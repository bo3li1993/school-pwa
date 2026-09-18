import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• onSnapshot cleanup â•â•
let _clinicUnsub = null;
function cleanupClinicListeners() {
    if(_clinicUnsub) { try { _clinicUnsub(); } catch(e) {} _clinicUnsub = null; }
}

// â•â• Cache Ù„Ù„Ø·Ù„Ø§Ø¨ â€” ÙŠØ¬Ù„Ø¨Ù‡Ù… Ù…Ø±Ø© ÙˆØ­Ø¯Ø© â•â•
let _clinicStudentsCache = null;
let _clinicSchoolCache   = null;

async function getClinicStudents(schoolId) {
    if(_clinicStudentsCache && _clinicSchoolCache === schoolId) return _clinicStudentsCache;
    var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId), limit(500)));
    _clinicStudentsCache = snap;
    _clinicSchoolCache   = schoolId;
    return snap;
}


export async function initClinicModule() {
    var container = document.getElementById('tab-clinic');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid #3498db; text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-heart-pulse-fill" style="color:#3498db;"></i> Ø³Ø¬Ù„ Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ© ÙˆØ§Ù„ØµØ­Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ÙŠØ©</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">Ù†Ø¸Ø§Ù… Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø³Ø±ÙŠØ¹ Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©Ø› Ø­Ø¯Ø¯ ÙØµÙ„ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ø³Ù…Ù‡ ÙˆÙ…ØªØ§Ø¨Ø¹Ø© Ø­Ø§Ù„ØªÙ‡ Ø§Ù„Ø·Ø¨ÙŠØ© ÙÙˆØ±Ø§Ù‹ Ø¨Ø¯ÙˆÙ† ÙƒÙŠØ¨ÙˆØ±Ø¯.</p>
            
            <form id="clinic-reg-form" onsubmit="window.handleRegisterClinicLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. Ø§Ø®ØªØ± Ø§Ù„ØµÙ / Ø§Ù„ÙØµÙ„</label>
                        <select id="clinic-class-select" onchange="window.handleClinicClassChange(this.value)" required>
                            <option value="">-- Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„ÙØµÙˆÙ„... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„Ù…Ø±ÙŠØ¶</label>
                        <select id="clinic-student-select" disabled required>
                            <option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. Ø§Ù„ØªØ´Ø®ÙŠØµ Ø§Ù„Ø¹Ø§Ø±Ø¶ / Ø§Ù„Ø´ÙƒÙˆÙ‰</label>
                        <select id="clinic-complaint" required>
                            <option value="Ø§Ø±ØªÙØ§Ø¹ Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø±Ø§Ø±Ø©">ðŸŒ¡ï¸ Ø§Ø±ØªÙØ§Ø¹ Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø±Ø§Ø±Ø©</option>
                            <option value="ØµØ¯Ø§Ø¹ ÙˆØ£Ù„Ù… Ø¨Ø§Ù„Ø±Ø£Ø³">ðŸ¤• ØµØ¯Ø§Ø¹ ÙˆØ£Ù„Ù… Ø¨Ø§Ù„Ø±Ø£Ø³</option>
                            <option value="Ø£Ù„Ù… Ø¨Ø§Ù„Ù…Ø¹Ø¯Ø© ÙˆÙ…ØºØµ">ðŸ¤¢ Ø£Ù„Ù… Ø¨Ø§Ù„Ù…Ø¹Ø¯Ø© ÙˆÙ…ØºØµ</option>
                            <option value="Ø¥ØµØ§Ø¨Ø© Ø¬Ø±Ø­ / ÙƒØ¯Ù…Ø© Ø¨Ø§Ù„Ù…Ù„Ø¹Ø¨">ðŸƒ Ø¬Ø±Ø­ / Ø¥ØµØ§Ø¨Ø© Ø¨Ø§Ù„Ù…Ù„Ø§Ø¹Ø¨</option>
                            <option value="Ø¥Ø¹ÙŠØ§Ø¡ Ø¹Ø§Ù… ÙˆØ¥Ø±Ù‡Ø§Ù‚">ðŸ’¤ Ø¥Ø¹ÙŠØ§Ø¡ Ø¹Ø§Ù… ÙˆØ¥Ø±Ù‡Ø§Ù‚</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ ÙˆØ§Ù„Ø¹Ù„Ø§Ø¬ Ø§Ù„Ù…Ù…Ù†ÙˆØ­</label>
                    <input type="text" id="clinic-treatment" placeholder="Ù…Ø«Ø§Ù„: Ø¥Ø¹Ø·Ø§Ø¡ Ø¨Ù†Ø¯ÙˆÙ„ + Ù…ÙƒÙˆØ« Ø¨Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ù„Ù…Ø¯Ø© Ø­ØµØ© ÙƒØ§Ù…Ù„Ø©" required>
                </div>
                
                <button type="submit" style="width:100%; background:#3498db; font-weight:700; margin-top:5px;"><i class="bi bi-plus-square-fill"></i> ØªÙ‚ÙŠÙŠØ¯ ÙˆØ¥Ø±Ø³Ø§Ù„ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø§Ù„ØµØ­ÙŠØ©</button>
            </form>
        </div>

        
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button onclick="window.printClinicPDF()" 
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> ØªØµØ¯ÙŠØ± PDF
                </button>
                <button onclick="window.printClinicDirect()" 
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø© Ù…Ø¨Ø§Ø´Ø±Ø©
                </button>
            </div>
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-capsule"></i> ÙƒØ´Ù Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ© Ø§Ù„Ù…Ù‚ÙŠØ¯Ø© Ø§Ù„ÙŠÙˆÙ… Ù„Ø§ÙŠÙ</h2>
            <div style="overflow-x:auto;">
                <table id="clinic-logs-table" style="width:100%;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„Ù…Ø±ÙŠØ¶</th>
                            <th style="text-align:center;">Ø§Ù„ÙØµÙ„</th>
                            <th style="text-align:center;">Ø§Ù„Ø¹Ø§Ø±Ø¶ Ø§Ù„Ø·Ø¨ÙŠ</th>
                            <th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙˆØ§Ù„Ø¹Ù„Ø§Ø¬ Ø§Ù„Ù…Ù…Ù†ÙˆØ­</th>
                        </tr>
                    </thead>
                    <tbody id="clinic-logs-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">Ø¬Ø§Ø±ÙŠ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ©...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        var classSelect = document.getElementById('clinic-class-select');
        var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©
        
        // Ø¬Ù„Ø¨ Ø§Ù„ÙØµÙˆÙ„ Ø§Ù„ØªØ§Ø¨Ø¹Ø© Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
        var qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        var snap = await getDocs(qStudents);
        
        var classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        // Ø¯Ø¹Ù… Ø§Ù„ØªÙˆØ§ÙÙ‚ÙŠØ© Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©
        if (classesSet.size === 0 && schoolId === 'hosainan') {
            var fSnap = await getDocs(getActiveSchoolId() ? query(collection(db, 'students'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'students'));
            fSnap.forEach(doc => { if(!doc.data().schoolId && doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        }
        
        var htmlClasses = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadClinicLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">âš ï¸ ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ø¹ÙŠØ§Ø¯Ø©: ${e.message}</div>`;
    }
}

window.handleClinicClassChange = async function(classId) {
    var studentSelect = document.getElementById('clinic-student-select');
    if (!studentSelect) return;
    var schoolId = getActiveSchoolId();

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">â³ Ø¬Ø§Ø±ÙŠ ÙØ±Ø² Ø§Ù„ÙƒØ´Ù Ø£Ø¨Ø¬Ø¯ÙŠØ§Ù‹...</option>';
    studentSelect.disabled = true;

    try {
        var q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        var snap = await getDocs(q);
        
        if (snap.empty && schoolId === 'hosainan') {
             snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId.trim())));
        }
        
        var arr = [];
        snap.forEach(doc => { 
            var d = doc.data();
            if(d.name && (!d.schoolId || d.schoolId === schoolId)) arr.push(d.name.trim()); 
        });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        var html = '<option value="">-- Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„Ù…Ø±ÙŠØ¶ --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„ÙƒØ´Ù</option>';
    }
};

window.handleRegisterClinicLive = async function(e) {
    e.preventDefault();
    var sName = document.getElementById('clinic-student-select').value;
    var cId = document.getElementById('clinic-class-select').value;
    var complaint = document.getElementById('clinic-complaint').value;
    var treatment = document.getElementById('clinic-treatment').value.trim();
    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø±Ø¨Ø· Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠ

    try {
        await addDoc(collection(db, 'clinic'), {
            schoolId: schoolId, // ðŸ”‘ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ø£Ù…Ù†ÙŠØ©
            studentName: sName,
            classId: cId,
            complaint: complaint,
            treatment: treatment,
            createdAt: serverTimestamp()
        });
        window.showToast('âœ“ ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµØ­ÙŠØ© Ù„Ù„Ø·Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­.');
        // Ø®ÙŠØ§Ø± Ø¥Ø¨Ù„Ø§Øº ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±
        var sName = document.getElementById('clinic-student-select')?.value||'';
        var cId   = document.getElementById('clinic-class-select')?.value||'';
        var comp  = document.getElementById('clinic-complaint')?.value||'';
        var res   = document.getElementById('clinic-result')?.value||'';
        if(sName && confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥Ø¨Ù„Ø§Øº ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ØŸ')) {
            window.sendClinicWhatsApp(sName, cId, comp, res);
        };
        document.getElementById('clinic-reg-form').reset();
        document.getElementById('clinic-student-select').innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>';
        document.getElementById('clinic-student-select').disabled = true;
    } catch(err) {
        window.showToast('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„: ' + err.message, 'error');
    }
};

function loadClinicLogsLive() {
    var tbody = document.getElementById('clinic-logs-tbody');
    if (!tbody) return;
    var schoolId = getActiveSchoolId();

    // Ø¬Ù„Ø¨ ÙˆØ­ØµØ± Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„ØªØ§Ø¨Ø¹Ø© Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙÙ‚Ø·
    var qLogs = query(collection(db, 'clinic'), where('schoolId', '==', schoolId));
    onSnapshot(qLogs, (snap) => {
        var html = '';
        snap.forEach(d => {
            var data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>ðŸ‘¤ ${data.studentName || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge success" style="background:#3498db;">${data.complaint || '-'}</span></td>
                    <td style="color:#555; font-size:12px; font-weight:700;">${data.treatment || '-'}</td>
                </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">ðŸ’¡ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª Ù…Ù‚ÙŠØ¯Ø© Ù„Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„ÙŠÙˆÙ….</td></tr>';
    });
}
// ===== Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø³Ø¬Ù„ =====
window.printClinicPDF = async function() {
    var tbody = document.getElementById('clinic-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø´ÙƒÙˆÙ‰</th><th>Ø§Ù„Ø¹Ù„Ø§Ø¬</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'Ø³Ø¬Ù„_Ø§Ù„Ø¹ÙŠØ§Ø¯Ø©_Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©', 'Ø³Ø¬Ù„ Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©');
};

window.printClinicDirect = function() {
    var tbody = document.getElementById('clinic-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø´ÙƒÙˆÙ‰</th><th>Ø§Ù„Ø¹Ù„Ø§Ø¬</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'Ø³Ø¬Ù„ Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©');
};

// ===== ÙˆØ§ØªØ³Ø§Ø¨ â€” Ø¥Ø¨Ù„Ø§Øº ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ø¨Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© =====
window.sendClinicWhatsApp = async function(studentName, classId, complaint, result) {
    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(
            collection(db,'students'),
            where('schoolId','==',schoolId),
            where('name','==',studentName),
            where('classId','==',classId)
        ));
        if(snap.empty) { window.showToast('âš ï¸ Ù„Ù… ÙŠÙØ¹Ø«Ø± Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨','warning'); return; }
        var phone = (snap.docs[0].data().parentPhone||'').replace(/\D/g,'');
        if(!phone) { window.showToast('âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ù„ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±','warning'); return; }

        var today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
        var msg = encodeURIComponent(
            `Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÙŠÙƒÙ… ÙˆÙ„ÙŠ Ø£Ù…Ø± Ø§Ù„Ø·Ø§Ù„Ø¨ ${studentName}ØŒ\n` +
            `Ø±Ø§Ø¬Ø¹ Ø§Ø¨Ù†ÙƒÙ… Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ© Ø§Ù„ÙŠÙˆÙ… ${today}.\n` +
            `Ø§Ù„Ø´ÙƒÙˆÙ‰: ${complaint||'â€”'}\n` +
            `Ø§Ù„Ù†ØªÙŠØ¬Ø©: ${result||'â€”'}\n` +
            `ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù†Ø§ Ø¥Ø°Ø§ Ø§Ø­ØªØ¬ØªÙ… Ù…Ø²ÙŠØ¯Ø§Ù‹ Ù…Ù† Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª.`
        );
        window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
    } catch(e) { window.showToast('âŒ '+e.message,'error'); }
};
window.archiveOldClinicRecords = async function() {
    if (!confirm('Ø£Ø±Ø´ÙØ© ÙƒÙ„ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ø£Ù‚Ø¯Ù… Ù…Ù† 30 ÙŠÙˆÙ…Ø§Ù‹ØŸ')) return;
    var schoolId = getActiveSchoolId();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    var cutoffISO = cutoff.toISOString().slice(0,10);

    try {
        var { deleteDoc, doc: docFn, addDoc: addD } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var snap = await getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId)));
        var toArchive = snap.docs.filter(d => {
            var date = d.data().date || d.data().dateStr || '';
            return date && date < cutoffISO;
        });

        if (!toArchive.length) { window.showToast('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ù‚Ø¯ÙŠÙ…Ø© Ù„Ù„Ø£Ø±Ø´ÙØ©', 'info'); return; }

        for (var d of toArchive) {
            await addD(collection(db, 'clinic_archive'), { ...d.data(), archivedAt: new Date().toISOString() });
            await deleteDoc(docFn(db, 'clinic', d.id));
        }

        window.showToast('âœ… ØªÙ… Ø£Ø±Ø´ÙØ© ' + toArchive.length + ' Ø³Ø¬Ù„ Ø¹ÙŠØ§Ø¯Ø©');
        loadClinicLogsLive();
    } catch(e) { window.showToast('âŒ ' + e.message, 'error'); }
};
