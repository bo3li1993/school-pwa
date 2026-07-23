import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initClinicModule() {
    const container = document.getElementById('tab-clinic');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid #3498db; text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-heart-pulse-fill" style="color:#3498db;"></i> سجل العيادة المدرسية والصحة الطلابية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">نظام الدخول السريع لعيادة المدرسة؛ حدد فصل الطالب لاستدعاء اسمه ومتابعة حالته الطبية فوراً بدون كيبورد.</p>
            
            <form id="clinic-reg-form" onsubmit="window.handleRegisterClinicLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="clinic-class-select" onchange="window.handleClinicClassChange(this.value)" required>
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب المريض</label>
                        <select id="clinic-student-select" disabled required>
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. التشخيص العارض / الشكوى</label>
                        <select id="clinic-complaint" required>
                            <option value="ارتفاع درجة الحرارة">🌡️ ارتفاع درجة الحرارة</option>
                            <option value="صداع وألم بالرأس">🤕 صداع وألم بالرأس</option>
                            <option value="ألم بالمعدة ومغص">🤢 ألم بالمعدة ومغص</option>
                            <option value="إصابة جرح / كدمة بالملعب">🏃 جرح / إصابة بالملاعب</option>
                            <option value="إعياء عام وإرهاق">💤 إعياء عام وإرهاق</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">الإجراء الطبي والعلاج الممنوح</label>
                    <input type="text" id="clinic-treatment" placeholder="مثال: إعطاء بندول + مكوث بالعيادة لمدة حصة كاملة" required>
                </div>
                
                <button type="submit" style="width:100%; background:#3498db; font-weight:700; margin-top:5px;"><i class="bi bi-plus-square-fill"></i> تقييد وإرسال بطاقة الزيارة الصحية</button>
            </form>
        </div>

        
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button onclick="window.printClinicPDF()" 
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
                </button>
                <button onclick="window.printClinicDirect()" 
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> طباعة مباشرة
                </button>
            </div>
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-capsule"></i> كشف زيارات العيادة المدرسية المقيدة اليوم لايف</h2>
            <div style="overflow-x:auto;">
                <table id="clinic-logs-table" style="width:100%;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>اسم الطالب المريض</th>
                            <th style="text-align:center;">الفصل</th>
                            <th style="text-align:center;">العارض الطبي</th>
                            <th>الإجراء والعلاج الممنوح</th>
                        </tr>
                    </thead>
                    <tbody id="clinic-logs-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري مراجعة سجلات العيادة السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        const classSelect = document.getElementById('clinic-class-select');
        const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية
        
        // جلب الفصول التابعة للمدرسة الحالية
        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const snap = await getDocs(qStudents);
        
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        // دعم التوافقية للمدرسة القديمة
        if (classesSet.size === 0 && schoolId === 'hosainan') {
            const fSnap = await getDocs(getActiveSchoolId() ? query(collection(db, 'students'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'students'));
            fSnap.forEach(doc => { if(!doc.data().schoolId && doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        }
        
        let htmlClasses = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadClinicLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل موديل العيادة: ${e.message}</div>`;
    }
}

window.handleClinicClassChange = async function(classId) {
    const studentSelect = document.getElementById('clinic-student-select');
    if (!studentSelect) return;
    const schoolId = getActiveSchoolId();

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري فرز الكشف أبجدياً...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);
        
        if (snap.empty && schoolId === 'hosainan') {
             snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId.trim())));
        }
        
        let arr = [];
        snap.forEach(doc => { 
            const d = doc.data();
            if(d.name && (!d.schoolId || d.schoolId === schoolId)) arr.push(d.name.trim()); 
        });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب المريض --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

window.handleRegisterClinicLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('clinic-student-select').value;
    const cId = document.getElementById('clinic-class-select').value;
    const complaint = document.getElementById('clinic-complaint').value;
    const treatment = document.getElementById('clinic-treatment').value.trim();
    const schoolId = getActiveSchoolId(); // 🏢 الربط المركزي السحابي

    try {
        await addDoc(collection(db, 'clinic'), {
            schoolId: schoolId, // 🔑 البصمة الأمنية
            studentName: sName,
            classId: cId,
            complaint: complaint,
            treatment: treatment,
            createdAt: serverTimestamp()
        });
        window.showToast('✓ تم تسجيل البيانات الصحية للطالب بنجاح.');
        // خيار إبلاغ ولي الأمر
        const sName = document.getElementById('clinic-student-select')?.value||'';
        const cId   = document.getElementById('clinic-class-select')?.value||'';
        const comp  = document.getElementById('clinic-complaint')?.value||'';
        const res   = document.getElementById('clinic-result')?.value||'';
        if(sName && confirm('هل تريد إبلاغ ولي الأمر عبر واتساب؟')) {
            window.sendClinicWhatsApp(sName, cId, comp, res);
        };
        document.getElementById('clinic-reg-form').reset();
        document.getElementById('clinic-student-select').innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        document.getElementById('clinic-student-select').disabled = true;
    } catch(err) {
        window.showToast('❌ خطأ في الاتصال: ' + err.message, 'error');
    }
};

function loadClinicLogsLive() {
    const tbody = document.getElementById('clinic-logs-tbody');
    if (!tbody) return;
    const schoolId = getActiveSchoolId();

    // جلب وحصر زيارات العيادة التابعة للمدرسة الحالية فقط
    const qLogs = query(collection(db, 'clinic'), where('schoolId', '==', schoolId));
    onSnapshot(qLogs, (snap) => {
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.studentName || 'غير محدد'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge success" style="background:#3498db;">${data.complaint || '-'}</span></td>
                    <td style="color:#555; font-size:12px; font-weight:700;">${data.treatment || '-'}</td>
                </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 لا توجد زيارات مقيدة للعيادة اليوم.</td></tr>';
    });
}
// ===== طباعة السجل =====
window.printClinicPDF = async function() {
    const tbody = document.getElementById('clinic-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للتصدير', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>الشكوى</th><th>العلاج</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'سجل_العيادة_المدرسية', 'سجل العيادة المدرسية');
};

window.printClinicDirect = function() {
    const tbody = document.getElementById('clinic-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للطباعة', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>الشكوى</th><th>العلاج</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'سجل العيادة المدرسية');
};

// ===== واتساب — إبلاغ ولي الأمر بالعيادة =====
window.sendClinicWhatsApp = async function(studentName, classId, complaint, result) {
    try {
        const schoolId = getActiveSchoolId();
        const snap = await getDocs(query(
            collection(db,'students'),
            where('schoolId','==',schoolId),
            where('name','==',studentName),
            where('classId','==',classId)
        ));
        if(snap.empty) { window.showToast('⚠️ لم يُعثر على بيانات الطالب','warning'); return; }
        const phone = (snap.docs[0].data().parentPhone||'').replace(/\D/g,'');
        if(!phone) { window.showToast('⚠️ لا يوجد رقم هاتف لولي الأمر','warning'); return; }

        const today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
        const msg = encodeURIComponent(
            `السلام عليكم ولي أمر الطالب ${studentName}،\n` +
            `راجع ابنكم العيادة المدرسية اليوم ${today}.\n` +
            `الشكوى: ${complaint||'—'}\n` +
            `النتيجة: ${result||'—'}\n` +
            `يرجى التواصل معنا إذا احتجتم مزيداً من المعلومات.`
        );
        window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
    } catch(e) { window.showToast('❌ '+e.message,'error'); }
};