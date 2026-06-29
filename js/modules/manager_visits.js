import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initManagerVisitsModule() {
    const container = document.getElementById('tab-manager-visits');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color);">
            <h2><i class="bi bi-eye-fill"></i> الزيارات التفقدية للإدارة</h2>
            <form id="manager-visit-form" onsubmit="window.handleRegisterManagerVisitLive(event)">
                <label>الفصل</label>
                <select id="m-visit-class" required><option value="">-- اختر الفصل --</option></select>
                <label>المعلم المُزار</label>
                <select id="m-visit-teacher" required><option value="">⏳ جاري تحميل دليل المعلمين...</option></select>
                <label>الملاحظة الإدارية</label>
                <input type="text" id="m-visit-notes" placeholder="مثال: التزام بخطة الدرس، تفاعل جيد مع الطلاب" required>
                <button type="submit" style="width:100%; margin-top:10px; background:var(--primary-color); color:#fff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">بث بطاقة الزيارة</button>
            </form>
        </div>
        <div class="card" style="margin-top:20px;">
            <h3 style="font-size:14px;">سجل الزيارات</h3>
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <thead><tr style="background:#f4f6f9;"><th style="padding:8px;">الفصل</th><th style="padding:8px;">المعلم</th><th style="padding:8px;">الملاحظة</th></tr></thead>
                <tbody id="manager-visits-tbody"></tbody>
            </table>
        </div>`;

    const schoolId = getActiveSchoolId();
    const classSelect = document.getElementById('m-visit-class');
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    
    let html = '<option value="">-- اختر الفصل --</option>';
    new Set(snap.docs.map(d => d.data().classId)).forEach(c => { if(c) html += `<option value="${c}">${c}</option>`; });
    classSelect.innerHTML = html;

    loadTeacherDirectoryForVisits();
    loadManagerVisitsLogsLive();
}

async function loadTeacherDirectoryForVisits() {
    const sel = document.getElementById('m-visit-teacher');
    try {
        const schoolId = getActiveSchoolId();
        const q = query(collection(db,'users'), where('schoolId','==',schoolId), where('role','==','teacher'));
        const snap = await getDocs(q);
        const names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = names.length
            ? '<option value="">-- اختر المعلم --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('')
            : '<option value="">⚠️ لا يوجد معلمين مسجّلين</option>';
    } catch(e) { sel.innerHTML = '<option value="">❌ خطأ بالتحميل</option>'; }
}

window.handleRegisterManagerVisitLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId();
    const teacherName = document.getElementById('m-visit-teacher').value.trim();
    if(!teacherName) { alert('⚠️ يرجى اختيار المعلم'); return; }

    await addDoc(collection(db, 'manager_visits'), {
        schoolId: schoolId,
        classId: document.getElementById('m-visit-class').value,
        teacherName: teacherName,
        notes: document.getElementById('m-visit-notes').value.trim(),
        createdAt: serverTimestamp()
    });
    alert('✓ تم توثيق الزيارة بنجاح.');
    document.getElementById('manager-visit-form').reset();
};

async function loadManagerVisitsLogsLive() {
    const tbody = document.getElementById('manager-visits-tbody');
    const schoolId = getActiveSchoolId();
    const q = query(collection(db, 'manager_visits'), where('schoolId', '==', schoolId));
    
    onSnapshot(q, (snap) => {
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            html += `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">${d.classId}</td><td style="padding:8px;">أ. ${d.teacherName}</td><td style="padding:8px;">${d.notes}</td></tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">لا توجد زيارات مسجّلة بعد.</td></tr>';
    });
}
