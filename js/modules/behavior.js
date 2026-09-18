import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, addDoc, query, where, serverTimestamp, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• onSnapshot cleanup â•â•
let _behaviorUnsubs = [];
function cleanupBehavior() {
    _behaviorUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _behaviorUnsubs = [];
}


export async function initBehaviorModule() {
    var container = document.getElementById('tab-behavior');
    if (!container) return;

    var currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-shield-exclamation" style="color:var(--danger-color);"></i> Ù†Ø¸Ø§Ù… Ø±ØµØ¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ØµÙ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ ÙƒØ´Ù Ø§Ù„Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ØŒ Ø«Ù… Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø³Ù„ÙˆÙƒÙŠ ÙˆØ­Ø§Ù„Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©.</p>
            
            <form id="behavior-reg-form" onsubmit="window.handleRegisterBehaviorLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">1. Ø§Ù„ØµÙ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ:</label>
                        <select id="beh-class-select" onchange="window.handleBehClassChange(this.value)" required>
                            <option value="">-- Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„ÙØµÙˆÙ„... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">2. Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø±Ø¨Ø§Ø¹ÙŠ:</label>
                        <select id="beh-student-select" disabled required>
                            <option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">3. Ù†ÙˆØ¹ Ø§Ù„Ø³Ù„ÙˆÙƒ Ø§Ù„Ù…Ø±ØµÙˆØ¯:</label>
                        <select id="beh-behavior-type" required>
                            <option value="">-- Ø§Ø®ØªØ± Ù†ÙˆØ¹ Ø§Ù„Ø³Ù„ÙˆÙƒ --</option>
                            <option value="ØºÙŠØ§Ø¨ Ø¨Ø¯ÙˆÙ† Ø¹Ø°Ø±">ØºÙŠØ§Ø¨ Ø¨Ø¯ÙˆÙ† Ø¹Ø°Ø±</option>
                            <option value="ØªØ£Ø®Ø± Ù…ØªÙƒØ±Ø±">ØªØ£Ø®Ø± Ù…ØªÙƒØ±Ø±</option>
                            <option value="Ø¹Ø¯Ù… Ø§Ù„Ø§Ù†ØªØ¨Ø§Ù‡">Ø¹Ø¯Ù… Ø§Ù„Ø§Ù†ØªØ¨Ø§Ù‡ ÙÙŠ Ø§Ù„ÙØµÙ„</option>
                            <option value="Ù…Ø´Ø§Ø¬Ø±Ø©">Ù…Ø´Ø§Ø¬Ø±Ø©</option>
                            <option value="ØºØ´ ÙÙŠ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±">ØºØ´ ÙÙŠ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±</option>
                            <option value="Ø¥ØªÙ„Ø§Ù Ù…Ù…ØªÙ„ÙƒØ§Øª">Ø¥ØªÙ„Ø§Ù Ù…Ù…ØªÙ„ÙƒØ§Øª</option>
                            <option value="Ø¥Ø­Ø¶Ø§Ø± Ù…Ù…Ù†ÙˆØ¹Ø§Øª">Ø¥Ø­Ø¶Ø§Ø± Ù…Ù…Ù†ÙˆØ¹Ø§Øª</option>
                            <option value="Ø¹Ø¯Ù… Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„Ø²ÙŠ">Ø¹Ø¯Ù… Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø¨Ø§Ù„Ø²ÙŠ</option>
                            <option value="Ø³Ù„ÙˆÙƒ Ø¢Ø®Ø±">Ø³Ù„ÙˆÙƒ Ø¢Ø®Ø±</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">4. Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…Ø­ÙŠÙ„ Ù„Ù„Ø­Ø§Ù„Ø© (Ø¬Ù‡Ø© Ø§Ù„Ø¥Ø­Ø§Ù„Ø©):</label>
                        <input type="text" id="beh-referred-by" value="${currentUser.name || ''}" readonly style="padding:12px; background:var(--off); color:var(--mid); font-weight:700;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">5. Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªØ±Ø¨ÙˆÙŠ Ø§Ù„Ù…ØªØ®Ø°:</label>
                        <select id="beh-action-type" required>
                            <option value="ØªÙ†Ø¨ÙŠÙ‡ Ø´ÙÙ‡ÙŠ Ù…Ø¨Ø¯Ø¦ÙŠ">âš ï¸ ØªÙ†Ø¨ÙŠÙ‡ Ø´ÙÙ‡ÙŠ Ù…Ø¨Ø¯Ø¦ÙŠ ÙˆØªÙˆØ¬ÙŠÙ‡ Ø¥Ø±Ø´Ø§Ø¯ÙŠ</option>
                            <option value="ØªØ¹Ù‡Ø¯ Ø®Ø·ÙŠ Ø±Ø³Ù…ÙŠ">ðŸ“ Ø£Ø®Ø° ØªØ¹Ù‡Ø¯ Ø®Ø·ÙŠ Ø±Ø³Ù…ÙŠ Ø¨Ø­Ø¶ÙˆØ± Ø§Ù„Ø£Ø®ØµØ§Ø¦ÙŠ</option>
                            <option value="Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ ÙˆÙ„ÙŠ Ø£Ù…Ø± Ø§Ù„Ø·Ø§Ù„Ø¨">ðŸ‘¥ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ ÙˆÙ„ÙŠ Ø£Ù…Ø± Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø±Ø³Ù…ÙŠØ§Ù‹</option>
                            <option value="Ø¥Ù†Ø°Ø§Ø± Ø­Ø±Ù…Ø§Ù† Ø¥Ø¯Ø§Ø±ÙŠ">ðŸš« Ø¥ØµØ¯Ø§Ø± Ø¥Ù†Ø°Ø§Ø± Ø­Ø±Ù…Ø§Ù† Ø¥Ø¯Ø§Ø±ÙŠ (Ø¨Ø·Ø§Ù‚Ø© Ø³Ù„ÙˆÙƒ)</option>
                            <option value="ØªØ­ÙˆÙŠÙ„ Ø¥Ù„Ù‰ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©">âš–ï¸ ØªØ­ÙˆÙŠÙ„ Ø±Ø³Ù…ÙŠ Ù…Ø¨Ø§Ø´Ø± Ø¥Ù„Ù‰ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">6. Ù…ÙˆÙ‚Ù ÙˆØ­Ø§Ù„Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©:</label>
                        <select id="beh-followup-status" required>
                            <option value="ØªÙ…Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ù„Ø¥Ù‚ÙØ§Ù„">âœ… ØªÙ…Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ù„Ø¥Ù‚ÙØ§Ù„ Ø±Ø³Ù…ÙŠØ§Ù‹</option>
                            <option value="Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©">â³ Ù„Ø§ØŒ Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ø³ØªÙ…Ø±Ø©</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:12px; color:#444;">ØªÙØ§ØµÙŠÙ„ ÙˆÙ…Ù„Ø§Ø­Ø¸Ø§Øª Ø­Ø§Ù„Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ù„Ù„Ø§Ø¦Ø­Ø©:</label>
                    <textarea id="beh-notes" rows="3" placeholder="Ø£Ø¯Ø®Ù„ Ù…Ù„Ø®Øµ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…ØªØ®Ø°ØŒ Ø£Ø³Ø¨Ø§Ø¨ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŒ ÙˆØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ù‚Ø§Ø¨Ù„Ø© Ø¨Ø¯Ù‚Ø©..." required style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:8px; font-weight:600; font-size:13px; outline:none; margin-top:5px; color:#333;"></textarea>
                </div>
                
                <button type="submit" style="width:100%; background:var(--danger-color); color:#fff; font-weight:900; margin-top:15px; padding:15px; border-radius:8px; cursor:pointer; border:none;"><i class="bi bi-file-earmark-plus-fill"></i> Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªØ±Ø¨ÙˆÙŠ Ø¨Ø³Ø¬Ù„ Ø§Ù„Ø·Ø§Ù„Ø¨</button>
            </form>
        </div>

        
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button onclick="window.printBehaviorPDF()" 
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> ØªØµØ¯ÙŠØ± PDF
                </button>
                <button onclick="window.printBehaviorDirect()" 
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø© Ù…Ø¨Ø§Ø´Ø±Ø©
                </button>
            </div>
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-list-task"></i> Ø§Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ø¶Ø¨Ø· Ø§Ù„Ø³Ù„ÙˆÙƒÙŠ ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:10px; border:1px solid #eee;">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th>
                            <th style="padding:10px; border:1px solid #eee;">Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø«Ù„Ø§Ø«ÙŠ/Ø±Ø¨Ø§Ø¹ÙŠ</th>
                            <th style="padding:10px; border:1px solid #eee; text-align:center;">Ø§Ù„ÙØµÙ„</th>
                            <th style="padding:10px; border:1px solid #eee; text-align:center;">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªØ±Ø¨ÙˆÙŠ Ø§Ù„Ù…Ù‚ÙŠØ¯</th>
                            <th style="padding:10px; border:1px solid #eee; text-align:center;">Ø­Ø§Ù„Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th>
                            <th style="padding:10px; border:1px solid #eee;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…Ø­ÙŠÙ„</th>
                            <th style="padding:10px; border:1px solid #eee;">Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø£Ø®ØµØ§Ø¦ÙŠ Ø§Ù„Ø±Ø³Ù…ÙŠ</th>
                        </tr>
                    </thead>
                    <tbody id="behavior-logs-tbody">
                        <tr><td colspan="7" style="text-align:center; color:#999; padding:15px; font-weight:bold;">â³ Ø¬Ø§Ø±ÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ø§Ù„Ø­ÙŠØ© ÙÙˆØ±Ø§Ù‹...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        var classSelect = document.getElementById('beh-class-select');
        var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©

        // ØªØµÙÙŠØ© Ø§Ù„ÙØµÙˆÙ„ Ø§Ù„Ù…ØªØ§Ø­Ø© Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙÙ‚Ø· Ù„Ù…Ù†Ø¹ Ø§Ù„ØªØ¯Ø§Ø®Ù„
        var qClasses = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        _behaviorUnsubs.push(onSnapshot(qClasses, (snapshot) => {
            var classesSet = new Set();
            snapshot.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
            
            // Ø¬Ù„Ø¨ Ø§Ø­ØªÙŠØ§Ø·ÙŠ ÙŠØ¯Ø¹Ù… Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù† Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©
            if (classesSet.size === 0 && schoolId === 'hosainan') {
                var qFallback = query(collection(db, 'students'));
                getDocs(qFallback).then(fallbackSnap => {
                    fallbackSnap.forEach(doc => {
                        var d = doc.data();
                        if(!d.schoolId && d.classId) classesSet.add(d.classId.trim());
                    });
                    renderClassesDropdown(classesSet, classSelect);
                });
            } else {
                renderClassesDropdown(classesSet, classSelect);
            }
        });

        loadBehaviorLogsLive(); 
    } catch(e) { console.error(e); }
}

function renderClassesDropdown(classesSet, element) {
    if (!element) return;
    var htmlClasses = '<option value="">-- Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ØµÙ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ --</option>';
    Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
    element.innerHTML = htmlClasses;
}

window.handleBehClassChange = async function(classId) {
    var studentSelect = document.getElementById('beh-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">â³ Ø¬Ø§Ø±ÙŠ ÙØ±Ø² Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„ÙØµÙ„ Ø£Ø¨Ø¬Ø¯ÙŠØ§Ù‹ Ù„Ø§ÙŠÙ...</option>';
    studentSelect.disabled = true;

    var schoolId = getActiveSchoolId();

    try {
        // ÙÙ„ØªØ±Ø© Ù…Ø²Ø¯ÙˆØ¬Ø©: Ø§Ù„ÙØµÙ„ Ø§Ù„ØªØ§Ø¨Ø¹ Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙÙ‚Ø· Ù„Ø¶Ù…Ø§Ù† Ø§Ù„Ø®ØµÙˆØµÙŠØ© Ø§Ù„ØªØ§Ù…Ø©
        var q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        _behaviorUnsubs.push(onSnapshot(q, (snapshot) => {
            var arr = [];
            snapshot.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
            
            // Ø®Ø· Ø¯ÙØ§Ø¹ Ø®Ù„ÙÙŠ Ù„Ù„Ø¯Ø§ØªØ§ Ø§Ù„Ø¹Ø§Ù…Ø© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©
            if (arr.length === 0 && schoolId === 'hosainan') {
                var qFallback = query(collection(db, 'students'), where('classId', '==', classId.trim()));
                getDocs(qFallback).then(fallbackSnap => {
                    var fArr = [];
                    fallbackSnap.forEach(doc => {
                        var d = doc.data();
                        if(!d.schoolId && d.name) fArr.push(d.name.trim());
                    });
                    fArr.sort((a, b) => a.localeCompare(b, 'ar'));
                    populateStudentsDropdown(fArr, studentSelect);
                });
            } else {
                arr.sort((a, b) => a.localeCompare(b, 'ar'));
                populateStudentsDropdown(arr, studentSelect);
            }
        });
    } catch (e) { studentSelect.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</option>'; }
};

function populateStudentsDropdown(arr, element) {
    var html = '<option value="">-- Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ù…Ù† Ø§Ù„ÙƒØ´Ù Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ --</option>';
    arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });
    element.innerHTML = arr.length === 0 ? '<option value="">âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨ Ø¨Ø§Ù„ÙØµÙ„</option>' : html;
    element.disabled = arr.length === 0;
}

window.handleRegisterBehaviorLive = async function(e) {
    e.preventDefault();
    var sName = document.getElementById('beh-student-select').value;
    var cId = document.getElementById('beh-class-select').value;
    var refBy = document.getElementById('beh-referred-by').value.trim();
    var behaviorType = document.getElementById('beh-behavior-type')?.value || '';
    var action = document.getElementById('beh-action-type').value;
    var followup = document.getElementById('beh-followup-status').value;
    var notes = document.getElementById('beh-notes').value.trim();
    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø±Ø¨Ø· Ø§Ù„Ù€ SaaS Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ

    if(!sName || !cId) { window.showToast("âš ï¸ Ø§Ù„Ø±Ø¬Ø§Ø¡ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø·Ø§Ù„Ø¨ ÙˆØ§Ù„ØµÙ Ø£ÙˆÙ„Ø§Ù‹ Ù‚Ø¨Ù„ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯!"); return; }

    try {
        var todayISO = getTodayISO(); // Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¯ÙˆÙ„ÙŠ Ø§Ù„Ù…ÙˆØ­Ø¯ ÙˆØ§Ù„Ù…ØµØ­Ø­ Ù„Ù„Ù…Ù‚Ø§Ø±Ù†Ø§Øª Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ©
        
        await addDoc(collection(db, 'behavior'), {
            schoolId: schoolId, // ðŸ”‘ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ø£Ù…Ù†ÙŠØ© Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø±Ø§ØµØ¯Ø©
            studentName: sName.trim(),
            name: sName.trim(),
            classId: cId.trim(),
            referredBy: refBy,
            type: behaviorType,
            action: action,
            followUpStatus: followup,
            notes: notes,
            dateStr: todayISO,
            date: todayISO,
            createdAt: serverTimestamp()
        });
        
        window.showToast('âœ“ ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªØ±Ø¨ÙˆÙŠ Ø¨Ù†Ø¬Ø§Ø­ØŒ ÙˆØªØ­Ø¯ÙŠØ« Ù…Ù„Ù Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠ ÙÙˆØ±Ø§Ù‹.');
        document.getElementById('behavior-reg-form').reset();
        document.getElementById('beh-student-select').innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>';
        document.getElementById('beh-student-select').disabled = true;
    } catch(err) { window.showToast('âŒ Ø®Ø·Ø£: ' + err.message, 'error'); }
};

function loadBehaviorLogsLive() {
    var tbody = document.getElementById('behavior-logs-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId();

    // Ø¬Ù„Ø¨ ÙˆØ­ØµØ± Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ø§Ù„ØªØ§Ø¨Ø¹ Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙÙ‚Ø·
    var qLogs = query(collection(db, 'behavior'), where('schoolId', '==', schoolId));

    _behaviorUnsubs.push(onSnapshot(qLogs, (snapshot) => {
        var html = '';
        
        // Ø¥Ø°Ø§ ÙƒØ§Ù† ÙØ§Ø±ØºØ§Ù‹ ÙˆØ§Ù„Ù…Ø¯Ø±Ø³Ø© Ù‡ÙŠ Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù†ØŒ Ù†Ø³Ø­Ø¨ Ø§Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù‚Ø¯ÙŠÙ… Ø§Ù„ØºÙŠØ± Ù…Ù‚ÙŠØ¯ Ø¨Ù€ schoolId
        if (snapshot.empty && schoolId === 'hosainan') {
            getDocs(getActiveSchoolId() ? query(collection(db, 'behavior'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'behavior')).then(oldSnap => {
                var fHtml = '';
                oldSnap.forEach(d => {
                    var data = d.data();
                    if (!data.schoolId) fHtml += buildBehaviorRowHtml(data);
                });
                tbody.innerHTML = fHtml || '<tr><td colspan="7" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">âœ… Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ø³Ù„ÙŠÙ… ØªÙ…Ø§Ù…Ø§Ù‹.</td></tr>';
            });
            return;
        }

        snapshot.forEach(d => {
            html += buildBehaviorRowHtml(d.data());
        });
        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">âœ… Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ø³Ù„ÙŠÙ… ØªÙ…Ø§Ù…Ø§Ù‹.</td></tr>';
    }, (err) => { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px;">ðŸ’¡ Ø¨Ø§Ù†ØªØ¸Ø§Ø± ØªØ³Ø¬ÙŠÙ„ Ø£ÙˆÙ„Ù‰ Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© Ø¨Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø©.</td></tr>'; });
}

function buildBehaviorRowHtml(data) {
    var statusBadge = data.followUpStatus && data.followUpStatus.includes('ØªÙ…Øª') ? 
        `<span class="badge success" style="background:#27ae60; padding:3px 8px; border-radius:4px; color:#fff;">ØªÙ… Ø§Ù„Ø¥Ù‚ÙØ§Ù„</span>` : 
        `<span class="badge warning" style="background:#e67e22; padding:3px 8px; border-radius:4px; color:#fff;">Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</span>`;

    return `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px; font-weight:bold; color:#7f8c8d;">ðŸ“… ${data.dateStr || data.date || '-'}</td>
            <td style="padding:10px;"><b>ðŸ‘¤ ${data.studentName || data.name || '-'}</b></td>
            <td style="padding:10px; text-align:center;"><span class="badge info" style="background:var(--accent-color); padding:3px 8px; color:#fff; border-radius:4px;">${data.classId || '-'}</span></td>
            <td style="padding:10px; text-align:center;"><span style="background:#7c3aed; color:#fff; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:700;">${data.type || '-'}</span></td><td style="padding:10px; text-align:center;"><span class="badge danger" style="background:#c0392b; padding:4px 8px; color:#fff; border-radius:4px; font-weight:bold;">${data.action || 'Ø¥Ø¬Ø±Ø§Ø¡ Ù…Ø¹ØªÙ…Ø¯'}</span></td>
            <td style="padding:10px; text-align:center;">${statusBadge}</td>
            <td style="padding:10px; font-weight:700; color:#2980b9;">Ø£. ${data.referredBy || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</td>
            <td style="padding:10px; color:#555; font-size:12px; font-weight:bold;">${data.notes || '-'}</td>
        </tr>`;
}
// ===== Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø³Ø¬Ù„ =====
window.printBehaviorPDF = async function() {
    var tbody = document.getElementById('behavior-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th><th>Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th><th>Ø§Ù„Ù…Ø­ÙŠÙ„</th><th>Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'Ø³Ø¬Ù„_Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª_Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©', 'Ø³Ø¬Ù„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©');
};

window.printBehaviorDirect = function() {
    var tbody = document.getElementById('behavior-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th><th>Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th><th>Ø§Ù„Ù…Ø­ÙŠÙ„</th><th>Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'Ø³Ø¬Ù„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©');
};

// ===== ÙˆØ§ØªØ³Ø§Ø¨ â€” Ø¥Ø¨Ù„Ø§Øº ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ø¨Ø§Ù„Ø³Ù„ÙˆÙƒ =====
window.sendBehaviorWhatsApp = async function(studentName, classId, behaviorType, action) {
    try {
        var schoolId = getActiveSchoolId();
        // Ø¬Ù„Ø¨ Ø±Ù‚Ù… ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±
        var snap = await getDocs(query(
            collection(db,'students'),
            where('schoolId','==',schoolId),
            where('name','==',studentName),
            where('classId','==',classId)
        ));
        if(snap.empty) { window.showToast('âš ï¸ Ù„Ù… ÙŠÙØ¹Ø«Ø± Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨','warning'); return; }
        var student = snap.docs[0].data();
        var phone = (student.parentPhone||'').replace(/\D/g,'');
        if(!phone) { window.showToast('âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ù„ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±','warning'); return; }

        var today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
        var msg = encodeURIComponent(
            `Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÙŠÙƒÙ… ÙˆÙ„ÙŠ Ø£Ù…Ø± Ø§Ù„Ø·Ø§Ù„Ø¨ ${studentName}ØŒ\n` +
            `Ù†ÙØ¹Ù„Ù…ÙƒÙ… Ø¨Ø£Ù†Ù‡ ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø­Ø§Ø¯Ø«Ø© ${behaviorType} Ø¨ØªØ§Ø±ÙŠØ® ${today}.\n` +
            `Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…ØªØ®Ø°: ${action||'â€”'}\n` +
            `ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ù„Ù„Ù…Ø²ÙŠØ¯.`
        );
        window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
    } catch(e) { window.showToast('âŒ '+e.message,'error'); }
};