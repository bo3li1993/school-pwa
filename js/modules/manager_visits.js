import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initManagerVisitsModule() {
    const container = document.getElementById('tab-manager-visits');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); padding:20px; border-radius:12px;">
            <h2><i class="bi bi-eye-fill"></i> الزيارات التفقدية للإدارة</h2>
            <form id="manager-visit-form" onsubmit="window.handleRegisterManagerVisitLive(event)">
                <select id="m-visit-class" required style="width:100%; padding:8px; margin-bottom:10px;"><option value="">-- اختر الفصل --</option></select>
                <input type="text" id="m-visit-teacher" placeholder="اسم المعلم" required style="width:100%; padding:8px; margin-bottom:10px;">
                <input type="text" id="m-visit-notes" placeholder="الملاحظة الإدارية" required style="width:100%; padding:8px;">
                <button type="submit" style="width:100%; margin-top:10px;">بث بطاقة الزيارة</button>
            </form>
        </div>
        <div class="card" style="margin-top:20px; padding:20px;">
            <table style="width:100%"><tbody id="manager-visits-tbody"></tbody></table>
        </div>`;

    const schoolId = getActiveSchoolId();
    const classSelect = document.getElementById('m-visit-class');
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    
    let html = '<option value="">-- اختر الفصل --</option>';
    new Set(snap.docs.map(d => d.data().classId)).forEach(c => { if(c) html += `<option value="${c}">${c}</option>`; });
    classSelect.innerHTML = html;

    loadManagerVisitsLogsLive();
}

window.handleRegisterManagerVisitLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId();
    await addDoc(collection(db, 'manager_visits'), {
        schoolId: schoolId,
        classId: document.getElementById('m-visit-class').value,
        teacherName: document.getElementById('m-visit-teacher').value.trim(),
        notes: document.getElementById('m-visit-notes').value.trim(),
        createdAt: serverTimestamp()
    });
    alert('تم التوثيق لايف!');
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
            html += `<tr><td>${d.classId}</td><td>${d.teacherName}</td><td>${d.notes}</td></tr>`;
        });
        tbody.innerHTML = html;
    });
}