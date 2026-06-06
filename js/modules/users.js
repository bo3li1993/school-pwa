import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initUsersModule() {
    const container = document.getElementById('tab-users');
    if (!container) return;

    // 🛡️ جدار حماية موضعى لضمان استقرار واجهة المستخدم الإدارية ضد الكراش
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-people-fill" style="color:var(--primary-color);"></i> نظام إدارة صلاحيات المستخدمين وحسابات الهيئة التعليمية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">قم بإنشاء وتفعيل مستويات صلاحيات الدخول للمدرسة وحفظها فورياً بقاعدة البيانات الموحدة.</p>
            
            <form id="user-creation-form" onsubmit="window.handleCreateUserLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">الاسم الكامل للموظف</label>
                        <input type="text" id="user-full-name" placeholder="أدخل الاسم الثلاثي أو الرباعي" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">رقم المستخدم الافتراضي (User ID)</label>
                        <input type="text" id="user-login-id" placeholder="مثال: 6464" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">كلمة المرور الافتراضية</label>
                        <input type="text" id="user-plain-pass" placeholder="أدخل الرمز السري الفريش" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">المسمى الوظيفي والدور (Role)</label>
                        <select id="user-role-select" required>
                            <option value="teacher">teacher (معلم / هيئة تعليمية)</option>
                            <option value="admin">admin (مدير مساعد / مسؤول نظام إداري)</option>
                        </select>
                    </div>
                </div>
                <button type="submit" style="width:100%; margin-top:15px; font-weight:700;"><i class="bi bi-person-plus-fill"></i> اعتماد قيد المستخدم وتنشيط الصلاحية فورا</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--hover-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-shield-lock"></i> سجل الحسابات النشطة والمصرح لها بالدخول للمنظومة</h2>
            <div style="overflow-x:auto; margin-top:10px;">
                <table>
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>الاسم المعتمد بالمنشأة</th>
                            <th style="text-align:center;">رقم المستخدم ID</th>
                            <th style="text-align:center;">الصلاحية الدور</th>
                            <th style="text-align:center;">كلمة المرور الافتراضية</th>
                        </tr>
                    </thead>
                    <tbody id="system-users-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري فحص تصاريح الحسابات السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        
        loadSystemUsersLive();
    } catch(e) {
        container.innerHTML = `
            <div class="card" style="border-top:5px solid var(--danger-color); color:var(--danger-color); text-align:center; padding:20px; font-weight:bold;">
               ⚠️ تعذر تحميل شاشة إدارة المستخدمين: ${e.message}
            </div>`;
    }
}

window.handleCreateUserLive = async function(e) {
    e.preventDefault();
    const name = document.getElementById('user-full-name').value.trim();
    const userId = document.getElementById('user-login-id').value.trim();
    const plainPass = document.getElementById('user-plain-pass').value.trim();
    const role = document.getElementById('user-role-select').value;

    try {
        // ✨ تصحيح العلة الحرج وحفظ البيانات في الكولكشن الصحيح الموحد users مع الحقول الأربعة المطلوبة بالملي
        await addDoc(collection(db, 'users'), {
            name: name,
            userId: userId,
            plainPass: plainPass,
            role: role,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم بنجاح اعتماد الحساب السحابي للموظف: ${name}\nصلاحية الدخول الممنوحة: ${role}`);
        document.getElementById('user-creation-form').reset();
        loadSystemUsersLive();
    } catch(err) { 
        alert('خطأ مالي أثناء حفظ الحساب بالسيرفر: ' + err.message); 
    }
};

async function loadSystemUsersLive() {
    const tbody = document.getElementById('system-users-tbody');
    if(!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'users'));
        let html = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.name || '-'}</b></td>
                    <td style="text-align:center; font-weight:700;">${data.userId || '-'}</td>
                    <td style="text-align:center;"><span class="badge ${data.role === 'admin' ? 'danger' : 'info'}">${data.role === 'admin' ? 'مسؤول نظام' : 'معلم'}</span></td>
                    <td style="text-align:center; font-family:monospace; font-weight:bold; color:var(--accent-color); font-size:14px;">${data.plainPass || '-'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:15px; font-weight:bold; color:#999;">💡 لا توجد حسابات مخصصة مقيدة بالسيرفر حالياً.</td></tr>';
    } catch(e) { 
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px; font-weight:bold;">❌ تعذر جلب الحسابات النشطة من السيرفر الموحد.</td></tr>'; 
    }
}