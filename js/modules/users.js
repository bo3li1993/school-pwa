import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ظ‹ع؛â€‌ع¯ ط·ع¾ط·آ´ط¸ظ¾ط¸ظ¹ط·آ± ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€¦ط·آ­ط¸â€‍ط¸ظ¹ط·آ§ط¸â€¹ ط·آ¨ط·آ§ط¸â€‍ط¸â€¦ط·ع¾ط·آµط¸ظ¾ط·آ­ ط¸â€ڑط·آ¨ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط·آ±ط·آ³ط·آ§ط¸â€‍


export async function initUsersModule() {
    var container = document.getElementById('tab-users');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-person-plus-fill"></i> ط¸â€ڑط¸ظ¹ط·آ¯ ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ (${schoolId})</h2>
        <form id="new-user-form" onsubmit="window.handleCreateNewUserLive(event)">
            <input type="hidden" id="reg-school-id" value="${schoolId}">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                <div>
                    <label style="font-weight:700; font-size:13px;">ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾ ط·آ§ط¸â€‍ط¸ظ¾ط·آ±ط¸ظ¹ط·آ¯ (User ID)</label>
                    <input type="text" id="reg-user-id" placeholder="ط¸â€¦ط·آ«ط·آ§ط¸â€‍: T100" required>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">ط·آ§ط¸â€‍ط·آ§ط·آ³ط¸â€¦ ط·آ§ط¸â€‍ط¸ئ’ط·آ§ط¸â€¦ط¸â€‍</label>
                    <input type="text" id="reg-user-name" required>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">ط·آ§ط¸â€‍ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ©</label>
                    <select id="reg-user-role" required onchange="window.toggleDepartmentField(this.value)">
                        <option value="teacher">ط¸â€¦ط·آ¹ط¸â€‍ط¸â€¦</option>
                        <option value="admin">ط¸â€¦ط·آ³ط·آ¤ط¸ث†ط¸â€‍ ط·آ¥ط·آ¯ط·آ§ط·آ±ط¸ظ¹ (ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±)</option>
                        <option value="assistant_manager">ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±</option>
                        <option value="wing_supervisor">ط¸â€¦ط·آ´ط·آ±ط¸ظ¾ ط·آ¬ط¸â€ ط·آ§ط·آ­</option>
                        <option value="social_worker">ط·آ£ط·آ®ط·آµط·آ§ط·آ¦ط¸ظ¹ ط·آ§ط·آ¬ط·ع¾ط¸â€¦ط·آ§ط·آ¹ط¸ظ¹</option>
                        <option value="department_head">ط·آ±ط·آ¦ط¸ظ¹ط·آ³ ط¸â€ڑط·آ³ط¸â€¦</option>
                        <option value="guard">ط·آ­ط·آ§ط·آ±ط·آ³</option>
                    </select>
                </div>
                <div id="dept-field-wrapper" style="display:none;">
                    <label style="font-weight:700; font-size:13px;">ط·آ§ط¸â€‍ط¸â€ڑط·آ³ط¸â€¦</label>
                    <select id="reg-user-department">
                        <option value="">-- ط·آ§ط·آ®ط·ع¾ط·آ± ط·آ§ط¸â€‍ط¸â€ڑط·آ³ط¸â€¦ --</option>
                        <option value="ط¸â€‍ط·ط›ط·آ© ط·آ¹ط·آ±ط·آ¨ط¸ظ¹ط·آ©">ط¸â€‍ط·ط›ط·آ© ط·آ¹ط·آ±ط·آ¨ط¸ظ¹ط·آ©</option>
                        <option value="ط¸â€‍ط·ط›ط·آ© ط·آ¥ط¸â€ ط·آ¬ط¸â€‍ط¸ظ¹ط·آ²ط¸ظ¹ط·آ©">ط¸â€‍ط·ط›ط·آ© ط·آ¥ط¸â€ ط·آ¬ط¸â€‍ط¸ظ¹ط·آ²ط¸ظ¹ط·آ©</option>
                        <option value="ط·آ±ط¸ظ¹ط·آ§ط·آ¶ط¸ظ¹ط·آ§ط·ع¾">ط·آ±ط¸ظ¹ط·آ§ط·آ¶ط¸ظ¹ط·آ§ط·ع¾</option>
                        <option value="ط·آ¹ط¸â€‍ط¸ث†ط¸â€¦">ط·آ¹ط¸â€‍ط¸ث†ط¸â€¦</option>
                        <option value="ط·آ§ط·آ¬ط·ع¾ط¸â€¦ط·آ§ط·آ¹ط¸ظ¹ط·آ§ط·ع¾">ط·آ§ط·آ¬ط·ع¾ط¸â€¦ط·آ§ط·آ¹ط¸ظ¹ط·آ§ط·ع¾</option>
                        <option value="ط·ع¾ط·آ±ط·آ¨ط¸ظ¹ط·آ© ط·آ¥ط·آ³ط¸â€‍ط·آ§ط¸â€¦ط¸ظ¹ط·آ©">ط·ع¾ط·آ±ط·آ¨ط¸ظ¹ط·آ© ط·آ¥ط·آ³ط¸â€‍ط·آ§ط¸â€¦ط¸ظ¹ط·آ©</option>
                        <option value="ط·ع¾ط·آ±ط·آ¨ط¸ظ¹ط·آ© ط¸ظ¾ط¸â€ ط¸ظ¹ط·آ©">ط·ع¾ط·آ±ط·آ¨ط¸ظ¹ط·آ© ط¸ظ¾ط¸â€ ط¸ظ¹ط·آ©</option>
                        <option value="ط·ع¾ط·آ±ط·آ¨ط¸ظ¹ط·آ© ط·آ¨ط·آ¯ط¸â€ ط¸ظ¹ط·آ©">ط·ع¾ط·آ±ط·آ¨ط¸ظ¹ط·آ© ط·آ¨ط·آ¯ط¸â€ ط¸ظ¹ط·آ©</option>
                        <option value="ط·آ­ط·آ§ط·آ³ط·آ¨ ط·آ¢ط¸â€‍ط¸ظ¹">ط·آ­ط·آ§ط·آ³ط·آ¨ ط·آ¢ط¸â€‍ط¸ظ¹</option>
                        <option value="ط¸â€¦ط¸â€،ط·آ§ط·آ±ط·آ§ط·ع¾ ط·آ­ط¸ظ¹ط·آ§ط·ع¾ط¸ظ¹ط·آ©">ط¸â€¦ط¸â€،ط·آ§ط·آ±ط·آ§ط·ع¾ ط·آ­ط¸ظ¹ط·آ§ط·ع¾ط¸ظ¹ط·آ©</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ§ط·آ¨ط·ع¾ط·آ¯ط·آ§ط·آ¦ط¸ظ¹ط·آ©</label>
                    <input type="password" id="reg-user-pass" required>
                </div>
            </div>
            <button type="submit" style="width:100%; font-weight:bold; margin-top:10px; background:var(--primary-color); color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">ط·آ§ط·آ¹ط·ع¾ط¸â€¦ط·آ§ط·آ¯ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨</button>
        </form>
    </div>

    <div class="card" style="border-top: 5px solid var(--hover-color);">
        <h2><i class="bi bi-people-fill"></i> ط·آ³ط·آ¬ط¸â€‍ ط·آ­ط·آ³ط·آ§ط·آ¨ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ©</h2>
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr style="background:#f4f6f9;">
                        <th>ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾</th><th>ط·آ§ط¸â€‍ط·آ§ط·آ³ط¸â€¦ ط·آ§ط¸â€‍ط·آ±ط·آ³ط¸â€¦ط¸ظ¹</th><th>ط·آ§ط¸â€‍ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ©</th><th>ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط·آ©</th><th>ط·آ§ط¸â€‍ط·آ£ط¸â€¦ط·آ§ط¸â€ </th><th>ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒ</th>
                    </tr>
                </thead>
                <tbody id="system-users-tbody">
                    <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">ط·آ¬ط·آ§ط·آ±ط¸ظ¹ ط·ع¾ط·آ­ط¸â€¦ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ط·آ§ط·ع¾...</td></tr>
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
        window.showToast('أ¢ع‘آ أ¯آ¸عˆ ط·آ®ط·آ·ط·آ£: ط¸â€‍ط·آ§ ط¸ظ¹ط¸ث†ط·آ¬ط·آ¯ schoolId ط¸â€ ط·آ´ط·آ· ط¸â€‍ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ط·إ’ ط¸â€‍ط·آ§ ط¸ظ¹ط¸â€¦ط¸ئ’ط¸â€  ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦.');
        return;
    }
    if (!userId || !name || !plainPass) {
        window.showToast('أ¢ع‘آ أ¯آ¸عˆ ط·آ§ط¸â€‍ط·آ±ط·آ¬ط·آ§ط·طŒ ط·ع¾ط·آ¹ط·آ¨ط·آ¦ط·آ© ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط·آ­ط¸â€ڑط¸ث†ط¸â€‍.');
        return;
    }
    if (role === 'department_head' && !department) {
        window.showToast('أ¢ع‘آ أ¯آ¸عˆ ط¸ظ¹ط·آ±ط·آ¬ط¸â€° ط·آ§ط·آ®ط·ع¾ط¸ظ¹ط·آ§ط·آ± ط·آ§ط¸â€‍ط¸â€ڑط·آ³ط¸â€¦ ط¸â€‍ط·آ±ط·آ¦ط¸ظ¹ط·آ³ ط·آ§ط¸â€‍ط¸â€ڑط·آ³ط¸â€¦.');
        return;
    }

    var submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'أ¢عˆآ³ ط·آ¬ط·آ§ط·آ±ط¸ظ¹ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸...';

    try {
        // ط·ع¾ط·آ­ط¸â€ڑط¸â€ڑ ط¸â€¦ط¸â€  ط·آ¹ط·آ¯ط¸â€¦ ط·ع¾ط¸ئ’ط·آ±ط·آ§ط·آ± ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾ ط·آ¯ط·آ§ط·آ®ط¸â€‍ ط¸â€ ط¸ظ¾ط·آ³ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ©
        var dupCheck = query(
            collection(db, 'users'),
            where('schoolId', '==', schoolId),
            where('userId', '==', userId)
        );
        var dupSnap = await getDocs(dupCheck);
        if (!dupSnap.empty) {
            window.showToast(`أ¢ع‘آ أ¯آ¸عˆ ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾ "${userId}" ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط·آ¨ط·آ§ط¸â€‍ط¸ظ¾ط·آ¹ط¸â€‍ ط¸ظ¾ط¸ظ¹ ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ©.`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'ط·آ§ط·آ¹ط·ع¾ط¸â€¦ط·آ§ط·آ¯ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨';
            return;
        }

        // ظ‹ع؛â€‌ع¯ ط·ع¾ط·آ´ط¸ظ¾ط¸ظ¹ط·آ± ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ¨ط¸â‚¬ SHA-256 ط¸â€ڑط·آ¨ط¸â€‍ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸ (ط·آ¨ط·آ¯ط¸â€‍ ط·ع¾ط·آ®ط·آ²ط¸ظ¹ط¸â€ ط¸â€،ط·آ§ ط¸â€ ط·آµط·آ§ط¸â€¹ ط·آµط·آ±ط¸ظ¹ط·آ­ط·آ§ط¸â€¹)
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

        window.showToast(`أ¢إ“â€¦ ط·ع¾ط¸â€¦ ط·آ§ط·آ¹ط·ع¾ط¸â€¦ط·آ§ط·آ¯ ط·آ­ط·آ³ط·آ§ط·آ¨ "${name}" ط·آ¨ط¸â€ ط·آ¬ط·آ§ط·آ­.`);
        document.getElementById('new-user-form').reset();
        loadSystemUsersDirectoryLive();
    } catch (err) {
        window.showToast('أ¢â€Œإ’ ط·ع¾ط·آ¹ط·آ°ط·آ± ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ط·آ§ط·آ¹ط·ع¾ط¸â€¦ط·آ§ط·آ¯ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨';
    }
};

async function loadSystemUsersDirectoryLive() {
    var tbody = document.getElementById('system-users-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId();
    if (!schoolId) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">أ¢ع‘آ أ¯آ¸عˆ ط¸â€‍ط·آ§ ط¸ظ¹ط¸ث†ط·آ¬ط·آ¯ schoolId ط¸â€ ط·آ´ط·آ· أ¢â‚¬â€‌ ط¸â€‍ط·آ§ ط¸ظ¹ط¸â€¦ط¸ئ’ط¸â€  ط·آ¬ط¸â€‍ط·آ¨ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ط·آ§ط·ع¾.</td></tr>';
        return;
    }

    try {
        var q = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        var snap = await getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; font-weight:bold; color:#999;">ظ‹ع؛â€™طŒ ط¸â€‍ط·آ§ ط¸ظ¹ط¸ث†ط·آ¬ط·آ¯ ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ط¸ظ¹ط¸â€  ط¸â€¦ط¸â€ڑط¸ظ¹ط·آ¯ط¸ظ¹ط¸â€  ط·آ¨ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط·آ±ط·آ³ط·آ©.</td></tr>';
            return;
        }

        var html = '';
        snap.forEach(docSnap => {
            var u = docSnap.data();
            var roleLabel = u.role === 'admin' ? 'ط¸â€¦ط·آ³ط·آ¤ط¸ث†ط¸â€‍ ط·آ¥ط·آ¯ط·آ§ط·آ±ط¸ظ¹'
                : u.role === 'assistant_manager' ? 'ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±'
                : u.role === 'wing_supervisor' ? 'ط¸â€¦ط·آ´ط·آ±ط¸ظ¾ ط·آ¬ط¸â€ ط·آ§ط·آ­'
                : u.role === 'social_worker' ? 'ط·آ£ط·آ®ط·آµط·آ§ط·آ¦ط¸ظ¹ ط·آ§ط·آ¬ط·ع¾ط¸â€¦ط·آ§ط·آ¹ط¸ظ¹'
                : u.role === 'department_head' ? `ط·آ±ط·آ¦ط¸ظ¹ط·آ³ ط¸â€ڑط·آ³ط¸â€¦${u.department ? ' - ' + u.department : ''}`
                : u.role === 'guard' ? 'ط·آ­ط·آ§ط·آ±ط·آ³'
                : 'ط¸â€¦ط·آ¹ط¸â€‍ط¸â€¦';
            var statusLabel = u.status === 'suspended' ? 'أ¢عˆآ¸ ط¸â€¦ط¸ث†ط¸â€ڑط¸ث†ط¸ظ¾' : 'أ¢إ“â€¦ ط¸ظ¾ط·آ¹ط¸â€کط·آ§ط¸â€‍';
            var securityBadge = u.passHash ? '<span style="color:var(--success-color); font-size:11px;">ظ‹ع؛â€‌â€™ ط¸â€¦ط·آ´ط¸ظ¾ط¸â€کط·آ±ط·آ©</span>' : '<span style="color:var(--danger-color); font-size:11px;">أ¢ع‘آ أ¯آ¸عˆ ط¸â€ڑط·آ¯ط¸ظ¹ط¸â€¦ط·آ©</span>';

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
                                <i class="bi bi-pencil-fill"></i> ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍
                            </button>
                            <button onclick="window.openResetPasswordModal('${docSnap.id}', '${(u.name||'').replace(/'/g,"\\'")}')"
                                style="background:var(--sky);color:#fff;border:none;padding:5px 10px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px">
                                <i class="bi bi-key-fill"></i> ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ±
                            </button>
                            <button onclick="window.deleteUser('${docSnap.id}', '${(u.name||"").replace(/'/g,"\\'")}')"
                                style="background:#fee2e2;color:#dc2626;border:none;padding:5px 10px;border-radius:6px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer">
                                <i class="bi bi-trash-fill"></i> ط·آ­ط·آ°ط¸ظ¾
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:15px; font-weight:bold;">أ¢â€Œإ’ ط·ع¾ط·آ¹ط·آ°ط·آ± ط·آ¬ط¸â€‍ط·آ¨ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨ط·آ§ط·ع¾: ${e.message}</td></tr>`;
    }
}

// ===== ط·آ¥ط·آ¹ط·آ§ط·آ¯ط·آ© ط·ع¾ط·آ¹ط¸ظ¹ط¸ظ¹ط¸â€  ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€¦ط¸ث†ط·آ¸ط¸ظ¾ (Admin ط¸ظ¾ط¸â€ڑط·آ·ط·إ’ ط·آ¹ط·آ¨ط·آ± Cloud Function ط·آ¢ط¸â€¦ط¸â€ ط·آ©) =====
window.openResetPasswordModal = function(userDocId, userName) {
    var newPass = prompt(`ط·آ£ط·آ¯ط·آ®ط¸â€‍ ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط·آ§ط¸â€‍ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ط·آ© ط¸â€‍ط¸â€‍ط¸â€¦ط¸ث†ط·آ¸ط¸ظ¾: ${userName}`);
    if (!newPass) return;
    if (newPass.length < 4) { window.showToast('أ¢ع‘آ أ¯آ¸عˆ ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ±ط¸ث†ط·آ± ط¸â€ڑط·آµط¸ظ¹ط·آ±ط·آ© ط·آ¬ط·آ¯ط·آ§ط¸â€¹ (4 ط·آ£ط·آ­ط·آ±ط¸ظ¾ ط·آ¹ط¸â€‍ط¸â€° ط·آ§ط¸â€‍ط·آ£ط¸â€ڑط¸â€‍)', 'info'); return; }

    window.executeResetPassword(userDocId, newPass, userName);
};

window.executeResetPassword = async function(userDocId, newPass, userName) {
    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var { auth } = await import('../firebase-config.js');
        var functions = getFunctions(auth.app, 'me-central1');
        var resetFn = httpsCallable(functions, 'resetUserPassword');

        await resetFn({ userDocId, newPassword: newPass });
        window.showToast(`أ¢إ“â€¦ ط·ع¾ط¸â€¦ ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط¸ئ’ط¸â€‍ط¸â€¦ط·آ© ط¸â€¦ط·آ±ط¸ث†ط·آ± ${userName} ط·آ¨ط¸â€ ط·آ¬ط·آ§ط·آ­`);
        loadSystemUsersDirectoryLive();
    } catch (e) {
        window.showToast('أ¢â€Œإ’ ط·آ®ط·آ·ط·آ£: ' + e.message, 'error');
    }
};


// أ¢â€¢ع¯أ¢â€¢ع¯ ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ أ¢â€¢ع¯أ¢â€¢ع¯
window.openEditUserModal = function(docId, name, role, userId, department) {
    document.getElementById('edit-user-modal')?.remove();
    var roles = [
        ['admin','ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±'],['assistant_manager','ط¸â€¦ط·آ³ط·آ§ط·آ¹ط·آ¯ ط¸â€¦ط·آ¯ط¸ظ¹ط·آ±'],['wing_supervisor','ط¸â€¦ط·آ´ط·آ±ط¸ظ¾ ط·آ¬ط¸â€ ط·آ§ط·آ­'],
        ['department_head','ط·آ±ط·آ¦ط¸ظ¹ط·آ³ ط¸â€ڑط·آ³ط¸â€¦'],['teacher','ط¸â€¦ط·آ¹ط¸â€‍ط¸â€¦'],['social_worker','ط·آ£ط·آ®ط·آµط·آ§ط·آ¦ط¸ظ¹ ط·آ§ط·آ¬ط·ع¾ط¸â€¦ط·آ§ط·آ¹ط¸ظ¹'],
        ['guard','ط·آ­ط·آ§ط·آ±ط·آ³'],['nurse','ط¸â€¦ط¸â€¦ط·آ±ط·آ¶']
    ];
    var modal = document.createElement('div');
    modal.id    = 'edit-user-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:100%;direction:rtl;font-family:'Cairo',sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:15px;font-weight:900;color:#0b2545;margin:0">أ¢إ“عˆأ¯آ¸عˆ ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦</h3>
            <button onclick="document.getElementById('edit-user-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer">أ¢إ“â€¢</button>
        </div>
        <label style="font-size:12px;font-weight:800;color:#6b7280;display:block;margin-bottom:4px">ط·آ§ط¸â€‍ط·آ§ط·آ³ط¸â€¦</label>
        <input id="edit-user-name" type="text" value="${name}" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:12px;outline:none">
        <label style="font-size:12px;font-weight:800;color:#6b7280;display:block;margin-bottom:4px">ط·آ§ط¸â€‍ط·آ¯ط¸ث†ط·آ±</label>
        <select id="edit-user-role" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:12px;outline:none">
            ${roles.map(([v,l])=>`<option value="${v}" ${v===role?'selected':''}>${l}</option>`).join('')}
        </select>
        <label style="font-size:12px;font-weight:800;color:#6b7280;display:block;margin-bottom:4px">ط·آ§ط¸â€‍ط¸â€ڑط·آ³ط¸â€¦ (ط¸â€‍ط·آ±ط·آ¦ط¸ظ¹ط·آ³ ط·آ§ط¸â€‍ط¸â€ڑط·آ³ط¸â€¦ ط¸ظ¾ط¸â€ڑط·آ·)</label>
        <input id="edit-user-dept" type="text" value="${department||''}" placeholder="ط¸â€¦ط·آ«ط·آ§ط¸â€‍: ط·آ±ط¸ظ¹ط·آ§ط·آ¶ط¸ظ¹ط·آ§ط·ع¾" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;margin-bottom:16px;outline:none">
        <button onclick="window.saveUserEdit('${docId}')"
            style="width:100%;padding:12px;background:#0b2545;color:#fff;border:none;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:14px;cursor:pointer">
            ط·آ­ط¸ظ¾ط·آ¸ ط·آ§ط¸â€‍ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ط·آ§ط·ع¾
        </button>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
};

window.saveUserEdit = async function(docId) {
    var name = document.getElementById('edit-user-name')?.value?.trim();
    var role = document.getElementById('edit-user-role')?.value;
    var dept = document.getElementById('edit-user-dept')?.value?.trim();
    if(!name) { window.showToast?.('أ¢ع‘آ أ¯آ¸عˆ ط·آ£ط·آ¯ط·آ®ط¸â€‍ ط·آ§ط¸â€‍ط·آ§ط·آ³ط¸â€¦','warning'); return; }
    try {
        var { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var { db: database }   = await import('../firebase-config.js');
        var updates = { name, role };
        if(dept) updates.department = dept;
        await updateDoc(doc(database,'users',docId), updates);
        window.showToast?.('أ¢إ“â€¦ ط·ع¾ط¸â€¦ ط·آ­ط¸ظ¾ط·آ¸ ط·آ§ط¸â€‍ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ط·آ§ط·ع¾');
        document.getElementById('edit-user-modal')?.remove();
        setTimeout(() => window.loadSystemUsersDirectoryLive?.(), 500);
    } catch(e) { window.showToast?.('أ¢â€Œإ’ '+e.message,'error'); }
};

// أ¢â€¢ع¯أ¢â€¢ع¯ ط·آ­ط·آ°ط¸ظ¾ ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ أ¢â€¢ع¯أ¢â€¢ع¯
window.deleteUser = async function(docId, userName) {
    if(!confirm('ط¸â€،ط¸â€‍ ط·آ£ط¸â€ ط·ع¾ ط¸â€¦ط·ع¾ط·آ£ط¸ئ’ط·آ¯ ط¸â€¦ط¸â€  ط·آ­ط·آ°ط¸ظ¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦: ' + userName + 'ط·ع؛\n\nط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒ ط¸â€‍ط·آ§ ط¸ظ¹ط¸â€¦ط¸ئ’ط¸â€  ط·آ§ط¸â€‍ط·ع¾ط·آ±ط·آ§ط·آ¬ط·آ¹ ط·آ¹ط¸â€ ط¸â€،!')) return;
    try {
        var { db } = await import('../firebase-config.js');
        var { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        await deleteDoc(doc(db, 'users', docId));
        window.showToast('أ¢إ“â€¦ ط·ع¾ط¸â€¦ ط·آ­ط·آ°ط¸ظ¾ ' + userName);
        loadSystemUsersDirectoryLive();
    } catch(e) {
        window.showToast('أ¢â€Œإ’ ط·آ®ط·آ·ط·آ£: ' + e.message, 'error');
    }
};
