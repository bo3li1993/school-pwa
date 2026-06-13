import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, doc, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
        <div style="display:flex; gap:10px;">
            <button onclick="window.triggerStudentProfileFetch()" style="flex:1; background:var(--primary-color); font-weight:900; padding:14px; border-radius:8px; border:none; color:#fff; cursor:pointer;"><i class="bi bi-search"></i> جلب وتجميع السجل التاريخي الكامل للطالب الحين</button>
            <button onclick="window.resetStudentDashboardLiveView()" id="btn-student-reset" style="background:#7f8c8d; font-weight:700; border-radius:8px; border:none; color:#fff; padding:0 20px; display:none;"><i class="bi bi-arrow-counterclockwise"></i> 🔄 الرجوع للأرشيف</button>
        </div>
    </div>

    <div id="student-profile-display-area"></div>`;

    try {
        const classSelect = document.getElementById('prof-class-select');
        const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية الحالية
        
        // جلب طلاب المدرسة الحالية فقط لعزل الفصول
        const qClasses = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const snap = await getDocs(qClasses);
        
        let classesSet = new Set();
        snap.forEach(doc => { 
            if(doc.data().classId) classesSet.add(doc.data().classId.trim()); 
        });
        
        // حماية دائرية: إذا كانت المدرسة جديدة ولم ترفع طلاب بعد، نسحب الفصول العامة احتياطياً
        if (classesSet.size === 0 && schoolId === 'hosainan') {
            const fallbackSnap = await getDocs(collection(db, 'students'));
            fallbackSnap.forEach(doc => {
                const d = doc.data();
                if(!d.schoolId && d.classId) classesSet.add(d.classId.trim());
            });
        }
        
        let htmlClasses = '<option value="">-- الرجاء اختيار الصف الدراسي --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;
    } catch(e) { console.error(e); }
}

window.resetStudentDashboardLiveView = function() {
    document.getElementById('student-profile-display-area').innerHTML = '';
    document.getElementById('btn-student-reset').style.display = 'none';
    document.getElementById('prof-student-select').value = '';
};

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

    const schoolId = getActiveSchoolId();

    try {
        // الفلترة الثنائية: الفصل + كود المدرسة لمنع تداخل الأسماء
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);
        
        // خط دفاع ثانٍ للداتا القديمة
        if (snap.empty && schoolId === 'hosainan') {
            const fallbackQ = query(collection(db, 'students'), where('classId', '==', classId.trim()));
            snap = await getDocs(fallbackQ);
        }
        
        let studentsList = [];
        snap.forEach(doc => {
            const data = doc.data();
            // التأكد من تبعية الداتا للمدرسة في حال استرجاع الفولباك العام
            if(data.name && (!data.schoolId || data.schoolId === schoolId)) {
                const cleanName = data.name.trim();
                studentsList.push(cleanName);
                localStudentsMap[cleanName] = { id: doc.id, ...data };
            }
        });
        studentsList.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب من الكشف المعتمد --</option>';
        studentsList.forEach(name => { html += `<option value="${name}">${name}</option>'; });

        studentSelect.innerHTML = studentsList.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = studentsList.length === 0;
    } catch(e) { studentSelect.innerHTML = '<option value="">❌ خطأ في الاتصال</option>'; }
};

window.triggerStudentProfileFetch = function() {
    const sName = document.getElementById('prof-student-select').value;
    if(!sName || !localStudentsMap[sName]) { alert('⚠️ يرجى اختيار اسم الطالب أولاً من القائمة!'); return; }
    document.getElementById('btn-student-reset').style.display = 'inline-block';
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

window.loadStudentFullProfile = async function(student) {
    const displayArea = document.getElementById('student-profile-display-area');
    if(!displayArea) return;

    displayArea.innerHTML = `<p style="text-align:center; padding:20px; font-weight:bold; color:var(--hover-color);">⏳ جاري جرد السيرفر وتجميع الملفات والقرارات الصادرة بحق الطالب...</p>`;

    const schoolId = getActiveSchoolId();

    try {
        const studentNameClean = student.name.trim();

        // 🚀 حقن الـ schoolId بشكل كامل ومتوازي في الكولكشنات الخمسة الموحدة لضمان أمان الـ SaaS مئة بالمئة
        const [attSnap, behSnap, rewSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', studentNameClean), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', studentNameClean), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', studentNameClean), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('studentName', '==', studentNameClean), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', studentNameClean), where('schoolId', '==', schoolId)))
        ]);

        // 1. حضور وغياب الحصص
        let attendanceRows = '';
        attSnap.forEach(doc => {
            const d = doc.data();
            if (d.status === 'absent' || d.status === 'late') {
                const badge = d.status === 'absent' ? '<span class="badge danger" style="background:#e74c3c;">🔴 غياب</span>' : '<span class="badge warning" style="background:#f39c12;">🟡 تأخر</span>';
                attendanceRows += `<tr style="border-bottom:1px solid #eee;"><td>📅 ${d.dateStr || d.date || '-'}</td><td style="text-align:center;">${d.period || 'الحصة'}</td><td style="text-align:center;">${badge}</td><td>أ. ${d.recordedBy || 'هيئة التعليم'}</td></tr>`;
            }
        });
        if(!attendanceRows) attendanceRows = '<tr><td colspan="4" style="text-align:center; padding:12px; color:#27ae60; font-weight:bold;">✅ ملف الحضور والالتزام نظيف ومثالي.</td></tr>';

        // 2. قرارات الضبط والمتابعة السلوكية الرسمية
        let behaviorRows = '';
        behSnap.forEach(doc => {
            const d = doc.data();
            const followupBadge = d.followUpStatus && d.followUpStatus.includes('تمت') ? 
                `<span class="badge success" style="background:#27ae60;">تم الإقفال</span>` : 
                `<span class="badge warning" style="background:#e67e22;">قيد المتابعة</span>`;
                
            behaviorRows += `
            <tr style="border-bottom:1px solid #eee;">
                <td>📅 ${d.dateStr || d.date || '-'}</td>
                <td><span class="badge danger" style="background:#c0392b;">${d.action || 'إجراء معتمد'}</span></td>
                <td style="text-align:center;">${followupBadge}</td>
                <td style="font-weight:700; color:#2980b9;">أ. ${d.referredBy || 'غير محدد'}</td>
                <td style="color:#444; font-size:12px; font-weight:bold;">${d.notes || '-'}</td>
            </tr>`;
        });
        if(!behaviorRows) behaviorRows = '<tr><td colspan="5" style="text-align:center; padding:12px; color:#27ae60; font-weight:bold;">✅ سجل المتابعة السلوكية نظيف وخالٍ من العقوبات التربوية.</td></tr>';

        // 3. كشف لوحة الشرف والتعزيز الإيجابي والمكافآت المفعّلة
        let rewardsRows = '';
        rewSnap.forEach(doc => {
            const d = doc.data();
            rewardsRows += `<tr style="border-bottom:1px solid #eee;"><td>📅 ${d.dateStr || d.date || '-'}</td><td style="color:#27ae60; font-weight:900;">🏆 ${d.rewardType || d.title || 'تميز تربوي'}</td><td>${d.notes || d.reason || '-'}</td></tr>`;
        });
        if(!rewardsRows) rewardsRows = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#999; font-weight:bold;">💡 لا توجد شهادات تكريم أو لوحة تميز مرصودة بحق الطالب حالياً.</td></tr>';

        // 4. تصاريح الخروج المبكر والاستئذان
        let gatepassRows = '';
        gateSnap.forEach(doc => {
            const d = doc.data();
            gatepassRows += `<tr style="border-bottom:1px solid #eee;"><td>📅 ${d.dateStr || d.date || '-'}</td><td>👥 ${d.relative || '-'}</td><td style="color:#2980b9; font-weight:bold;">${d.reason || '-'}</td></tr>`;
        });
        if(!gatepassRows) gatepassRows = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#999;">💡 لم يصدر للطالب أي تصريح استئذان خروج مسبقاً.</td></tr>';

        // 5. سجل العيادة الطبية للمدرسة
        let clinicRows = '';
        clinicSnap.forEach(doc => {
            const d = doc.data();
            clinicRows += `<tr style="border-bottom:1px solid #eee;"><td>📅 ${d.dateStr || d.date || '-'}</td><td style="color:#c0392b;">🩺 ${d.complaint || '-'}</td><td style="padding:8px; font-weight:bold; color:#27ae60;">${d.actionTaken || d.status || '-'}</td></tr>`;
        });
        if(!clinicRows) clinicRows = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#999;">💡 السجل الطبي خالٍ من أي زيارات مسجلة للعيادة.</td></tr>';

        // عرض اللوحة الإدارية العليا الفخمة والموحدة للطالب
        displayArea.innerHTML = `
        <div class="card" style="border-top:5px solid var(--hover-color); background:#fff; padding:20px; border-radius:12px; margin-top:20px; text-align:right;">
            <div style="background:#f8fafc; border-right:5px solid var(--primary-color); padding:15px; border-radius:6px; margin-bottom:20px;">
                <h3 style="font-size:15px; color:var(--primary-color); font-weight:900;"><i class="bi bi-person-circle"></i> الملف الرسمي التراكمي المعتمد للطالب</h3>
                <p style="font-size:14px; margin-top:5px; font-weight:bold; color:#333;">الاسم الكامل: <span style="color:var(--hover-color); font-size:15px;">${studentNameClean}</span></p>
                <p style="font-size:12px; font-weight:bold; color:#666; margin-top:2px;">الصف الدراسي الحالي: <span style="background:var(--accent-color); padding:2px 8px; color:#fff; border-radius:4px;">${student.classId || '-'}</span></p>
            </div>

            <div style="display:grid; grid-template-columns:1fr; gap:20px;">
                <div style="border:1px solid #eef2f5; border-radius:8px; padding:15px;">
                    <h4 style="font-size:13px; font-weight:900; color:#e74c3c; margin-bottom:10px;"><i class="bi bi-calendar-x-fill"></i> سجل جرد غياب وتأخر الحصص الدراسي اليومي</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead><tr style="background:#f8f9fa;"><th>التاريخ</th><th style="text-align:center;">الحصة</th><th style="text-align:center;">الحالة الرسمية</th><th>الموظف الراصد</th></tr></thead>
                        <tbody>${attendanceRows}</tbody>
                    </table>
                </div>

                <div style="border:1px solid #eef2f5; border-radius:8px; padding:15px;">
                    <h4 style="font-size:13px; font-weight:900; color:var(--primary-color); margin-bottom:10px;"><i class="bi bi-shield-lock-fill"></i> سجل الإجراءات التربوية المعتمدة وقرارات الضبط السلوكي ومواقف المتابعة</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead><tr style="background:#f8f9fa;"><th>تاريخ الإجراء</th><th>القرار الصادر</th><th style="text-align:center;">حالة المتابعة</th><th>المعلم المحيل للحالة</th><th>تفاصيل وملاحظات الأخصائي</th></tr></thead>
                        <tbody>${behaviorRows}</tbody>
                    </table>
                </div>

                <div style="border:1px solid #eef2f5; border-radius:8px; padding:15px;">
                    <h4 style="font-size:13px; font-weight:900; color:#27ae60; margin-bottom:10px;"><i class="bi bi-trophy-fill"></i> كشف لوحة الشرف والتعزيز الإيجابي والمكافآت المرصودة</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead><tr style="background:#f8f9fa;"><th>تاريخ التكريم</th><th>نوع المكافأة المعتمدة</th><th>أسباب التميز وملاحظات اللجنة</th></tr></thead>
                        <tbody>${rewardsRows}</tbody>
                    </table>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:15px;">
                    <div style="border:1px solid #eef2f5; border-radius:8px; padding:12px;">
                        <h4 style="font-size:13px; font-weight:900; color:#2980b9; margin-bottom:10px;"><i class="bi bi-ticket-perforated-fill"></i> بطاقات تصاريح الاستئذان المعتمدة</h4>
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
    } catch(err) { displayArea.innerHTML = `<p style="color:red; font-weight:bold; padding:20px;">❌ خطأ في فرز البيانات السحابية: ${err.message}</p>`; }
};

window.switchStudentTab = function() {}; // تم الابقاء للسلامة البرمجية