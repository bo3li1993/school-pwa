// 👤 موديل ملف الطالب الشامل المطور - يدمج سجل المتابعة والقرارات التربوية الرسمية
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let localStudentsMap = {};

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--hover-color);"></i> محرك الاستعلام الموحد عن ملف الطالب الشامل</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            🔍 حدد الصف الدراسي ثم اختر اسم الطالب للاطلاع على تقارير الغياب، السلوك، والتوصيات التربوية والقرارات الصادرة بحقه.
        </p>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">الصف الدراسي:</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)">
                    <option value="">-- جاري سحب الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">اسم الطالب رباعي:</label>
                <select id="prof-student-select" disabled>
                    <option value="">-- بانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <button onclick="window.triggerStudentProfileFetch()" style="width:100%; background:var(--primary-color); font-weight:900; padding:14px; border-radius:8px; border:none; color:#fff; cursor:pointer;"><i class="bi bi-search"></i> جلب وتجميع السجل التاريخي الكامل للطالب الحين</button>
    </div>

    <div id="student-profile-display-area"></div>`;

    try {
        const classSelect = document.getElementById('prof-class-select');
        const snap = await getDocs(collection(db, 'students'));
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- الرجاء اختيار الصف الدراسي --</option>';
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

        let html = '<option value="">-- اختر اسم الطالب من الكشف المعتمد --</option>';
        studentsList.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = studentsList.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = studentsList.length === 0;
    } catch(e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في الاتصال</option>';
    }
};

window.triggerStudentProfileFetch = function() {
    const sName = document.getElementById('prof-student-select').value;
    if(!sName || !localStudentsMap[sName]) { alert('⚠️ يرجى اختيار اسم الطالب أولاً من القائمة!'); return; }
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

window.loadStudentFullProfile = async function(student) {
    const displayArea = document.getElementById('student-profile-display-area');
    if(!displayArea) return;

    displayArea.innerHTML = `<p style="text-align:center; padding:20px; font-weight:bold; color:var(--hover-color);">⏳ جاري جرد السيرفر وتجميع الملفات والقرارات الصادرة بحق الطالب...</p>`;

    try {
        const studentNameClean = student.name.trim();

        // جلب كشوف الطالب المتوازية لسرعة الصاروخ الموحدة
        const [attSnap, behSnap, rewSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', studentNameClean)))
        ]);

        // 1. جرد الغياب وحصص الدراسة
        let attendanceHtml = '';
        attSnap.forEach(doc => {
            const d = doc.data();
            const badge = d.status === 'absent' ? '<span class="badge danger">🔴 غياب</span>' : '<span class="badge success">🟢 حضور</span>';
            attendanceHtml += `<tr style="border-bottom:1px solid #eee;"><td>📅 ${d.dateStr || d.date || '-'}</td><td style="text-align:center;">${d.period || 'الحصة'}</td><td style="text-align:center;">${badge}</td><td>أ. ${d.recordedBy || 'هيئة التعليم'}</td></tr>`;
        });

        // 2. جرد قرارات الضبط والإجراءات التربوية المعتمدة (تحويل لغة المخالفات إلى رسمية بالكامل)
        let behaviorHtml = '';
        behSnap.forEach(doc => {
            const d = doc.data();
            behaviorHtml += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="font