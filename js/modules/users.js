import { db, firebaseConfig } from '../firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
// استدعاء مكتبات قوقل الرسمية لتشفير الحسابات وإنشاء مستخدمين حقيقيين
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

export async function initUsersModule() {
    const container = document.getElementById('tab-users');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-shield-check" style="color:var(--success-color);"></i> نظام الحماية الرقمي - تشفير وقيد حسابات المعلمين</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
                🔒 النظام مرتب مع Firebase Authentication؛ سيتم تشفير كلمة المرور فوراً وتحويل المعرّف لإيميل رسمي بالخلفية.
            </p>
            
            <form id="user-creation-form" onsubmit="window.handleCreateUserLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">الاسم الكامل للموظف</label>
                        <input type="text" id="user-full-name" placeholder="أدخل الاسم الثلاثي أو الرباعي" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">رقم الدخول / المعرف (Login ID)</label>
                        <input type="text" id="user-login-id" placeholder="مثال: 6464" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">كلمة المرور الأمنية (6 خانات أو أكثر)</label>
                        <input type="password" id="user-plain-pass" placeholder="أدخل رمز الحماية السري" minlength="6" required>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">المسمى الوظيفي والصلاحية (Role)</label>
                        <select id="user-role-select" required>
                            <option value="teacher">teacher (معلم / هيئة تعليمية)</option>
                            <option value="admin">admin (مدير مساعد / مسؤول نظام إداري)</option>
                        </select>
                    </div>
                </div>
                <button type="submit" style="width:100%; margin-top:15px; font-weight:700; background:var(--success-color);"><i class="bi bi-lock-fill"></i> تشفير الحساب وإطلاق الصلاحية بالسيرفر</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-shield-lock"></i> سجل الحسابات النشطة والمحمية بالمنظومة</h2>
            <div style="overflow-x:auto; margin-top:10px;">
                <table>
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>الاسم المعتمد بالمنشأة</th>
                            <th style="text-align:center;">رقم المستخدم ID</th>
                            <th style="text-align:center;">الإيميل الرسمي الافتراضي بالخلفية</th>
                            <th style="text-align:center;">الصلاحية الدور</th>
                        </tr>
                    </thead>
                    <tbody id="system-users-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري فحص جدار الحماية وقراءة الحسابات...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        
        loadSystemUsersLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ خطأ: ${e.message}</div>`;
    }
}

window.handleCreateUserLive = async function(e) {
    e.preventDefault();
    const name = document.getElementById('user-full-name').value.trim();
    const userId = document.getElementById('user-login-id').value.trim();
    const pass = document.getElementById('user-plain-pass').value.trim();
    const role = document.getElementById('user-role-select').value;

    if(pass.length < 6) {
        alert("⚠️ خطأ أمني: يشترط الفايربيس أن تكون كلمة المرور 6 خانات أو أكثر لحماية الحساب.");
        return;
    }

    // ⚡ السحر هني: تحويل الرقم ميكانيكياً لإيميل افتراضي يتقبله نظام الحماية العالمي قوقل
    const virtualEmail = `${userId}@hosainan.school`;

    alert('⏳ جاري تسجيل المعلم بتشفير غوغل العالمي ومنع التداخل...');

    try {
        // 🔥 الخدعة الهندسية: إنشاء اتصال فرعي مؤقت بالخلفية لمنع طرد الأدمين الحالي من لوحته
        const tempAppName = "TempApp_" + Date.now();
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        // 1. تسجيل الحساب رسمياً بـ Firebase Authentication المشفر والمحمي
        await createUserWithEmailAndPassword(tempAuth, virtualEmail, pass);

        // 2. قيد تفاصيل الدور والصلاحية بـ Firestore بجدول users
        await addDoc(collection(db, 'users'), {
            name: name,
            userId: userId,
            email: virtualEmail,
            role: role,
            createdAt: serverTimestamp()
            // 💡 تم إلغاء الـ plainPass نهائياً لحماية خصوصية وسلامة بيانات المعلمين!
        });

        alert(`✓ تم بنجاح تشفير حساب الموظف: ${name}\nالحساب الحين مؤمن 100% بسيرفرات غوغل الحماية.`);
        document.getElementById('user-creation-form').reset();
        loadSystemUsersLive();
    } catch(err) { 
        alert('❌ تعذر تشفير الحساب: ' + err.message); 
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
                    <td style="text-align:center; font-weight:700; color:var(--primary-color);">${data.userId || '-'}</td>
                    <td style="text-align:center; font-family:monospace; color:#666;">${data.email || `${data.userId}@hosainan.school`}</td>
                    <td style="text-align:center;"><span class="badge ${data.role === 'admin' ? 'danger' : 'info'}">${data.role === 'admin' ? 'مسؤول نظام' : 'معلم'}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:15px; font-weight:bold; color:#999;">💡 لا يوجد مستخدمين مقيدين.</td></tr>';
    } catch(e) { 
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px; font-weight:bold;">❌ تعذر جلب الحسابات المحمية.</td></tr>'; 
    }
}