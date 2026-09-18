import { db, getActiveSchoolId } from '../firebase-config.js';
import { doc, getDoc, updateDoc, collection, getDocs, query, where }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initSchoolSettingsModule() {
    var container = document.getElementById('tab-school-settings');
    if (!container) return;

    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--navy);">
        <h2><i class="bi bi-gear-fill" style="color:var(--navy);"></i> Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</h2>
        <p style="font-size:12px; color:var(--mid); margin-bottom:20px;">Ø¥Ø¯Ø§Ø±Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø© ÙˆØ§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ø©</p>
        <div id="ss-loading" style="text-align:center; padding:30px; color:var(--mid);">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
        <div id="ss-form" style="display:none;"></div>
    </div>

    <div class="card" style="border-top:5px solid var(--gold); margin-top:14px;">
        <h3 style="font-size:14px; font-weight:900; margin-bottom:14px;"><i class="bi bi-bar-chart-fill" style="color:var(--gold);"></i> Ø¥Ø­ØµØ§Ø¡Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</h3>
        <div id="ss-stats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
            <div style="text-align:center; padding:20px; color:var(--mid);">â³</div>
        </div>
    </div>`;

    await loadSchoolSettings();
    await loadSchoolStats();
}

async function loadSchoolSettings() {
    var schoolId = getActiveSchoolId();
    var formEl = document.getElementById('ss-form');
    var loadEl = document.getElementById('ss-loading');

    try {
        var snap = await getDoc(doc(db, 'schools', schoolId));
        var data = snap.exists() ? snap.data() : {};

        loadEl.style.display = 'none';
        formEl.style.display = 'block';

        formEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:16px;">
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ø§Ø³Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</label>
                <input type="text" id="ss-name" value="${data.name||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ø§Ù„Ù…Ù†Ø·Ù‚Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©</label>
                <select id="ss-region" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none; background:#fff;">
                    <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ù†Ø·Ù‚Ø© --</option>
                    ${['Ø§Ù„Ø¹Ø§ØµÙ…Ø©','Ø­ÙˆÙ„ÙŠ','Ø§Ù„ÙØ±ÙˆØ§Ù†ÙŠØ©','Ø§Ù„Ø£Ø­Ù…Ø¯ÙŠ','Ù…Ø¨Ø§Ø±Ùƒ Ø§Ù„ÙƒØ¨ÙŠØ±','Ø§Ù„Ø¬Ù‡Ø±Ø§Ø¡'].map(r =>
                        `<option value="${r}" ${data.region===r?'selected':''}>${r}</option>`
                    ).join('')}
                </select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ù†ÙˆØ¹ Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</label>
                <select id="ss-type" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none; background:#fff;">
                    <option value="Ù…ØªÙˆØ³Ø·Ø© Ø¨Ù†ÙŠÙ†" ${data.type==='Ù…ØªÙˆØ³Ø·Ø© Ø¨Ù†ÙŠÙ†'?'selected':''}>Ù…ØªÙˆØ³Ø·Ø© Ø¨Ù†ÙŠÙ†</option>
                    <option value="Ù…ØªÙˆØ³Ø·Ø© Ø¨Ù†Ø§Øª" ${data.type==='Ù…ØªÙˆØ³Ø·Ø© Ø¨Ù†Ø§Øª'?'selected':''}>Ù…ØªÙˆØ³Ø·Ø© Ø¨Ù†Ø§Øª</option>
                    <option value="Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠØ© Ø¨Ù†ÙŠÙ†" ${data.type==='Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠØ© Ø¨Ù†ÙŠÙ†'?'selected':''}>Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠØ© Ø¨Ù†ÙŠÙ†</option>
                    <option value="Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠØ© Ø¨Ù†Ø§Øª" ${data.type==='Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠØ© Ø¨Ù†Ø§Øª'?'selected':''}>Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠØ© Ø¨Ù†Ø§Øª</option>
                    <option value="Ø«Ø§Ù†ÙˆÙŠØ© Ø¨Ù†ÙŠÙ†" ${data.type==='Ø«Ø§Ù†ÙˆÙŠØ© Ø¨Ù†ÙŠÙ†'?'selected':''}>Ø«Ø§Ù†ÙˆÙŠØ© Ø¨Ù†ÙŠÙ†</option>
                    <option value="Ø«Ø§Ù†ÙˆÙŠØ© Ø¨Ù†Ø§Øª" ${data.type==='Ø«Ø§Ù†ÙˆÙŠØ© Ø¨Ù†Ø§Øª'?'selected':''}>Ø«Ø§Ù†ÙˆÙŠØ© Ø¨Ù†Ø§Øª</option>
                </select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ø§Ù„Ù„ÙˆÙ† Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ</label>
                <input type="color" id="ss-color" value="${data.primaryColor||'#0b2545'}"
                    style="width:100%; height:44px; border:1.5px solid var(--line); border-radius:8px; cursor:pointer; padding:2px;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">ØªØ§Ø±ÙŠØ® Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ</label>
                <input type="date" id="ss-expiry" value="${data.subscriptionEnd||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ø§Ù„Ø®Ø·Ø©</label>
                <select id="ss-plan" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none; background:#fff;">
                    <option value="basic" ${data.plan==='basic'?'selected':''}>Ø£Ø³Ø§Ø³ÙŠØ©</option>
                    <option value="pro" ${data.plan==='pro'?'selected':''}>Ø§Ø­ØªØ±Ø§ÙÙŠØ©</option>
                    <option value="enterprise" ${data.plan==='enterprise'?'selected':''}>Ù…Ø¤Ø³Ø³ÙŠØ©</option>
                </select>
            </div>
        </div>

        <!-- Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø© -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:14px; background:var(--off); border-radius:10px;">
            <span style="font-weight:800; font-size:13px;">Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©:</span>
            <select id="ss-status" style="padding:8px 14px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff;">
                <option value="active" ${data.status==='active'?'selected':''}>âœ… Ù†Ø´Ø·Ø©</option>
                <option value="suspended" ${data.status==='suspended'?'selected':''}>â¸ Ù…ÙˆÙ‚ÙˆÙØ©</option>
                <option value="expired" ${data.status==='expired'?'selected':''}>âŒ Ù…Ù†ØªÙ‡ÙŠØ©</option>
            </select>
            <span style="font-size:12px; color:var(--mid);">Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ù…Ø¯Ø±Ø³Ø©: <b>${schoolId}</b></span>
        </div>

        <!-- Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙˆØ§ØµÙ„ -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:16px;">
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</label>
                <input type="text" id="ss-phone" value="${data.phone||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">Ø§Ø³Ù… Ø§Ù„Ù…Ø¯ÙŠØ±</label>
                <input type="text" id="ss-principal" value="${data.principalName||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
        </div>

        <button onclick="window.saveSchoolSettings()"
            style="background:var(--navy); color:#fff; border:none; padding:13px 28px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:900; font-size:14px; cursor:pointer;">
            <i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª
        </button>`;

    } catch(e) {
        loadEl.innerHTML = `<div style="color:red; padding:20px;">âŒ ${e.message}</div>`;
    }
}

window.saveSchoolSettings = async function() {
    var schoolId = getActiveSchoolId();
    try {
        await updateDoc(doc(db, 'schools', schoolId), {
            name: document.getElementById('ss-name').value.trim(),
            region: document.getElementById('ss-region').value,
            type: document.getElementById('ss-type').value,
            primaryColor: document.getElementById('ss-color').value,
            subscriptionEnd: document.getElementById('ss-expiry').value,
            plan: document.getElementById('ss-plan').value,
            status: document.getElementById('ss-status').value,
            phone: document.getElementById('ss-phone').value.trim(),
            principalName: document.getElementById('ss-principal').value.trim(),
        });
        window.showToast?.('âœ… ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø©');
    } catch(e) {
        window.showToast?.('âŒ ' + e.message, 'error');
    }
};

async function loadSchoolStats() {
    var statsEl = document.getElementById('ss-stats');
    if (!statsEl) return;
    var schoolId = getActiveSchoolId();
    try {
        var [studentsSnap, usersSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db,'students'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'users'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'classes'), where('schoolId','==',schoolId))),
        ]);

        var stats = [
            { icon: 'ðŸ‘¥', num: studentsSnap.size, label: 'Ø·Ø§Ù„Ø¨' },
            { icon: 'ðŸ‘¤', num: usersSnap.size, label: 'Ù…ÙˆØ¸Ù' },
            { icon: 'ðŸ«', num: classesSnap.size, label: 'ÙØµÙ„' },
        ];

        statsEl.innerHTML = stats.map(s => `
            <div style="background:#fff; border-radius:12px; padding:16px; border:1px solid var(--line); text-align:center;">
                <span style="font-size:28px; display:block; margin-bottom:6px;">${s.icon}</span>
                <span style="font-size:24px; font-weight:900; display:block; color:var(--navy);">${s.num}</span>
                <span style="font-size:12px; font-weight:700; color:var(--mid);">${s.label}</span>
            </div>`).join('');
    } catch(e) {
        statsEl.innerHTML = `<div style="color:red;">âŒ ${e.message}</div>`;
    }
}
