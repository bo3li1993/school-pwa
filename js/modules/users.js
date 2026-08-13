import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ًں”گ طھط´ظپظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ…ط­ظ„ظٹط§ظ‹ ط¨ط§ظ„ظ…طھطµظپط­ ظ‚ط¨ظ„ ط§ظ„ط¥ط±ط³ط§ظ„
async function sha256Hash(text) {
    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function initUsersModule() {
    var container = document.getElementById('tab-users');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-person-plus-fill"></i> ظ‚ظٹط¯ ظ…ط³طھط®ط¯ظ… ط¬ط¯ظٹط¯ (${schoolId})</h2>
        <form id="new-user-form" onsubmit="window.handleCreateNewUserLive(event)">
            <input type="hidden" id="reg-school-id" value="${schoolId}">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                <div>
                    <label style="font-weight:700; font-size:13px;">ط§ظ„ظ…ط¹ط±ظپ ط§ظ„ظپط±ظٹط¯ (User ID)</label>
                    <input type="text" id="reg-user-id" placeholder="ظ…ط«ط§ظ„: T100" required>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„</label>
                    <input type="text" id="reg-user-name" required>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">ط§ظ„طµظ„ط§ط­ظٹط©</label>
                    <select id="reg-user-role" required onchange="window.toggleDepartmentField(this.value)">
                        <option value="teacher">ظ…ط¹ظ„ظ…</option>
                        <option value="admin">ظ…ط³ط¤ظˆظ„ ط¥ط¯ط§ط±ظٹ (ظ…ط¯ظٹط±)</option>
                        <option value="assistant_manager">ظ…ط³ط§ط¹ط¯ ظ…ط¯ظٹط±</option>
                        <option value="wing_supervisor">ظ…ط´ط±ظپ ط¬ظ†ط§ط­</option>
                        <option value="social_worker">ط£ط®طµط§ط¦ظٹ ط§ط¬طھظ…ط§ط¹ظٹ</option>
                        <option value="department_head">ط±ط¦ظٹط³ ظ‚ط³ظ…</option>
                        <option value="guard">ط­ط§ط±ط³</option>
                    </select>
                </div>
                <div id="dept-field-wrapper" style="display:none;">
                    <label style="font-weight:700; font-size:13px;">ط§ظ„ظ‚ط³ظ…</label>
                    <select id="reg-user-department">
                        <option value="">-- ط§ط®طھط± ط§ظ„ظ‚ط³ظ… --</option>
                        <option value="ظ„ط؛ط© ط¹ط±ط¨ظٹط©">ظ„ط؛ط© ط¹ط±ط¨ظٹط©</option>
                        <option value="ظ„ط؛ط© ط¥ظ†ط¬ظ„ظٹط²ظٹط©">ظ„ط؛ط© ط¥ظ†ط¬ظ„ظٹط²ظٹط©</option>
                        <option value="ط±ظٹط§ط¶ظٹط§طھ">ط±ظٹط§ط¶ظٹط§طھ</option>
                        <option value="ط¹ظ„ظˆظ…">ط¹ظ„ظˆظ…</option>
                        <option value="ط§ط¬طھظ…ط§ط¹ظٹط§طھ">ط§ط¬طھظ…ط§ط¹ظٹط§طھ</option>
                        <option value="طھط±ط¨ظٹط© ط¥ط³ظ„ط§ظ…ظٹط©">طھط±ط¨ظٹط© ط¥ط³ظ„ط§ظ…ظٹط©</option>
                        <option value="طھط±ط¨ظٹط© ظپظ†ظٹط©">طھط±ط¨ظٹط© ظپظ†ظٹط©</option>
                        <option value="طھط±ط¨ظٹط© ط¨ط¯ظ†ظٹط©">طھط±ط¨ظٹط© ط¨ط¯ظ†ظٹط©</option>
                        <option value="ط­ط§ط³ط¨ ط¢ظ„ظٹ">ط­ط§ط³ط¨ ط¢ظ„ظٹ</option>
                        <option value="ظ…ظ‡ط§ط±ط§طھ ط­ظٹط§طھظٹط©">ظ…ظ‡ط§ط±ط§طھ ط­ظٹط§طھظٹط©</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹط©</label>
                    <input type="password" id="reg-user-pass" required>
                </div>
            </div>
            <button type="submit" style="width:100%; font-weight:bold; margin-top:10px; background:var(--primary-color); color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">ط§ط¹طھظ…ط§ط¯ ط§ظ„ط­ط³ط§ط¨</button>
        </form>
    </div>

    <div class="card" style="border-top: 5px solid var(--hover-color);">
        <h2><i class="bi bi-people-fill"></i> ط³ط¬ظ„ ط­ط³ط§ط¨ط§طھ ط§ظ„ظ…ط¯ط±ط³ط©</h2>
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr style="background:#f4f6f9;">
                        <th>ط§ظ„ظ…ط¹ط±ظپ</th><th>ط§ظ„ط§ط³ظ… ط§ظ„ط±ط³ظ…ظٹ</th><th>ط§ظ„طµظ„ط§ط­ظٹط©</th><th>ط§ظ„ط­ط§ظ„ط©</th><th>ط§ظ„ط£ظ…ط§ظ†</th><th>ط¥ط¬ط±ط§ط،</th>
                    </tr>
                </thead>
                <tbody id="system-users-tbody">
                    <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ط­ط³ط§ط¨ط§طھ...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;

    loadSystemUsersDirectoryLive();
}

window.toggleDepartmentField = function(role) {
    var wrapper = document.getElementById('dept-field-wrapper');
    if (!wrapper) return;
    wrapper.style.display = (role === 'department_head' || role === 'teacher') ? 'block' : 'none';
};

window.handleCreateNewUserLive = async function (e) {
    e.preventDefault();

    var schoolId = document.getElementById('reg-school-id').value.trim();
    var userId = document.getElementById('reg-user-id').value.trim();
    var name = document.getElementById('reg-user-name').value.trim();
    var role = document.getElementById('reg-user-role').value;
    var department = document.getElementById('reg-user-department')?.value.trim() || '';
    var plainPass = document.getElementById('reg-user-pass').value.trim();

    if (!schoolId) {
        window.showToast('âڑ ï¸ڈ ط®ط·ط£: ظ„ط§ ظٹظˆط¬ط¯ schoolId ظ†ط´ط· ظ„ظ‡ط°ط§ ط§ظ„ط­ط³ط§ط¨طŒ ظ„ط§ ظٹظ…ظƒظ† ط¥ط¶ط§ظپط© ط§ظ„ظ…ط³طھط®ط¯ظ….');
        return;
    }
    if (!userId || !name || !plainPass) {
        window.showToast('âڑ ï¸ڈ ط§ظ„ط±ط¬ط§ط، طھط¹ط¨ط¦ط© ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„.');
        return;
    }
    if (role === 'department_head' && !department) {
        window.showToast('âڑ ï¸ڈ ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± ط§ظ„ظ‚ط³ظ… ظ„ط±ط¦ظٹط³ ط§ظ„ظ‚ط³ظ….');
        return;
    }

    var submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'âڈ³ ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...';

    try {
        // طھط­ظ‚ظ‚ ظ…ظ† ط¹ط¯ظ… طھظƒط±ط§ط± ط§ظ„ظ…ط¹ط±ظپ ط¯ط§ط®ظ„ ظ†ظپط³ ط§ظ„ظ…ط¯ط±ط³ط©
        var dupCheck = query(
            collection(db, 'users'),
            where('schoolId', '==', schoolId),
            where('userId', '==', userId)
        );
        var dupSnap = await getDocs(dupCheck);
        if (!dupSnap.empty) {
            window.showToast(`âڑ ï¸ڈ ط§ظ„ظ…ط¹ط±ظپ "${userId}" ظ…ط³طھط®ط¯ظ… ط¨ط§ظ„ظپط¹ظ„ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظ…ط¯ط±ط³ط©.`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'ط§ط¹طھظ…ط§ط¯ ط§ظ„ط­ط³ط§ط¨';
            return;
        }

        // ًں”گ طھط´ظپظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط¨ظ€ SHA-256 ظ‚ط¨ظ„ ط§ظ„ط­ظپط¸ (ط¨ط¯ظ„ طھط®ط²ظٹظ†ظ‡ط§ ظ†طµط§ظ‹ طµط±ظٹط­ط§ظ‹)
        var passHash = await sha256Hash(plainPass);

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

        window.showToast(`âœ… طھظ… ط§ط¹طھظ…ط§ط¯ ط­ط³ط§ط¨ "${name}" ط¨ظ†ط¬ط§ط­.`);
        document.getElementById('new-user-form').reset();
        loadSystemUsersDirectoryLive();
    } catch (err) {
        window.showToast('â‌Œ طھط¹ط°ط± ط¥ط¶ط§ظپط© ط§ظ„ظ…ط³طھط®ط¯ظ…: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ط§ط¹طھظ…ط§ط¯ ط§ظ„ط­ط³ط§ط¨';
    }
};

async function loadSystemUsersDirectoryLive() {
    var tbody = document.getElementById('system-users-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId();
    if (!schoolId) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">âڑ ï¸ڈ ظ„ط§ ظٹظˆط¬ط¯ schoolId ظ†ط´ط· â€” ظ„ط§ ظٹظ…ظƒظ† ط¬ظ„ط¨ ط§ظ„ط­ط³ط§ط¨ط§طھ.</td></tr>';
        return;
    }

    try {
        var q = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        var snap = await getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; font-weight:bold; color:#999;">ًں’، ظ„ط§ ظٹظˆط¬ط¯ ظ…ط³طھط®ط¯ظ…ظٹظ† ظ…ظ‚ظٹط¯ظٹظ† ط¨ظ‡ط°ظ‡ ط§ظ„ظ…ط¯ط±ط³ط©.</td></tr>';
            return;
        }

        var html = '';
        snap.forEach(docSnap => {
            var u = docSnap.data();
            var roleLabel = u.role === 'admin' ? 'ظ…ط³ط¤ظˆظ„ ط¥ط¯ط§ط±ظٹ'
                : u.role === 'assistant_manager' ? 'ظ…ط³ط§ط¹ط¯ ظ…ط¯ظٹط±'
                : u.role === 'wing_supervisor' ? 'ظ…ط´ط±ظپ ط¬ظ†ط§ط­'
                : u.role === 'social_worker' ? 'ط£ط®طµط§ط¦ظٹ ط§ط¬طھظ…ط§ط¹ظٹ'
                : u.role === 'department_head' ? `ط±ط¦ظٹط³ ظ‚ط³ظ…${u.department ? ' - ' + u.department : ''}`
                : u.role === 'guard' ? 'ط­ط§ط±ط³'
                : 'ظ…ط¹ظ„ظ…';
            var statusLabel = u.status === 'suspended' ? 'âڈ¸ ظ…ظˆظ‚ظˆظپ' : 'âœ… ظپط¹ظ‘ط§ظ„';
            var securityBadge = u.passHash ? '<span style="color:var(--success-color); font-size:11px;">ًں”’ ظ…ط´ظپظ‘ط±ط©</span>' : '<span style="color:var(--danger-color); font-size:11px;">âڑ ï¸ڈ ظ‚ط¯ظٹظ…ط©</span>';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:700;">${u.userId || '-'}</td>
                    <td>${u.name || '-'}</td>
                    <td>${roleLabel}</td>
                    <td>${statusLabel}</td>
                    <td>${securityBadge}</td>
                    <td>
                        <div style="display:flex;gap:5px;flex-wrap:wrap">
                            <button onclick="window.openEditUserModal('${docSnap.id}','${(u.name||'').replace(/'/g,"\\'")}','${u.role||''}','${u.userId||''}','${u.department||''}')"
                                style="background:#16a34a;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px">
                                <i class="bi bi-pencil-fill"></i> طھط¹ط¯ظٹظ„
                            </button>
                            <button onclick="window.openResetPasswordModal('${docSnap.id}', '${(u.name||'').replace(/'/g,"\\'")}')"
                                style="background:var(--sky);color:#fff;border:none;padding:5px 10px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px">
                                <i class="bi bi-key-fill"></i> ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±
                            </button>
                            <button onclick="window.deleteUser('${docSnap.id}', '${(u.name||"").replace(/'/g,"\\'")}')"
                                style="background:#fee2e2;color:#dc2626;border:none;padding:5px 10px;border-radius:6px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer">
                                <i class="bi bi-trash-fill"></i> ط­ط°ظپ
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:15px; font-weight:bold;">â‌Œ طھط¹ط°ط± ط¬ظ„ط¨ ط§ظ„ط­ط³ط§ط¨ط§طھ: ${e.message}</td></tr>`;
    }
}

// ===== ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ظ…ط±ظˆط± ظ…ظˆط¸ظپ (Admin ظپظ‚ط·طŒ ط¹ط¨ط± Cloud Function ط¢ظ…ظ†ط©) =====
window.openResetPasswordModal = function(userDocId, userName) {
    var newPass = prompt(`ط£ط¯ط®ظ„ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظ„ظ„ظ…ظˆط¸ظپ: ${userName}`);
    if (!newPass) return;
    if (newPass.length < 4) { window.showToast('âڑ ï¸ڈ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ‚طµظٹط±ط© ط¬ط¯ط§ظ‹ (4 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„)', 'info'); return; }

    window.executeResetPassword(userDocId, newPass, userName);
};

window.executeResetPassword = async function(userDocId, newPass, userName) {
    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var { auth } = await import('../firebase-config.js');
        var functions = getFunctions(auth.app, 'me-central1');
        var resetFn = httpsCallable(functions, 'resetUserPassword');

        await resetFn({ userDocId, newPassword: newPass });
        window.showToast(`âœ… طھظ… طھط­ط¯ظٹط« ظƒظ„ظ…ط© ظ…ط±ظˆط± ${userName} ط¨ظ†ط¬ط§ط­`);
        loadSystemUsersDirectoryLive();
    } catch (e) {
        window.showToast('â‌Œ ط®ط·ط£: ' + e.message, 'error');
    }
};


// â•گâ•گ طھط¹ط¯ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… â•گâ•گ
window.openEditUserModal = function(docId, name, role, userId, department) {
    document.getElementById('edit-user-modal')?.remove();
    var roles = [
        ['admin','ظ…ط¯ظٹط±'],['assistant_manager','ظ…ط³ط§ط¹ط¯ ظ…ط¯ظٹط±'],['wing_supervisor','ظ…ط´ط±ظپ ط¬ظ†ط§ط­'],
        ['department_head','ط±ط¦ظٹط³ ظ‚ط³ظ…'],['teacher','ظ…ط¹ظ„ظ…'],['social_worker','ط£ط®طµط§ط¦ظٹ ط§ط¬طھظ…ط§ط¹ظٹ'],
        ['guard','ط­ط§ط±ط³'],['nurse','ظ…ظ…ط±ط¶']
    ];
    var modal = document.createElement('div');
    modal.id    = 'edit-user-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:100%;direction:rtl;font-family:'Cairo',sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:15px;font-weight:900;color:#0b2545;margin:0">âœڈï¸ڈ طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…</h3>
            <button onclick="document.getElementById('edit-user-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer">âœ•</button>
        </div>
        <label style="font-size:12px;font-weight:800;color:#6b7280;display:block;margin-bottom:4px">ط§ظ„ط§ط³ظ…</label>
        <input id="edit-user-name" type="text" value="${name}" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:12px;outline:none">
        <label style="font-size:12px;font-weight:800;color:#6b7280;display:block;margin-bottom:4px">ط§ظ„ط¯ظˆط±</label>
        <select id="edit-user-role" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:12px;outline:none">
            ${roles.map(([v,l])=>`<option value="${v}" ${v===role?'selected':''}>${l}</option>`).join('')}
        </select>
        <label style="font-size:12px;font-weight:800;color:#6b7280;display:block;margin-bottom:4px">ط§ظ„ظ‚ط³ظ… (ظ„ط±ط¦ظٹط³ ط§ظ„ظ‚ط³ظ… ظپظ‚ط·)</label>
        <input id="edit-user-dept" type="text" value="${department||''}" placeholder="ظ…ط«ط§ظ„: ط±ظٹط§ط¶ظٹط§طھ" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:16px;outline:none">
        <button onclick="window.saveUserEdit('${docId}')"
            style="width:100%;padding:12px;background:#0b2545;color:#fff;border:none;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:14px;cursor:pointer">
            ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ
        </button>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
};

window.saveUserEdit = async function(docId) {
    var name = document.getElementById('edit-user-name')?.value?.trim();
    var role = document.getElementById('edit-user-role')?.value;
    var dept = document.getElementById('edit-user-dept')?.value?.trim();
    if(!name) { window.showToast?.('âڑ ï¸ڈ ط£ط¯ط®ظ„ ط§ظ„ط§ط³ظ…','warning'); return; }
    try {
        var { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var { db: database }   = await import('../firebase-config.js');
        var updates = { name, role };
        if(dept) updates.department = dept;
        await updateDoc(doc(database,'users',docId), updates);
        window.showToast?.('âœ… طھظ… ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ');
        document.getElementById('edit-user-modal')?.remove();
        setTimeout(() => window.loadSystemUsersDirectoryLive?.(), 500);
    } catch(e) { window.showToast?.('â‌Œ '+e.message,'error'); }
};

// â•گâ•گ ط­ط°ظپ ظ…ط³طھط®ط¯ظ… â•گâ•گ
window.deleteUser = async function(docId, userName) {
    if(!confirm('ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…: ' + userName + 'طں\n\nظ‡ط°ط§ ط§ظ„ط¥ط¬ط±ط§ط، ظ„ط§ ظٹظ…ظƒظ† ط§ظ„طھط±ط§ط¬ط¹ ط¹ظ†ظ‡!')) return;
    try {
        var { db } = await import('../firebase-config.js');
        var { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        await deleteDoc(doc(db, 'users', docId));
        window.showToast('âœ… طھظ… ط­ط°ظپ ' + userName);
        loadSystemUsersDirectoryLive();
    } catch(e) {
        window.showToast('â‌Œ ط®ط·ط£: ' + e.message, 'error');
    }
};

