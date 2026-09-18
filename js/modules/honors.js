import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• onSnapshot cleanup â•â•
let _honorsUnsubs = [];
window._cleanupHonors = function() {
    _honorsUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _honorsUnsubs = [];
};


const ALL_CLASSES = ['6/1','6/2','6/3','6/4','7/1','7/2','7/3','7/4','8/1','8/2','8/3','8/4','9/1','9/2','9/3','9/4'];

export async function initHonorsModule() {
    var container = document.getElementById('tab-honors');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--hover-color);">
        <h2><i class="bi bi-trophy-fill" style="color:var(--hover-color);"></i> Ù„ÙˆØ­Ø© Ø§Ù„Ø´Ø±Ù Ø§Ù„ÙƒØ¨Ø±Ù‰ Ù„ÙØ§Ø¦Ù‚ÙŠ Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">Ù‚ÙŠØ¯ Ø£Ø³Ø§Ù…ÙŠ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ† Ø§Ù„Ø£ÙˆØ§Ø¦Ù„ ÙˆØ§Ù„Ù…ØªÙ…ÙŠØ²ÙŠÙ† Ø¹Ù„Ù‰ Ù…Ø³ØªÙˆÙ‰ Ù…Ø¯Ø±Ø³ØªÙƒÙ….</p>
        <form id="honors-board-add-form" onsubmit="window.handlePostToHonorsBoardLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
                <div>
                    <label>Ù¡. Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„</label>
                    <select id="honor-std-class" onchange="window.onHonorClassChange(this.value)" required>
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ --</option>
                        ${ALL_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label>Ù¢. Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚</label>
                    <select id="honor-std-name" disabled required>
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø£ÙˆÙ„Ø§Ù‹ --</option>
                    </select>
                </div>
                <div>
                    <label>Ø§Ù„ÙˆØ³Ø§Ù… Ø§Ù„Ù…Ù…Ù†ÙˆØ­ Ù„Ù‡</label>
                    <select id="honor-badge-title" required>
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙˆØ³Ø§Ù… --</option>
                        <option value="Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø£ÙˆÙ„">ðŸ¥‡ Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø£ÙˆÙ„</option>
                        <option value="Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø«Ø§Ù†ÙŠ">ðŸ¥ˆ Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø«Ø§Ù†ÙŠ</option>
                        <option value="Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø«Ø§Ù„Ø«">ðŸ¥‰ Ø§Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ø«Ø§Ù„Ø«</option>
                        <option value="Ø­Ø§ÙØ¸ Ø§Ù„Ù‚Ø±Ø¢Ù† Ø§Ù„ÙƒØ±ÙŠÙ…">ðŸ“– Ø­Ø§ÙØ¸ Ø§Ù„Ù‚Ø±Ø¢Ù† Ø§Ù„ÙƒØ±ÙŠÙ…</option>
                        <option value="Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„Ù…Ø«Ø§Ù„ÙŠ">ðŸŽ¯ Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„Ù…Ø«Ø§Ù„ÙŠ</option>
                        <option value="Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ Ø§Ù„Ù…ØªÙ…ÙŠØ²">â­ Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ Ø§Ù„Ù…ØªÙ…ÙŠØ²</option>
                        <option value="Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ù…Ø¬ØªÙ…Ø¹ÙŠØ©">ðŸ¤ Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ù…Ø¬ØªÙ…Ø¹ÙŠØ©</option>
                        <option value="Ø£Ø®Ø±Ù‰">ðŸ“Œ Ø£Ø®Ø±Ù‰</option>
                    </select>
                </div>
            </div>
            <button type="submit" style="width:100%; background:var(--hover-color); color:#fff; border:none; padding:10px; font-weight:bold; margin-top:10px; cursor:pointer; border-radius:5px;"><i class="bi bi-star-fill"></i> Ø­Ù‚Ù† ÙˆÙ†Ø´Ø± Ø§Ø³Ù… Ø§Ù„ÙØ§Ø¦Ù‚ Ø¨Ù„ÙˆØ­Ø© Ø§Ù„Ø´Ø±Ù</button>
        </form>
    </div>
    <div class="card" style="border-top:5px solid var(--primary-color); margin-top:20px;">
        <h2>ðŸ† Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø´Ø±Ù Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©</h2>
        <div id="honors-board-display-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:15px; margin-top:15px;">
            <p style="text-align:center; color:#999; font-weight:bold; grid-column:1/-1;">â³ Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ù„ÙˆØ­Ø© Ø§Ù„Ù…ØªÙ…ÙŠØ²ÙŠÙ† Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ©...</p>
        </div>
    </div>`;

    loadHonorsBoardCardsLive();
}

window.onHonorClassChange = async function(classId) {
    var sel = document.getElementById('honor-std-name');
    if(!classId) { sel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø£ÙˆÙ„Ø§Ù‹ --</option>'; sel.disabled = true; return; }
    sel.innerHTML = '<option value="">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</option>';
    sel.disabled = true;
    try {
        var q = query(collection(db,'students'), where('schoolId','==',getActiveSchoolId()), where('classId','==',classId));
        var snap = await getDocs(q);
        var names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        if(!names.length) { sel.innerHTML = '<option value="">âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨</option>'; return; }
        sel.innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('');
        sel.disabled = false;
    } catch(e) { sel.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ Ø¨Ø§Ù„ØªØ­Ù…ÙŠÙ„</option>'; }
};

window.handlePostToHonorsBoardLive = async function(e) {
    e.preventDefault();
    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©
    var classId = document.getElementById('honor-std-class').value.trim();
    var name = document.getElementById('honor-std-name').value.trim();
    var badge = document.getElementById('honor-badge-title').value.trim();

    if(!classId || !name || !badge) { window.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ØªØ¹Ø¨Ø¦Ø© Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„'); return; }

    try {
        await addDoc(collection(db, 'honors_board'), { 
            schoolId: schoolId, // ðŸ”‘ Ø§Ù„Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø£Ù…Ù†ÙŠØ©
            name: name, 
            classId: classId, 
            badge: badge, 
            createdAt: serverTimestamp() 
        });
        window.showToast('âœ“ ØªÙ… Ø¨Ù†Ø¬Ø§Ø­ ØªØ®Ù„ÙŠØ¯ Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¨Ù„ÙˆØ­Ø© Ø§Ù„Ø´Ø±Ù.');
        document.getElementById('honors-board-add-form').reset();
        document.getElementById('honor-std-name').innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø£ÙˆÙ„Ø§Ù‹ --</option>';
        document.getElementById('honor-std-name').disabled = true;
    } catch(err) { window.showToast('âŒ Ø®Ø·Ø£: ' + err.message, 'error'); }
};

async function loadHonorsBoardCardsLive() {
    var grid = document.getElementById('honors-board-display-grid');
    if(!grid) return;
    
    var schoolId = getActiveSchoolId();
    var q = query(collection(db, 'honors_board'), where('schoolId', '==', schoolId));
    
    onSnapshot(q, (snap) => {
        var html = '';
        snap.forEach(doc => {
            var d = doc.data();
            html += `
            <div style="background:#fffcf5; border:1px solid var(--hover-color); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                <div style="font-size:30px; color:var(--hover-color);"><i class="bi bi-award-fill"></i></div>
                <h4 style="font-weight:900; color:var(--primary-color); margin:10px 0;">${d.name || '-'}</h4>
                <p style="font-size:12px; font-weight:bold; color:#777; margin:3px 0;">Ø§Ù„ÙØµÙ„: ${d.classId || '-'}</p>
                <span class="badge warning" style="background:var(--accent-color); font-size:11px; color:#fff; padding:3px 8px; border-radius:4px;">ðŸ† ${d.badge || '-'}</span>
            </div>`;
        });
        grid.innerHTML = html || `<p style="text-align:center; color:#999; grid-column:1/-1; font-weight:bold;">ðŸ’¡ Ø§Ù„Ù„ÙˆØ­Ø© Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù‚ÙŠØ¯ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ† Ø§Ù„Ø£ÙˆØ§Ø¦Ù„.</p>`;
    });
}

// ===== Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø³Ø¬Ù„ =====
window.printHonorsPDF = async function() {
    var tbody = document.getElementById('honors-board-display-grid');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„Ø§Ø³Ù…</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„ÙˆØ³Ø§Ù…</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'Ù„ÙˆØ­Ø©_Ø§Ù„Ø´Ø±Ù', 'Ù„ÙˆØ­Ø© Ø§Ù„Ø´Ø±Ù');
};

window.printHonorsDirect = function() {
    var tbody = document.getElementById('honors-board-display-grid');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„Ø§Ø³Ù…</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„ÙˆØ³Ø§Ù…</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'Ù„ÙˆØ­Ø© Ø§Ù„Ø´Ø±Ù');
};