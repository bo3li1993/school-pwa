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
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right;">
            <h2><i class="bi bi-person-badge-fill"></i> الملف الشامل للطالب (البحث الذكي بالفصول)</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">اختر الصف الدراسي أولاً، ليقوم النظام بجلب واستعراض أسامي طلاب الفصل تلقائياً.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
                <div>
                    <label>1. اختر الصف / الفصل</label>
                    <select id="student-search-class-select" onchange="window.handleClassChangeFilter(this.value)">
                        <option value="">-- اختر الفصل --</option>
                        <option value="6/1">6/1</option>
                        <option value="6/2">6/2</option>
                        <option value="6/3">6/3</option>
                        <option value="6/4">6/4</option>
                        <option value="7/1">7/1</option>
                        <option value="7/2">7/2</option>
                        <option value="7/3">7/3</option>
                        <option value="7/4">7/4</option>
                        <option value="8/1">8/1</option>
                        <option value="8/2">8/2</option>
                        <option value="8/3">8/3</option>
                        <option value="8/4">8/4</option>
                        <option value="9/1">9/1</option>
                        <option value="9/2">9/2</option>
                    </select>
                </div>
                <div>
                    <label>2. اختر اسم الطالب من الفصل</label>
                    <select id="student-search-name-select" disabled>
                        <option value="">-- بانتظار اختيار الفصل --</option>
                    </select>
                </div>
            </div>
            
            <button onclick="window.fetchStudentFullCardLive()" style="width: 100%; background: var(--accent-color);">
                <i class="bi bi-search"></i> استعراض وتفنيد ملف الطالب الشامل
            </button>
        </div>

        <div id="student-profile-result-area"></div>
    `;
}

// دالة جلب أسامي طلاب الفصل المختار حياً وفورياً
window.handleClassChangeFilter = async function(classId) {
    const studentSelect = document.getElementById('student-search-name-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب أسامي الطلاب...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let html = '<option value="">-- اختر اسم الطالب من الكشف --</option>';
        let count = 0;

        snap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                html += `<option value="${data.name.trim()}">${data.name.trim()}</option>`;
                count++;
            }
        });

        if (count === 0) {
            studentSelect.innerHTML = '<option value="">⚠️ لا يوجد طلاب مقيدين بهذا الفصل</option>';
        } else {
            studentSelect.innerHTML = html;
            studentSelect.disabled = false;
        }
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

// دالة جلب وتحليل سجل الطالب بالكامل (حضور، سلوك، تميز)
window.fetchStudentFullCardLive = async function() {
    const studentName = document.getElementById('student-search-name-select').value;
    const classId = document.getElementById('student-search-class-select').value;
    const resultArea = document.getElementById('student-profile-result-area');

    if (!studentName || !classId) {
        alert('يرجى اختيار الصف والطالب أولاً لبدء الفحص.');
        return;
    }

    resultArea.innerHTML = '<div class="card" style="text-align:center; padding:3px;"><p>⏳ جاري تجميع السجل السحابي الشامل للطالب...</p></div>';

    try {
        // 1. فحص سجل الغياب
        let absentDays = 0;
        const attSnap = await getDocs(collection(db, 'attendance'));
        attSnap.forEach(d => {
            const data = d.data();
            if ((data.studentName === studentName || data.name === studentName) && data.status === 'absent') {
                absentDays++;
            }
        });

        // 2. فحص سجل السلوك المخالف
        let behaviorHtml = '';
        const behSnap = await getDocs(collection(db, 'behavior'));
        behSnap.forEach(d => {
            const data = d.data();
            if (data.studentName === studentName || data.name === studentName) {
                behaviorHtml += `<li>⚠️ ${data.action || 'مخالفة سلوكية'}: بالفصل ${data.classId || classId}</li>`;
            }
        });

        // 3. فحص نقاط بنك التميز
        let totalPoints = 0;
        const rewSnap = await getDocs(collection(db, 'rewards'));
        rewSnap.forEach(d => {
            const data = d.data();
            if (data.studentName === studentName || data.name === studentName) {
                totalPoints += parseInt(data.points || 0);
            }
        });

        resultArea.innerHTML = `
            <div class="card" style="border-top: 5px solid var(--success-color); background:#fff; text-align:right;">
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:15px;">
                    <h3>👤 الطالب: ${studentName}</h3>
                    <p><b>🏫 الفصل الدراسي الحالي:</b> الصف ${classId}</p>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:15px;">
                    <div style="background:#fff5f5; padding:15px; border-radius:8px; text-align:center; border:1px solid #ffcccc;">
                        <h4 style="color:var(--danger-color); font-size:24px;">${absentDays} أيام</h4>
                        <p style="font-size:12px; font-weight:bold;">إجمالي أيام الغياب</p>
                    </div>
                    <div style="background:#f0fff4; padding:15px; border-radius:8px; text-align:center; border:1px solid #ccffcc;">
                        <h4 style="color:var(--success-color); font-size:24px;">+${totalPoints} نقطة</h4>
                        <p style="font-size:12px; font-weight:bold;">رصيد بنك التميز</p>
                    </div>
                </div>

                <h4>📑 السجل السلوكي والبطاقات المرصودة:</h4>
                <ul style="margin-right:20px; margin-top:5px; font-size:13px; color:#555;">
                    ${behaviorHtml || '<li style="color:green; font-weight:bold;">🥇 السجل نظيف ومشرف (لا توجد مخالفات مقيدة)</li>'}
                </ul>
            </div>
        `;
    } catch (err) {
        resultArea.innerHTML = `<div class="card" style="color:red;">خطأ في تحليل بيانات الطالب: ${err.message}</div>`;
    }
};