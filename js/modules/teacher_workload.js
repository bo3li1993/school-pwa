import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Ù…ÙˆØ¯ÙŠÙˆÙ„ Ø§Ù„Ù…Ø´ØºÙˆÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ â€” ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† Ø¨Ø­Ø³Ø¨ Ø£Ù‚Ø³Ø§Ù…Ù‡Ù…
// ÙŠØ¹Ø±Ø¶: ÙƒÙ„ Ù‚Ø³Ù… â†’ Ù…Ø¹Ù„Ù…ÙŠÙ‡ â†’ Ø­ØµØµÙ‡Ù… â†’ ØºÙŠØ§Ø¨Ù‡Ù… â†’ ØªÙ‚ÙŠÙŠÙ…Ù‡Ù…
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function initTeacherWorkloadModule() {
    var container = document.getElementById('tab-teacher-workload');
    if(!container) return;

    container.innerHTML = `
    <style>
        .wl-card { background:#fff; border:1px solid var(--line); border-radius:14px; margin-bottom:16px; overflow:hidden; }
        .wl-dept-header { background:var(--navy); color:#fff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
        .wl-dept-name { font-size:15px; font-weight:900; display:flex; align-items:center; gap:10px; }
        .wl-dept-count { background:rgba(255,255,255,.2); padding:3px 12px; border-radius:20px; font-size:12px; font-weight:800; }
        .wl-dept-body { display:none; padding:0 16px 16px; }
        .wl-dept-body.open { display:block; }
        .wl-teacher-row { display:grid; grid-template-columns:1fr 80px 80px 80px 100px; gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid var(--line); font-size:13px; }
        .wl-teacher-row:last-child { border-bottom:none; }
        .wl-header-row { display:grid; grid-template-columns:1fr 80px 80px 80px 100px; gap:8px; padding:8px 0 6px; border-bottom:2px solid var(--navy); font-size:11px; font-weight:800; color:var(--mid); }
        .wl-name { font-weight:800; color:var(--navy); }
        .wl-num { text-align:center; font-weight:700; }
        .wl-badge { text-align:center; }
        .wl-perf { display:inline-block; padding:3px 10px; border-radius:8px; font-size:11px; font-weight:800; }
        .wl-perf.high   { background:#dcfce7; color:#16a34a; }
        .wl-perf.medium { background:#fef9c3; color:#ca8a04; }
        .wl-perf.low    { background:#fee2e2; color:#dc2626; }
        .wl-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:16px; }
        .wl-summary-card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px; text-align:center; }
        .wl-summary-card .n { font-size:26px; font-weight:900; color:var(--navy); }
        .wl-summary-card .l { font-size:11px; color:var(--mid); font-weight:700; margin-top:3px; }
        .wl-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; align-items:center; }
        .wl-filter select { padding:9px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; }
        .wl-export { background:var(--red); color:#fff; border:none; padding:9px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:800; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; }
        @media(max-width:600px) {
            .wl-teacher-row, .wl-header-row { grid-template-columns:1fr 60px 60px; }
            .wl-teacher-row > *:nth-child(4),
            .wl-teacher-row > *:nth-child(5),
            .wl-header-row > *:nth-child(4),
            .wl-header-row > *:nth-child(5) { display:none; }
        }
    </style>

    <!-- Ù‡ÙŠØ¯Ø± -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div>
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0">
                <i class="bi bi-diagram-3-fill" style="color:var(--sky)"></i> Ø§Ù„Ù…Ø´ØºÙˆÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†
            </h2>
            <p style="font-size:12px;color:var(--mid);font-weight:700;margin:4px 0 0">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† Ø¨Ø­Ø³Ø¨ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… Ù…Ø¹ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª</p>
        </div>
        <button class="wl-export" onclick="window.exportWorkloadPDF()">
            <i class="bi bi-file-earmark-pdf-fill"></i> ØªØµØ¯ÙŠØ± PDF
        </button>
    </div>

    <!-- ÙÙ„ØªØ± -->
    <div class="wl-filter">
        <select id="wl-filter-dept" onchange="window.filterWorkload()">
            <option value="">ÙƒÙ„ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…</option>
        </select>
        <select id="wl-filter-role" onchange="window.filterWorkload()">
            <option value="">ÙƒÙ„ Ø§Ù„Ø£Ø¯ÙˆØ§Ø±</option>
            <option value="teacher">Ù…Ø¹Ù„Ù…</option>
            <option value="department_head">Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…</option>
            <option value="admin">Ø¥Ø¯Ø§Ø±Ø©</option>
            <option value="social_worker">Ø£Ø®ØµØ§Ø¦ÙŠ</option>
        </select>
    </div>

    <!-- Ù…Ù„Ø®Øµ Ø³Ø±ÙŠØ¹ -->
    <div class="wl-summary" id="wl-summary">
        <div class="wl-summary-card"><div class="n" id="wl-total-teachers">â€”</div><div class="l">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†</div></div>
        <div class="wl-summary-card"><div class="n" id="wl-total-depts">â€”</div><div class="l">Ø§Ù„Ø£Ù‚Ø³Ø§Ù…</div></div>
        <div class="wl-summary-card"><div class="n" id="wl-total-visits">â€”</div><div class="l">Ø²ÙŠØ§Ø±Ø§Øª ÙÙ†ÙŠØ©</div></div>
        <div class="wl-summary-card"><div class="n" id="wl-avg-visits">â€”</div><div class="l">Ù…ØªÙˆØ³Ø· Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª</div></div>
    </div>

    <!-- Ø§Ù„Ù…Ø­ØªÙˆÙ‰ -->
    <div id="wl-content">
        <div style="text-align:center;padding:40px;color:var(--mid)">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...</div>
    </div>
    `;

    await loadWorkloadData();
}

// â•â• ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª â•â•
let _workloadData = null;

async function loadWorkloadData() {
    var schoolId = getActiveSchoolId();

    try {
        // Ø¬Ù„Ø¨ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙˆØ§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø¨Ø§Ù„ØªÙˆØ§Ø²ÙŠ
        var _pr = await Promise.all([
            getDocs(query(collection(db,'users'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'technical_visits'), where('schoolId','==',schoolId)))
        ]);
        var usersSnap = _pr[0];          var visitsSnap = _pr[1]; 

        // Ø¨Ù†Ø§Ø¡ Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª
        var visitsByTeacher = {};
        visitsSnap.forEach(d => {
            var name = d.data().teacherName || 'â€”';
            if(!visitsByTeacher[name]) visitsByTeacher[name] = { count:0, ratings:[] };
            visitsByTeacher[name].count++;
            if(d.data().overallRating) visitsByTeacher[name].ratings.push(d.data().overallRating);
        });

        // ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† Ø¨Ø­Ø³Ø¨ Ø§Ù„Ù‚Ø³Ù…
        var depts = {};
        var roleLabel = {
            admin:            'Ù…Ø¯ÙŠØ± / Ù…Ø³Ø§Ø¹Ø¯',
            assistant_manager:'Ù…Ø³Ø§Ø¹Ø¯ Ù…Ø¯ÙŠØ±',
            wing_supervisor:  'Ù…Ø´Ø±Ù Ø¬Ù†Ø§Ø­',
            department_head:  'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…',
            teacher:          'Ù…Ø¹Ù„Ù…',
            social_worker:    'Ø£Ø®ØµØ§Ø¦ÙŠ Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ',
            guard:            'Ø­Ø§Ø±Ø³',
            nurse:            'Ù…Ù…Ø±Ø¶',
        };

        usersSnap.forEach(d => {
            var u = d.data();
            if(!u.name) return;

            // Ø§Ù„Ù‚Ø³Ù…: Ù…Ù† Ø­Ù‚Ù„ department Ø£Ùˆ Ù…Ù† Ø§Ù„Ø¯ÙˆØ±
            var dept = u.department?.trim() ||
                (u.role === 'admin' || u.role === 'assistant_manager' ? 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©' :
                 u.role === 'wing_supervisor' ? 'Ø§Ù„Ø¥Ø´Ø±Ø§Ù' :
                 u.role === 'guard'           ? 'Ø§Ù„Ø£Ù…Ù† ÙˆØ§Ù„Ø­Ø±Ø§Ø³Ø©' :
                 u.role === 'social_worker'   ? 'Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ©' :
                 u.role === 'nurse'           ? 'Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠØ©' :
                 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯');

            if(!depts[dept]) depts[dept] = [];

            var visits  = visitsByTeacher[u.name] || { count:0, ratings:[] };
            var perfScore = visits.ratings.length > 0
                ? calcPerfScore(visits.ratings) : null;

            depts[dept].push({
                name:     u.name,
                userId:   u.userId || 'â€”',
                role:     roleLabel[u.role] || u.role || 'â€”',
                visits:   visits.count,
                perfScore,
                perfLabel: perfScore === null ? 'â€”' : perfScore >= 80 ? 'Ù…Ù…ØªØ§Ø²' : perfScore >= 60 ? 'Ø¬ÙŠØ¯' : 'ÙŠØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø©',
                perfClass: perfScore === null ? '' : perfScore >= 80 ? 'high' : perfScore >= 60 ? 'medium' : 'low',
            });
        });

        // ØªØ±ØªÙŠØ¨ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† Ø¯Ø§Ø®Ù„ ÙƒÙ„ Ù‚Ø³Ù…
        Object.keys(depts).forEach(dept => {
            depts[dept].sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        });

        _workloadData = depts;

        // Ù…Ù„Ø®Øµ Ø³Ø±ÙŠØ¹
        var totalTeachers = Object.values(depts).flat().length;
        var totalVisits   = visitsSnap.size;
        document.getElementById('wl-total-teachers').textContent = totalTeachers;
        document.getElementById('wl-total-depts').textContent    = Object.keys(depts).length;
        document.getElementById('wl-total-visits').textContent   = totalVisits;
        document.getElementById('wl-avg-visits').textContent     =
            totalTeachers > 0 ? (totalVisits/totalTeachers).toFixed(1) : '0';

        // Ù…Ù„Ø¡ ÙÙ„ØªØ± Ø§Ù„Ø£Ù‚Ø³Ø§Ù…
        var deptSel = document.getElementById('wl-filter-dept');
        if(deptSel) {
            deptSel.innerHTML = '<option value="">ÙƒÙ„ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…</option>' +
                Object.keys(depts).sort().map(d=>`<option value="${d}">${d}</option>`).join('');
        }

        renderWorkload(depts);

    } catch(e) {
        document.getElementById('wl-content').innerHTML =
            `<div style="text-align:center;padding:30px;color:var(--red)">âŒ ${e.message}</div>`;
    }
}

function calcPerfScore(ratings) {
    var scores = { 'Ù…Ù…ØªØ§Ø²':100, 'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹':80, 'Ø¬ÙŠØ¯':60, 'Ù…Ù‚Ø¨ÙˆÙ„':40, 'Ø¶Ø¹ÙŠÙ':20 };
    var vals   = ratings.map(r => scores[r] || 60).filter(v => v);
    return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
}

// â•â• Ø±Ø³Ù… Ø§Ù„Ø£Ù‚Ø³Ø§Ù… â•â•
function renderWorkload(depts) {
    var content = document.getElementById('wl-content');
    if(!content) return;

    var sorted = Object.entries(depts).sort((a,b) => a[0].localeCompare(b[0],'ar'));

    content.innerHTML = sorted.map(([dept, teachers], idx) => `
    <div class="wl-card">
        <div class="wl-dept-header" onclick="toggleDept('dept-${idx}')">
            <div class="wl-dept-name">
                <i class="bi bi-building-fill"></i>
                ${dept}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <span class="wl-dept-count">${teachers.length} Ù…Ø¹Ù„Ù…</span>
                <i class="bi bi-chevron-down" id="chevron-${idx}" style="transition:transform .3s"></i>
            </div>
        </div>
        <div class="wl-dept-body" id="dept-${idx}">
            <div class="wl-header-row" style="margin-top:12px">
                <span>Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù…</span>
                <span style="text-align:center">Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª</span>
                <span style="text-align:center">Ø§Ù„Ø¯ÙˆØ±</span>
                <span style="text-align:center">Ø§Ù„Ù†ØªÙŠØ¬Ø©</span>
                <span style="text-align:center">Ø§Ù„Ø£Ø¯Ø§Ø¡</span>
            </div>
            ${teachers.map(t => `
            <div class="wl-teacher-row">
                <div class="wl-name">ðŸ‘¤ ${t.name}</div>
                <div class="wl-num" style="color:${t.visits>0?'var(--sky)':'var(--mid)'};font-size:16px;font-weight:900">${t.visits}</div>
                <div class="wl-num" style="color:var(--mid);font-size:11px">${t.role}</div>
                <div class="wl-num">${t.perfScore !== null ? t.perfScore+'%' : 'â€”'}</div>
                <div class="wl-badge">
                    ${t.visits > 0
                        ? `<span class="wl-perf ${t.perfClass}">${t.perfLabel}</span>`
                        : '<span style="color:#aaa;font-size:11px;font-weight:700">Ù„Ù… ÙŠÙØ²Ø§Ø±</span>'}
                </div>
            </div>`).join('')}
        </div>
    </div>`).join('');

    // Ø§ÙØªØ­ Ø£ÙˆÙ„ Ù‚Ø³Ù… ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹
    if(sorted.length > 0) toggleDept('dept-0');
}

window.toggleDept = function(id) {
    var body    = document.getElementById(id);
    var idx     = id.replace('dept-','');
    var chevron = document.getElementById(`chevron-${idx}`);
    if(!body) return;
    body.classList.toggle('open');
    if(chevron) chevron.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
};

// â•â• ÙÙ„ØªØ± â•â•
window.filterWorkload = function() {
    if(!_workloadData) return;
    var deptFilter = document.getElementById('wl-filter-dept')?.value || '';
    var roleFilter = document.getElementById('wl-filter-role')?.value || '';

    var filtered = {};
    Object.entries(_workloadData).forEach(([dept, teachers]) => {
        if(deptFilter && dept !== deptFilter) return;
        var filtered_t = roleFilter
            ? teachers.filter(t => t.role.includes(roleFilter) || t.perfClass === roleFilter)
            : teachers;
        if(filtered_t.length > 0) filtered[dept] = filtered_t;
    });

    renderWorkload(filtered);
};

// â•â• ØªØµØ¯ÙŠØ± PDF â•â•
window.exportWorkloadPDF = async function() {
    if(!_workloadData) { window.showToast?.('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª','warning'); return; }

    var tableHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#0b2545;color:#fff">
            <th style="padding:8px">Ø§Ù„Ù‚Ø³Ù…</th>
            <th style="padding:8px">Ø§Ù„Ù…Ø¹Ù„Ù…</th>
            <th style="padding:8px">Ø§Ù„Ø¯ÙˆØ±</th>
            <th style="padding:8px;text-align:center">Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª</th>
            <th style="padding:8px;text-align:center">Ø§Ù„Ø£Ø¯Ø§Ø¡</th>
        </tr></thead><tbody>`;

    Object.entries(_workloadData).sort((a,b)=>a[0].localeCompare(b[0],'ar')).forEach(([dept, teachers]) => {
        teachers.forEach((t,i) => {
            tableHTML += `<tr style="border-bottom:1px solid #eee;${i===0?'background:#f8f9fc':''}">
                <td style="padding:7px;font-weight:${i===0?'800':'600'}">${i===0?dept:''}</td>
                <td style="padding:7px;font-weight:700">${t.name}</td>
                <td style="padding:7px;color:#666">${t.role}</td>
                <td style="padding:7px;text-align:center;font-weight:800;color:#1a78c2">${t.visits}</td>
                <td style="padding:7px;text-align:center;font-weight:800;color:${t.perfClass==='high'?'#16a34a':t.perfClass==='medium'?'#ca8a04':'#dc2626'}">${t.perfLabel}</td>
            </tr>`;
        });
    });

    tableHTML += '</tbody></table>';

    if(window.ManzoumaReport?.exportPDF) {
        await window.ManzoumaReport.exportPDF(tableHTML, 'Ø§Ù„Ù…Ø´ØºÙˆÙ„_Ø§Ù„ÙØ¹Ù„ÙŠ', 'Ø§Ù„Ù…Ø´ØºÙˆÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† Ø¨Ø­Ø³Ø¨ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…', '');
    } else {
        // Ø·Ø¨Ø§Ø¹Ø© Ù…Ø¨Ø§Ø´Ø±Ø©
        var htmlContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                <title>Ø§Ù„Ù…Ø´ØºÙˆÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ</title>
                <style>body{font-family:'Cairo',sans-serif;padding:20px}h1{font-size:16px;margin-bottom:16px}</style>
                </head><body><h1>Ø§Ù„Ù…Ø´ØºÙˆÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†</h1>${tableHTML}</body></html>`;
        var blob    = new Blob([htmlContent], { type:'text/html;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);
        var win     = window.open(blobUrl, '_blank');
        if(!win) {
            // iOS fallback
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column';
            overlay.innerHTML = `<div style="padding:12px 16px;background:#0b2545;color:#fff;font-family:Cairo,sans-serif;display:flex;justify-content:space-between">
                <span style="font-weight:800">Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©</span>
                <div style="display:flex;gap:8px">
                    <button id="_pb" style="background:#25d366;color:#fff;border:none;padding:7px 14px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:800;cursor:pointer">ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø©</button>
                    <button id="_cb" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:7px 12px;border-radius:6px;cursor:pointer">âœ•</button>
                </div></div>
                <iframe id="_pf" src="${blobUrl}" style="flex:1;border:none;width:100%"></iframe>`;
            document.body.appendChild(overlay);
            document.getElementById('_pb').onclick = () => document.getElementById('_pf').contentWindow?.print();
            document.getElementById('_cb').onclick = () => { overlay.remove(); URL.revokeObjectURL(blobUrl); };
        } else {
            setTimeout(() => { win.print(); URL.revokeObjectURL(blobUrl); }, 700);
        }
    }
};
