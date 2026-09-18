import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• onSnapshot cleanup â•â•
let _distUnsubs = [];
window._cleanupDistribution = function() {
    _distUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _distUnsubs = [];
};


const ALL_CLASSES = ['6/1','6/2','6/3','6/4','7/1','7/2','7/3','7/4','8/1','8/2','8/3','8/4','9/1','9/2','9/3','9/4'];

export async function initDistributionModule() {
    var container = document.getElementById('tab-coverage');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--success-color);">
        <h2><i class="bi bi-shuffle" style="color:var(--success-color);"></i> Ù…Ø­Ø±Ùƒ ØªÙ†Ø¸ÙŠÙ… ÙˆØªÙˆØ²ÙŠØ¹ ÙØµÙˆÙ„ ØºØ±Ù Ø§Ù„Ù…Ù†Ø´Ø£Ø© ÙˆØ¬Ø¯ÙˆÙ„ Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">Ù†Ø¸Ø§Ù… Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„ÙÙˆØ±ÙŠØ› Ù„Ø±Ø¨Ø· Ø§Ù„ÙØµÙˆÙ„ ÙˆØªØ«Ø¨ÙŠØª Ù…Ø¹Ù„Ù…Ø§Øª Ø§Ù„Ø§Ø­ØªÙŠØ§Ø· ÙˆØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„ÙŠÙˆÙ…ÙŠØ© Ø¨ØºØ±Ù Ø§Ù„Ù…Ø¯Ø±Ø³Ø©.</p>
        
        <form id="class-dist-reg-form" onsubmit="window.handleRegisterDistributionLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                <div>
                    <label style="font-weight:700; font-size:13px;">Ø§Ù„ÙØµÙ„ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù</label>
                    <select id="dist-class-id" required>
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ --</option>
                        ${ALL_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-weight:700; font-size:13px;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…ÙˆÙƒÙ„ Ø¥Ù„ÙŠÙ‡ Ø§Ù„Ø§Ø­ØªÙŠØ§Ø· / Ø§Ù„Ù…Ù‡Ù…Ø©</label>
                    <select id="dist-teacher-assign" required>
                        <option value="">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¯Ù„ÙŠÙ„ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†...</option>
                    </select>
                </div>
                <div><label style="font-weight:700; font-size:13px;">Ø§Ù„Ù…ÙˆÙ‚Ø¹ / Ø§Ù„ØºØ±ÙØ© Ø§Ù„Ù…Ø®ØµØµØ©</label><input type="text" id="dist-room-id" placeholder="Ù…Ø«Ø§Ù„: Ù…Ø®ØªØ¨Ø± Ø§Ù„Ø­Ø§Ø³ÙˆØ¨ 1" required style="width:100%; padding:8px;"></div>
            </div>
            <button type="submit" style="background:var(--success-color); width:100%; font-weight:bold; margin-top:15px; border:none; padding:12px; color:#fff; cursor:pointer; border-radius:8px;"><i class="bi bi-cpu-fill"></i> Ø¨Ø« ÙˆØ¬Ø¯ÙˆÙ„Ø© Ø£Ù…Ø± Ø§Ù„ØªÙˆØ²ÙŠØ¹ ÙÙˆØ±Ø§ Ù„Ù„Ù…Ù†Ø¸ÙˆÙ…Ø©</button>
        </form>
    </div>

    <div class="card" style="margin-top:14px;">
        <h3 style="font-size:15px;"><i class="bi bi-clock-history"></i> Ø³Ø¬Ù„ ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø§Ø­ØªÙŠØ§Ø· Ø§Ù„ÙŠÙˆÙ…</h3>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <thead><tr style="background:#f4f6f9;">
                    <th style="padding:8px; text-align:right;">Ø§Ù„ÙØµÙ„</th>
                    <th style="padding:8px; text-align:right;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…ÙƒÙ„Ù‘Ù</th>
                    <th style="padding:8px; text-align:right;">Ø§Ù„Ù…ÙˆÙ‚Ø¹/Ø§Ù„ØºØ±ÙØ©</th>
                </tr></thead>
                <tbody id="dist-logs-tbody">
                    <tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;

    loadTeacherDirectoryForDistribution();
    listenToDistributionLogs();
}

async function loadTeacherDirectoryForDistribution() {
    var sel = document.getElementById('dist-teacher-assign');
    try {
        var schoolId = getActiveSchoolId();
        var q = query(collection(db,'users'), where('schoolId','==',schoolId), where('role','==','teacher'));
        var snap = await getDocs(q);
        var names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        if(!names.length) { sel.innerHTML = '<option value="">âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø¹Ù„Ù…ÙŠÙ† Ù…Ø³Ø¬Ù‘Ù„ÙŠÙ†</option>'; return; }
        sel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¹Ù„Ù… --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('');
    } catch(e) { sel.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ Ø¨Ø§Ù„ØªØ­Ù…ÙŠÙ„</option>'; }
}

function listenToDistributionLogs() {
    var schoolId = getActiveSchoolId();
    var q = query(collection(db, 'class_distribution'), where('schoolId', '==', schoolId));
    onSnapshot(q, (snap) => {
        var tbody = document.getElementById('dist-logs-tbody');
        if (!tbody) return;
        var html = '';
        var docs = snap.docs.sort((a,b) => (b.data().createdAt?.seconds||0) - (a.data().createdAt?.seconds||0));
        docs.forEach(d => {
            var r = d.data();
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;"><b>${r.classId || '-'}</b></td>
                <td style="padding:8px;">Ø£. ${r.teacherName || '-'}</td>
                <td style="padding:8px; color:#666;">${r.roomLocation || '-'}</td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">ðŸ’¡ Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªÙˆØ²ÙŠØ¹ Ù…Ø³Ø¬Ù‘Ù„ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.</td></tr>';
    });
}

window.handleRegisterDistributionLive = async function(e) {
    e.preventDefault();
    var cId = document.getElementById('dist-class-id').value.trim();
    var tName = document.getElementById('dist-teacher-assign').value.trim();
    var room = document.getElementById('dist-room-id').value.trim();
    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ© Ù„Ù„Ù€ SaaS

    if(!cId || !tName) { window.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ ÙˆØ§Ù„Ù…Ø¹Ù„Ù…'); return; }
    
    try {
        await addDoc(collection(db, 'class_distribution'), { 
            schoolId: schoolId, // ðŸ”‘ Ø¹Ø²Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
            classId: cId, 
            teacherName: tName, 
            roomLocation: room, 
            createdAt: serverTimestamp() 
        });
        window.showToast(`âœ“ ØªÙ… Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ø« ÙˆÙ†Ø´Ø± Ø®Ø·Ø© ØªÙˆØ²ÙŠØ¹ Ø§Ù„ÙØµÙ„: ${cId}\nØ§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…ÙƒÙ„Ù Ø¨Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·: Ø£. ${tName}`);
        document.getElementById('class-dist-reg-form').reset();
    } catch(err) { 
        window.showToast('Ø®Ø·Ø£ Ø³Ø­Ø§Ø¨ÙŠ: ' + err.message, 'error'); 
    }
};