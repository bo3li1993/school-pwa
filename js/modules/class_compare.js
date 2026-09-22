import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initClassCompareModule() {
    var container = document.getElementById('tab-class-compare');
    if(!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .cc-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .cc-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .period-btns{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
        .period-btn{padding:8px 16px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;color:#6b7280}
        .period-btn.active{background:#0b2545;color:#fff;border-color:#0b2545}
        .rank-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0f2f5}
        .rank-num{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0}
        .bar-wrap{flex:1;height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden}
        .bar-fill{height:100%;border-radius:5px;transition:width 1s}
        .metric-tabs{display:flex;gap:4px;margin-bottom:14px;background:#f1f5f9;border-radius:8px;padding:3px}
        .metric-tab{flex:1;padding:8px;border:none;border-radius:6px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s}
        .metric-tab.active{background:#fff;color:#0b2545;box-shadow:0 1px 4px rgba(0,0,0,.08)}
        .compare-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}
        .compare-box{background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center}
        .compare-val{font-size:28px;font-weight:900;margin-bottom:4px}
        .compare-lbl{font-size:11px;color:#6b7280;font-weight:700}
        .trophy-row{display:flex;justify-content:center;gap:16px;margin-bottom:20px}
        .trophy-box{text-align:center;padding:16px;background:linear-gradient(135deg,#f8fafc,#fff);border:1.5px solid #e5e7eb;border-radius:12px;min-width:100px}
    </style>

    <div class="cc-card">
        <div class="cc-title"><i class="bi bi-bar-chart-fill" style="color:#1a78c2"></i> مقارنة الفصول</div>

        <!-- فترة المقارنة -->
        <div class="period-btns">
            <button class="period-btn active" onclick="ccSetPeriod('today',this)">اليوم</button>
            <button class="period-btn" onclick="ccSetPeriod('week',this)">هذا الأسبوع</button>
            <button class="period-btn" onclick="ccSetPeriod('month',this)">هذا الشهر</button>
            <button class="period-btn" onclick="ccSetPeriod('semester',this)">الفصل كاملاً</button>
        </div>

        <!-- المؤشر -->
        <div class="metric-tabs">
            <button class="metric-tab active" onclick="ccSetMetric('absence',this)"><i class="bi bi-person-x"></i> الغياب</button>
            <button class="metric-tab" onclick="ccSetMetric('behavior',this)"><i class="bi bi-shield-exclamation"></i> السلوك</button>
            <button class="metric-tab" onclick="ccSetMetric('clinic',this)"><i class="bi bi-heart-pulse"></i> العيادة</button>
            <button class="metric-tab" onclick="ccSetMetric('gatepass',this)"><i class="bi bi-door-open"></i> الاستئذان</button>
        </div>

        <div id="cc-loading" style="text-align:center;padding:30px;color:#6b7280">⏳ جاري التحميل...</div>
        <div id="cc-content" style="display:none">
            <!-- الجوائز -->
            <div class="trophy-row" id="cc-trophies"></div>
            <!-- الترتيب -->
            <div id="cc-ranking"></div>
        </div>
    </div>

    <!-- تقرير تفصيلي -->
    <div class="cc-card">
        <div class="cc-title"><i class="bi bi-table" style="color:#d4920a"></i> تقرير تفصيلي</div>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <button class="period-btn active" style="font-size:12px;padding:6px 14px" onclick="ccPrintReport()"><i class="bi bi-printer"></i> طباعة</button>
            <button class="period-btn" style="font-size:12px;padding:6px 14px" onclick="ccExport()"><i class="bi bi-file-excel"></i> Excel</button>
        </div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead><tr id="cc-table-head" style="background:#0b2545;color:#fff"></tr></thead>
                <tbody id="cc-table-body"></tbody>
            </table>
        </div>
    </div>
    `;

    window._ccPeriod = 'today';
    window._ccMetric = 'absence';
    window._ccData = {};
    await ccLoad();
}

window.ccSetPeriod = function(period, btn) {
    document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    window._ccPeriod = period;
    ccLoad();
};

window.ccSetMetric = function(metric, btn) {
    document.querySelectorAll('.metric-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    window._ccMetric = metric;
    ccRender();
};

function getDateRange(period) {
    var today = getTodayISO();
    var from = new Date();
    if(period==='week') from.setDate(from.getDate()-7);
    else if(period==='month') from.setMonth(from.getMonth()-1);
    else if(period==='semester') from.setMonth(from.getMonth()-5);
    else return { from: today, to: today };
    from.setMinutes(from.getMinutes()-from.getTimezoneOffset());
    return { from: from.toISOString().slice(0,10), to: today };
}

async function ccLoad() {
    var loading = document.getElementById('cc-loading');
    var content = document.getElementById('cc-content');
    if(loading) loading.style.display='block';
    if(content) content.style.display='none';

    var schoolId = getActiveSchoolId();
    var { from, to } = getDateRange(window._ccPeriod);
    var isToday = window._ccPeriod === 'today';

    try {
        var [absSnap, behSnap, clinicSnap, gateSnap] = await Promise.all([
            getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId),
                isToday ? where('date','==',from) : where('date','>=',from), where('status','==','absent'))),
            getDocs(query(collection(db,'behavior'), where('schoolId','==',schoolId),
                isToday ? where('date','==',from) : where('date','>=',from))),
            getDocs(query(collection(db,'clinic'), where('schoolId','==',schoolId),
                isToday ? where('date','==',from) : where('date','>=',from))),
            getDocs(query(collection(db,'gatepass'), where('schoolId','==',schoolId),
                isToday ? where('date','==',from) : where('date','>=',from))),
        ]);

        var data = {};
        var processSnap = (snap, key) => {
            snap.forEach(d=>{
                var r = d.data();
                var cls = r.classId || r.class || '—';
                if(!data[cls]) data[cls] = { class:cls, absence:0, behavior:0, clinic:0, gatepass:0 };
                data[cls][key]++;
            });
        };
        processSnap(absSnap, 'absence');
        processSnap(behSnap, 'behavior');
        processSnap(clinicSnap, 'clinic');
        processSnap(gateSnap, 'gatepass');

        window._ccData = data;
        if(loading) loading.style.display='none';
        if(content) content.style.display='block';
        ccRender();
        ccRenderTable();
    } catch(e) {
        if(loading) loading.textContent = '❌ خطأ في التحميل: ' + e.message;
    }
}

function ccRender() {
    var data = window._ccData;
    var metric = window._ccMetric;
    var metricLabel = {absence:'الغياب', behavior:'السلوك', clinic:'العيادة', gatepass:'الاستئذان'}[metric];
    var metricColor = {absence:'#dc2626', behavior:'#7c3aed', clinic:'#0891b2', gatepass:'#ea580c'}[metric];

    var sorted = Object.values(data).sort((a,b)=>b[metric]-a[metric]);
    var max = sorted.length ? sorted[0][metric] : 1;

    // الجوائز
    var trophies = document.getElementById('cc-trophies');
    if(trophies) {
        var best = sorted[sorted.length-1]; // أقل غياب = الأفضل
        var worst = sorted[0]; // أكثر غياب = الأسوأ
        trophies.innerHTML = `
            <div class="trophy-box" style="border-color:#fbbf24">
                <div style="font-size:28px">🏆</div>
                <div style="font-size:14px;font-weight:900;color:#0b2545">${best?.class||'—'}</div>
                <div style="font-size:11px;color:#16a34a;font-weight:700">الأفضل — ${best?.[metric]||0} فقط</div>
            </div>
            <div class="trophy-box" style="border-color:#dc2626">
                <div style="font-size:28px">⚠️</div>
                <div style="font-size:14px;font-weight:900;color:#0b2545">${worst?.class||'—'}</div>
                <div style="font-size:11px;color:#dc2626;font-weight:700">يحتاج متابعة — ${worst?.[metric]||0}</div>
            </div>
            <div class="trophy-box">
                <div style="font-size:28px">📊</div>
                <div style="font-size:14px;font-weight:900;color:#0b2545">${sorted.length} فصل</div>
                <div style="font-size:11px;color:#6b7280;font-weight:700">إجمالي ${sorted.reduce((s,c)=>s+c[metric],0)} ${metricLabel}</div>
            </div>`;
    }

    // الترتيب
    var ranking = document.getElementById('cc-ranking');
    if(ranking) {
        ranking.innerHTML = sorted.map((c,i)=>{
            var pct = max>0?(c[metric]/max)*100:0;
            var color = pct>80?'#dc2626':pct>50?'#d97706':pct>20?'#f59e0b':'#16a34a';
            var medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
            return `<div class="rank-row">
                <div class="rank-num" style="background:${color}22;color:${color}">${medal||i+1}</div>
                <div style="width:60px;font-weight:900;font-size:13px;color:#0b2545">${c.class}</div>
                <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
                <div style="width:50px;text-align:center;font-weight:900;font-size:15px;color:${color}">${c[metric]}</div>
                <div style="width:60px;text-align:center;font-size:11px;color:#6b7280">${metricLabel}</div>
            </div>`;
        }).join('') || '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:700">✅ لا توجد بيانات لهذه الفترة</div>';
    }
}

function ccRenderTable() {
    var data = window._ccData;
    var sorted = Object.values(data).sort((a,b)=>a.class.localeCompare(b.class));

    var head = document.getElementById('cc-table-head');
    var body = document.getElementById('cc-table-body');
    if(!head||!body) return;

    head.innerHTML = '<th style="padding:10px 12px;text-align:right">الفصل</th><th style="padding:10px 12px;text-align:center">الغياب</th><th style="padding:10px 12px;text-align:center">السلوك</th><th style="padding:10px 12px;text-align:center">العيادة</th><th style="padding:10px 12px;text-align:center">الاستئذان</th><th style="padding:10px 12px;text-align:center">المجموع</th>';
    body.innerHTML = sorted.map(c=>{
        var total = c.absence+c.behavior+c.clinic+c.gatepass;
        var totalColor = total>20?'#dc2626':total>10?'#d97706':'#16a34a';
        return `<tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:10px 12px;font-weight:900">${c.class}</td>
            <td style="padding:10px 12px;text-align:center;color:#dc2626;font-weight:700">${c.absence}</td>
            <td style="padding:10px 12px;text-align:center;color:#7c3aed;font-weight:700">${c.behavior}</td>
            <td style="padding:10px 12px;text-align:center;color:#0891b2;font-weight:700">${c.clinic}</td>
            <td style="padding:10px 12px;text-align:center;color:#ea580c;font-weight:700">${c.gatepass}</td>
            <td style="padding:10px 12px;text-align:center;font-weight:900;color:${totalColor}">${total}</td>
        </tr>`;
    }).join('');
}

window.ccPrintReport = function() {
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var table = document.querySelector('#tab-class-compare table')?.outerHTML||'';
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right}td{padding:7px;border:1px solid #ddd}@page{size:A4;margin:10mm}</style>
    </head><body>
    <div style="border-bottom:3px solid #0b2545;margin-bottom:14px;padding-bottom:10px;display:flex;justify-content:space-between">
        <div style="font-size:11px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center;font-size:16px;font-weight:900;color:#0b2545">تقرير مقارنة الفصول</div>
        <div style="font-size:11px;text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
    </div>
    ${table}
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b=new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

window.ccExport = function() {
    if(!window.XLSX){ alert('مكتبة Excel غير محملة'); return; }
    var data = Object.values(window._ccData).sort((a,b)=>a.class.localeCompare(b.class));
    var rows = [['الفصل','الغياب','السلوك','العيادة','الاستئذان','المجموع']];
    data.forEach(c=>rows.push([c.class,c.absence,c.behavior,c.clinic,c.gatepass,c.absence+c.behavior+c.clinic+c.gatepass]));
    var wb=XLSX.utils.book_new();
    var ws=XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,'مقارنة الفصول',ws);
    XLSX.writeFile(wb,'class_comparison.xlsx');
};
