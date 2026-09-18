import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDateSearchModule() {
    var container = document.getElementById('tab-date');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-calendar3"></i> Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø³Ø¬Ù„ ØºÙŠØ§Ø¨ Ø¨ØªØ§Ø±ÙŠØ® Ù…Ø¹ÙŠÙ‘Ù†</h2>
        <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-top:10px;">
            <div style="flex:1; min-width:180px;">
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">Ø§Ø®ØªØ± Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
                <input type="date" id="search-date-input" style="width:100%; padding:10px; border:1px solid var(--line); border-radius:8px; font-size:14px;">
            </div>
            <button onclick="window.setTodayAndSearch()" style="background:var(--off); color:var(--primary-color); border:1px solid var(--line); padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-calendar-day"></i> Ø§Ù„ÙŠÙˆÙ…
            </button>
            <button onclick="window.fetchHistoricAttendanceByClassLive()" style="background:var(--primary-color); color:#fff; border:none; padding:11px 20px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-search"></i> Ø¨Ø­Ø«
            </button>
            <button id="btn-historic-pdf" onclick="window.exportDateSearchPDF()" style="display:none; background:#dc2626; color:#fff; border:none; padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-family:Cairo,sans-serif;">
                <i class="bi bi-file-earmark-pdf-fill"></i> PDF
            </button>
            <button id="btn-historic-print" onclick="window.printDateSearchDirect()" style="display:none; background:#0b2545; color:#fff; border:none; padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-family:Cairo,sans-serif;">
                <i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø©
            </button>
            <button id="btn-historic-reset" onclick="window.resetHistoricSearch()" style="display:none; background:#fff; color:var(--danger-color); border:1px solid var(--danger-color); padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-x-circle"></i> Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†
            </button>
        </div>
    </div>

    <div id="historic-results-display-area" style="margin-top:16px;">
        <p style="text-align:center; padding:30px; color:#999; font-weight:bold;">ðŸ’¡ Ø§Ø®ØªØ± ØªØ§Ø±ÙŠØ®Ø§Ù‹ Ø«Ù… Ø§Ø¶ØºØ· "Ø¨Ø­Ø«" Ù„Ø¹Ø±Ø¶ Ø³Ø¬Ù„ Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø®Ø§Øµ Ø¨Ø°Ù„Ùƒ Ø§Ù„ÙŠÙˆÙ….</p>
    </div>`;
}

window.setTodayAndSearch = function() {
    var today = new Date();
    var iso = today.toISOString().slice(0,10);
    document.getElementById('search-date-input').value = iso;
    window.fetchHistoricAttendanceByClassLive();
};

window.resetHistoricSearch = function() {
    document.getElementById('search-date-input').value = '';
    document.getElementById('btn-historic-reset').style.display = 'none';
    document.getElementById('btn-historic-pdf').style.display = 'none'; var _pbtn=document.getElementById('btn-historic-print'); if(_pbtn)_pbtn.style.display='none';
    document.getElementById('historic-results-display-area').innerHTML =
        `<p style="text-align:center; padding:30px; color:#999; font-weight:bold;">ðŸ’¡ Ø§Ø®ØªØ± ØªØ§Ø±ÙŠØ®Ø§Ù‹ Ø«Ù… Ø§Ø¶ØºØ· "Ø¨Ø­Ø«" Ù„Ø¹Ø±Ø¶ Ø³Ø¬Ù„ Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø®Ø§Øµ Ø¨Ø°Ù„Ùƒ Ø§Ù„ÙŠÙˆÙ….</p>`;
};

let lastSearchedDate = '';

window.fetchHistoricAttendanceByClassLive = async function() {
    var dateInput = document.getElementById('search-date-input').value;
    var displayArea = document.getElementById('historic-results-display-area');
    var resetBtn = document.getElementById('btn-historic-reset');
    var pdfBtn = document.getElementById('btn-historic-pdf');
    var schoolId = getActiveSchoolId(); // ðŸ¢ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ø£Ù…Ù†ÙŠØ© Ù„Ù„Ù…Ø¯Ø±Ø³Ø©

    if (!dateInput) { window.showToast("âš ï¸ ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø£ÙˆÙ„Ø§Ù‹ Ù„Ù„Ø¨Ø¯Ø¡!"); return; }

    var isoDate = dateInput; // ØµÙŠØºØ© ISO Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù…Ø§ ÙŠØ­ÙØ¸Ù‡ attendance.js
    lastSearchedDate = isoDate;

    displayArea.innerHTML = `<p style="text-align:center; padding:25px; font-weight:bold; color:var(--hover-color);">â³ Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ø§Ù„ÙƒØ´ÙˆÙ Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ù…Ø¯Ø±Ø³ØªÙƒ ÙÙ‚Ø·...</p>`;
    resetBtn.style.display = 'inline-flex';
    pdfBtn.style.display = 'none';

    try {
        var q = query(collection(db, 'attendance'),
                        where('date', '==', isoDate),
                        where('schoolId', '==', schoolId));

        var snap = await getDocs(q);

        if (snap.empty) {
            displayArea.innerHTML = `
            <div class="card" style="text-align:center; padding:30px;">
                <i class="bi bi-calendar-x" style="font-size:40px; color:var(--danger-color);"></i>
                <p style="font-weight:bold; color:#555; margin-top:10px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª ØºÙŠØ§Ø¨ Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø¨ØªØ§Ø±ÙŠØ®: (${isoDate})</p>
            </div>`;
            return;
        }

        var groupedData = {};
        snap.forEach(doc => {
            var d = doc.data();
            if ((d.status === 'absent' || d.status === 'late') && d.schoolId === schoolId) {
                var classKey = d.classId ? d.classId.trim() : "ÙØµÙˆÙ„ ØºÙŠØ± Ù…Ø¹Ø±ÙØ©";
                if (!groupedData[classKey]) groupedData[classKey] = [];
                groupedData[classKey].push({
                    name: d.studentName || d.name || "Ø·Ø§Ù„Ø¨ ØºÙŠØ± Ù…Ø³Ø¬Ù„",
                    period: d.period || "Ø§Ù„Ø­ØµØ©",
                    status: d.status,
                    teacher: d.recordedBy || "Ø¹Ø¶Ùˆ Ø§Ù„Ù‡ÙŠØ¦Ø©"
                });
            }
        });

        var sortedClasses = Object.keys(groupedData).sort();

        if (sortedClasses.length === 0) {
            displayArea.innerHTML = `
            <div class="card" style="text-align:center; padding:30px;">
                <i class="bi bi-emoji-smile" style="font-size:40px; color:var(--success-color);"></i>
                <p style="font-weight:bold; color:#555; margin-top:10px;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØºÙŠØ§Ø¨ Ø£Ùˆ ØªØ£Ø®ÙŠØ± Ù…Ø³Ø¬Ù„ Ø¨Ù‡Ø°Ø§ Ø§Ù„ØªØ§Ø±ÙŠØ® â€” Ø­Ø¶ÙˆØ± ÙƒØ§Ù…Ù„ ðŸŽ‰</p>
            </div>`;
            return;
        }

        var html = `<div class="card" style="margin-bottom:14px;">
            <h3 style="font-size:15px; color:var(--primary-color);">
                <i class="bi bi-calendar-check"></i> Ù†ØªØ§Ø¦Ø¬ Ø¨Ø­Ø« ÙŠÙˆÙ…: ${isoDate}
                <span style="float:left; font-size:12px; color:#888; font-weight:600;">${sortedClasses.length} ÙØµÙ„ Ø¨Ù‡ ØºÙŠØ§Ø¨/ØªØ£Ø®ÙŠØ±</span>
            </h3>
        </div>`;

        sortedClasses.forEach(classKey => {
            var rows = groupedData[classKey];
            html += `
            <div class="card" style="margin-bottom:14px;">
                <h3 style="font-size:14px; border-bottom:2px solid var(--line); padding-bottom:8px; margin-bottom:10px;">
                    <i class="bi bi-people-fill" style="color:var(--accent-color);"></i> ÙØµÙ„ ${classKey}
                    <span style="float:left; font-size:12px; color:#888;">${rows.length} Ø­Ø§Ù„Ø©</span>
                </h3>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#f4f6f9;">
                                <th style="padding:8px; text-align:right;">Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th>
                                <th style="padding:8px; text-align:center;">Ø§Ù„Ø­ØµØ©</th>
                                <th style="padding:8px; text-align:center;">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                                <th style="padding:8px; text-align:right;">Ø³Ø¬Ù‘Ù„Ù‡Ø§</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(r => `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px;"><b>${r.name}</b></td>
                                    <td style="padding:8px; text-align:center;">${r.period}</td>
                                    <td style="padding:8px; text-align:center;">
                                        <span class="badge ${r.status === 'absent' ? 'danger' : 'warning'}">
                                            ${r.status === 'absent' ? 'ðŸ”´ ØºØ§Ø¦Ø¨' : 'ðŸŸ¡ Ù…ØªØ£Ø®Ø±'}
                                        </span>
                                    </td>
                                    <td style="padding:8px; color:#666;">${r.teacher}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        });

        displayArea.innerHTML = html;
        lastGroupedData = groupedData;
        pdfBtn.style.display = 'inline-flex'; var _pb=document.getElementById('btn-historic-print'); if(_pb)_pb.style.display='inline-flex';

    } catch (err) {
        displayArea.innerHTML = `<p style="color:red; font-weight:bold;">âŒ Ø®Ø·Ø£ ÙÙŠ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„ÙØ±Ø² Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠ: ${err.message}</p>`;
    }
};

let lastGroupedData = {};

window.exportDateSearchPDF = async function() {
    var sortedClasses = Object.keys(lastGroupedData).sort();
    if (!sortedClasses.length) { showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù„ØªØµØ¯ÙŠØ±Ù‡Ø§', 'info'); return; }

    var contentHTML = '';
    var totalAbsent = 0, totalLate = 0;

    sortedClasses.forEach(classKey => {
        var rows = lastGroupedData[classKey];
        totalAbsent += rows.filter(r => r.status === 'absent').length;
        totalLate += rows.filter(r => r.status === 'late').length;

        contentHTML += `
        <div class="section-title">ðŸ“‹ ÙØµÙ„ ${classKey} â€” ${rows.length} Ø­Ø§Ù„Ø©</div>
        <table>
            <thead><tr>
                <th>Ù…</th><th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„Ø­ØµØ©</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø³Ø¬Ù‘Ù„Ù‡Ø§</th>
            </tr></thead>
            <tbody>${rows.map((r, i) => `<tr>
                <td style="text-align:center;color:#666;">${i+1}</td>
                <td style="font-weight:700;">${r.name}</td>
                <td style="text-align:center;">Ø§Ù„Ø­ØµØ© ${r.period || '-'}</td>
                <td><span class="${r.status === 'absent' ? 'badge-absent' : 'badge-late'}">${r.status === 'absent' ? 'ØºØ§Ø¦Ø¨' : 'Ù…ØªØ£Ø®Ø±'}</span></td>
                <td style="color:#666;">Ø£. ${r.teacher}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    });

    var subtitle = `Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${totalAbsent} ØºÙŠØ§Ø¨ Â· ${totalLate} ØªØ£Ø®ÙŠØ± Â· ${sortedClasses.length} ÙØµÙ„ â€” ØªØ§Ø±ÙŠØ® ${lastSearchedDate}`;
    await window.ManzoumaReport.exportPDF(contentHTML, `ÙƒØ´Ù_Ø§Ù„ØºÙŠØ§Ø¨_${lastSearchedDate.replace(/\//g,'-')}`, 'ÙƒØ´Ù Ø§Ù„ØºÙŠØ§Ø¨ ÙˆØ§Ù„ØªØ£Ø®ÙŠØ±', subtitle);
};

// ===== Ø·Ø¨Ø§Ø¹Ø© Ù…Ø¨Ø§Ø´Ø±Ø© =====
window.printDateSearchDirect = function() {
    var sortedClasses = Object.keys(lastGroupedData).sort();
    if (!sortedClasses.length) { showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬', 'info'); return; }

    var contentHTML = '';
    sortedClasses.forEach(classKey => {
        var rows = lastGroupedData[classKey];
        contentHTML += `
        <div class="section-title">ÙØµÙ„ ${classKey}</div>
        <table>
            <thead><tr><th>Ù…</th><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„Ø­ØµØ©</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„Ù…Ø¹Ù„Ù…</th></tr></thead>
            <tbody>${rows.map((r,i) => `<tr>
                <td>${i+1}</td><td>${r.name}</td>
                <td>Ø§Ù„Ø­ØµØ© ${r.period||'-'}</td>
                <td><span class="${r.status==='absent'?'badge-absent':'badge-late'}">${r.status==='absent'?'ØºØ§Ø¦Ø¨':'Ù…ØªØ£Ø®Ø±'}</span></td>
                <td>Ø£. ${r.teacher}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    });
    window.ManzoumaReport.printDirect(contentHTML, 'ÙƒØ´Ù Ø§Ù„ØºÙŠØ§Ø¨ ÙˆØ§Ù„ØªØ£Ø®ÙŠØ±', `ØªØ§Ø±ÙŠØ® ${lastSearchedDate}`);
};
