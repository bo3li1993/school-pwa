import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const ROLES = {
    admin: 'مدير',
    assistant_manager: 'مدير مساعد',
    wing_supervisor: 'مشرف جناح',
    department_head: 'رئيس قسم',
    social_worker: 'أخصائي اجتماعي',
    nurse: 'ممرض/ة',
    guard: 'حارس أمن',
    teacher: 'معلم'
};

const DEPARTMENTS = [
    'العلوم', 'الرياضيات', 'اللغة العربية', 'اللغة الإنجليزية',
    'التربية الإسلامية', 'التربية الاجتماعية', 'الحاسوب',
    'التربية الفنية', 'التربية الرياضية', 'الفيزياء', 'الكيمياء', 'الأحياء'
];

export async function initUsersModule() {
    var container = document.getElementById('tab-users');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <!-- إضافة مستخدم جديد -->
    <div class="card" style="border-top:5px solid var(--sky);">
        <h2><i class="bi bi-person-plus-fill" style="color:var(--sky);"></i> إضافة مستخدم جديد</h2>
        <form id="new-user-form" onsubmit="window.handleCreateNewUserLive(event)">
            <input type="hidden" id="reg-school-id" value="${schoolId}">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:14px;">
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">اسم المستخدم الكامل *</label>
                    <input type="text" id="reg-name" placeholder="أحمد محمد العلي" required
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">معرّف المستخدم (ID) *</label>
                    <input type="text" id="reg-user-id" placeholder="ahmed.ali" required
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">كلمة المرور *</label>
                    <input type="password" id="reg-password" placeholder="••••••••" required minlength="6"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">الصلاحية *</label>
                    <select id="reg-role" required onchange="window.toggleDepartmentField(this.value)"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif;">
                        <option value="">-- اختر الصلاحية --</option>
                        ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
                    </select>
                </div>
                <div id="dept-field-wrapper" style="display:none;">
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">القسم</label>
                    <select id="reg-department"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif;">
                        <option value="">-- اختر القسم --</option>
                        ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                </div>
            </div>
            <button type="submit"
                style="width:100%; background:var(--sky); color:#fff; border:none; padding:13px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:900; font-size:15px; cursor:pointer;">
                <i class="bi bi-person-check-fill"></i> إنشاء الحساب
            </button>
        </form>
    </div>

    <!-- قائمة المستخدمين -->
    <div class="card" style="border-top:5px solid var(--navy); margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <h2 style="margin:0;"><i class="bi bi-people-fill" style="color:var(--gold);"></i> المستخدمون المسجلون</h2>
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" id="users-search" placeholder="🔍 بحث بالاسم أو ID..." oninput="window.filterUsers()"
                    style="padding:8px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; outline:none;">
                <select id="users-role-filter" onchange="window.filterUsers()"
                    style="padding:8px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; outline:none; background:#fff;">
                    <option value="">كل الصلاحيات</option>
                    ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
                </select>
            </div>
        </div>
        <div id="users-list">
            <p style="text-align:center; color:#999; padding:30px;">⏳ جاري تحميل المستخدمين...</p>
        </div>
    </div>

    <!-- Modal تعديل المستخدم -->
    <div id="edit-user-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:420px; width:92%; direction:rtl;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; font-weight:900; color:var(--navy);">تعديل بيانات المستخدم</h3>
                <button onclick="document.getElementById('edit-user-modal').style.display='none'" style="background:none; border:none; font-size:22px; cursor:pointer;">✕</button>
            </div>
            <input type="hidden" id="edit-user-doc-id">
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">الاسم الكامل</label>
            <input type="text" id="edit-user-name"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:12px; box-sizing:border-box;">
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">الصلاحية</label>
            <select id="edit-user-role"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:12px;">
                ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">القسم (للمعلمين)</label>
            <select id="edit-user-dept"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:18px;">
                <option value="">-- بدون قسم --</option>
                ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
            <button onclick="window.saveUserEdit()"
                style="width:100%; background:var(--sky); color:#fff; border:none; padding:12px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                <i class="bi bi-check-circle-fill"></i> حفظ التعديلات
            </button>
        </div>
    </div>

    <!-- Modal إعادة تعيين كلمة المرور -->
    <div id="reset-pass-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:380px; width:92%; direction:rtl;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h3 style="margin:0; font-weight:900; color:var(--navy);">إعادة تعيين كلمة المرور</h3>
                <button onclick="document.getElementById('reset-pass-modal').style.display='none'" style="background:none; border:none; font-size:22px; cursor:pointer;">✕</button>
            </div>
            <p id="reset-pass-user-name" style="font-weight:700; color:var(--sky); margin-bottom:12px;"></p>
            <input type="hidden" id="reset-pass-doc-id">
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">كلمة المرور الجديدة</label>
            <input type="password" id="reset-new-pass" placeholder="••••••••" minlength="6"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:16px; box-sizing:border-box;">
            <button onclick="window.executeResetPassword()"
                style="width:100%; background:var(--gold); color:#fff; border:none; padding:12px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                <i class="bi bi-key-fill"></i> تغيير كلمة المرور
            </button>
        </div>
    </div>`;

    await loadSystemUsersDirectoryLive();
}

// ===== إظهار/إخفاء حقل القسم =====
window.toggleDepartmentField = function(role) {
    var show = ['teacher', 'department_head'].includes(role);
    document.getElementById('dept-field-wrapper').style.display = show ? 'block' : 'none';
};

// ===== إنشاء مستخدم جديد =====
window.handleCreateNewUserLive = async function(e) {
    e.preventDefault();
    var name = document.getElementById('reg-name').value.trim();
    var userId = document.getElementById('reg-user-id').value.trim();
    var password = document.getElementById('reg-password').value.trim();
    var role = document.getElementById('reg-role').value;
    var department = document.getElementById('reg-department')?.value || '';
    var schoolId = getActiveSchoolId();

    if (!name || !userId || !password || !role) {
        window.showToast?.('يرجى تعبئة جميع الحقول المطلوبة', 'warning');
        return;
    }

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var createUser = httpsCallable(fns, 'createUser');

        await createUser({ name, userId, password, role, department, schoolId });

        window.showToast?.('✅ تم إنشاء الحساب بنجاح');
        document.getElementById('new-user-form').reset();
        document.getElementById('dept-field-wrapper').style.display = 'none';
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('❌ خطأ: ' + err.message, 'error');
    }
};

// ===== تحميل قائمة المستخدمين =====
var allUsersCache = [];

async function loadSystemUsersDirectoryLive() {
    var listEl = document.getElementById('users-list');
    if (!listEl) return;

    var schoolId = getActiveSchoolId();
    listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">⏳ جاري التحميل...</p>';

    try {
        var snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
        allUsersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        allUsersCache.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        renderUsersList(allUsersCache);
    } catch(err) {
        listEl.innerHTML = `<p style="color:red; text-align:center; padding:20px;">❌ ${err.message}</p>`;
    }
}

function renderUsersList(users) {
    var listEl = document.getElementById('users-list');
    if (!listEl) return;

    if (!users.length) {
        listEl.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">لا يوجد مستخدمون مسجلون</p>';
        return;
    }

    var html = `<div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
            <tr style="background:var(--navy); color:#fff;">
                <th style="padding:10px 12px; text-align:right;">#</th>
                <th style="padding:10px 12px; text-align:right;">الاسم</th>
                <th style="padding:10px 12px; text-align:right;">المعرّف</th>
                <th style="padding:10px 12px; text-align:right;">الصلاحية</th>
                <th style="padding:10px 12px; text-align:right;">القسم</th>
                <th style="padding:10px 12px; text-align:right;">الحالة</th>
                <th style="padding:10px 12px; text-align:center;">إجراءات</th>
            </tr>
        </thead>
        <tbody>`;

    users.forEach((u, i) => {
        var roleName = ROLES[u.role] || u.role || '-';
        var isActive = u.status !== 'suspended';
        html += `
            <tr style="border-bottom:1px solid #f0f0f0; ${i % 2 ? 'background:#fafbfc;' : ''}">
                <td style="padding:10px 12px; color:#999; font-size:12px;">${i + 1}</td>
                <td style="padding:10px 12px; font-weight:700;">${u.name || '-'}</td>
                <td style="padding:10px 12px; font-size:12px; color:var(--mid); font-family:monospace;">${u.userId || u.id || '-'}</td>
                <td style="padding:10px 12px;">
                    <span style="background:var(--ice); color:var(--sky); padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">${roleName}</span>
                </td>
                <td style="padding:10px 12px; font-size:12px; color:#666;">${u.department || '-'}</td>
                <td style="padding:10px 12px;">
                    <span style="background:${isActive ? '#f0fdf4' : '#fef2f2'}; color:${isActive ? '#16a34a' : '#dc2626'}; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">
                        ${isActive ? 'نشط' : 'موقوف'}
                    </span>
                </td>
                <td style="padding:10px 12px;">
                    <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                        <button onclick="window.openEditUserModal('${u.id}','${(u.name||'').replace(/'/g,"\\'")}','${u.role||''}','${u.userId||''}','${u.department||''}')"
                            style="background:var(--sky); color:#fff; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="bi bi-pencil-fill"></i> تعديل
                        </button>
                        <button onclick="window.openResetPasswordModal('${u.id}','${(u.name||'').replace(/'/g,"\\'")}' )"
                            style="background:var(--gold); color:#fff; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="bi bi-key-fill"></i> كلمة المرور
                        </button>
                        <button onclick="window.toggleUserStatus('${u.id}','${u.status||'active'}')"
                            style="background:${isActive ? '#fef2f2' : '#f0fdf4'}; color:${isActive ? '#dc2626' : '#16a34a'}; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            ${isActive ? '⏸ إيقاف' : '▶ تفعيل'}
                        </button>
                        <button onclick="window.deleteUser('${u.id}','${(u.name||'').replace(/'/g,"\\'")}' )"
                            style="background:#fee2e2; color:#dc2626; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    html += '</tbody></table></div>';
    listEl.innerHTML = html;
}

// ===== بحث وفلترة =====
window.filterUsers = function() {
    var search = document.getElementById('users-search').value.toLowerCase().trim();
    var roleFilter = document.getElementById('users-role-filter').value;

    var filtered = allUsersCache.filter(u => {
        var matchSearch = !search ||
            (u.name || '').toLowerCase().includes(search) ||
            (u.userId || '').toLowerCase().includes(search);
        var matchRole = !roleFilter || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    renderUsersList(filtered);
};

// ===== تعديل المستخدم =====
window.openEditUserModal = function(docId, name, role, userId, department) {
    document.getElementById('edit-user-doc-id').value = docId;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-role').value = role;
    document.getElementById('edit-user-dept').value = department;
    document.getElementById('edit-user-modal').style.display = 'flex';
};

window.saveUserEdit = async function() {
    var docId = document.getElementById('edit-user-doc-id').value;
    var name = document.getElementById('edit-user-name').value.trim();
    var role = document.getElementById('edit-user-role').value;
    var department = document.getElementById('edit-user-dept').value;

    if (!name || !role) { window.showToast?.('الاسم والصلاحية مطلوبان', 'warning'); return; }

    try {
        await updateDoc(doc(db, 'users', docId), { name, role, department });
        document.getElementById('edit-user-modal').style.display = 'none';
        window.showToast?.('✅ تم تعديل بيانات المستخدم');
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('❌ ' + err.message, 'error');
    }
};

// ===== إعادة تعيين كلمة المرور =====
window.openResetPasswordModal = function(docId, userName) {
    document.getElementById('reset-pass-doc-id').value = docId;
    document.getElementById('reset-pass-user-name').textContent = '👤 ' + userName;
    document.getElementById('reset-new-pass').value = '';
    document.getElementById('reset-pass-modal').style.display = 'flex';
};

window.executeResetPassword = async function() {
    var docId = document.getElementById('reset-pass-doc-id').value;
    var newPass = document.getElementById('reset-new-pass').value.trim();

    if (!newPass || newPass.length < 6) { window.showToast?.('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning'); return; }

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var resetFn = httpsCallable(fns, 'resetUserPassword');
        await resetFn({ targetUserDocId: docId, newPassword: newPass });
        document.getElementById('reset-pass-modal').style.display = 'none';
        window.showToast?.('✅ تم تغيير كلمة المرور بنجاح');
    } catch(err) {
        window.showToast?.('❌ ' + err.message, 'error');
    }
};

// ===== إيقاف/تفعيل المستخدم =====
window.toggleUserStatus = async function(docId, currentStatus) {
    var newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    var label = newStatus === 'suspended' ? 'إيقاف' : 'تفعيل';
    if (!confirm(`هل تريد ${label} هذا المستخدم؟`)) return;

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var updateStatus = httpsCallable(fns, 'updateUserStatus');
        await updateStatus({ targetUserDocId: docId, newStatus });
        window.showToast?.(`✅ تم ${label} الحساب`);
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('❌ ' + err.message, 'error');
    }
};

// ===== حذف المستخدم =====
window.deleteUser = async function(docId, userName) {
    if (!confirm(`حذف المستخدم "${userName}" نهائياً؟ لا يمكن التراجع.`)) return;
    try {
        await deleteDoc(doc(db, 'users', docId));
        window.showToast?.('✅ تم حذف المستخدم');
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('❌ ' + err.message, 'error');
    }
};
