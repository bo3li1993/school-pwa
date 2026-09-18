import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initAttendanceModule() {
    var container = document.getElementById('tab-attendance');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-person-x-fill" style="color:var(--danger-color);"></i> ÙƒØ´Ù Ø§Ù„Ø­ØµØ± Ø§Ù„Ù…Ø¬Ù…Ø¹ Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ØºØ§Ø¦Ø¨ÙŠÙ† Ø§Ù„ÙŠÙˆÙ… Ø¨Ø§Ù„ÙØµÙˆÙ„</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
                ðŸ“ˆ ÙŠØªÙ… Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØªØ¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ØªØ­Øª ÙØµÙˆÙ„Ù‡Ù… Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø© Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©.
            </p>
            
            <div id="live-absents-classes-container" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:15px; margin-top:10px;">
                <p style="color:#999; font-weight:bold; text-align:center; grid-column:1/-1; padding:20px;">â³ Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ ÙˆÙØ±Ø² ÙƒØ´ÙˆÙ Ø§Ù„ØºÙŠØ§Ø¨ Ù„Ø§ÙŠÙ...</p>
            </div>
            
            <button onclick="window.exportAsManzoumaPDF('tab-absent', 'ÙƒØ´Ù_ØªÙˆØ²ÙŠØ¹_Ø§Ù„ØºÙŠØ§Ø¨_Ø§Ù„ÙØµÙ„ÙŠ')" style="width:100%; background:var(--primary-color); margin-top:20px; font-size:12px; font-weight:bold; border:none; color:#fff; padding:10px; cursor:pointer;"><i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø© ÙƒØ´Ù Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø­Ø§Ù„ÙŠ PDF</button>
        </div>`;

        loadTodayAbsentsGroupedByClass();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">âš ï¸ ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„ØºØ§Ø¦Ø¨ÙŠÙ†: ${e.message}</div>`;
    }
}

async function loadTodayAbsentsGroupedByClass() {
    var wrapper = document.getElementById('live-absents-classes-container');
    if (!wrapper) return;

    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©
    var todayISO = getTodayISO();       // ðŸ“… Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…ÙˆØ­Ø¯

    try {
        // Ø§Ù„Ø§Ø³ØªØ¹Ù„Ø§Ù… Ø§Ù„Ù…ÙÙ„ØªØ±: ØºÙŠØ§Ø¨ + Ù…Ø¯Ø±Ø³Ø© + ØªØ§Ø±ÙŠØ®
        // Ù…Ù„Ø§Ø­Ø¸Ø©: Ø¨Ù…Ø§ Ø£Ù†Ù†Ø§ Ù†Ø³ØªØ®Ø¯Ù… ISOØŒ ÙÙ†Ø­Ù† Ù†Ù‚Ø§Ø±Ù† Ø¨Ø­Ù‚Ù„ Ø§Ù„Ù€ date Ø§Ù„Ù…ÙˆØ­Ø¯
        var q = query(
            collection(db, 'attendance'), 
            where('schoolId', '==', schoolId),
            where('date', '==', todayISO), 
            where('status', '==', 'absent')
        );
        
        var snap = await getDocs(q);

        // Ø¯Ø¹Ù… Ø§Ù„ØªÙˆØ§ÙÙ‚ÙŠØ© Ù„Ù„Ø¯Ø§ØªØ§ Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© (Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù†)
        if (snap.empty && schoolId === 'hosainan') {
            var fallbackQ = query(collection(db, 'attendance'), where('date', '==', todayISO), where('status', '==', 'absent'));
            snap = await getDocs(fallbackQ);
        }
        
        var byClass = {};
        var count = 0;

        snap.forEach(doc => {
            var d = doc.data();
            // ØªØµÙÙŠØ© Ø£Ù…Ù†ÙŠØ© Ù„Ù„Ø¯Ø§ØªØ§ Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©
            if (d.schoolId && d.schoolId !== schoolId) return;

            var classId = d.classId ? d.classId.trim() : 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
            var sName = d.studentName || d.name || 'Ø·Ø§Ù„Ø¨ ØºÙŠØ± Ù…Ø¹Ø±Ù';
            var teacher = d.recordedBy || 'Ù‡ÙŠØ¦Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…';

            if (!byClass[classId]) {
                byClass[classId] = { classId: classId, students: [], teacherName: teacher };
            }
            byClass[classId].students.push(sName);
            count++;
        });

        if (count === 0) {
            wrapper.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--success-color); padding:30px; font-weight:bold; background:#e8f8f5; border-radius:8px;"><i class="bi bi-emoji-sunglasses"></i> ðŸ¥‡ Ù…Ø¨Ø±ÙˆÙƒ! Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø§Ù„Ø§Øª ØºÙŠØ§Ø¨ Ù…Ø±ØµÙˆØ¯Ø© Ù„Ù„ÙŠÙˆÙ… Ø­ØªÙ‰ Ø§Ù„Ø¢Ù† Ø¨ÙƒØ§ÙØ© ÙØµÙˆÙ„ Ø§Ù„Ù…Ø¯Ø±Ø³Ø©.</div>`;
            return;
        }

        var html = '';
        Object.keys(byClass).sort().forEach(cId => {
            var group = byClass[cId];
            html += `
                <div style="background:#fff0f0; border:1px solid #ffcccc; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.01);">
                    <h4 style="color:var(--danger-color); font-size:15px; font-weight:900; margin-bottom:8px; border-bottom:1px dashed #ffcccc; padding-bottom:5px;">
                        ðŸ“š ØµÙ ${group.classId} (${group.students.length} ØºØ§Ø¦Ø¨ÙŠÙ†)
                    </h4>
                    <ul style="list-style:none; padding-right:5px; margin-bottom:10px; display:flex; flex-direction:column; gap:5px;">
                        ${group.students.map(name => `<li style="font-size:13px; font-weight:700; color:#333;"><i class="bi bi-dash-circle-fill" style="color:var(--danger-color); font-size:11px;"></i> ${name}</li>`).join('')}
                    </ul>
                    <span style="font-size:11px; color:#666; font-weight:bold; background:#fff; padding:3px 8px; border-radius:4px; display:inline-block; border:1px solid #eee;">
                        <i class="bi bi-person-workspace"></i> Ø§Ù„Ø±Ø§ØµØ¯: Ø£. ${group.teacherName}
                    </span>
                </div>
            `;
        });

        wrapper.innerHTML = html;
    } catch(err) {
        wrapper.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#999; padding:20px;">ðŸ’¡ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø­Ø±ÙƒØ© Ø±ØµØ¯ Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø£ÙˆÙ„Ù‰ Ù„Ù„ÙŠÙˆÙ….</div>`;
    }
}