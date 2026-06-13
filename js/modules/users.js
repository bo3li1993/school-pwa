import { db, auth, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteField, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

export async function initUsersModule() {
    const container = document.getElementById('tab-users');
    if (!container) return;
    const schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div class="card" id="migration-card" style="border-top: 5px solid var(--danger-color); background: #fffcfc; display:none;">
        <h2 style="color:var(--danger-color);"><i class="bi bi-shield-lock-fill"></i> درع الحماية: ترحيل الحسابات</h2>
        <p style="font-size:12px; color:#555; font-weight:bold; margin-bottom:15px;">
            🚨 أولوية قصوى: هذا الإجراء يحول الحسابات إلى Firebase Auth ويحذف كلمات المرور المكشوفة نهائياً.
        </p>
        <button onclick="window.migrateAllSchoolUsersLive()" style="background:var(--danger-color); font-weight:bold; font-size:13px; width:100%; padding:12px; color:white; border:none; cursor:pointer;">
            <i class="bi bi-cpu-fill"></i> ⚡ ابدأ الترحيل الفوري وتشفير حسابات المنشأة
        </button>
    </div>

    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-person-plus-fill"></i> قيد مستخدم جديد (${schoolId})</h2>
        <form id="new-user-form" onsubmit="window.handleCreateNewUserLive(event)">
            <input type="hidden" id="reg-school-id" value="${schoolId}">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                <div>
                    <label style="font-weight:700; font-size:13px;">المعرف الفريد (User ID)</label>
                    <input type="text" id="reg-user-id" placeholder="مثال: T100" required>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">الاسم الكامل</label>
                    <input type="text" id="reg-user-name" required>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">الصلاحية</label>
                    <select id="reg-user-role" required>
                        <option value="teacher">معلم</option>
                        <option value="admin">مسؤول إداري</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">كلمة المرور الابتدائية</label>
                    <input type="password" id="reg-user-pass" required>
                </div>
            </div>
            <button type="submit" style="width:100%; font-weight:bold; margin-top:10px; background:var(--primary-color); color:white; border:none; padding:10px;">اعتماد الحساب</button>
        </form>
    </div>

    <div class="card" style="border-top: 5px solid var(--hover-color);">
        <h2><i class="bi bi-people-fill"></i> سجل حسابات المدرسة</h2>
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr style="background:#f4f6f9;">
                        <th>المعرف</th><th>الاسم الرسمي</th><th>الصلاحية</th><th>الحالة</th>
                    </tr>
                </thead>
                <tbody id="system-users-tbody"></tbody>
            </table>
        </div>
    </div>`;

    loadSystemUsersDirectoryLive();
}

// ... (الدوال البرمجية تبقى كما هي، مع تعديل بسيط في الترحيل لإضافة schoolId أثناء القيد)