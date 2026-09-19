import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initUsersModule() {
    const container = document.getElementById('tab-users');
    if (!container) return;
    const schoolId = getActiveSchoolId();

    container.innerHTML = `
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
            <button type="submit" style="width:100%; font-weight:bold; margin-top:10px; background:var(--primary-color); color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">اعتماد الحساب</button>
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
                <tbody id="system-users-tbody">
                    <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري تحميل الحسابات...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;

    loadSystemUsersDirectoryLive();
}

window.handleCreateNewUserLive = async function (e) {
    e.preventDefault();

    const schoolId = document.getElementById('reg-school-id').value.trim();
    const userId = document.getElementById('reg-user-id').value.trim();
    const name = document.getElementById('reg-user-name').value.trim();
    const role = document.getElementById('reg-user-role').value;
    const plainPass = document.getElementById('reg-user-pass').value.trim();

    if (!schoolId) {
        alert('⚠️ خطأ: لا يوجد schoolId نشط لهذا الحساب، لا يمكن إضافة المستخدم.');
        return;
    }
    if (!userId || !name || !plainPass) {
        alert('⚠️ الرجاء تعبئة جميع الحقول.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري الحفظ...';

    try {
        // تحقق من عدم تكرار المعرف داخل نفس المدرسة
        const dupCheck = query(
            collection(db, 'users'),
            where('schoolId', '==', schoolId),
            where('userId', '==', userId)
        );
        const dupSnap = await getDocs(dupCheck);
        if (!dupSnap.empty) {
            alert(`⚠️ المعرف "${userId}" مستخدم بالفعل في هذه المدرسة.`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'اعتماد الحساب';
            return;
        }

        await addDoc(collection(db, 'users'), {
            schoolId: schoolId,
            userId: userId,
            name: name,
            role: role,
            plainPass: plainPass,
            status: 'active',
            createdAt: serverTimestamp()
        });

        alert(`✅ تم اعتماد حساب "${name}" بنجاح.`);
        document.getElementById('new-user-form').reset();
        loadSystemUsersDirectoryLive();
    } catch (err) {
        alert('❌ تعذر إضافة المستخدم: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'اعتماد الحساب';
    }
};

async function loadSystemUsersDirectoryLive() {
    const tbody = document.getElementById('system-users-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId();
    if (!schoolId) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">⚠️ لا يوجد schoolId نشط — لا يمكن جلب الحسابات.</td></tr>';
        return;
    }

    try {
        const q = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        const snap = await getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; font-weight:bold; color:#999;">💡 لا يوجد مستخدمين مقيدين بهذه المدرسة.</td></tr>';
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const roleLabel = u.role === 'admin' ? 'مسؤول إداري'
                : u.role === 'assistant_manager' ? 'مساعد مدير'
                : u.role === 'wing_supervisor' ? 'مشرف جناح'
                : u.role === 'social_worker' ? 'أخصائي اجتماعي'
                : u.role === 'guard' ? 'حارس'
                : 'معلم';
            const statusLabel = u.status === 'suspended' ? '⏸ موقوف' : '✅ فعّال';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:700;">${u.userId || '-'}</td>
                    <td>${u.name || '-'}</td>
                    <td>${roleLabel}</td>
                    <td>${statusLabel}</td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:15px; font-weight:bold;">❌ تعذر جلب الحسابات: ${e.message}</td></tr>`;
    }
}
