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

        // جلب متوازي وصاروخي لكافة السجلات لمنع أي ثقل أو تعليق
        const [attSnap, behSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'gatepass'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', studentNameClean)))
        ]);

        // 1. معالجة بيانات الحضور والغياب
        let attendanceRows = '';
        attSnap.forEach(doc => {
            const d = doc.data();
            if (d.status === 'absent' || d.status === 'late') {
                const badge = d.status === 'absent' ? '<span class="badge danger" style="background:#e74c3c; padding:3px 8px; color:#fff; border-radius:4px;">🔴 غياب</span>' : '<span class="badge warning" style="background:#f39c12; padding:3px 8px; color:#fff; border-radius:4px;">🟡 تأخر</span>';
                attendanceRows += `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">📅 ${d.dateStr || d.date || '-'}</td><td style="text-align:center; padding:8px;">${d.period || 'الحصة'}</td><td style="text-align:center; padding:8px;">${badge}</td><td style="padding:8px;">أ. ${d.recordedBy || 'هيئة التعليم'}</td></tr>`;
            }
        });
        if(!attendanceRows) attendanceRows = '<tr><td colspan="4" style="text-align:center; padding:12px; color:#27ae60; font-weight:bold;">✅ لا توجد سجلات غياب أو تأخير مقيدة بحق الطالب.</td></tr>';

        // 2. معالجة بيانات القرارات السلوكية والمتابعة الرسمية
        let behaviorRows = '';
        behSnap.forEach(doc => {
            const d = doc.data();
            behaviorRows += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px; font-weight:bold; color:#7f8c8d;">📅 ${d.dateStr || d.date || '-'}</td>
                <td style="padding:10px; text-align:center;"><span class="badge danger" style="background:#c0392b; padding:4px 8px; color:#fff; border-radius:4px; font-weight:bold;">${d.action || 'إجراء معتمد'}</span></td>
                <td style="padding:10px; color:#444; font-size:12px; font-weight:bold;">${d.notes || '-'}</td>
            </tr>`;
        });
        if(!behaviorRows) behaviorRows = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#27ae60; font-weight:bold;">✅ ملف الطالب السلوكي نظيف وخالٍ من العقوبات التنظيمية.</td></tr>';

        // 3. معالجة تصاريح الاستئذان والخروج
        let gatepassRows = '';
        gateSnap.forEach(doc => {
            const d = doc.data();
            gatepassRows += `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">📅 ${d.dateStr || d.date || '-'}</td><td style="padding:8px;">👥 ${d.relative || '-'}</td><td style="padding:8px; color:#2980b9; font-weight:bold;">${d.reason || '-'}</td></tr>`;
        });
        if(!gatepassRows) gatepassRows = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#999;">💡 لم يصدر للطالب أي تصريح استئذان خروج مسبقاً.</td></tr>';

        // 4. معالجة زيارات العيادة المدرسية
        let clinicRows = '';
        clinicSnap.forEach(doc => {
            const d = doc.data();
            clinicRows += `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">📅 ${d.dateStr || d.date || '-'}</td><td style="padding:8px; color:#c0392b;">🩺 ${d.complaint || '-'}</td><td style="padding:8px; font-weight:bold; color:#27ae60;">${d.actionTaken || d.status || '-'}</td></tr>`;
        });
        if(!clinicRows) clinicRows = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#999;">💡 السجل الطبي خالٍ من أي زيارات مسجلة للعيادة.</td></tr>';

        // بناء اللوحة المتكاملة للعرض الرسمي الموحد
        displayArea.innerHTML = `
        <div class="card" style="border-top:5px solid var(--hover-color); background:#fff; padding:20px; border-radius:12px; margin-top:20px; text-align:right;">
            <div style="background:#f8fafc; border-right:5px solid var(--primary-color); padding:15px; border-radius:6px; margin-bottom:20px;">
                <h3 style="font-size:15px; color:var(--primary-color); font-weight:900;"><i class="bi bi-person-circle"></i> الملف الرسمي التراكمي المعتمد للطالب</h3>
                <p style="font-size:14px; margin-top:5px; font-weight:bold; color:#333;">الاسم الكامل: <span style="color:var(--hover-color); font-size:15px;">${studentNameClean}</span></p>
                <p style="font-size:12px; font-weight:bold; color:#666; margin-top:2px;">الصف المقيد به: <span style="background:var(--accent-color); padding:2px 8px; color:#fff; border-radius:4px;">${student.classId || '-'}</span></p>
            </div>

            <div style="display:grid; grid-template-columns:1fr; gap:20px;">
                <div style="border:1px solid #eef2f5; border-radius:8px; padding:15px;">
                    <h4 style="font-size:13px; font-weight:900; color:#e74c3c; margin-bottom:10px;"><i class="bi bi-calendar-x-fill"></i> سجل جرد غياب وتأخر الحصص الدراسي اليومي</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th>التاريخ</th>
                                <th style="text-align:center;">الحصة</th>
                                <th style="text-align:center;">الحالة الرسمية</th>
                                <th>الموظف الراصد</th>
                            </tr>
                        </thead>
                        <tbody>${attendanceRows}</tbody>
                    </table>
                </div>

                <div style="border:1px solid #eef2f5; border-radius:8px; padding:15px;">
                    <h4 style="font-size:13px; font-weight:900; color:var(--primary-color); margin-bottom:10px;"><i class="bi bi-shield-lock-fill"></i> سجل الإجراءات التربوية المعتمدة وقرارات الضبط السلوكي</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th>تاريخ الإجراء</th>
                                <th style="text-align:center;">القرار الصادر</th>
                                <th>تفاصيل وملاحظات الأخصائي الموثقة للائحة</th>
                            </tr>
                        </thead>
                        <tbody>${behaviorRows}</tbody>
                    </table>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:15px;">
                    <div style="border:1px solid #eef2f5; border-radius:8px; padding:12px;">
                        <h4 style="font-size:13px; font-weight:900; color:#27ae60; margin-bottom:10px;"><i class="bi bi-ticket-perforated-fill"></i> بطاقات تصاريح الاستئذان المعتمدة</h4>
                        <table style="width:100%; border-collapse:collapse; font-size:12px;">
                            <thead><tr style="background:#f8f9fa;"><th>التاريخ</th><th>مستلم الطالب</th><th>عذر الخروج</th></tr></thead>
                            <tbody>${gatepassRows}</tbody>
                        </table>
                    </div>
                    <div style="border:1px solid #eef2f5; border-radius:8px; padding:12px;">
                        <h4 style="font-size:13px; font-weight:900; color:var(--accent-color); margin-bottom:10px;"><i class="bi bi-heart-pulse-fill"></i> كشوف زيارات العيادة والتحويل الطبي الصادر</h4>
                        <table style="width:100%; border-collapse:collapse; font-size:12px;">
                            <thead><tr style="background:#f8f9fa;"><th>التاريخ</th><th>التشخيص/الشكوى</th><th>الإجراء الطبي</th></tr></thead>
                            <tbody>${clinicRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    } catch(err) {
        displayArea.innerHTML = `<p style="text-align:center; color:red; font-weight:bold; padding:20px;">❌ خطأ في فرز البيانات السحابية: ${err.message}</p>`;
    }
};