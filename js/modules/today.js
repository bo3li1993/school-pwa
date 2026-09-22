import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    var container = document.getElementById('tab-index');
    if(!container) return;
    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var dateStr = new Date().toLocaleDateString('ar-KW',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

    container.innerHTML = `
    <style>
        .kpi-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;text-align:center;transition:box-shadow .2s;cursor:pointer}
        .kpi-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)}
        .kpi-val{font-size:32px;font-weight:900;margin-bottom:4px}
        .kpi-lbl{font-size:11px;color:#6b7280;font-weight:700}
        .kpi-sub{font-size:10px;color:#9ca3af;margin-top:2px}
        .dash-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:14px}
        .dash-title{font-size:14px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px;justify-content:space-between}
        .alert-card{border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700}
        .alert-red{background:#fef2f2;border:1px solid #fca5a5;color:#dc2626}
        .alert-orange{background:#fff7ed;border:1px solid #fed7aa;color:#ea580c}
        .alert-yellow{background:#fefce8;border:1px solid #fde047;color:#ca8a04}
        .alert-green{background:#f0fdf4;border:1px solid #86efac;color:#16a34a}
        .alert-blue{background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8}
        .compare-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}
        .up{background:#fee2e2;color:#dc2626}
        .down{background:#dcfce7;color:#16a34a}
        .same{background:#f1f5f9;color:#6b7280}
        .class-rank{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f2f5}
        .class-bar{flex:1;height:8px;border-radius:4px;background:#f1f5f9;overflow:hidden}
        .class-bar-fill{height:100%;border-radius:4px;transition:width .8s}
        .tab-btn{padding:7px 16px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
        .tab-btn.active{background:#0b2545;color:#fff;border-color:#0b2545}
    </style>

    <div style="max-width:900px;margin:0 auto;padding:16px">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
            <div>
                <h2 style="font-size:17px;font-weight:900;color:#0b2545"><i class="bi bi-speedometer2" style="color:#1a78c2"></i> لوحة المؤشرات</h2>
                <p style="font-size:12px;color:#6b7280;margin-top:2px">${dateStr}</p>
            </div>
            <div style="display:flex;gap:8px">
                <button onclick="refreshDashboard()" style="background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer"><i class="bi bi-arrow-clockwise"></i> تحديث</button>
                <button onclick="printDashboard()" style="background:#0b2545;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer"><i class="bi bi-printer"></i> طباعة</button>
            </div>
        </div>

        <!-- KPIs Row 1 -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px" id="kpi-row1">
            <div class="kpi-card"><div class="kpi-val" style="color:#0b2545" id="kpi-students">⏳</div><div class="kpi-lbl">إجمالي الطلاب</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color:#dc2626" id="kpi-absent">⏳</div><div class="kpi-lbl">غائب اليوم</div><div class="kpi-sub" id="kpi-absent-sub"></div></div>
            <div class="kpi-card"><div class="kpi-val" style="color:#d97706" id="kpi-late">⏳</div><div class="kpi-lbl">متأخر اليوم</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color:#16a34a" id="kpi-rate">⏳</div><div class="kpi-lbl">نسبة الحضور</div><div class="kpi-sub" id="kpi-rate-compare"></div></div>
        </div>

        <!-- KPIs Row 2 -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
            <div class="kpi-card"><div class="kpi-val" style="color:#7c3aed" id="kpi-behavior">⏳</div><div class="kpi-lbl">حوادث سلوكية</div><div class="kpi-sub">هذا الأسبوع</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color:#0891b2" id="kpi-clinic">⏳</div><div class="kpi-lbl">زيارات العيادة</div><div class="kpi-sub">هذا الأسبوع</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color:#ea580c" id="kpi-gatepass">⏳</div><div class="kpi-lbl">استئذانات اليوم</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color:#dc2626" id="kpi-atrisk">⏳</div><div class="kpi-lbl">طلاب في خطر</div><div class="kpi-sub">5+ أيام غياب</div></div>
        </div>

        <!-- تنبيهات ذكية -->
        <div class="dash-card" id="alerts-card">
            <div class="dash-title"><span><i class="bi bi-bell-fill" style="color:#d97706"></i> تنبيهات اليوم</span></div>
            <div id="smart-alerts"><div style="color:#aaa;font-size:13px;text-align:center;padding:10px">⏳ جاري التحليل...</div></div>
        </div>

        <!-- رسم بياني — الغياب آخر 7 أيام + مقارنة الأسبوع الماضي -->
        <div class="dash-card">
            <div class="dash-title">
                <span><i class="bi bi-graph-up" style="color:#1a78c2"></i> الغياب — آخر 7 أيام</span>
                <div style="display:flex;gap:6px">
                    <span style="font-size:11px;font-weight:700;color:#6b7280;display:flex;align-items:center;gap:4px"><span style="width:12px;height:4px;background:#1a78c2;border-radius:2px;display:inline-block"></span>هذا الأسبوع</span>
                    <span style="font-size:11px;font-weight:700;color:#6b7280;display:flex;align-items:center;gap:4px"><span style="width:12px;height:4px;background:#e5e7eb;border-radius:2px;display:inline-block"></span>الأسبوع الماضي</span>
                </div>
            </div>
            <div id="chart-week" style="display:flex;align-items:flex-end;gap:6px;height:140px;direction:ltr"></div>
        </div>

        <!-- مقارنة الفصول -->
        <div class="dash-card">
            <div class="dash-title">
                <span><i class="bi bi-bar-chart-fill" style="color:#dc2626"></i> مقارنة الفصول — الغياب</span>
                <div style="display:flex;gap:6px">
                    <button class="tab-btn active" onclick="switchClassView('today',this)">اليوم</button>
                    <button class="tab-btn" onclick="switchClassView('week',this)">الأسبوع</button>
                    <button class="tab-btn" onclick="switchClassView('month',this)">الشهر</button>
                </div>
            </div>
            <div id="chart-classes-ranked"></div>
        </div>

        <!-- صف: أكثر الطلاب غياباً + السلوك -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="dash-card" style="margin-bottom:0">
                <div class="dash-title"><span><i class="bi bi-person-x-fill" style="color:#dc2626"></i> أكثر طلاباً غياباً</span></div>
                <div id="top-absent" style="font-size:13px">⏳</div>
            </div>
            <div class="dash-card" style="margin-bottom:0">
                <div class="dash-title"><span><i class="bi bi-shield-exclamation" style="color:#7c3aed"></i> آخر الحوادث السلوكية</span></div>
                <div id="recent-behavior" style="font-size:13px">⏳</div>
            </div>
        </div>

        <!-- إعلانات -->
        <div id="admin-announcements"></div>
    </div>`;

    await loadDashboard(schoolId, today);
}

window.refreshDashboard = async function() {
    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    await loadDashboard(schoolId, today);
    if(window.showToast) window.showToast('تم التحديث', 'success');
};

window.printDashboard = function() {
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var content = document.querySelector('#tab-index > div').innerHTML;
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:12px}
    button{display:none!important}.kpi-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;display:inline-block;margin:4px}
    @page{size:A4;margin:10mm}</style></head><body>
    <div style="border-bottom:3px solid #0b2545;margin-bottom:14px;padding-bottom:10px;display:flex;justify-content:space-between">
        <div style="font-size:11px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center;font-size:16px;font-weight:900;color:#0b2545">تقرير المؤشرات اليومية</div>
        <div style="font-size:11px;text-align:left">${me.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
    </div>
    ${content}
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b = new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

// ══ بيانات مقارنة الفصول ══
var classDataCache = { today:{}, week:{}, month:{} };

window.switchClassView = function(period, btn) {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderClassChart(classDataCache[period]);
};

function renderClassChart(data) {
    var el = document.getElementById('chart-classes-ranked');
    if(!el) return;
    var sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
    if(!sorted.length){ el.innerHTML='<div style="color:#16a34a;font-weight:700;text-align:center;padding:16px">✅ لا يوجد غياب</div>'; return; }
    var max = sorted[0][1];
    el.innerHTML = sorted.map(([cls,count],i)=>{
        var pct = max>0?(count/max)*100:0;
        var color = pct>80?'#dc2626':pct>50?'#d97706':pct>30?'#f59e0b':'#16a34a';
        var medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
        return `<div class="class-rank">
            <div style="width:60px;font-weight:900;font-size:13px;color:#0b2545">${medal} ${cls}</div>
            <div class="class-bar"><div class="class-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <div style="width:40px;text-align:center;font-weight:900;font-size:13px;color:${color}">${count}</div>
        </div>`;
    }).join('');
}

async function loadDashboard(schoolId, today) {
    try {
        // ══ إجمالي الطلاب ══
        var studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        var totalStudents = studSnap.size;
        document.getElementById('kpi-students').textContent = totalStudents;

        // ══ غياب اليوم ══
        var attSnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('date','==',today)));
        var records = attSnap.docs.map(d=>d.data());
        var absentNames = new Set(); var lateNames = new Set();
        records.forEach(r=>{ if(r.status==='absent') absentNames.add(r.studentName); if(r.status==='late') lateNames.add(r.studentName); });
        document.getElementById('kpi-absent').textContent = absentNames.size;
        document.getElementById('kpi-late').textContent = lateNames.size;
        var rate = totalStudents>0 ? Math.floor(((totalStudents-absentNames.size)/totalStudents)*100*10)/10 : 100;
        document.getElementById('kpi-rate').textContent = rate+'%';

        // ══ غياب أمس للمقارنة ══
        var yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
        yesterday.setMinutes(yesterday.getMinutes()-yesterday.getTimezoneOffset());
        var yStr = yesterday.toISOString().slice(0,10);
        var ySnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('date','==',yStr), where('status','==','absent')));
        var yCount = new Set(); ySnap.docs.forEach(d=>yCount.add(d.data().studentName));
        var diff = absentNames.size - yCount.size;
        var compareEl = document.getElementById('kpi-absent-sub');
        if(compareEl) compareEl.innerHTML = diff>0?`<span style="color:#dc2626">▲ ${diff} عن أمس</span>`:diff<0?`<span style="color:#16a34a">▼ ${Math.abs(diff)} عن أمس</span>`:`<span style="color:#6b7280">= مثل أمس</span>`;

        // ══ نسبة الحضور مقارنة بالأسبوع ══
        var rateCompare = document.getElementById('kpi-rate-compare');
        var rateColor = rate>=95?'#16a34a':rate>=85?'#d97706':'#dc2626';
        var rateLabel = rate>=95?'ممتازة':rate>=85?'جيدة':'تحتاج متابعة';
        if(rateCompare) rateCompare.innerHTML = `<span style="color:${rateColor}">${rateLabel}</span>`;

        // ══ الاستئذانات ══
        var gateSnap = await getDocs(query(collection(db,'gatepass'), where('schoolId','==',schoolId), where('date','==',today)));
        document.getElementById('kpi-gatepass').textContent = gateSnap.size;

        // ══ السلوك هذا الأسبوع ══
        var weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
        weekStart.setMinutes(weekStart.getMinutes()-weekStart.getTimezoneOffset());
        var wStr = weekStart.toISOString().slice(0,10);
        var behSnap = await getDocs(query(collection(db,'behavior'), where('schoolId','==',schoolId), where('date','>=',wStr)));
        document.getElementById('kpi-behavior').textContent = behSnap.size;

        // ══ العيادة هذا الأسبوع ══
        var clinicSnap = await getDocs(query(collection(db,'clinic'), where('schoolId','==',schoolId), where('date','>=',wStr)));
        document.getElementById('kpi-clinic').textContent = clinicSnap.size;

        // ══ طلاب في خطر ══
        var allAttSnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('status','==','absent')));
        var studentCounts = {};
        allAttSnap.docs.forEach(d=>{ var r=d.data(); var k=r.studentName+'|'+(r.classId||''); studentCounts[k]=(studentCounts[k]||0)+1; });
        var atRisk = Object.values(studentCounts).filter(v=>v>=5).length;
        document.getElementById('kpi-atrisk').textContent = atRisk;
        if(atRisk>0) document.getElementById('kpi-atrisk').style.color='#dc2626';

        // ══ تنبيهات ذكية ══
        var alerts = [];
        if(absentNames.size > totalStudents*0.1) alerts.push({type:'red', icon:'🔴', msg:`نسبة الغياب اليوم مرتفعة — ${absentNames.size} طالب (${Math.round(absentNames.size/totalStudents*100)}%)`});
        if(atRisk>0) alerts.push({type:'orange', icon:'⚠️', msg:`${atRisk} طالب وصلوا 5+ أيام غياب — يحتاجون متابعة فورية`});
        if(gateSnap.size>10) alerts.push({type:'yellow', icon:'🚪', msg:`عدد الاستئذانات اليوم مرتفع — ${gateSnap.size} حالة`});
        if(behSnap.size>5) alerts.push({type:'orange', icon:'🛡️', msg:`${behSnap.size} حادثة سلوكية هذا الأسبوع`});
        if(rate>=95) alerts.push({type:'green', icon:'🎉', msg:`نسبة حضور ممتازة اليوم — ${rate}%`});
        if(absentNames.size===0) alerts.push({type:'green', icon:'✅', msg:'لا يوجد غياب اليوم — يوم مثالي!'});
        if(diff>5) alerts.push({type:'red', icon:'📈', msg:`ارتفاع ملحوظ في الغياب اليوم — ${diff} أكثر من أمس`});

        var alertsEl = document.getElementById('smart-alerts');
        if(alertsEl) alertsEl.innerHTML = alerts.length
            ? alerts.map(a=>`<div class="alert-card alert-${a.type}"><span style="font-size:18px">${a.icon}</span><span>${a.msg}</span></div>`).join('')
            : '<div style="color:#aaa;font-size:13px;text-align:center;padding:10px">لا توجد تنبيهات خاصة اليوم</div>';

        // ══ رسم آخر 7 أيام ══
        var days = [];
        for(var i=6;i>=0;i--){ var dd=new Date(); dd.setDate(dd.getDate()-i); dd.setMinutes(dd.getMinutes()-dd.getTimezoneOffset()); days.push(dd.toISOString().slice(0,10)); }
        var weekData = {}; days.forEach(d=>weekData[d]=0);
        allAttSnap.docs.forEach(d=>{ var r=d.data(); if(weekData[r.date]!==undefined) weekData[r.date]++; });

        // الأسبوع الماضي للمقارنة
        var lastWeekData = {};
        for(var i=13;i>=7;i--){ var dd=new Date(); dd.setDate(dd.getDate()-i); dd.setMinutes(dd.getMinutes()-dd.getTimezoneOffset()); lastWeekData[dd.toISOString().slice(0,10)]=0; }
        allAttSnap.docs.forEach(d=>{ var r=d.data(); if(lastWeekData[r.date]!==undefined) lastWeekData[r.date]++; });
        var lastWeekVals = Object.values(lastWeekData);

        var weekMax = Math.max(...Object.values(weekData), ...lastWeekVals, 1);
        var weekChart = document.getElementById('chart-week');
        weekChart.innerHTML = days.map((d,i)=>{
            var val=weekData[d]; var lastVal=lastWeekVals[i]||0;
            var pct=(val/weekMax)*100; var lastPct=(lastVal/weekMax)*100;
            var dayName=new Date(d+'T12:00:00').toLocaleDateString('ar-KW',{weekday:'short'});
            var isToday=d===today;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:2px">
                <div style="font-size:10px;font-weight:900;color:${isToday?'#1a78c2':'#666'}">${val}</div>
                <div style="width:100%;display:flex;gap:2px;justify-content:center;align-items:flex-end;height:110px">
                    <div style="width:45%;background:${isToday?'#1a78c2':'#93c5fd'};border-radius:4px 4px 0 0;height:${Math.max(pct,4)}%;min-height:4px"></div>
                    <div style="width:45%;background:#e5e7eb;border-radius:4px 4px 0 0;height:${Math.max(lastPct,4)}%;min-height:4px"></div>
                </div>
                <div style="font-size:9px;font-weight:${isToday?'900':'600'};color:${isToday?'#1a78c2':'#6b7280'}">${dayName}</div>
            </div>`;
        }).join('');

        // ══ مقارنة الفصول ══
        // اليوم
        var todayByClass = {};
        records.filter(r=>r.status==='absent').forEach(r=>{ todayByClass[r.classId]=(todayByClass[r.classId]||0)+1; });
        classDataCache.today = todayByClass;

        // الأسبوع
        var weekByClass = {};
        allAttSnap.docs.forEach(d=>{ var r=d.data(); if(days.includes(r.date)) weekByClass[r.classId]=(weekByClass[r.classId]||0)+1; });
        classDataCache.week = weekByClass;

        // الشهر
        var monthStart = new Date(); monthStart.setDate(1);
        monthStart.setMinutes(monthStart.getMinutes()-monthStart.getTimezoneOffset());
        var mStr = monthStart.toISOString().slice(0,10);
        var monthByClass = {};
        allAttSnap.docs.forEach(d=>{ var r=d.data(); if(r.date>=mStr) monthByClass[r.classId]=(monthByClass[r.classId]||0)+1; });
        classDataCache.month = monthByClass;

        renderClassChart(todayByClass);

        // ══ أكثر طلاباً غياباً ══
        var topAbsent = Object.entries(studentCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
        var topDiv = document.getElementById('top-absent');
        topDiv.innerHTML = topAbsent.length ? topAbsent.map((t,i)=>{
            var [key,count]=t; var [name,cls]=key.split('|');
            var color=count>=10?'#dc2626':count>=5?'#d97706':'#6b7280';
            var level=count>=10?'حرمان':count>=8?'إنذار':count>=5?'استدعاء':count>=3?'تنبيه':'';
            return `<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f2f5;gap:8px">
                <span style="width:22px;height:22px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0">${i+1}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
                    <div style="font-size:10px;color:#6b7280">${cls}</div>
                </div>
                <div style="text-align:center;flex-shrink:0">
                    <div style="color:${color};font-weight:900;font-size:13px">${count}</div>
                    ${level?`<div style="font-size:9px;color:${color};font-weight:700">${level}</div>`:''}
                </div>
            </div>`;
        }).join('') : '<div style="color:#16a34a;font-weight:700;padding:10px">✅ لا يوجد طلاب متكرري الغياب</div>';

        // ══ آخر الحوادث السلوكية ══
        var recentBeh = behSnap.docs.map(d=>d.data()).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5);
        var behDiv = document.getElementById('recent-behavior');
        behDiv.innerHTML = recentBeh.length ? recentBeh.map(r=>`
            <div style="padding:8px 0;border-bottom:1px solid #f0f2f5">
                <div style="font-weight:700;font-size:12px">${r.studentName||'—'}</div>
                <div style="font-size:11px;color:#6b7280">${r.action||r.type||'—'} — ${r.date||''}</div>
            </div>`).join('')
        : '<div style="color:#16a34a;font-weight:700;padding:10px">✅ لا توجد حوادث هذا الأسبوع</div>';

        // ══ إعلانات ══
        var annSnap = await getDocs(query(collection(db,'school_announcements'), where('schoolId','==',schoolId)));
        var annDiv = document.getElementById('admin-announcements');
        if(annSnap.size>0 && annDiv) {
            annDiv.innerHTML = `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:14px;padding:16px">
                <h3 style="font-size:14px;font-weight:900;color:#92400e;margin-bottom:8px">📢 إعلانات المدرسة</h3>
                ${annSnap.docs.map(d=>`<div style="font-size:13px;color:#78350f;padding:6px 0;border-bottom:1px solid #fde68a;font-weight:600">${d.data().text}</div>`).join('')}
            </div>`;
        }

    } catch(e) {
        console.error('Dashboard error:', e);
        ['kpi-students','kpi-absent','kpi-late','kpi-rate','kpi-behavior','kpi-clinic','kpi-gatepass','kpi-atrisk'].forEach(id=>{
            var el=document.getElementById(id); if(el) el.textContent='!';
        });
    }
}
