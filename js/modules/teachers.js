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

// دالة بناء واجهة دليل الهيكل الوظيفي للمعلمين
export async function initTeachersModule() {
    const container = document.getElementById('tab-teacher-directory');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-person-lines-fill"></i> نظام تسجيل وتوثيق بيانات أعضاء الهيئة التعليمية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى إدخال بيانات المعلم بدقة لإضافته إلى دليل الأقسام المدرسية المعتمد.</p>
            
            <form id="teacher-add-form" onsubmit="window.submitTeacherAddForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم المعلم ثلاثياً أو رباعياً</label>
                        <input type="text" id="t-name" placeholder="أدخل اسم المعلم" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">التخصص / القسم الفني</label>
                        <select id="t-dept" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="">اختر القسم التابع له</option>
                            <option value="التربية الإسلامية">التربية الإسلامية</option>
                            <option value="اللغة العربية">اللغة العربية</option>
                            <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                            <option value="الرياضيات">الرياضيات</option>
                            <option value="العلوم">العلوم</option>
                            <option value="الاجتماعيات">الاجتماعيات</option>
                            <option value="الحاسوب">الحاسوب</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">رقم الهاتف الجوال</label>
                        <input type="text" id="t-phone" placeholder="رقم التواصل الرسمي" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-person-plus-fill"></i> اعتماد وإدراج المعلم في الدليل الرقمي</button>
            </form>
        </div>

        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--accent-color);">
            <h2><i class="bi bi-address-card-fill"></i> دليل الهيئة التعليمية والأقسام الفنية للمدرسة</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">تاريخ القيد</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم المعلم</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">القسم الفني</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">رقم التواصل</th>
                        </tr>
                    </thead>
                    <tbody id="teachers-directory-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري استدعاء سجلات المعلمين...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadTeachersDirectoryFromServer();
}

// دالة حفظ المدرس اليديد بالسيرفر
window.submitTeacherAddForm = async function(e) {
    e.preventDefault();
    const name = document.getElementById('t-name').value.trim();
    const dept = document.getElementById('t-dept').value;
    const phone = document.getElementById('t-phone').value.trim();
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'teachers'), {
            name: name,
            dept: dept,
            phone: phone,
            dateAdded: currentDate,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم إدراج المعلم (${name}) بنجاح في دليل المدرسة.`);
        document.getElementById('teacher-add-form').reset();
        loadTeachersDirectoryFromServer();
    } catch (err) { alert('خطأ أثناء حفظ بيانات المعلم: ' + err.message); }
};

// دالة جلب وعرض المدرسين بالجدول
async function loadTeachersDirectoryFromServer() {
    const tbody = document.getElementById('teachers-directory-tbody');
    if (!tbody) return;
    try {
        const snap = await getDocs(collection(db, 'teachers'));
        let html = ''; let count = 0;
        snap.forEach(docSnap => {
            count++;
            const t = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${t.dateAdded || '-'}</small></td>
                  <td style="padding:12px;"><b>أ. ${t.name}</b></td>
                  <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${t.dept}</span></td>
                  <td style="padding:12px; font-weight:bold; color:#e67e22;">${t.phone}</td>
                </tr>
            `;
        });
        tbody.innerHTML = count === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">لا يوجد معلمين مسجلين في الدليل حالياً.</td></tr>' : html;
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">خطأ في جلب بيانات الدليل.</td></tr>'; }
}