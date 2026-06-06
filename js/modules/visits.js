// 🏫 موديل تسجيل الزيارات الفنية للموجهين ورؤساء الأقسام - كولكشن موحد technical_visits
import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initVisitsModule() {
    const container = document.getElementById('tab-visits');
    if (!container) return;

    // 🛡️ جدار حماية وعزل الأخطاء (Error Boundary)
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-journal-check" style="color:var(--accent-color);"></i> توثيق ورصد الزيارات الفنية للهيئة التعليمية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
                🔒 تم توحيد اسم الكولكشن إلى technical_visits ليتوافق مع محرك كفاءة الأداء والتقارير الأسبوعية بالملي.
            </p>
            
            <form id="tech-visit-form" onsubmit="window.handleRegisterTechVisitLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">اسم المعلم المزار</label>
                        <input type="text" id="visit-teacher-name" placeholder="أدخل اسم المعلم الثلاثي" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">المادة الدراسيّة / القسم الفني</label>
                        <select id="visit-subject" required>
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
                        <input type="text" id="visit-visitor-name" placeholder="رئيس القسم أو الموجه الفني" required>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">توصيات الزيارة الفنية وأبرز الملاحظات</label>
                    <input type="text" id="visit-notes" placeholder="اكتب التوجيه الفني المرصود للمعلم..." required>
                </div>
                
                <button type="submit" style="width:100%; background:var(--accent-color); font-weight:700; margin-top:5px;"><i class="bi bi-cloud-plus-fill"></i> قيد وتوثيق الزيارة الفنية سحابياً</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-archive-fill"></i> أرشيف الزيارات الفنية المرصودة بالمدرسة</h2>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>المعلم المزار</th>
                            <th style="text-align:center;">القسم / المادة</th>
                            <th>الموجه / رئيس القسم</th>
                            <th>التوصيات المرصودة</th>
                        </tr>
                    </thead>
                    <tbody id="tech-visits-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري جلب الأرشيف الفني...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        loadTechVisitsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ خطأ في موديل الزيارات: ${e.message}</div>`;
    }
}

window.handleRegisterTechVisitLive = async function(e) {
    e.preventDefault();
    const tName = document.getElementById('visit-teacher-name').value.trim();
    const subject = document.getElementById('visit-subject').value;
    const vName = document.getElementById('visit-visitor-name').value.trim();
    const notes = document.getElementById('visit-notes').value.trim();

    try {
        // ✨ حل خطأ التقرير والتخزين الصارم في كولكشن technical_visits
        await addDoc(collection(db, 'technical_visits'), {
            teacherName: tName,
            subject: subject,
            visitorName: vName,
            notes: notes,
            createdAt: serverTimestamp()
        });
        alert('✓ تم توثيق الزيارة الفنية بنجاح في السجل السحابي الموحد.');
        document.getElementById('tech-visit-form').reset();
        loadTechVisitsLive();
    } catch(err) {
        alert('خطأ سحابي: ' + err.message);
    }
};

async function loadTechVisitsLive() {
    const tbody = document.getElementById('tech-visits-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'technical_visits'));
        let html = '';
        
        snap.forEach(d => {
            const data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.teacherName || '-'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.subject || '-'}</span></td>
                    <td><i class="bi bi-person-badge"></i> ${data.visitorName || '-'}</td>
                    <td style="color:#555; font-size:12px; font-weight:700;">${data.notes || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 الأرشيف الفني خالي حالياً.</td></tr>';
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 بانتظار قيد أول زيارة فنية لتنشيط الأرشيف.</td></tr>';
    }
}