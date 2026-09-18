import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initArchiveModule() {
    var container = document.getElementById('tab-archive');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--navy);">
        <h2><i class="bi bi-archive-fill" style="color:var(--navy);"></i> Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ø³Ù†ÙˆØ§Øª Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©</h2>
        <p style="font-size:13px; color:#666; margin-bottom:15px;">
            Ø§Ø®ØªØ± Ø³Ù†Ø© Ø¯Ø±Ø§Ø³ÙŠØ© Ù„Ø¹Ø±Ø¶ Ù…Ù„Ø®Øµ Ø¥Ø­ØµØ§Ø¦ÙŠ ÙƒØ§Ù…Ù„ Ø¹Ù†Ù‡Ø§ (ÙŠØ¸Ù‡Ø± ÙÙ‚Ø· Ø¨Ø¹Ø¯ ØªÙ†ÙÙŠØ° Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ø³Ù†ÙˆÙŠ Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„).
        </p>
        <div id="archive-years-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
            <p style="color:#999;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø³Ù†ÙˆØ§Øª Ù…Ø¤Ø±Ø´ÙØ©...</p>
        </div>
    </div>
    <div id="archive-results-area"></div>

    <div class="card" style="border-top: 4px solid var(--gold);">
        <h2><i class="bi bi-mortarboard-fill" style="color:var(--gold);"></i> Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ø®Ø±ÙŠØ¬ÙŠÙ†</h2>
        <div id="graduates-list">
            <p style="text-align:center; color:#999; padding:15px;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>
        </div>
    </div>`;

    loadArchiveYears();
    loadGraduatesList();
}

async function loadArchiveYears() {
    var listEl = document.getElementById('archive-years-list');
    var schoolId = getActiveSchoolId();

    try {
        var snap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId)));
        var years = new Set();
        snap.forEach(d => { if (d.data().academicYear) years.add(d.data().academicYear); });

        if (!years.size) {
            listEl.innerHTML = '<p style="color:#999; padding:10px;">ðŸ’¡ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ù†ÙˆØ§Øª Ù…Ø¤Ø±Ø´ÙØ© Ø¨Ø¹Ø¯ â€” ØªØ¸Ù‡Ø± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨Ø¹Ø¯ Ø£ÙˆÙ„ Ø¹Ù…Ù„ÙŠØ© ØªØ±Ø­ÙŠÙ„ Ø³Ù†ÙˆÙŠ.</p>';
            return;
        }

        var sortedYears = Array.from(years).sort().reverse();
        listEl.innerHTML = sortedYears.map(y => `
            <button onclick="window.loadYearArchive('${y}')"
                style="background:var(--ice); color:var(--navy); border:1.5px solid var(--sky); padding:10px 18px; border-radius:8px; font-weight:900; cursor:pointer; font-family:'Cairo',sans-serif;">
                <i class="bi bi-calendar3"></i> ${y}
            </button>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<p style="color:red;">âŒ Ø®Ø·Ø£: ${e.message}</p>`;
    }
}

window.loadYearArchive = async function(yearLabel) {
    var resultsEl = document.getElementById('archive-results-area');
    resultsEl.innerHTML = `<div class="card"><p style="text-align:center; padding:20px; color:#666; font-weight:700;">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ${yearLabel}...</p></div>`;

    var schoolId = getActiveSchoolId();

    try {
        var _pr = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel)))
        ]);
        var attSnap = _pr[0];          var behSnap = _pr[1];          var gateSnap = _pr[2];          var clinicSnap = _pr[3]; 

        var absentCount = attSnap.docs.filter(d => d.data().status === 'absent').length;
        var lateCount = attSnap.docs.filter(d => d.data().status === 'late').length;

        var html = `
        <div class="card">
            <h3 style="font-size:15px; margin-bottom:14px;"><i class="bi bi-graph-up"></i> Ù…Ù„Ø®Øµ Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© ${yearLabel}</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:16px;">
                <div style="text-align:center; background:#fef2f2; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--danger-color);">${absentCount}</div>
                    <div style="font-size:11px; color:#666;">Ø­Ø§Ù„Ø© ØºÙŠØ§Ø¨</div>
                </div>
                <div style="text-align:center; background:#fffbeb; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--gold);">${lateCount}</div>
                    <div style="font-size:11px; color:#666;">Ø­Ø§Ù„Ø© ØªØ£Ø®ÙŠØ±</div>
                </div>
                <div style="text-align:center; background:#f0fdf4; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--success-color);">${behSnap.size}</div>
                    <div style="font-size:11px; color:#666;">Ø³Ø¬Ù„ Ø³Ù„ÙˆÙƒÙŠ</div>
                </div>
                <div style="text-align:center; background:#eaf4fd; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--sky);">${gateSnap.size}</div>
                    <div style="font-size:11px; color:#666;">Ø§Ø³ØªØ¦Ø°Ø§Ù†</div>
                </div>
                <div style="text-align:center; background:#f8fafc; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--navy);">${clinicSnap.size}</div>
                    <div style="font-size:11px; color:#666;">Ø²ÙŠØ§Ø±Ø© Ø¹ÙŠØ§Ø¯Ø©</div>
                </div>
            </div>
            <button onclick="window.exportArchivePDF('${yearLabel}', ${absentCount}, ${lateCount}, ${behSnap.size}, ${gateSnap.size}, ${clinicSnap.size})"
                style="background:var(--danger-color); color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-file-earmark-pdf-fill"></i> ØªØµØ¯ÙŠØ± ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø±Ø´ÙŠÙ PDF
            </button>
        </div>`;

        resultsEl.innerHTML = html;
    } catch (e) {
        resultsEl.innerHTML = `<div class="card" style="color:red;">âŒ Ø®Ø·Ø£: ${e.message}</div>`;
    }
};

window.exportArchivePDF = async function(yearLabel, absent, late, behavior, gatepass, clinic) {
    var contentHTML = `
    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; text-align:center; margin-bottom:16px;">
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #dc2626;">
            <div style="font-size:22px; font-weight:900; color:#dc2626;">${absent}</div><div style="font-size:10px;">ØºÙŠØ§Ø¨</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #d97706;">
            <div style="font-size:22px; font-weight:900; color:#d97706;">${late}</div><div style="font-size:10px;">ØªØ£Ø®ÙŠØ±</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #059669;">
            <div style="font-size:22px; font-weight:900; color:#059669;">${behavior}</div><div style="font-size:10px;">Ø³Ù„ÙˆÙƒ</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #1a78c2;">
            <div style="font-size:22px; font-weight:900; color:#1a78c2;">${gatepass}</div><div style="font-size:10px;">Ø§Ø³ØªØ¦Ø°Ø§Ù†</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #0b2545;">
            <div style="font-size:22px; font-weight:900; color:#0b2545;">${clinic}</div><div style="font-size:10px;">Ø¹ÙŠØ§Ø¯Ø©</div>
        </div>
    </div>`;
    await window.ManzoumaReport.exportPDF(contentHTML, `Ø£Ø±Ø´ÙŠÙ_${yearLabel}`, `ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø£Ø±Ø´ÙŠÙ â€” Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© ${yearLabel}`);
};

// ===== Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ø®Ø±ÙŠØ¬ÙŠÙ† =====
async function loadGraduatesList() {
    var listEl = document.getElementById('graduates-list');
    var schoolId = getActiveSchoolId();

    try {
        var snap = await getDocs(query(collection(db, 'graduates'), where('schoolId', '==', schoolId)));
        if (snap.empty) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; padding:15px;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø®Ø±ÙŠØ¬ÙˆÙ† Ù…Ø¤Ø±Ø´ÙÙˆÙ† Ø¨Ø¹Ø¯</p>';
            return;
        }

        var docs = snap.docs.sort((a, b) => (b.data().graduatedAt?.seconds || 0) - (a.data().graduatedAt?.seconds || 0));
        var html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
        html += '<thead><tr style="background:#f8fafc;"><th style="padding:8px;">Ø§Ù„Ø§Ø³Ù…</th><th style="padding:8px;">Ø¢Ø®Ø± ÙØµÙ„</th><th style="padding:8px;">Ø³Ù†Ø© Ø§Ù„ØªØ®Ø±Ø¬</th></tr></thead><tbody>';
        docs.forEach(d => {
            var g = d.data();
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; font-weight:700;">${g.name || '-'}</td>
                <td style="padding:8px;">${g.classId || '-'}</td>
                <td style="padding:8px; color:var(--gold); font-weight:700;">${g.academicYearGraduated || '-'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<p style="color:red; text-align:center; padding:15px;">âŒ Ø®Ø·Ø£: ${e.message}</p>`;
    }
}
