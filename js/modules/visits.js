import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initVisitsModule() {
    const container = document.getElementById('tab-visits');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-journal-check" style="color:var(--accent-color);"></i> توثيق ورصد الزيارات الفنية للهيئة التعليمية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">نظام التوثيق السحابي لزيارات الموجهين الفنيين.</p>
            
            <form id="tech-visit-form" onsubmit="window.handleRegisterTechVisitLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">اسم المعلم المزار</label>
                        <input type="text" id="visit-teacher-name" placeholder="أدخل اسم المعلم الثلاثي" required style="width:100%; padding:8px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">المادة الدراسيّة / القسم الفني</label>
                        <select id="visit-subject" required style="width:100%; padding:8px;">
                            <option value="التربية الإسلامية">التربية الإسلامية</option>
                            <option value="اللغة العربية">اللغة العربية</option>
                            <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                            <option value="الرياضيات">الرياضيات</option>
                            <option value="العلوم">العلوم</option>
                            <option value="الحاسوب">الحاسوب</option>
                            <option value="الاجتماعيات">الاجتماعيات</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">اسم الموجه الفني / الزائر</label>
                        <input type="text" id="visit-visitor-name" placeholder="رئيس القسم أو الموجه" required style="width:100%; padding:8px;">
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">توصيات الزيارة الفنية وأبرز الملاحظات</label>
                    <input type="text" id="visit-notes" placeholder="اكتب التوجيه الفني..." required style="width:100%; padding:8px;">
                </div>
                <button type="submit" style="width:100%; background:var(--accent-color); color:#fff; font-weight:700; margin-top:10px; border:none; padding:10px; border-radius:5px;"><i class="bi bi-cloud-plus-fill"></i> توثيق الزيارة سحابياً</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; margin-top:20px;">
            <h2><i class="bi bi-archive-fill"></i> أرشيف الزيارات الفنية</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead style="background:#f8f9fa;">
                        <tr><th style="padding:10px;">المعلم المزار</th><th style="padding:10px;">المادة</th><th style="padding:10px;">الموجه</th><th style="padding:10px;">التاريخ</th></tr>
                    </thead>
                    <tbody id="tech-visits-tbody"></tbody>
                </table>
            </div>
        </div>`;

    loadTechVisitsLive();
}

window.handleRegisterTechVisitLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId();
    await addDoc(collection(db, 'technical_visits'), {
        schoolId: schoolId,
        teacherName: document.getElementById('visit-teacher-name').value.trim(),
        subject: document.getElementById('visit-subject').value,
        visitorName: document.getElementById('visit-visitor-name').value.trim(),
        notes: document.getElementById('visit-notes').value.trim(),
        date: new Date().toLocaleDateString('ar-KW'),
        createdAt: serverTimestamp()
    });
    alert('✓ تم التوثيق بنجاح.');
    document.getElementById('tech-visit-form').reset();
};

async function loadTechVisitsLive() {
    const tbody = document.getElementById('tech-visits-tbody');
    const schoolId = getActiveSchoolId();
    const q = query(collection(db, 'technical_visits'), where('schoolId', '==', schoolId));
    
    onSnapshot(q, (snap) => {
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            html += `<tr><td style="padding:10px;">${data.teacherName}</td><td style="padding:10px;">${data.subject}</td><td style="padding:10px;">${data.visitorName}</td><td style="padding:10px;">${data.date || '-'}</td></tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center;">لا توجد زيارات.</td></tr>';
    });
}