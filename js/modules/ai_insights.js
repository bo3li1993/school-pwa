import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, query, where, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø°ÙƒÙŠØ© â€” Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ©
// ÙŠØ³ØªØ®Ø¯Ù… Anthropic Claude API Ù„ØªØ­Ù„ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function initAiInsightsModule() {
    var container = document.getElementById('tab-ai-insights');
    if (!container) return;

    container.innerHTML = `
    <style>
        .ai-card{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
        .ai-title{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--off);padding-bottom:10px}
        .ai-btn{background:linear-gradient(135deg,var(--navy),#1a4a8a);color:#fff;border:none;padding:11px 24px;border-radius:10px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .2s}
        .ai-btn:hover{opacity:.9;transform:translateY(-1px)}
        .ai-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .ai-btn.secondary{background:var(--ice);color:var(--navy);border:1px solid var(--line)}
        .ai-result{background:var(--off);border-radius:10px;padding:18px;margin-top:14px;font-size:14px;line-height:1.8;color:var(--text);white-space:pre-line;display:none;border-right:4px solid var(--sky)}
        .ai-result.show{display:block}
        .ai-loading{display:none;text-align:center;padding:24px;color:var(--mid);font-weight:700}
        .ai-loading.show{display:block}
        .ai-dots{display:inline-block;animation:dotAnim 1.4s infinite}
        @keyframes dotAnim{0%,80%,100%{opacity:0}40%{opacity:1}}
        .period-grid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .period-btn{padding:7px 16px;border-radius:20px;border:1.5px solid var(--line);background:var(--white);color:var(--mid);font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
        .period-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
        .stat-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:14px}
        .stat-mini{background:var(--off);border-radius:8px;padding:12px;text-align:center}
        .stat-mini .n{font-size:22px;font-weight:900;color:var(--navy)}
        .stat-mini .l{font-size:10px;color:var(--mid);font-weight:700;margin-top:2px}
        .insight-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin:4px;cursor:pointer;border:1.5px solid;transition:all .2s}
        .chip-danger{background:#fef2f2;color:var(--red);border-color:#fecaca}
        .chip-warn{background:#fffbeb;color:#d97706;border-color:#fde68a}
        .chip-info{background:var(--ice);color:var(--sky);border-color:#bae6fd}
        .chip-success{background:#f0fdf4;color:var(--green);border-color:#bbf7d0}
        .insight-chip:hover{opacity:.8}
    </style>

    <!-- Ù‡ÙŠØ¯Ø± -->
    <div class="ai-card" style="border-top:4px solid var(--sky);background:linear-gradient(135deg,var(--off),var(--white))">
        <div class="ai-title">
            <i class="bi bi-robot" style="color:var(--sky);font-size:18px"></i>
            Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø°ÙƒÙŠØ© â€” ØªØ­Ù„ÙŠÙ„ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ
        </div>
        <p style="font-size:13px;color:var(--mid);margin-bottom:14px;font-weight:600">
            ÙŠÙ‚ÙˆÙ… Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø¨ØªØ­Ù„ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨ ÙˆØ§Ù„Ø³Ù„ÙˆÙƒ ÙˆØ§Ø³ØªØ®Ù„Ø§Øµ Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ù…Ø®ÙÙŠØ©
        </p>

        <!-- Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØªØ±Ø© -->
        <div style="margin-bottom:14px">
            <label style="font-weight:800;font-size:12px;color:var(--mid);display:block;margin-bottom:8px">Ø§Ø®ØªØ± ÙØªØ±Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„:</label>
            <div class="period-grid">
                <button class="period-btn active" onclick="selectPeriod(this,'week')">Ø¢Ø®Ø± Ø£Ø³Ø¨ÙˆØ¹</button>
                <button class="period-btn" onclick="selectPeriod(this,'month')">Ø¢Ø®Ø± Ø´Ù‡Ø±</button>
                <button class="period-btn" onclick="selectPeriod(this,'semester')">Ø§Ù„ÙØµÙ„ ÙƒØ§Ù…Ù„Ø§Ù‹</button>
                <button class="period-btn" onclick="selectPeriod(this,'today')">Ø§Ù„ÙŠÙˆÙ… ÙÙ‚Ø·</button>
            </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="ai-btn" id="btn-analyze" onclick="window.runAiAnalysis('general')">
                <i class="bi bi-graph-up-arrow"></i> ØªØ­Ù„ÙŠÙ„ Ø´Ø§Ù…Ù„ Ù„Ù„ØºÙŠØ§Ø¨
            </button>
            <button class="ai-btn secondary" id="btn-risks" onclick="window.runAiAnalysis('risks')">
                <i class="bi bi-shield-exclamation"></i> Ø·Ù„Ø§Ø¨ ÙÙŠ Ø®Ø·Ø±
            </button>
            <button class="ai-btn secondary" id="btn-recommendations" onclick="window.runAiAnalysis('recommendations')">
                <i class="bi bi-lightbulb"></i> ØªÙˆØµÙŠØ§Øª Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©
            </button>
            <button class="ai-btn secondary" id="btn-patterns" onclick="window.runAiAnalysis('patterns')">
                <i class="bi bi-bezier2"></i> Ø£Ù†Ù…Ø§Ø· Ø§Ù„ØºÙŠØ§Ø¨
            </button>
        </div>

        <div class="ai-loading" id="ai-loading">
            <div style="font-size:32px;margin-bottom:10px">ðŸ¤–</div>
            <div>Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ÙŠØ­Ù„Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª<span class="ai-dots">...</span></div>
            <div style="font-size:12px;margin-top:6px;color:#aaa">Ù‚Ø¯ ÙŠØ³ØªØºØ±Ù‚ Ø¨Ø¶Ø¹ Ø«ÙˆØ§Ù†Ù</div>
        </div>

        <div class="ai-result" id="ai-result"></div>
    </div>

    <!-- Ù…Ù„Ø®Øµ Ø³Ø±ÙŠØ¹ -->
    <div class="ai-card">
        <div class="ai-title"><i class="bi bi-lightning-fill" style="color:var(--gold)"></i> Ù…Ù„Ø®Øµ Ø³Ø±ÙŠØ¹ â€” Ø¨Ø¯ÙˆÙ† Ø°ÙƒØ§Ø¡ Ø§ØµØ·Ù†Ø§Ø¹ÙŠ</div>
        <div class="stat-summary" id="quick-stats">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
        <div id="quick-chips" style="margin-top:12px"></div>
    </div>

    <!-- Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø£ÙƒØ«Ø± ØºÙŠØ§Ø¨Ø§Ù‹ -->
    <div class="ai-card">
        <div class="ai-title"><i class="bi bi-person-x-fill" style="color:var(--red)"></i> Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø£ÙƒØ«Ø± ØºÙŠØ§Ø¨Ø§Ù‹</div>
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px" id="top-absent-table">
                <thead>
                    <tr style="background:var(--off)">
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">#</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">Ø§Ù„Ø·Ø§Ù„Ø¨</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">Ø§Ù„ÙØµÙ„</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">Ø§Ù„Ù…Ø³ØªÙˆÙ‰</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">Ø¥Ø¬Ø±Ø§Ø¡</th>
                    </tr>
                </thead>
                <tbody id="top-absent-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:20px;color:var(--mid)">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    // ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ÙˆÙ„ÙŠØ©
    await loadQuickStats();
    await loadTopAbsentStudents();
}

let selectedPeriod = 'week';

window.selectPeriod = function(btn, period) {
    document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedPeriod = period;
};

// â•â• Ø­Ø³Ø§Ø¨ Ù†Ø·Ø§Ù‚ Ø§Ù„ØªØ§Ø±ÙŠØ® â•â•
function getDateRange(period) {
    var to   = getTodayISO();
    var from = new Date();
    if(period==='week')     from.setDate(from.getDate()-7);
    else if(period==='month')    from.setMonth(from.getMonth()-1);
    else if(period==='semester') from.setMonth(from.getMonth()-5);
    else { return { from: to, to }; } // today
    return { from: from.toISOString().slice(0,10), to };
}

// â•â• Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ­Ù„ÙŠÙ„ â•â•
async function fetchAnalysisData(period) {
    var schoolId = getActiveSchoolId();
    var { from, to } = getDateRange(period);

    var _pr = await Promise.all([
        getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
        getDocs(query(collection(db,'behavior'),
            where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
        getDocs(query(collection(db,'clinic'),
            where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
    ]);
        var attSnap = _pr[0];          var behSnap = _pr[1];          var clinicSnap = _pr[2]; 

    var byStudent = {}, byClass = {}, byDate = {}, byDay = {0:0,1:0,2:0,3:0,4:0};
    var absentCount = 0, lateCount = 0;

    attSnap.forEach(d => {
        var data = d.data();
        if(data.status==='absent') absentCount++;
        else if(data.status==='late') lateCount++;

        var name = data.studentName||data.name||'â€”';
        var cls  = data.classId||'â€”';
        if(!byStudent[name]) byStudent[name] = { name, cls, absent:0, late:0 };
        if(data.status==='absent') byStudent[name].absent++;
        else if(data.status==='late') byStudent[name].late++;

        if(!byClass[cls]) byClass[cls] = 0;
        if(data.status==='absent') byClass[cls]++;

        if(data.date) {
            if(!byDate[data.date]) byDate[data.date] = 0;
            if(data.status==='absent') byDate[data.date]++;
            var day = new Date(data.date+'T00:00:00').getDay();
            if(data.status==='absent') byDay[day] = (byDay[day]||0)+1;
        }
    });

    var topStudents = Object.values(byStudent).sort((a,b)=>b.absent-a.absent).slice(0,20);
    var topClasses  = Object.entries(byClass).sort((a,b)=>b[1]-a[1]).slice(0,10);
    var days = ['Ø§Ù„Ø£Ø­Ø¯','Ø§Ù„Ø§Ø«Ù†ÙŠÙ†','Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡','Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡','Ø§Ù„Ø®Ù…ÙŠØ³'];
    var worstDay = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
    var atRisk = topStudents.filter(s=>s.absent>=5).length;
    var studentsNeedWarning = topStudents.filter(s=>s.absent>=3).length;

    return {
        period, from, to, absentCount, lateCount,
        totalDays: Object.keys(byDate).length,
        behaviorCount: behSnap.size,
        clinicCount: clinicSnap.size,
        topStudents,
        topClasses,
        worstDay: worstDay ? `${days[worstDay[0]]} (${worstDay[1]} ØºÙŠØ§Ø¨)` : 'â€”',
        atRisk, studentsNeedWarning,
        avgPerDay: Object.keys(byDate).length > 0
            ? Math.round(absentCount / Object.keys(byDate).length) : 0
    };
}

// â•â• ØªØ´ØºÙŠÙ„ Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø°ÙƒÙŠ â•â•
window.runAiAnalysis = async function(type) {
    var resultEl  = document.getElementById('ai-result');
    var loadingEl = document.getElementById('ai-loading');

    resultEl.classList.remove('show');
    loadingEl.classList.add('show');

    // ØªØ¹Ø·ÙŠÙ„ Ø§Ù„Ø£Ø²Ø±Ø§Ø±
    document.querySelectorAll('.ai-btn').forEach(b=>b.disabled=true);

    try {
        var data = await fetchAnalysisData(selectedPeriod);
        var periodLabel = {week:'Ø¢Ø®Ø± Ø£Ø³Ø¨ÙˆØ¹',month:'Ø¢Ø®Ø± Ø´Ù‡Ø±',semester:'Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ',today:'Ø§Ù„ÙŠÙˆÙ…'}[selectedPeriod];

        // Ø¨Ù†Ø§Ø¡ Ø§Ù„Ù€ prompt Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„ØªØ­Ù„ÙŠÙ„
        var prompt = '';

        if(type==='general') {
            prompt = `Ø£Ù†Øª Ù…Ø³ØªØ´Ø§Ø± ØªØ±Ø¨ÙˆÙŠ Ù…ØªØ®ØµØµ Ù„Ù„Ù…Ø¯Ø§Ø±Ø³ Ø§Ù„ÙƒÙˆÙŠØªÙŠØ©. Ø­Ù„Ù‘Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‚Ø¯Ù‘Ù… ØªÙ‚Ø±ÙŠØ±Ø§Ù‹ Ø´Ø§Ù…Ù„Ø§Ù‹ Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©:

**Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨ â€” ${periodLabel}:**
- Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø­Ø§Ù„Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨: ${data.absentCount}
- Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø­Ø§Ù„Ø§Øª Ø§Ù„ØªØ£Ø®ÙŠØ±: ${data.lateCount}
- Ù…ØªÙˆØ³Ø· Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„ÙŠÙˆÙ…ÙŠ: ${data.avgPerDay} Ø·Ø§Ù„Ø¨
- Ø£ÙŠØ§Ù… Ø§Ù„Ø¹Ù…Ù„ ÙÙŠ Ø§Ù„ÙØªØ±Ø©: ${data.totalDays} ÙŠÙˆÙ…
- Ø­ÙˆØ§Ø¯Ø« Ø³Ù„ÙˆÙƒÙŠØ©: ${data.behaviorCount}
- Ù…Ø±Ø§Ø¬Ø¹Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø©: ${data.clinicCount}
- Ø·Ù„Ø§Ø¨ ÙÙŠ Ø®Ø·Ø± (5+ Ø£ÙŠØ§Ù…): ${data.atRisk}
- Ø§Ù„ÙŠÙˆÙ… Ø§Ù„Ø£Ø³ÙˆØ£ ØºÙŠØ§Ø¨Ø§Ù‹: ${data.worstDay}

**Ø£ÙƒØ«Ø± Ø§Ù„ÙØµÙˆÙ„ ØºÙŠØ§Ø¨Ø§Ù‹:**
${data.topClasses.map(([c,n],i)=>`${i+1}. ${c}: ${n} ØºÙŠØ§Ø¨`).join('\n')}

**Ø£ÙƒØ«Ø± Ø§Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹:**
${data.topStudents.slice(0,10).map((s,i)=>`${i+1}. ${s.name} (${s.cls}): ${s.absent} ØºÙŠØ§Ø¨`).join('\n')}

Ù‚Ø¯Ù‘Ù…: Ù¡) Ù…Ù„Ø®Øµ ØªÙ†ÙÙŠØ°ÙŠ Ù¢) Ø£Ø¨Ø±Ø² Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ù£) Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚Ù„Ù‚ Ù¤) ØªÙˆØµÙŠØ§Øª Ø¹Ù…Ù„ÙŠØ© Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©`;

        } else if(type==='risks') {
            prompt = `Ø£Ù†Øª Ù…Ø³ØªØ´Ø§Ø± ØªØ±Ø¨ÙˆÙŠ. Ø­Ø¯Ù‘Ø¯ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙÙŠ Ø®Ø·Ø± ÙˆØµÙ†Ù‘ÙÙ‡Ù… Ø­Ø³Ø¨ Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©:

**Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø£ÙƒØ«Ø± ØºÙŠØ§Ø¨Ø§Ù‹ â€” ${periodLabel}:**
${data.topStudents.slice(0,15).map((s,i)=>`${i+1}. ${s.name} (${s.cls}): ${s.absent} ÙŠÙˆÙ… ØºÙŠØ§Ø¨ØŒ ${s.late} ØªØ£Ø®ÙŠØ±`).join('\n')}

**Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„ÙƒÙˆÙŠØªÙŠØ© Ù„Ù„Ø¥Ù†Ø°Ø§Ø±:**
- 3 ØºÙŠØ§Ø¨Ø§Øª: ØªÙ†Ø¨ÙŠÙ‡
- 5 ØºÙŠØ§Ø¨Ø§Øª: Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±
- 8 ØºÙŠØ§Ø¨Ø§Øª: Ø¥Ù†Ø°Ø§Ø± Ø±Ø³Ù…ÙŠ
- 10 ØºÙŠØ§Ø¨Ø§Øª: Ø­Ø±Ù…Ø§Ù† Ù…Ù† Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª

Ù‚Ø¯Ù‘Ù…: Ù¡) Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ù…ØµÙ†Ù‘ÙØ© Ø­Ø³Ø¨ Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø®Ø·Ø± Ù¢) Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ù„ÙƒÙ„ Ù…Ø³ØªÙˆÙ‰ Ù£) Ø£ÙˆÙ„ÙˆÙŠØ§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©`;

        } else if(type==='recommendations') {
            prompt = `Ø£Ù†Øª Ù…Ø³ØªØ´Ø§Ø± ØªØ±Ø¨ÙˆÙŠ Ù…ØªØ®ØµØµ. Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù‚Ø¯Ù‘Ù… ØªÙˆØµÙŠØ§Øª Ø¹Ù…Ù„ÙŠØ©:

**Ù…Ù„Ø®Øµ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª â€” ${periodLabel}:**
- ØºÙŠØ§Ø¨: ${data.absentCount} | ØªØ£Ø®ÙŠØ±: ${data.lateCount} | Ù…ØªÙˆØ³Ø· ÙŠÙˆÙ…ÙŠ: ${data.avgPerDay}
- Ø£Ø³ÙˆØ£ ÙŠÙˆÙ…: ${data.worstDay}
- Ø·Ù„Ø§Ø¨ ÙŠØ­ØªØ§Ø¬ÙˆÙ† ØªØ¯Ø®Ù„Ø§Ù‹: ${data.studentsNeedWarning}
- Ø­ÙˆØ§Ø¯Ø« Ø³Ù„ÙˆÙƒÙŠØ©: ${data.behaviorCount}
- Ø§Ù„ÙØµÙ„ Ø§Ù„Ø£ÙƒØ«Ø± ØºÙŠØ§Ø¨Ø§Ù‹: ${data.topClasses[0]?.[0]||'â€”'} (${data.topClasses[0]?.[1]||0} ØºÙŠØ§Ø¨)

Ù‚Ø¯Ù‘Ù… ØªÙˆØµÙŠØ§Øª Ø¹Ù…Ù„ÙŠØ© ÙÙŠ: Ù¡) Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ± Ù¢) Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„ÙˆÙ‚Ø§Ø¦ÙŠØ© Ù£) Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„Ù†ÙØ³ÙŠ ÙˆØ§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ Ù¤) ØªØ­Ø³ÙŠÙ† Ø¨ÙŠØ¦Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ù¥) Ø®Ø·Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø£Ø³Ø¨ÙˆØ¹ÙŠØ©`;

        } else if(type==='patterns') {
            prompt = `Ø£Ù†Øª Ù…Ø­Ù„Ù„ Ø¨ÙŠØ§Ù†Ø§Øª ØªØ±Ø¨ÙˆÙŠØ©. Ø§ÙƒØªØ´Ù Ø§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ù…Ø®ÙÙŠØ© ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª:

**Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨ â€” ${periodLabel}:**
- Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${data.absentCount} ØºÙŠØ§Ø¨ Ø®Ù„Ø§Ù„ ${data.totalDays} ÙŠÙˆÙ… Ø¹Ù…Ù„
- Ø§Ù„ÙŠÙˆÙ… Ø§Ù„Ø£Ø³ÙˆØ£: ${data.worstDay}
- Ø§Ù„ÙØµÙˆÙ„ Ø§Ù„Ù…ØªÙƒØ±Ø±Ø© ÙÙŠ Ø§Ù„ØºÙŠØ§Ø¨: ${data.topClasses.slice(0,5).map(([c,n])=>`${c}(${n})`).join('ØŒ ')}
- Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…ØªÙƒØ±Ø±ÙˆÙ†: ${data.topStudents.filter(s=>s.absent>=3).length} Ø·Ø§Ù„Ø¨ Ø¨Ù€ 3+ Ø£ÙŠØ§Ù…

Ø§ÙƒØªØ´Ù: Ù¡) Ø§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ø²Ù…Ù†ÙŠØ© (Ø£ÙŠØ§Ù…/ÙØªØ±Ø§Øª) Ù¢) Ø§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ø¬ØºØ±Ø§ÙÙŠØ© (ÙØµÙˆÙ„/Ù…Ø±Ø§Ø­Ù„) Ù£) Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…ØªÙƒØ±Ø±ÙŠÙ† Ù¤) Ø¹Ù„Ø§Ù‚Ø© Ø§Ù„ØºÙŠØ§Ø¨ Ø¨Ø§Ù„Ø³Ù„ÙˆÙƒ ÙˆØ§Ù„Ø¹ÙŠØ§Ø¯Ø© Ù¥) ØªÙˆÙ‚Ø¹Ø§Øª Ù„Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø§Ù„Ù‚Ø§Ø¯Ù…`;
        }

        // Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Cloud Function (Ø¢Ù…Ù† - API key ÙÙŠ Ø§Ù„Ø³ÙŠØ±ÙØ±)
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var fns = getFunctions(undefined, 'me-central1');
        var analyzeAI = httpsCallable(fns, 'analyzeAttendance');
        var result = await analyzeAI({ prompt });
        var text = result.data?.text || 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ù†ØªÙŠØ¬Ø©';

        loadingEl.classList.remove('show');
        resultEl.textContent = text;
        resultEl.classList.add('show');
        resultEl.scrollIntoView({ behavior:'smooth', block:'nearest' });

    } catch(e) {
        loadingEl.classList.remove('show');
        resultEl.textContent = 'âŒ ØªØ¹Ø°Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„: ' + e.message;
        resultEl.classList.add('show');
    } finally {
        document.querySelectorAll('.ai-btn').forEach(b=>b.disabled=false);
    }
};

// â•â• Ù…Ù„Ø®Øµ Ø³Ø±ÙŠØ¹ â•â•
async function loadQuickStats() {
    var el = document.getElementById('quick-stats');
    var chips = document.getElementById('quick-chips');
    var schoolId = getActiveSchoolId();
    var todayISO = getTodayISO();

    try {
        var _pr = await Promise.all([
            getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId), where('date','==',todayISO), where('status','==','absent'))),
            getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId),
                where('date','>=', (() => { var d=new Date();
        var todayAbs = _pr[0];          var weekAbs = _pr[1];          var stuTotal = _pr[2];  d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })()),
                where('status','==','absent'))),
            getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)))
        ]);

        var attendRate = stuTotal.size > 0
            ? Math.round(((stuTotal.size - todayAbs.size) / stuTotal.size) * 100) : 100;

        el.innerHTML = `
            <div class="stat-mini"><div class="n" style="color:var(--red)">${todayAbs.size}</div><div class="l">ØºÙŠØ§Ø¨ Ø§Ù„ÙŠÙˆÙ…</div></div>
            <div class="stat-mini"><div class="n" style="color:var(--sky)">${weekAbs.size}</div><div class="l">ØºÙŠØ§Ø¨ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹</div></div>
            <div class="stat-mini"><div class="n" style="color:var(--green)">${attendRate}%</div><div class="l">Ù†Ø³Ø¨Ø© Ø§Ù„Ø­Ø¶ÙˆØ±</div></div>
            <div class="stat-mini"><div class="n" style="color:var(--navy)">${stuTotal.size}</div><div class="l">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨</div></div>`;

        // chips Ø°ÙƒÙŠØ©
        var insightChips = [];
        if(todayAbs.size > 20) insightChips.push(`<span class="insight-chip chip-danger">âš ï¸ ØºÙŠØ§Ø¨ Ù…Ø±ØªÙØ¹ Ø§Ù„ÙŠÙˆÙ…: ${todayAbs.size}</span>`);
        if(attendRate >= 95) insightChips.push(`<span class="insight-chip chip-success">ðŸŽ‰ Ù†Ø³Ø¨Ø© Ø­Ø¶ÙˆØ± Ù…Ù…ØªØ§Ø²Ø© ${attendRate}%</span>`);
        if(attendRate < 85) insightChips.push(`<span class="insight-chip chip-warn">ðŸ“‰ Ù†Ø³Ø¨Ø© Ø§Ù„Ø­Ø¶ÙˆØ± Ø£Ù‚Ù„ Ù…Ù† 85%</span>`);
        if(weekAbs.size > todayAbs.size * 5) insightChips.push(`<span class="insight-chip chip-info">ðŸ“Š Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø£Ø¹Ù„Ù‰ Ù…Ù† Ø§Ù„Ù…ØªÙˆØ³Ø·</span>`);

        chips.innerHTML = insightChips.join('') || '<span style="color:var(--mid);font-size:13px;font-weight:700">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø®Ø§ØµØ© Ø§Ù„ÙŠÙˆÙ… âœ…</span>';

    } catch(e) { el.innerHTML = 'âŒ ØªØ¹Ø°Ø± Ø§Ù„ØªØ­Ù…ÙŠÙ„'; }
}

// â•â• Ø£ÙƒØ«Ø± Ø§Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹ â•â•
async function loadTopAbsentStudents() {
    var tbody = document.getElementById('top-absent-tbody');
    var schoolId = getActiveSchoolId();

    try {
        var snap = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('status','==','absent')));

        var byStudent = {};
        snap.forEach(d => {
            var data = d.data();
            var name = data.studentName||data.name||'â€”';
            var cls  = data.classId||'â€”';
            var phone= data.parentPhone||'';
            var key  = `${name}__${cls}`;
            if(!byStudent[key]) byStudent[key] = { name, cls, phone, count:0 };
            byStudent[key].count++;
        });

        var sorted = Object.values(byStudent).sort((a,b)=>b.count-a.count).slice(0,20);
        if(!sorted.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--mid)">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª ØºÙŠØ§Ø¨</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map((s,i) => {
            var level = s.count >= 10 ? ['ðŸ”´ Ø­Ø±Ù…Ø§Ù†','#dc2626']
                : s.count >= 8 ? ['ðŸŸ  Ø¥Ù†Ø°Ø§Ø± Ø±Ø³Ù…ÙŠ','#ea580c']
                : s.count >= 5 ? ['ðŸŸ¡ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡','#d97706']
                : s.count >= 3 ? ['ðŸ“¢ ØªÙ†Ø¨ÙŠÙ‡','#6b7280']
                : ['âœ… Ø·Ø¨ÙŠØ¹ÙŠ','#16a34a'];

            var phone = (s.phone||'').replace(/\D/g,'');
            return `<tr style="border-bottom:1px solid var(--line)">
                <td style="padding:9px 12px;font-weight:800;color:var(--mid)">${i+1}</td>
                <td style="padding:9px 12px;font-weight:700">${s.name}</td>
                <td style="padding:9px 12px">${s.cls}</td>
                <td style="padding:9px 12px;text-align:center;font-weight:900;font-size:16px;color:${s.count>=5?'var(--red)':'var(--navy)'}">${s.count}</td>
                <td style="padding:9px 12px;text-align:center">
                    <span style="color:${level[1]};font-weight:800;font-size:12px">${level[0]}</span>
                </td>
                <td style="padding:9px 12px;text-align:center">
                    ${phone ? `<button onclick="window.sendAbsenceAlert('${s.name}','${s.cls}','${s.count}','${phone}')"
                        style="background:#25d366;color:#fff;border:none;padding:5px 10px;border-radius:6px;
                        font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer">
                        <i class="bi bi-whatsapp"></i> ÙˆØ§ØªØ³Ø§Ø¨
                    </button>` : '<span style="color:#ccc;font-size:11px">Ù„Ø§ Ø±Ù‚Ù…</span>'}
                </td>
            </tr>`;
        }).join('');

    } catch(e) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:20px">âŒ ${e.message}</td></tr>`; }
}

window.sendAbsenceAlert = function(name, cls, count, phone) {
    var today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
    var level = count >= 10 ? 'Ø­Ø±Ù…Ø§Ù† Ù…Ù† Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª' : count >= 8 ? 'Ø¥Ù†Ø°Ø§Ø± Ø±Ø³Ù…ÙŠ' : count >= 5 ? 'Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±' : 'ØªÙ†Ø¨ÙŠÙ‡';
    var msg = encodeURIComponent(
        `Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÙŠÙƒÙ… ÙˆÙ„ÙŠ Ø£Ù…Ø± Ø§Ù„Ø·Ø§Ù„Ø¨ ${name} â€” ÙØµÙ„ ${cls}ØŒ\n` +
        `Ù†ÙØ¹Ù„Ù…ÙƒÙ… Ø¨Ø£Ù† Ø§Ø¨Ù†ÙƒÙ… Ø¨Ù„Øº Ø¹Ø¯Ø¯ ØºÙŠØ§Ø¨Ø§ØªÙ‡ ${count} ÙŠÙˆÙ…Ø§Ù‹ Ø­ØªÙ‰ ØªØ§Ø±ÙŠØ® ${today}.\n` +
        `Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…ØªØ±ØªØ¨: ${level}.\n` +
        `ÙŠØ±Ø¬Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©.`
    );
    window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
};
