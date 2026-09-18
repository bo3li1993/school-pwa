import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGatepassModule() {
    var container = document.getElementById('tab-gatepass');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-ticket-perforated-fill" style="color:var(--accent-color);"></i> Ø­Ù‚ÙŠØ¨Ø© ØªØµØ§Ø±ÙŠØ­ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† ÙˆØ§Ù„Ø®Ø±ÙˆØ¬ Ø§Ù„Ù…Ø¨ÙƒØ± Ù„Ù„Ø·Ù„Ø§Ø¨</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">Ø¥ØµØ¯Ø§Ø± Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ÙÙˆØ±ÙŠ Ù„Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©.</p>
            
            <form id="gatepass-reg-form" onsubmit="window.handleRegisterGatepassLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. Ø§Ø®ØªØ± Ø§Ù„ØµÙ / Ø§Ù„ÙØµÙ„</label>
                        <select id="gate-class-select" onchange="window.handleGateClassChange(this.value)" required style="width:100%; padding:8px;">
                            <option value="">-- Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„ÙØµÙˆÙ„... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ£Ø°Ù†</label>
                        <select id="gate-student-select" disabled required style="width:100%; padding:8px;">
                            <option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. ØµÙ„Ø© Ù‚Ø±Ø§Ø¨Ø© Ø§Ù„Ù…Ø³ØªÙ„Ù…</label>
                        <select id="gate-relative" required style="width:100%; padding:8px;">
                            <option value="Ø§Ù„Ø£Ø¨ Ø´Ø®ØµÙŠØ§Ù‹">ðŸ‘¨ Ø§Ù„Ø£Ø¨ Ø´Ø®ØµÙŠØ§Ù‹</option>
                            <option value="Ø§Ù„Ø£Ù… Ø´Ø®ØµÙŠØ§Ù‹">ðŸ‘© Ø§Ù„Ø£Ù… Ø´Ø®ØµÙŠØ§Ù‹</option>
                            <option value="Ù‚Ø±ÙŠØ¨ Ù…Ù† Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰">ðŸ‘¥ Ù‚Ø±ÙŠØ¨ Ù…Ù† Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰</option>
                            <option value="Ø³Ø§Ø¦Ù‚ Ø§Ù„Ø¹Ø§Ø¦Ù„Ø© Ø¨ØªÙÙˆÙŠØ¶">ðŸš— Ø³Ø§Ø¦Ù‚ Ø§Ù„Ø¹Ø§Ø¦Ù„Ø© Ø¨ØªÙÙˆÙŠØ¶</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">Ø³Ø¨Ø¨ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† Ø§Ù„Ø±Ø³Ù…ÙŠ</label>
                    <select id="gate-reason" onchange="window.handleGateReasonChange(this.value)" required style="width:100%; padding:8px;">
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ø³Ø¨Ø¨ --</option>
                        <option value="Ù…Ø±Ø§Ø¬Ø¹Ø© Ù…Ø³ØªØ´ÙÙ‰ / Ø¹ÙŠØ§Ø¯Ø©">ðŸ¥ Ù…Ø±Ø§Ø¬Ø¹Ø© Ù…Ø³ØªØ´ÙÙ‰ / Ø¹ÙŠØ§Ø¯Ø©</option>
                        <option value="Ù…ÙˆØ¹Ø¯ Ø·Ø¨ÙŠ Ù…Ø³Ø¨Ù‚">ðŸ“… Ù…ÙˆØ¹Ø¯ Ø·Ø¨ÙŠ Ù…Ø³Ø¨Ù‚</option>
                        <option value="Ø¸Ø±Ù Ø¹Ø§Ø¦Ù„ÙŠ Ø·Ø§Ø±Ø¦">ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Ø¸Ø±Ù Ø¹Ø§Ø¦Ù„ÙŠ Ø·Ø§Ø±Ø¦</option>
                        <option value="Ø¥Ø¬Ø±Ø§Ø¡ Ø­ÙƒÙˆÙ…ÙŠ Ø±Ø³Ù…ÙŠ">ðŸ›ï¸ Ø¥Ø¬Ø±Ø§Ø¡ Ø­ÙƒÙˆÙ…ÙŠ Ø±Ø³Ù…ÙŠ (Ø¬ÙˆØ§Ø²Ø§Øª/Ø£Ø­ÙˆØ§Ù„ Ù…Ø¯Ù†ÙŠØ©)</option>
                        <option value="Ù…Ø´Ø§Ø±ÙƒØ© Ø¨Ù…Ù†Ø§Ø³Ø¨Ø© Ø®Ø§Ø±Ø¬ÙŠØ©">ðŸŽ¤ Ù…Ø´Ø§Ø±ÙƒØ© Ø¨Ù…Ù†Ø§Ø³Ø¨Ø© Ø£Ùˆ ÙØ¹Ø§Ù„ÙŠØ© Ø®Ø§Ø±Ø¬ÙŠØ©</option>
                        <option value="Ø£Ø®Ø±Ù‰">ðŸ“Œ Ø£Ø®Ø±Ù‰ (Ø­Ø¯Ø¯ Ø§Ù„Ø³Ø¨Ø¨)</option>
                    </select>
                    <input type="text" id="gate-reason-other" placeholder="Ø§ÙƒØªØ¨ Ø§Ù„Ø³Ø¨Ø¨ Ø¨Ø§Ù„ØªÙØµÙŠÙ„..." style="width:100%; padding:8px; margin-top:8px; display:none;">
                </div>
                
                <button type="submit" style="width:100%; background:var(--accent-color); color:#fff; border:none; padding:10px; font-weight:700; margin-top:10px; cursor:pointer; border-radius:5px;"><i class="bi bi-printer-fill"></i> Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØ­ÙØ¸ ØªØµØ±ÙŠØ­ Ø§Ù„Ø®Ø±ÙˆØ¬ Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠ</button>
            </form>
        </div>

        
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button onclick="window.printGatepassPDF()" 
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> ØªØµØ¯ÙŠØ± PDF
                </button>
                <button onclick="window.printGatepassDirect()" 
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø© Ù…Ø¨Ø§Ø´Ø±Ø©
                </button>
            </div>
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; margin-top:20px;">
            <h2><i class="bi bi-door-open"></i> ÙƒØ´Ù Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø®Ø±Ø¬ÙŠÙ† Ø¨ØªØµØ§Ø±ÙŠØ­ Ø§Ù„ÙŠÙˆÙ…</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr style="background:#f8f9fa;"><th style="padding:10px;">Ø§Ù„Ø·Ø§Ù„Ø¨</th><th style="padding:10px;">Ø§Ù„ÙØµÙ„</th><th style="padding:10px;">Ø§Ù„Ù…Ø³ØªÙ„Ù…</th><th style="padding:10px;">Ø§Ù„Ø³Ø¨Ø¨</th></tr></thead>
                    <tbody id="gatepass-logs-tbody"><tr><td colspan="4" style="text-align:center; padding:15px;">Ø¬Ø§Ø±ÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...</td></tr></tbody>
                </table>
            </div>
        </div>`;

        // ØªÙ‡ÙŠØ¦Ø© Ø§Ù„ÙØµÙˆÙ„
        var classSelect = document.getElementById('gate-class-select');
        var schoolId = getActiveSchoolId();
        // Ø¬Ù„Ø¨ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ§Ù„ØªØµØ§Ø±ÙŠØ­ Ø¨Ø§Ù„ØªÙˆØ§Ø²ÙŠ
    var _pr = await Promise.all([
        getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)))
    ]);
        var stuSnap = _pr[0]; 
    var snap = stuSnap;
        
        var classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        var htmlClasses = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadGatepassLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center;">âš ï¸ ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„: ${e.message}</div>`;
    }
}

window.handleGateClassChange = async function(classId) {
    var studentSelect = document.getElementById('gate-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>';
        studentSelect.disabled = true;
        return;
    }

    var schoolId = getActiveSchoolId();
    studentSelect.innerHTML = '<option value="">â³ Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„Ø£Ø³Ù…Ø§Ø¡...</option>';
    
    try {
        var q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        var snap = await getDocs(q);
        
        var arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        var html = '<option value="">-- Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">âš ï¸ Ø§Ù„ÙØµÙ„ Ø®Ø§Ù„ÙŠ</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ Ø¨Ø§Ù„Ø´Ø¨ÙƒØ©</option>';
    }
};

window.handleGateReasonChange = function(value) {
    var otherInput = document.getElementById('gate-reason-other');
    if (value === 'Ø£Ø®Ø±Ù‰') {
        otherInput.style.display = 'block';
        otherInput.required = true;
    } else {
        otherInput.style.display = 'none';
        otherInput.required = false;
    }
};

window.handleRegisterGatepassLive = async function(e) {
    e.preventDefault();
    var schoolId = getActiveSchoolId();
    var reasonSelect = document.getElementById('gate-reason').value;
    var finalReason = reasonSelect === 'Ø£Ø®Ø±Ù‰' ? document.getElementById('gate-reason-other').value.trim() : reasonSelect;

    if(!finalReason) { window.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø³Ø¨Ø¨ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù†'); return; }

    await addDoc(collection(db, 'gatepass'), {
        schoolId: schoolId,
        studentName: document.getElementById('gate-student-select').value,
        classId: document.getElementById('gate-class-select').value,
        relative: document.getElementById('gate-relative').value,
        reason: finalReason,
        createdAt: serverTimestamp()
    });
    window.showToast('âœ“ ØªÙ… Ø­ÙØ¸ ÙˆØ§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªØµØ±ÙŠØ­!');
        // Ø¥Ø¨Ù„Ø§Øº ØªÙ„Ù‚Ø§Ø¦ÙŠ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨
        var studentSel = document.getElementById('gate-student-select');
        var classSel   = document.getElementById('gate-class-select');
        var reasonSel  = document.getElementById('gate-reason');
        var now = new Date().toLocaleTimeString('ar-KW',{hour:'2-digit',minute:'2-digit'});
        window.sendGatepassWhatsApp(
            studentSel?.value||'',
            classSel?.value||'',
            reasonSel?.value||'',
            now
        );
    document.getElementById('gatepass-reg-form').reset();
    document.getElementById('gate-reason-other').style.display = 'none';
    loadGatepassLogsLive();
};

async function loadGatepassLogsLive(filterDate) {
    var tbody = document.getElementById('gatepass-logs-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId();
    var today2 = new Date().toISOString().slice(0,10);
    var dateFilter2 = filterDate || document.getElementById('gate-date-filter')?.value || today2;
    var snap = await getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId)));
    
    var html = '';
    snap.forEach(d => {
        var data = d.data();
        html += `<tr><td style="padding:10px;">${data.studentName}</td><td style="padding:10px;">${data.classId}</td><td style="padding:10px;">${data.relative}</td><td style="padding:10px;">${data.reason}</td></tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø§Ø³ØªØ¦Ø°Ø§Ù† Ø§Ù„ÙŠÙˆÙ….</td></tr>';
}
// ===== Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø³Ø¬Ù„ =====
window.printGatepassPDF = async function() {
    var tbody = document.getElementById('gatepass-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø³Ø¨Ø¨</th><th>Ø§Ù„Ù…Ø³ØªÙ„Ù…</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'Ø³Ø¬Ù„_ØªØµØ§Ø±ÙŠØ­_Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù†', 'Ø³Ø¬Ù„ ØªØµØ§Ø±ÙŠØ­ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù†');
};

window.printGatepassDirect = function() {
    var tbody = document.getElementById('gatepass-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©', 'info'); return; }
    var contentHTML = `<table><thead><tr><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø³Ø¨Ø¨</th><th>Ø§Ù„Ù…Ø³ØªÙ„Ù…</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'Ø³Ø¬Ù„ ØªØµØ§Ø±ÙŠØ­ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù†');
};

// ===== ÙˆØ§ØªØ³Ø§Ø¨ â€” Ø¥Ø¨Ù„Ø§Øº ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± Ø¨Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† =====
window.sendGatepassWhatsApp = async function(studentName, classId, reason, time) {
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
            `Ù†ÙØ¹Ù„Ù…ÙƒÙ… Ø¨Ø£Ù† Ø§Ø¨Ù†ÙƒÙ… ØºØ§Ø¯Ø± Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ø¨ØªØ§Ø±ÙŠØ® ${today} Ø§Ù„Ø³Ø§Ø¹Ø© ${time||'â€”'}.\n` +
            `Ø§Ù„Ø³Ø¨Ø¨: ${reason||'â€”'}`
        );
        window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
    } catch(e) { window.showToast('âŒ '+e.message,'error'); }
};
window.archiveOldGatepasses = async function() {
    if (!confirm('Ø£Ø±Ø´ÙØ© ÙƒÙ„ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† Ø§Ù„Ø£Ù‚Ø¯Ù… Ù…Ù† 7 Ø£ÙŠØ§Ù…ØŸ')) return;
    var schoolId = getActiveSchoolId();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    var cutoffISO = cutoff.toISOString().slice(0,10);

    try {
        var { deleteDoc, doc: docFn } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var snap = await getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId)));
        var toArchive = snap.docs.filter(d => {
            var date = d.data().date || '';
            return date && date < cutoffISO;
        });

        if (!toArchive.length) { window.showToast('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ù‚Ø¯ÙŠÙ…Ø© Ù„Ù„Ø£Ø±Ø´ÙØ©', 'info'); return; }

        for (var d of toArchive) {
            var { addDoc: addD } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
            await addD(collection(db, 'gatepass_archive'), { ...d.data(), archivedAt: new Date().toISOString() });
            await deleteDoc(docFn(db, 'gatepass', d.id));
        }

        window.showToast('âœ… ØªÙ… Ø£Ø±Ø´ÙØ© ' + toArchive.length + ' Ø³Ø¬Ù„');
        loadGatepassLogsLive();
    } catch(e) { window.showToast('âŒ ' + e.message, 'error'); }
};
