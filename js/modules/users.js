import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// 🔐 تشفير كلمة المرور محلياً بالمتصفح قبل الإرسال
async function sha256Hash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
                    <select id="reg-user-role" required onchange="window.toggleDepartmentField(this.value)">
                        <option value="teacher">معلم</option>
                        <option value="admin">مسؤول إداري (مدير)</option>
                        <option value="assistant_manager">مساعد مدير</option>
                        <option value="wing_supervisor">مشرف جناح</option>
                        <option value="social_worker">أخصائي اجتماعي</option>
                        <option value="department_head">رئيس قسم</option>
                        <option value="guard">حارس</option>
                    </select>
                </div>
                <div id="dept-field-wrapper" style="display:none;">
                    <label style="font-weight:700; font-size:13px;">القسم</label>
                    <select id="reg-user-department">
                        <option value="">-- اختر القسم --</option>
                        <option value="لغة عربية">لغة عربية</option>
                        <option value="لغة إنجليزية">لغة إنجليزية</option>
                        <option value="رياضيات">رياضيات</option>
                        <option value="علوم">علوم</option>
                        <option value="اجتماعيات">اجتماعيات</option>
                        <option value="تربية إسلامية">تربية إسلامية</option>
                        <option value="تربية فنية">تربية فنية</option>
                        <option value="تربية بدنية">تربية بدنية</option>
                        <option value="حاسب آلي">حاسب آلي</option>
                        <option value="مهارات حياتية">مهارات حياتية</option>
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
                        <th>المعرف</th><th>الاسم الرسمي</th><th>الصلاحية</th><th>الحالة</th><th>الأمان</th><th>إجراء</th>
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

window.toggleDepartmentField = function(role) {
    const wrapper = document.getElementById('dept-field-wrapper');
    if (!wrapper) return;
    wrapper.style.display = (role === 'department_head' || role === 'teacher') ? 'block' : 'none';
};

window.handleCreateNewUserLive = async function (e) {
    e.preventDefault();

    const schoolId = document.getElementById('reg-school-id').value.trim();
    const userId = document.getElementById('reg-user-id').value.trim();
    const name = document.getElementById('reg-user-name').value.trim();
    const role = document.getElementById('reg-user-role').value;
    const department = document.getElementById('reg-user-department')?.value.trim() || '';
    const plainPass = document.getElementById('reg-user-pass').value.trim();

    if (!schoolId) {
        window.showToast('⚠️ خطأ: لا يوجد schoolId نشط لهذا الحساب، لا يمكن إضافة المستخدم.');
        return;
    }
    if (!userId || !name || !plainPass) {
        window.showToast('⚠️ الرجاء تعبئة جميع الحقول.');
        return;
    }
    if (role === 'department_head' && !department) {
        window.showToast('⚠️ يرجى اختيار القسم لرئيس القسم.');
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
            window.showToast(`⚠️ المعرف "${userId}" مستخدم بالفعل في هذه المدرسة.`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'اعتماد الحساب';
            return;
        }

        // 🔐 تشفير كلمة المرور بـ SHA-256 قبل الحفظ (بدل تخزينها نصاً صريحاً)
        const passHash = await sha256Hash(plainPass);

        await addDoc(collection(db, 'users'), {
            schoolId: schoolId,
            userId: userId,
            name: name,
            role: role,
            department: department,
            passHash: passHash,
            status: 'active',
            createdAt: serverTimestamp()
        });

        window.showToast(`✅ تم اعتماد حساب "${name}" بنجاح.`);
        document.getElementById('new-user-form').reset();
        loadSystemUsersDirectoryLive();
    } catch (err) {
        window.showToast('❌ تعذر إضافة المستخدم: ' + err.message);
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
                : u.role === 'department_head' ? `رئيس قسم${u.department ? ' - ' + u.department : ''}`
                : u.role === 'guard' ? 'حارس'
                : 'معلم';
            const statusLabel = u.status === 'suspended' ? '⏸ موقوف' : '✅ فعّال';
            const securityBadge = u.passHash ? '<span style="color:var(--success-color); font-size:11px;">🔒 مشفّرة</span>' : '<span style="color:var(--danger-color); font-size:11px;">⚠️ قديمة</span>';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:700;">${u.userId || '-'}</td>
                    <td>${u.name || '-'}</td>
                    <td>${roleLabel}</td>
                    <td>${statusLabel}</td>
                    <td>${securityBadge}</td>
                    <td>
                        <button onclick="window.openResetPasswordModal('${docSnap.id}', '${(u.name||'').replace(/'/g,"\\'")}')"
                            style="background:var(--sky); color:#fff; border:none; padding:5px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-size:11px;">
                            <i class="bi bi-key-fill"></i> إعادة تعيين
                        </button>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:15px; font-weight:bold;">❌ تعذر جلب الحسابات: ${e.message}</td></tr>`;
    }
}

// ===== إعادة تعيين كلمة مرور موظف (Admin فقط، عبر Cloud Function آمنة) =====
window.openResetPasswordModal = function(userDocId, userName) {
    const newPass = prompt(`أدخل كلمة المرور الجديدة للموظف: ${userName}`);
    if (!newPass) return;
    if (newPass.length < 4) { window.showToast('⚠️ كلمة المرور قصيرة جداً (4 أحرف على الأقل)', 'info'); return; }

    window.executeResetPassword(userDocId, newPass, userName);
};

window.executeResetPassword = async function(userDocId, newPass, userName) {
    try {
        const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        const { auth } = await import('../firebase-config.js');
        const functions = getFunctions(auth.app);
        const resetFn = httpsCallable(functions, 'resetUserPassword');

        await resetFn({ userDocId, newPassword: newPass });
        window.showToast(`✅ تم تحديث كلمة مرور ${userName} بنجاح`);
        loadSystemUsersDirectoryLive();
    } catch (e) {
        window.showToast('❌ خطأ: ' + e.message, 'error');
    }
};
