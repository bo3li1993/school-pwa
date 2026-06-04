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

// دالة بناء وتوليد واجهة إدارة المستخدمين والصلاحيات المدرسية
export async function initUsersModule() {
    const container = document.getElementById('tab-users');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-people-fill" style="color:var(--accent-color);"></i> نظام إدارة مستخدمي المنظومة ومنح الصلاحيات المشتركة</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">تستخدم هذه الشاشة من قبل الإدارة العليا لإنشاء حسابات العاملين بالمنشأة وتحديد مستوى صلاحيات الدخول الأمني.</p>
            
            <form id="user-add-form" onsubmit="window.submitUserCreationForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الموظف / المستخدم الكامل</label>
                        <input type="text" id="u-full-name" placeholder="أدخل الاسم ثلاثياً" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">المسمى الوظيفي والدور بالمنظومة</label>
                        <select id="u-role" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="مدير مساعد / مسؤول إداري">مدير مساعد / مسؤول إداري</option>
                            <option value="رئيس قسم فني">رئيس قسم فني</option>
                            <option value="أخصائي اجتماعي / نفسي">أخصائي اجتماعي / نفسي</option>
                            <option value="حارس أمن السلامة">حارس أمن السلامة</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">كلمة المرور الافتراضية للدخول</label>
                        <input type="text" id="u-password" placeholder="أدخل رمز الدخول المبدئي" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:center; font-family:monospace;">
                    </div>
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-person-check-fill"></i> اعتماد قيد المستخدم وتفعيل الصلاحية فوراً</button>
            </form>
        </div>

        <!-- جدول استعراض حسابات المنظومة النشطة -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--accent-color);">
            <h2><i class="bi bi-shield-lock-fill"></i> سجل الحسابات النشطة ومستويات الوصول الأمنية المعتمدة</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">تاريخ التفعيل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم المستخدم الكامل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">المسمى الوظيفي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">رمز المرور</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">حالة الوصول</th>
                        </tr>
                    </thead>
                    <tbody id="system-users-archive-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري مراجعة الأذونات السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadSystemUsersFromServer();
}

// دالة إنشاء وحفظ الحساب الجديد بالسيرفر
window.submitUserCreationForm = async function(e) {
    e.preventDefault();
    const fullName = document.getElementById('u-full-name').value.trim();
    const role = document.getElementById('u-role').value;
    const password = document.getElementById('u-password').value.trim();
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'system_users'), {
            name: fullName,
            role: role,
            password: password,
            dateCreated: currentDate,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم بنجاح إنشاء وتفعيل حساب الموظف (${fullName}) بصفة: ${role}.`);
        document.getElementById('user-add-form').reset();
        loadSystemUsersFromServer();
    } catch (err) { alert('خطأ أثناء حفظ الحساب السحابي: ' + err.message); }
};

// دالة جلب وعرض الحسابات النشطة من السيرفر
async function loadSystemUsersFromServer() {
    const tbody = document.getElementById('system-users-archive-tbody');
    if (!tbody) return;
    try {
        const snap = await getDocs(collection(db, 'system_users'));
        let html = ''; let count = 0;
        snap.forEach(docSnap => {
            count++;
            const u = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${u.dateCreated || '-'}</small></td>
                  <td style="padding:12px;"><b>${u.name}</b></td>
                  <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${u.role}</span></td>
                  <td style="padding:12px; text-align:center;"><code style="background:#fff3cd; color:#856404; padding:2px 6px; border-radius:4px; font-weight:bold;">${u.password}</code></td>
                  <td style="padding:12px; text-align:center;"><span class="badge success" style="background:#27ae60;"><i class="bi bi-shield-check"></i> نشط ومصرح</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">لا توجد حسابات إضافية مسجلة حالياً.</td></tr>' : html;
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ في جلب تصاريح المستخدمين.</td></tr>'; }
}