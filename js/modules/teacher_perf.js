import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTeacherPerfModule() {
    var container = document.getElementById('tab-teacher-perf');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--success-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-graph-up-arrow" style="color:var(--success-color);"></i> Ù…Ø¤Ø´Ø±Ø§Øª ÙƒÙØ§Ø¡Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ ÙˆØ§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ© Ù„Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">
                ðŸ“Š ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù…Ø­Ø±Ùƒ Ø¨Ø°ÙƒØ§Ø¡ Ø¨Ù‚Ø±Ø§Ø¡Ø© ÙƒÙˆÙ„ÙƒØ´Ù† Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ÙÙ†ÙŠØ© ÙˆØ­Ø³Ø§Ø¨ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø¹Ø¯Ø¯ Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„Ù…Ø±ØµÙˆØ¯Ø© Ù„ÙƒÙ„ Ù…Ø¹Ù„Ù… Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙÙŠ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø³Ù†ÙˆÙŠ.
            </p>
            
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f4f6f9; color:var(--primary-color);">
                            <th style="padding:10px;">Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ø¨Ø§Ù„Ù…Ù†Ø´Ø£Ø©</th>
                            <th style="padding:10px; text-align:center;">Ø§Ù„Ù‚Ø³Ù… Ø§Ù„ÙÙ†ÙŠ / Ø§Ù„Ù…Ø§Ø¯Ø©</th>
                            <th style="padding:10px; text-align:center;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø¹Ø¯Ø¯ Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ÙÙ†ÙŠØ©</th>
                            <th style="padding:10px; text-align:center;">Ø­Ø§Ù„Ø© Ø§Ø³ØªÙ‚Ø±Ø§Ø± Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</th>
                        </tr>
                    </thead>
                    <tbody id="teacher-perf-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù„ÙŠÙ„ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙÙ†ÙŠØ©...</td></tr>
                    </tbody>
                </table>
            </div>
            <button onclick="window.exportAsManzoumaPDF('tab-teacher-perf', 'ØªÙ‚Ø±ÙŠØ±_ÙƒÙØ§Ø¡Ø©_Ø§Ù„Ø§Ø¯Ø§Ø¡_Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠ')" style="background:var(--success-color); width:100%; margin-top:15px; font-weight:bold; border:none; padding:10px; color:#fff; cursor:pointer; border-radius:6px;"><i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø© Ù„ÙˆØ­Ø© ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ø­Ø§Ù„ÙŠØ© PDF</button>
        </div>`;

        calculateTeacherPerformanceLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">âš ï¸ ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ù„ÙˆØ­Ø© ÙƒÙØ§Ø¡Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡: ${e.message}</div>`;
    }
}

async function calculateTeacherPerformanceLive() {
    var tbody = document.getElementById('teacher-perf-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©

    try {
        // Ø§Ø³ØªØ¹Ù„Ø§Ù… Ø°ÙƒÙŠ ÙˆÙ…Ø­Ù…ÙŠ Ø­Ø³Ø¨ Ø§Ù„Ù…Ø¯Ø±Ø³Ø©
        var q = query(collection(db, 'technical_visits'), where('schoolId', '==', schoolId));
        var snap = await getDocs(q);

        // ØªÙˆØ§ÙÙ‚ÙŠØ© Ø§Ù„Ø¯Ø§ØªØ§ Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(getActiveSchoolId() ? query(collection(db, 'technical_visits'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'technical_visits'));
        }

        var perfMap = {};

        snap.forEach(doc => {
            var data = doc.data();
            // Ø­Ù…Ø§ÙŠØ© Ø£Ù…Ù†ÙŠØ© Ù„Ù„Ø¨ÙŠØ§Ù†Ø§Øª
            if (data.schoolId && data.schoolId !== schoolId) return;

            var tName = data.teacherName ? data.teacherName.trim() : 'Ù…Ø¹Ù„Ù… ØºÙŠØ± Ù…Ø¹Ø±Ù';
            
            if (!perfMap[tName]) {
                perfMap[tName] = { name: tName, subject: data.subject || 'Ø§Ù„Ù‚Ø³Ù… Ø§Ù„ÙÙ†ÙŠ', count: 0 };
            }
            perfMap[tName].count++;
        });

        var sortedTeachers = Object.values(perfMap).sort((a,b) => b.count - a.count);
        var html = '';

        sortedTeachers.forEach(t => {
            var statusBadge = `<span class="badge" style="background:#2ecc71; color:#fff; padding:3px 8px; border-radius:4px;">Ù…Ø³ØªÙ‚Ø± (Ù…Ù…ØªØ§Ø²)</span>`;
            if(t.count < 2) statusBadge = `<span class="badge" style="background:#f39c12; color:#fff; padding:3px 8px; border-radius:4px;">ÙŠØ­ØªØ§Ø¬ Ø²ÙŠØ§Ø±Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©</span>`;

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;"><b>ðŸ‘¤ Ø£. ${t.name}</b></td>
                    <td style="padding:10px; text-align:center;"><span class="badge info">${t.subject}</span></td>
                    <td style="padding:10px; text-align:center; font-weight:900; color:var(--primary-color); font-size:15px;">${t.count} Ø²ÙŠØ§Ø±Ø§Øª</td>
                    <td style="padding:10px; text-align:center;">${statusBadge}</td>
                </tr>`;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">ðŸ’¡ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª ÙÙ†ÙŠØ© Ù…Ù‚ÙŠØ¯Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±.</td></tr>';
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±.</td></tr>';
    }
}