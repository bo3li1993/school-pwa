import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGatepassModule() {
    const container = document.getElementById('tab-gatepass');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-ticket-perforated-fill" style="color:var(--accent-color);"></i> حقيبة تصاريح الاستئذان والخروج المبكر للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">إصدار إلكتروني فوري لبطاقة الاستئذان المعتمدة.</p>
            
            <form id="gatepass-reg-form" onsubmit="window.handleRegisterGatepassLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="gate-class-select" onchange="window.handleGateClassChange(this.value)" required style="width:100%; padding:8px;">
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب المستأذن</label>
                        <select id="gate-student-select" disabled required style="width:100%; padding:8px;">
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. صلة قرابة المستلم</label>
                        <select id="gate-relative" required style="width:100%; padding:8px;">
                            <option value="الأب شخصياً">👨 الأب شخصياً</option>
                            <option value="الأم شخصياً">👩 الأم شخصياً</option>
                            <option value="قريب من الدرجة الأولى">👥 قريب من الدرجة الأولى</option>
                            <option value="سائق العائلة بتفويض">🚗 سائق العائلة بتفويض</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">سبب الاستئذان الرسمي</label>
                    <select id="gate-reason" onchange="window.handleGateReasonChange(this.value)" required style="width:100%; padding:8px;">
                        <option value="">-- اختر السبب --</option>
                        <option value="مراجعة مستشفى / عيادة">🏥 مراجعة مستشفى / عيادة</option>
                        <option value="موعد طبي مسبق">📅 موعد طبي مسبق</option>
                        <option value="ظرف عائلي طارئ">👨‍👩‍👧 ظرف عائلي طارئ</option>
                        <option value="إجراء حكومي رسمي">🏛️ إجراء حكومي رسمي (جوازات/أحوال مدنية)</option>
                        <option value="مشاركة بمناسبة خارجية">🎤 مشاركة بمناسبة أو فعالية خارجية</option>
                        <option value="أخرى">📌 أخرى (حدد السبب)</option>
                    </select>
                    <input type="text" id="gate-reason-other" placeholder="اكتب السبب بالتفصيل..." style="width:100%; padding:8px; margin-top:8px; display:none;">
                </div>
                
                <button type="submit" style="width:100%; background:var(--accent-color); color:#fff; border:none; padding:10px; font-weight:700; margin-top:10px; cursor:pointer; border-radius:5px;"><i class="bi bi-printer-fill"></i> اعتماد وحفظ تصريح الخروج السحابي</button>
            </form>
        </div>

        
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button onclick="window.printGatepassPDF()" 
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
                </button>
                <button onclick="window.printGatepassDirect()" 
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> طباعة مباشرة
                </button>
            </div>
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; margin-top:20px;">
            <h2><i class="bi bi-door-open"></i> كشف الطلاب المخرجين بتصاريح اليوم</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr style="background:#f8f9fa;"><th style="padding:10px;">الطالب</th><th style="padding:10px;">الفصل</th><th style="padding:10px;">المستلم</th><th style="padding:10px;">السبب</th></tr></thead>
                    <tbody id="gatepass-logs-tbody"><tr><td colspan="4" style="text-align:center; padding:15px;">جاري جلب البيانات...</td></tr></tbody>
                </table>
            </div>
        </div>`;

        // تهيئة الفصول
        const classSelect = document.getElementById('gate-class-select');
        const schoolId = getActiveSchoolId();
        // جلب الطلاب والتصاريح بالتوازي
    const [stuSnap] = await Promise.all([
        getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)))
    ]);
    const snap = stuSnap;
        
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadGatepassLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center;">⚠️ تعذر تحميل الموديل: ${e.message}</div>`;
    }
}

window.handleGateClassChange = async function(classId) {
    const studentSelect = document.getElementById('gate-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    const schoolId = getActiveSchoolId();
    studentSelect.innerHTML = '<option value="">⏳ جاري سحب الأسماء...</option>';
    
    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        const snap = await getDocs(q);
        
        let arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ الفصل خالي</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ بالشبكة</option>';
    }
};

window.handleGateReasonChange = function(value) {
    const otherInput = document.getElementById('gate-reason-other');
    if (value === 'أخرى') {
        otherInput.style.display = 'block';
        otherInput.required = true;
    } else {
        otherInput.style.display = 'none';
        otherInput.required = false;
    }
};

window.handleRegisterGatepassLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId();
    const reasonSelect = document.getElementById('gate-reason').value;
    const finalReason = reasonSelect === 'أخرى' ? document.getElementById('gate-reason-other').value.trim() : reasonSelect;

    if(!finalReason) { window.showToast('⚠️ يرجى تحديد سبب الاستئذان'); return; }

    await addDoc(collection(db, 'gatepass'), {
        schoolId: schoolId,
        studentName: document.getElementById('gate-student-select').value,
        classId: document.getElementById('gate-class-select').value,
        relative: document.getElementById('gate-relative').value,
        reason: finalReason,
        createdAt: serverTimestamp()
    });
    window.showToast('✓ تم حفظ واعتماد التصريح!');
        // إبلاغ تلقائي عبر واتساب
        const studentSel = document.getElementById('gate-student-select');
        const classSel   = document.getElementById('gate-class-select');
        const reasonSel  = document.getElementById('gate-reason');
        const now = new Date().toLocaleTimeString('ar-KW',{hour:'2-digit',minute:'2-digit'});
        window.sendGatepassWhatsApp(
            studentSel?.value||'',
            classSel?.value||'',
            reasonSel?.value||'',
            now
        );
    document.getElementById('gatepass-reg-form').reset();
    document.getElementById('gate-reason-other').style.display = 'none';
    loadGatepassLogsLive();
};

async function loadGatepassLogsLive() {
    const tbody = document.getElementById('gatepass-logs-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId();
    const snap = await getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId)));
    
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        html += `<tr><td style="padding:10px;">${data.studentName}</td><td style="padding:10px;">${data.classId}</td><td style="padding:10px;">${data.relative}</td><td style="padding:10px;">${data.reason}</td></tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center;">لا يوجد استئذان اليوم.</td></tr>';
}
// ===== طباعة السجل =====
window.printGatepassPDF = async function() {
    const tbody = document.getElementById('gatepass-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للتصدير', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>الطالب</th><th>الفصل</th><th>السبب</th><th>المستلم</th><th>الحالة</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'سجل_تصاريح_الاستئذان', 'سجل تصاريح الاستئذان');
};

window.printGatepassDirect = function() {
    const tbody = document.getElementById('gatepass-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للطباعة', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>الطالب</th><th>الفصل</th><th>السبب</th><th>المستلم</th><th>الحالة</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'سجل تصاريح الاستئذان');
};

// ===== واتساب — إبلاغ ولي الأمر بالاستئذان =====
window.sendGatepassWhatsApp = async function(studentName, classId, reason, time) {
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
            `نُعلمكم بأن ابنكم غادر المدرسة بتاريخ ${today} الساعة ${time||'—'}.\n` +
            `السبب: ${reason||'—'}`
        );
        window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
    } catch(e) { window.showToast('❌ '+e.message,'error'); }
};