import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-person-badge-fill" style="color:var(--primary-color);"></i> الملف الشامل للطالب (البحث الذكي المفرز)</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">اختر الصف الدراسي أولاً، ليقوم النظام بجلب الأسماء مرتبة أبجدياً تلقائياً.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 15px;">
                <div>
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                    <select id="student-search-class-select" onchange="window.handleClassChangeFilter(this.value)">
                        <option value="">-- اختر الفصل --</option>
                        <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                        <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                        <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                        <option value="9/1">9/1</option><option value="9/2">9/2</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب من الفصل (مرتب أبجدياً)</label>
                    <select id="student-search-name-select" disabled>
                        <option value="">-- بانتظار اختيار الفصل --</option>
                    </select>
                </div>
            </div>
            
            <button onclick="window.fetchStudentFullCardLive()" style="width: 100%; background: var(--accent-color); font-weight:700;">
                <i class="bi bi-search"></i> استعراض وتفنيد ملف الطالب الشامل
            </button>
        </div>

        <div id="student-profile-result-area" style="margin-top:15px;"></div>
    `;
}

// دالة جلب أسامي طلاب الفصل المختار حياً وفورياً وترتيبهم أبجدياً كويتيّاً
window.handleClassChangeFilter = async function(classId) {
    const studentSelect = document.getElementById('student-search-name-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب وتصنيف الأسامي أبجدياً...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let studentsArray = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                studentsArray.push(data.name.trim());
            }
        });

        // 🔤 السحر هني: فرز وترتيب المصفوفة أبجدياً طبقاً للغة العربية وقواعدها المعتمدة
        studentsArray.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب من الكشف المفرز --</option>';
        studentsArray.forEach(name => {
            html += `<option value="${name}">${name}</option>`;
        });

        if (studentsArray.length === 0) {
            studentSelect.innerHTML = '<option value="">⚠️ لا يوجد طلاب مقيدين بهذا الفصل</option>';
        } else {
            studentSelect.innerHTML = html;
            studentSelect.disabled = false;
        }
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

// دالة جلب وتحليل سجل الطالب المستهدف ليزرياً (مقاومة لخطأ الصلاحيات)
window.fetchStudentFullCardLive = async function() {
    const studentName = document.getElementById('student-search-name-select').value;
    const classId = document.getElementById('student-search-class-select').value;
    const resultArea = document.getElementById('student-profile-result-area');

    if (!studentName || !classId) {
        alert('يرجى اختيار الصف والطالب أولاً لبدء الفحص.');
        return;
    }

    resultArea.innerHTML = '<div class="card" style="text-align:center; padding:20px;"><p>⏳ جاري جلب السجل السحابي المباشر للطالب...</p></div>';

    try {
        let absentDays = 0;
        let totalPoints = 0;
        let behaviorHtml = '';

        // 🎯 1. استعلام ليزري مستهدف عن غياب الطالب فقط (تجنباً لرفض الصلاحيات)
        const qAtt1 = query(collection(db, 'attendance'), where('studentName', '==', studentName.trim()));
        const qAtt2 = query(collection(db, 'attendance'), where('name', '==', studentName.trim()));
        
        const [snapAtt1, snapAtt2] = await Promise.all([getDocs(qAtt1), getDocs(qAtt2)]);
        
        snapAtt1.forEach(d => { if(d.data().status === 'absent') absentDays++; });
        snapAtt2.forEach(d => { if(d.data().status === 'absent') absentDays++; });

        // 🎯 2. استعلام ليزري مستهدف عن سلوكيات الطالب فقط
        const qBeh1 = query(collection(db, 'behavior'), where('studentName', '==', studentName.trim()));
        const qBeh2 = query(collection(db, 'behavior'), where('name', '==', studentName.trim()));
        
        const [snapBeh1, snapBeh2] = await Promise.all([getDocs(qBeh1), getDocs(qBeh2)]);
        
        const appendBehavior = (d) => {
            const data = d.data();
            behaviorHtml += `
                <li style="margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:5px;">
                    <span class="badge danger" style="padding:2px 6px;">${data.action || 'مخالفة'}</span> 
                    بفصل ${data.classId || classId} - تاريخ الرصد المعتمد.
                </li>`;
        };
        snapBeh1.forEach(appendBehavior);
        snapBeh2.forEach(appendBehavior);

        // 🎯 3. استعلام ليزري مستهدف عن رصيد نقاط التميز
        const qRew1 = query(collection(db, 'rewards'), where('studentName', '==', studentName.trim()));
        const qRew2 = query(collection(db, 'rewards'), where('name', '==', studentName.trim()));
        
        const [snapRew1, snapRew2] = await Promise.all([getDocs(qRew1), getDocs(qRew2)]);
        
        snapRew1.forEach(d => { totalPoints += parseInt(d.data().points || 0); });
        snapRew2.forEach(d => { totalPoints += parseInt(d.data().points || 0); });

        // 🎨 طباعة وتوليد كارت الطالب النظيف والنهائي
        resultArea.innerHTML = `
            <div class="card" style="border-top: 5px solid var(--success-color); background:#fff; text-align:right; border-radius:12px; padding:20px;">
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:15px; border-right:4px solid var(--primary-color);">
                    <h3 style="font-weight:900; color:var(--primary-color);">👤 الطالب: ${studentName}</h3>
                    <p style="font-size:12px; font-weight:700; color:#555; margin-top:2px;">🏫 الصف المقيد به: الفصل الدراسي ${classId}</p>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:20px;">
                    <div style="background:#fff5f5; padding:15px; border-radius:8px; text-align:center; border:1px solid #ffcccc;">
                        <h4 style="color:var(--danger-color); font-size:26px; font-weight:900;">${absentDays} أيام</h4>
                        <p style="font-size:11px; font-weight:bold; color:#777;">إجمالي غياب الطالب</p>
                    </div>
                    <div style="background:#f0fff4; padding:15px; border-radius:8px; text-align:center; border:1px solid #ccffcc;">
                        <h4 style="color:var(--success-color); font-size:26px; font-weight:900;">+${totalPoints} نقطة</h4>
                        <p style="font-size:11px; font-weight:bold; color:#777;">محفظة بنك التميز</p>
                    </div>
                </div>

                <h4 style="font-weight:800; color:var(--primary-color); border-bottom:2px solid #eee; padding-bottom:5px;"><i class="bi bi-shield-exclamation"></i> السجل السلوكي والبطاقات المرصودة:</h4>
                <ul style="margin-right:20px; margin-top:10px; font-size:13px; color:#555; list-style-type: square;">
                    ${behaviorHtml || '<li style="color:var(--success-color); font-weight:bold; list-style:none;">🥇 السجل السلوكي نظيف ومشرّف للمدرسة.</li>'}
                </ul>
            </div>
        `;
    } catch (err) {
        resultArea.innerHTML = `
            <div class="card" style="border-top:5px solid var(--danger-color); color:red; padding:15px; text-align:center; font-weight:bold;">
                ❌ تعذر جلب السجل الكامل: يرجى التأكد من رصد بيانات أولية للطالب بالسيرفر أولاً.
            </div>
        `;
    }
};