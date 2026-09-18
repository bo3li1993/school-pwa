import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const ROLES = {
    admin: 'Ù…Ø¯ÙŠØ±',
    assistant_manager: 'Ù…Ø¯ÙŠØ± Ù…Ø³Ø§Ø¹Ø¯',
    wing_supervisor: 'Ù…Ø´Ø±Ù Ø¬Ù†Ø§Ø­',
    department_head: 'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…',
    social_worker: 'Ø£Ø®ØµØ§Ø¦ÙŠ Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ',
    nurse: 'Ù…Ù…Ø±Ø¶/Ø©',
    guard: 'Ø­Ø§Ø±Ø³ Ø£Ù…Ù†',
    teacher: 'Ù…Ø¹Ù„Ù…'
};

const DEPARTMENTS = [
    'Ø§Ù„Ø¹Ù„ÙˆÙ…', 'Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª', 'Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©', 'Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©',
    'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠØ©', 'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ©', 'Ø§Ù„Ø­Ø§Ø³ÙˆØ¨',
    'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„ÙÙ†ÙŠØ©', 'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©', 'Ø§Ù„ÙÙŠØ²ÙŠØ§Ø¡', 'Ø§Ù„ÙƒÙŠÙ…ÙŠØ§Ø¡', 'Ø§Ù„Ø£Ø­ÙŠØ§Ø¡'
];

export async function initUsersModule() {
    var container = document.getElementById('tab-users');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <!-- Ø¥Ø¶Ø§ÙØ© Ù…Ø³ØªØ®Ø¯Ù… Ø¬Ø¯ÙŠØ¯ -->
    <div class="card" style="border-top:5px solid var(--sky);">
        <h2><i class="bi bi-person-plus-fill" style="color:var(--sky);"></i> Ø¥Ø¶Ø§ÙØ© Ù…Ø³ØªØ®Ø¯Ù… Ø¬Ø¯ÙŠØ¯</h2>
        <form id="new-user-form" onsubmit="window.handleCreateNewUserLive(event)">
            <input type="hidden" id="reg-school-id" value="${schoolId}">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:14px;">
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„ÙƒØ§Ù…Ù„ *</label>
                    <input type="text" id="reg-name" placeholder="Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø¹Ù„ÙŠ" required
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… (ID) *</label>
                    <input type="text" id="reg-user-id" placeholder="ahmed.ali" required
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± *</label>
                    <input type="password" id="reg-password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required minlength="6"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© *</label>
                    <select id="reg-role" required onchange="window.toggleDepartmentField(this.value)"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif;">
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© --</option>
                        ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
                    </select>
                </div>
                <div id="dept-field-wrapper" style="display:none;">
                    <label style="font-weight:700; font-size:12px; display:block; margin-bottom:5px;">Ø§Ù„Ù‚Ø³Ù…</label>
                    <select id="reg-department"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif;">
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø³Ù… --</option>
                        ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                </div>
            </div>
            <button type="submit"
                style="width:100%; background:var(--sky); color:#fff; border:none; padding:13px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:900; font-size:15px; cursor:pointer;">
                <i class="bi bi-person-check-fill"></i> Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨
            </button>
        </form>
    </div>

    <!-- Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† -->
    <div class="card" style="border-top:5px solid var(--navy); margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <h2 style="margin:0;"><i class="bi bi-people-fill" style="color:var(--gold);"></i> Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† Ø§Ù„Ù…Ø³Ø¬Ù„ÙˆÙ†</h2>
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" id="users-search" placeholder="ðŸ” Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ ID..." oninput="window.filterUsers()"
                    style="padding:8px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; outline:none;">
                <select id="users-role-filter" onchange="window.filterUsers()"
                    style="padding:8px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; outline:none; background:#fff;">
                    <option value="">ÙƒÙ„ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª</option>
                    ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
                </select>
            </div>
        </div>
        <div id="users-list">
            <p style="text-align:center; color:#999; padding:30px;">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†...</p>
        </div>
    </div>

    <!-- Modal ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… -->
    <div id="edit-user-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:420px; width:92%; direction:rtl;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; font-weight:900; color:var(--navy);">ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</h3>
                <button onclick="document.getElementById('edit-user-modal').style.display='none'" style="background:none; border:none; font-size:22px; cursor:pointer;">âœ•</button>
            </div>
            <input type="hidden" id="edit-user-doc-id">
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„</label>
            <input type="text" id="edit-user-name"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:12px; box-sizing:border-box;">
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©</label>
            <select id="edit-user-role"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:12px;">
                ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">Ø§Ù„Ù‚Ø³Ù… (Ù„Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†)</label>
            <select id="edit-user-dept"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:18px;">
                <option value="">-- Ø¨Ø¯ÙˆÙ† Ù‚Ø³Ù… --</option>
                ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
            <button onclick="window.saveUserEdit()"
                style="width:100%; background:var(--sky); color:#fff; border:none; padding:12px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                <i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª
            </button>
        </div>
    </div>

    <!-- Modal Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± -->
    <div id="reset-pass-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:380px; width:92%; direction:rtl;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h3 style="margin:0; font-weight:900; color:var(--navy);">Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±</h3>
                <button onclick="document.getElementById('reset-pass-modal').style.display='none'" style="background:none; border:none; font-size:22px; cursor:pointer;">âœ•</button>
            </div>
            <p id="reset-pass-user-name" style="font-weight:700; color:var(--sky); margin-bottom:12px;"></p>
            <input type="hidden" id="reset-pass-doc-id">
            <label style="font-weight:700; font-size:12px; display:block; margin-bottom:4px;">ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©</label>
            <input type="password" id="reset-new-pass" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" minlength="6"
                style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; margin-bottom:16px; box-sizing:border-box;">
            <button onclick="window.executeResetPassword()"
                style="width:100%; background:var(--gold); color:#fff; border:none; padding:12px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                <i class="bi bi-key-fill"></i> ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±
            </button>
        </div>
    </div>`;

    await loadSystemUsersDirectoryLive();
}

// ===== Ø¥Ø¸Ù‡Ø§Ø±/Ø¥Ø®ÙØ§Ø¡ Ø­Ù‚Ù„ Ø§Ù„Ù‚Ø³Ù… =====
window.toggleDepartmentField = function(role) {
    var show = ['teacher', 'department_head'].includes(role);
    document.getElementById('dept-field-wrapper').style.display = show ? 'block' : 'none';
};

// ===== Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø³ØªØ®Ø¯Ù… Ø¬Ø¯ÙŠØ¯ =====
window.handleCreateNewUserLive = async function(e) {
    e.preventDefault();
    var name = document.getElementById('reg-name').value.trim();
    var userId = document.getElementById('reg-user-id').value.trim();
    var password = document.getElementById('reg-password').value.trim();
    var role = document.getElementById('reg-role').value;
    var department = document.getElementById('reg-department')?.value || '';
    var schoolId = getActiveSchoolId();

    if (!name || !userId || !password || !role) {
        window.showToast?.('ÙŠØ±Ø¬Ù‰ ØªØ¹Ø¨Ø¦Ø© Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©', 'warning');
        return;
    }

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var createUser = httpsCallable(fns, 'createUser');

        await createUser({ name, userId, password, role, department, schoolId });

        window.showToast?.('âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¨Ù†Ø¬Ø§Ø­');
        document.getElementById('new-user-form').reset();
        document.getElementById('dept-field-wrapper').style.display = 'none';
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('âŒ Ø®Ø·Ø£: ' + err.message, 'error');
    }
};

// ===== ØªØ­Ù…ÙŠÙ„ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† =====
var allUsersCache = [];

async function loadSystemUsersDirectoryLive() {
    var listEl = document.getElementById('users-list');
    if (!listEl) return;

    var schoolId = getActiveSchoolId();
    listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>';

    try {
        var snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
        allUsersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        allUsersCache.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        renderUsersList(allUsersCache);
    } catch(err) {
        listEl.innerHTML = `<p style="color:red; text-align:center; padding:20px;">âŒ ${err.message}</p>`;
    }
}

function renderUsersList(users) {
    var listEl = document.getElementById('users-list');
    if (!listEl) return;

    if (!users.length) {
        listEl.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† Ù…Ø³Ø¬Ù„ÙˆÙ†</p>';
        return;
    }

    var html = `<div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
            <tr style="background:var(--navy); color:#fff;">
                <th style="padding:10px 12px; text-align:right;">#</th>
                <th style="padding:10px 12px; text-align:right;">Ø§Ù„Ø§Ø³Ù…</th>
                <th style="padding:10px 12px; text-align:right;">Ø§Ù„Ù…Ø¹Ø±Ù‘Ù</th>
                <th style="padding:10px 12px; text-align:right;">Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©</th>
                <th style="padding:10px 12px; text-align:right;">Ø§Ù„Ù‚Ø³Ù…</th>
                <th style="padding:10px 12px; text-align:right;">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                <th style="padding:10px 12px; text-align:center;">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
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
                        ${isActive ? 'Ù†Ø´Ø·' : 'Ù…ÙˆÙ‚ÙˆÙ'}
                    </span>
                </td>
                <td style="padding:10px 12px;">
                    <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                        <button onclick="window.openEditUserModal('${u.id}','${(u.name||'').replace(/'/g,"\\'")}','${u.role||''}','${u.userId||''}','${u.department||''}')"
                            style="background:var(--sky); color:#fff; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="bi bi-pencil-fill"></i> ØªØ¹Ø¯ÙŠÙ„
                        </button>
                        <button onclick="window.openResetPasswordModal('${u.id}','${(u.name||'').replace(/'/g,"\\'")}' )"
                            style="background:var(--gold); color:#fff; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="bi bi-key-fill"></i> ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±
                        </button>
                        <button onclick="window.toggleUserStatus('${u.id}','${u.status||'active'}')"
                            style="background:${isActive ? '#fef2f2' : '#f0fdf4'}; color:${isActive ? '#dc2626' : '#16a34a'}; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            ${isActive ? 'â¸ Ø¥ÙŠÙ‚Ø§Ù' : 'â–¶ ØªÙØ¹ÙŠÙ„'}
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

// ===== Ø¨Ø­Ø« ÙˆÙÙ„ØªØ±Ø© =====
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

// ===== ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… =====
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

    if (!name || !role) { window.showToast?.('Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„ØµÙ„Ø§Ø­ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø§Ù†', 'warning'); return; }

    try {
        await updateDoc(doc(db, 'users', docId), { name, role, department });
        document.getElementById('edit-user-modal').style.display = 'none';
        window.showToast?.('âœ… ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…');
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('âŒ ' + err.message, 'error');
    }
};

// ===== Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± =====
window.openResetPasswordModal = function(docId, userName) {
    document.getElementById('reset-pass-doc-id').value = docId;
    document.getElementById('reset-pass-user-name').textContent = 'ðŸ‘¤ ' + userName;
    document.getElementById('reset-new-pass').value = '';
    document.getElementById('reset-pass-modal').style.display = 'flex';
};

window.executeResetPassword = async function() {
    var docId = document.getElementById('reset-pass-doc-id').value;
    var newPass = document.getElementById('reset-new-pass').value.trim();

    if (!newPass || newPass.length < 6) { window.showToast?.('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„', 'warning'); return; }

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var resetFn = httpsCallable(fns, 'resetUserPassword');
        await resetFn({ targetUserDocId: docId, newPassword: newPass });
        document.getElementById('reset-pass-modal').style.display = 'none';
        window.showToast?.('âœ… ØªÙ… ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­');
    } catch(err) {
        window.showToast?.('âŒ ' + err.message, 'error');
    }
};

// ===== Ø¥ÙŠÙ‚Ø§Ù/ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… =====
window.toggleUserStatus = async function(docId, currentStatus) {
    var newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    var label = newStatus === 'suspended' ? 'Ø¥ÙŠÙ‚Ø§Ù' : 'ØªÙØ¹ÙŠÙ„';
    if (!confirm(`Ù‡Ù„ ØªØ±ÙŠØ¯ ${label} Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŸ`)) return;

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var updateStatus = httpsCallable(fns, 'updateUserStatus');
        await updateStatus({ targetUserDocId: docId, newStatus });
        window.showToast?.(`âœ… ØªÙ… ${label} Ø§Ù„Ø­Ø³Ø§Ø¨`);
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('âŒ ' + err.message, 'error');
    }
};

// ===== Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… =====
window.deleteUser = async function(docId, userName) {
    if (!confirm(`Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… "${userName}" Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹.`)) return;
    try {
        await deleteDoc(doc(db, 'users', docId));
        window.showToast?.('âœ… ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…');
        await loadSystemUsersDirectoryLive();
    } catch(err) {
        window.showToast?.('âŒ ' + err.message, 'error');
    }
};
