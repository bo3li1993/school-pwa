// 👤 موديل ملف الطالب الشامل بنظام الاختيار الفوري المانع للكتابة اليدوية
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// مخزن مؤقت لبيانات الطلاب لسهولة استدعائها عند الضغط على الاستعلام
let localStudentsMap = {};

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--hover-color);"></i> نظام الاستعلام عن ملف الطالب الشامل</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            🔍 حدد الفصل الدراسي ثم اختر اسم الطالب رباعي لعرض سجله الصحي والسلوكي والغياب التراكمي طيران.
        </p>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الفصل</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)">
                    <option value="">-- جاري سحب الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر الطالب</label>
                <select id="prof-student-select" disabled>
                    <option value="">-- بانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <button onclick="window.triggerStudentProfileFetch()" style="width:100%; background:var(--primary-color); font-weight:700;"><i class="bi bi-search"></i> استدعاء وجرد ملف الطالب الشامل الحين</button>
    </div>

    <div id="student-profile-display-area"></div>`;

    // جلب الفصول تلقائياً لايف
    try {
        const classSelect = document.getElementById('prof-class-select');
        const snap = await getDocs(collection(db, 'students'));
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;
    } catch(e) { console.error(e); }
}

window.handleStudentClassChange = async function(classId) {
    const studentSelect = document.getElementById('prof-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري جلب أسماء الصف أبجدياً...</option>';
    studentSelect.disabled = true;
    localStudentsMap = {};

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let studentsList = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.name) {
                const cleanName = data.name.trim();
                studentsList.push(cleanName);
                localStudentsMap[cleanName] = { id: doc.id, ...data };
            }
        });
        studentsList.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب رباعي --</option>';
        studentsList.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = studentsList.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = studentsList.length === 0;
    } catch(e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في الاتصال</option>';
    }
};

window.triggerStudentProfileFetch = function() {
    const sName = document.getElementById('prof-student-select').value;
    if(!sName || !localStudentsMap[sName]) { alert('⚠️ يرجى اختيار اسم الطالب أولاً للاستعلام التراكمي.'); return; }
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

// 📊 دالة سحب وضخ داتا الطالب المختار بالكامل من النسخة الأصلية
window.loadStudentFullProfile = async function(student) {
    const displayArea = document.getElementById('student-profile-display-area');
    if(!displayArea) return;

    displayArea.innerHTML = `<p style="text-align:center; padding:20px; font-weight:bold; color:var(--hover-color);">⏳ جاري تجميع كشف علامات السلوك والحضور التراكمي للطالب...</p>`;

    try {
        const studentNameClean = student.name.trim();

        // سحب كشوف الطالب الحية بالتوازي لسرعة الصاروخ
        const [attSnap, behSnap, rewSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', studentNameClean)))
        ]);

        // 1. غياب
        let attendanceHtml = '';
        attSnap.forEach(doc => {
            const d = doc.data();
            const badge = d.status === 'absent' ? '<span class="badge danger">🔴 غياب</span>' : '<span class="badge success">🟢 حضور</span>';
            attendanceHtml += `<tr style="border-bottom:1px solid #eee;"><td>${d.date || '-'}</td><td style="text-align:center;">${d.period || 'الحصة الأولى'}</td><td style="text-align:center;">${badge}</td><td>أ. ${d.recordedBy || 'المعلم'}</td></tr>`;
        });

        // 2. سلوك ومخالفات
        let behaviorHtml = '';
        behSnap.forEach(doc => {
            const d = doc.data();
            behaviorHtml += `<tr style="border-bottom:1px solid #eee; color:var(--danger-color);"><td>${d.dateStr || '-'}</td><td><b>⚠️ ${d.action || 'مخالفة'}</b></td><td>${d.notes || 'سلوك غير منضبط'}</td><td>رصد: الإدارة الإدارية</td></tr>`;
        });

        // 3. جوائز
        let rewardsHtml = '';
        rewSnap.forEach(doc => {
            const d = doc.data();
            rewardsHtml += `<tr style="border-bottom:1px solid #eee; color:var(--success-color);"><td>${d.date || '-'}</td><td><b>🏆 ${d.type || 'تعزيز إيجابي'}</b></td><td style="font-weight:bold;">+${d.points || '5'} نقاط تعزيز</td><td>بواسطة: ${d.recordedBy || 'المعلم'}</td></tr>`;
        });

        displayArea.innerHTML = `
            <div class="card" style="background: linear-gradient(135deg, var(--primary-color) 0%, #2c2c4d 100%); color:#fff; border:none; padding:25px; border-radius:12px; margin-top:15px; text-align:right;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="font-size:20px; font-weight:900; color:#fff;">👤 الطالب: ${student.name}</h3>
                        <p style="font-size:12px; opacity:0.85; font-weight:bold; margin-top:4px;">المرحلة الدراسية: مدرسة سالم الحسينان المتوسطة للبنين</p>
                    </div>
                    <div style="text-align:left; background:rgba(255,255,255,0.15); padding:8px 15px; border-radius:8px;">
                        <p style="font-size:14px; font-weight:900; color:var(--hover-color);">🏫 الصف: ${student.classId || '-'}</p>
                        <p style="font-size:11px; font-weight:bold; margin-top:2px;">رقم القيد: ${student.studentNumber || '-'}</p>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; text-align:right;">
                <div class="card" style="background:#fff; padding:15px; border-radius:12px;">
                    <h3 style="font-size:14px; font-weight:900; margin-bottom:10px; color:var(--primary-color);"><i class="bi bi-calendar3"></i> سجل الحضور والغياب التفصيلي</h3>
                    <div style="max-height:220px; overflow-y:auto; font-size:12px;">
                        <table style="margin-top:0; width:100%;">
                            <thead><tr style="background:#f4f6f9;"><th>التاريخ</th><th style="text-align:center;">الحصة</th><th style="text-align:center;">الحالة</th><th>الراصد</th></tr></thead>
                            <tbody>${attendanceHtml || '<tr><td colspan="4" style="text-align:center; padding:15px; color:green; font-weight:bold;">🟢 ملتزم ومواظب بالكامل ولم يسجل غياب.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div class="card" style="background:#fff; padding:15px; border-radius:12px; margin-bottom:0; flex:1;">
                        <h3 style="font-size:14px; font-weight:900; margin-bottom:8px; color:var(--success-color);"><i class="bi bi-trophy-fill"></i> سجل التكريم والتعزيز الإيجابي</h3>
                        <div style="max-height:110px; overflow-y:auto; font-size:12px;">
                            <table style="margin-top:0; width:100%;"><tbody>${rewardsHtml || '<tr><td style="text-align:center; padding:10px; color:#999;">لم يقيد جوائز تعزيزية بعد.</td></tr>'}</tbody></table>
                        </div>
                    </div>

                    <div class="card" style="background:#fff; padding:15px; border-radius:12px; margin-bottom:0; flex:1;">
                        <h3 style="font-size:14px; font-weight:900; margin-bottom:8px; color:var(--danger-color);"><i class="bi bi-shield-slash-fill"></i> سجل التنبيهات والمخالفات السلوكية</h3>
                        <div style="max-height:110px; overflow-y:auto; font-size:12px;">
                            <table style="margin-top:0; width:100%;"><tbody>${behaviorHtml || '<tr><td style="text-align:center; padding:10px; color:green; font-weight:bold;">✓ السجل السلوكي للطالب نظيف ومثالي.</td></tr>'}</tbody></table>
                        </div>
                    </div>
                </div>
            </div>

            <button onclick="window.exportAsManzoumaPDF('student-profile-display-area', 'الملف_الشامل_للطالب')" style="width:100%; background:var(--primary-color); margin-top:15px; font-size:12px; font-weight:bold;"><i class="bi bi-printer-fill"></i> طباعة واعتماد الملف الشامل للطالب PDF</button>
        `;
    } catch(err) {
        displayArea.innerHTML = `<div class="card" style="color:red; text-align:center;">❌ فشل في جلب ملف الطالب التراكمي: ${err.message}</div>`;
    }
};