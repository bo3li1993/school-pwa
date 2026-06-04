import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// دالة بناء وتوليد واجهة استمارة جولة الجناح اليومية
export async function initRoundsModule() {
    const container = document.getElementById('tab-rounds');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-clipboard-check-fill" style="color:var(--accent-color);"></i> استمارة الجولة الميدانية التفقديّة لمشرف الجناح اليومي</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">تستخدم هذه البطاقة لرصد الحالة العامة للمبنى المدرسي، ومتابعة انضباط الفصول، وتوثيق الملاحظات الإنشائية والتربوية فوراً.</p>
            
            <form id="wing-round-form" onsubmit="window.submitWingRoundForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم مشرف الجناح / الجولة</label>
                        <input type="text" id="r-supervisor" placeholder="أدخل اسم المشرف المسؤول" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">تحديد الجناح / الدور</label>
                        <select id="r-wing-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="الجناح الأيمن - الدور الأرضي">الجناح الأيمن - الدور الأرضي</option>
                            <option value="الجناح الأيسر - الدور الأرضي">الجناح الأيسر - الدور الأرضي</option>
                            <option value="الجناح الأيمن - الدور الأول">الجناح الأيمن - الدور الأول</option>
                            <option value="الجناح الأيسر - الدور الأول">الجناح الأيسر - الدور الأول</option>
                            <option value="المبنى العلمي والمختبرات">المبنى العلمي والمختبرات</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">حالة انضباط وهدوء الفصول</label>
                        <select id="r-discipline-status" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="ممتازة ومستقرة تماماً">ممتازة ومستقرة تماماً</option>
                            <option value="هادئة مع وجود بعض الملاحظات">هادئة مع وجود بعض الملاحظات</option>
                            <option value="غير مستقرة وتتطلب تدخل الإدارة">غير مستقرة وتتطلب تدخل الإدارة</option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">مستوى النظافة العامة للجناح</label>
                        <select id="r-cleanliness" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="ممتاز ونظيف">ممتاز ونظيف</option>
                            <option value="مقبول">مقبول</option>
                            <option value="سيء ويتطلب استدعاء العمال">سيء ويتطلب استدعاء العمال</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الملاحظات المرصودة أو الأعطال الإنشائية (إن وجدت)</label>
                        <input type="text" id="r-notes" placeholder="مثال: عطل في إضاءة ممر 2 / تكييف فصل 7/2 لا يعمل" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;">
                    </div>
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-cloud-check-fill"></i> اعتماد وحفظ تقرير الجولة الميدانية سحابياً</button>
            </form>
        </div>

        <!-- جدول أرشيف جولات الأجنحة -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--primary-color);">
            <h2><i class="bi bi-journal-text"></i> الأرشيف الزمني لجولات وتقارير مشرفي الأجنحة</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التاريخ والوقت</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">المشرف والجناح</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الانضباط والنظافة</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الملاحظات المسجلة</th>
                        </tr>
                    </thead>
                    <tbody id="rounds-archive-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري استدعاء تقارير الأجنحة السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadRoundsArchiveFromServer();
}

// دالة معالجة وحفظ تقرير الجولة بالسيرفر
window.submitWingRoundForm = async function(e) {
    e.preventDefault();
    const supervisor = document.getElementById('r-supervisor').value.trim();
    const wingId = document.getElementById('r-wing-id').value;
    const disciplineStatus = document.getElementById('r-discipline-status').value;
    const cleanliness = document.getElementById('r-cleanliness').value;
    const notes = document.getElementById('r-notes').value.trim();

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'wing_rounds'), {
            supervisor: supervisor,
            wingId: wingId,
            disciplineStatus: disciplineStatus,
            cleanliness: cleanliness,
            notes: notes,
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم اعتماد تقرير الجولة الميدانية بنجاح للمشرف (${supervisor}).`);
        document.getElementById('wing-round-form').reset();
        loadRoundsArchiveFromServer();
    } catch (err) { alert('خطأ أثناء حفظ تقرير الجناح بالسيرفر: ' + err.message); }
};

// دالة سحب وعرض أرشيف التقارير من السيرفر
async function loadRoundsArchiveFromServer() {
    const tbody = document.getElementById('rounds-archive-tbody');
    if (!tbody) return;
    try {
        const snap = await getDocs(collection(db, 'wing_rounds'));
        let html = ''; let count = 0;
        snap.forEach(docSnap => {
            count++;
            const r = docSnap.data();
            
            let disciplineColor = '#27ae60';
            if (r.disciplineStatus.includes('تدخل')) disciplineColor = '#e74c3c';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${r.date || ''}<br>${r.time || ''}</small></td>
                  <td style="padding:12px;"><b>${r.supervisor}</b><br><small style="color:#666; font-weight:bold;">${r.wingId}</small></td>
                  <td style="padding:12px;">
                    <span style="font-size:11px; display:block; color:${disciplineColor}; font-weight:bold;">• الانضباط: ${r.disciplineStatus}</span>
                    <span style="font-size:11px; display:block; color:#555; font-weight:bold;">• النظافة: ${r.cleanliness}</span>
                  </td>
                  <td style="padding:12px;"><small style="color:var(--danger-color); font-weight:bold;">${r.notes || 'لا يوجد ملاحظات ✓'}</small></td>
                </tr>
            `;
        });
        tbody.innerHTML = count === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">لا توجد تقارير جولات مؤرشفة حالياً.</td></tr>' : html;
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">خطأ في تحميل أرشيف الأجنحة.</td></tr>'; }
}