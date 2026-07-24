import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const container = document.getElementById('tab-index');
    if (!container) return;

    const user     = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const schoolId = getActiveSchoolId();
    const todayISO = getTodayISO();
    const d        = new Date();
    const dayName  = d.toLocaleDateString('ar-KW', { weekday:'long' });
    const dateAr   = d.toLocaleDateString('ar-KW', { year:'numeric', month:'long', day:'numeric' });

    container.innerHTML = `
    <style>
        .dash-greeting{background:linear-gradient(135deg,var(--navy) 0%,#1a4a8a 100%);border-radius:16px;padding:22px 24px;margin-bottom:18px;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
        .dash-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px}
        .dash-kpi{background:var(--white);border-radius:12px;padding:16px;border-bottom:4px solid;box-shadow:0 1px 4px rgba(0,0,0,.07);cursor:default;transition:transform .2s}
        .dash-kpi:hover{transform:translateY(-2px)}
        .dash-kpi .lbl{font-size:11px;color:#999;font-weight:700;margin-bottom:4px}
        .dash-kpi .num{font-size:32px;font-weight:900;line-height:1.2}
        .dash-kpi .sub{font-size:10px;color:#aaa;margin-top:3px;font-weight:600}
        .dash-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
        .dash-chart-box{background:var(--white);border-radius:14px;padding:20px;border:1px solid var(--line)}
        .dash-chart-title{font-size:14px;font-weight:900;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .bar-chart{display:flex;flex-direction:column;gap:8px}
        .bar-item{display:flex;align-items:center;gap:10px;font-size:12px}
        .bar-label{width:60px;text-align:right;font-weight:700;color:var(--mid);flex-shrink:0}
        .bar-track{flex:1;height:24px;background:#f0f4f8;border-radius:6px;overflow:hidden;position:relative}
        .bar-fill{height:100%;border-radius:6px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:11px;font-weight:800;color:#fff;transition:width 1s ease;min-width:28px}
        .donut-wrap{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap}
        .donut-svg{flex-shrink:0}
        .donut-legend{display:flex;flex-direction:column;gap:8px}
        .legend-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700}
        .legend-dot{width:10px;height:10px;border-radius:50%}
        .dash-list{background:var(--white);border-radius:14px;padding:20px;border:1px solid var(--line);margin-bottom:16px}
        .dash-list-title{font-size:14px;font-weight:900;color:var(--navy);margin-bottom:12px;display:flex;align-items:center;gap:8px;border-bottom:2px solid var(--off);padding-bottom:8px}
        .alert-card{background:linear-gradient(135deg,#fff5f5,#fff);border-right:4px solid var(--red);border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;font-size:13px}
        .alert-name{font-weight:800;color:var(--navy)}
        .alert-count{background:var(--red);color:#fff;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:800}
        .wa-btn{background:#25d366;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px}
        .wa-btn:hover{background:#1da851}
        .trend-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:800}
        .trend-up{background:#fee2e2;color:#dc2626}
        .trend-down{background:#dcfce7;color:#16a34a}
        @media(max-width:768px){.dash-two{grid-template-columns:1fr}.dash-kpi .num{font-size:26px}}
    </style>

    <!-- ترحيب -->
    <div class="dash-greeting">
        <div>
            <div style="font-size:12px;opacity:.7;font-weight:600">${dayName}، ${dateAr}</div>
            <h2 style="margin:4px 0 2px;font-size:19px;font-weight:900">مرحباً، ${user.name||'المدير'} 👋</h2>
            <div style="font-size:12px;opacity:.6">${user.schoolName||''}</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,.1);padding:12px 20px;border-radius:12px">
            <div id="dash-attend-rate" style="font-size:30px;font-weight:900;color:var(--gold)">—%</div>
            <div style="font-size:11px;opacity:.8">نسبة الحضور اليوم</div>
        </div>
    </div>

    <!-- KPIs -->
    <div class="dash-kpi-grid">
        <div class="dash-kpi" style="border-color:#dc2626">
            <div class="lbl">غياب اليوم</div>
            <div class="num" id="kpi-absent" style="color:#dc2626">—</div>
            <div class="sub" id="kpi-absent-trend"></div>
        </div>
        <div class="dash-kpi" style="border-color:#d97706">
            <div class="lbl">تأخير اليوم</div>
            <div class="num" id="kpi-late" style="color:#d97706">—</div>
        </div>
        <div class="dash-kpi" style="border-color:#7c3aed">
            <div class="lbl">حوادث سلوكية</div>
            <div class="num" id="kpi-behavior" style="color:#7c3aed">—</div>
        </div>
        <div class="dash-kpi" style="border-color:#0891b2">
            <div class="lbl">استئذان اليوم</div>
            <div class="num" id="kpi-gatepass" style="color:#0891b2">—</div>
        </div>
        <div class="dash-kpi" style="border-color:#16a34a">
            <div class="lbl">إجمالي الطلاب</div>
            <div class="num" id="kpi-total" style="color:#16a34a">—</div>
        </div>
        <div class="dash-kpi" style="border-color:#d4920a">
            <div class="lbl">عيادة اليوم</div>
            <div class="num" id="kpi-clinic" style="color:#d4920a">—</div>
        </div>
    </div>

    <!-- Charts -->
    <div class="dash-two">
        <div class="dash-chart-box">
            <div class="dash-chart-title"><i class="bi bi-bar-chart-fill" style="color:var(--sky)"></i> أكثر الفصول غياباً اليوم</div>
            <div class="bar-chart" id="chart-classes"></div>
        </div>
        <div class="dash-chart-box">
            <div class="dash-chart-title"><i class="bi bi-pie-chart-fill" style="color:var(--gold)"></i> توزيع الغياب بالمرحلة</div>
            <div class="donut-wrap">
                <svg class="donut-svg" width="140" height="140" viewBox="0 0 140 140" id="donut-svg">
                    <circle cx="70" cy="70" r="55" fill="none" stroke="#f0f4f8" stroke-width="22"/>
                </svg>
                <div class="donut-legend" id="donut-legend"></div>
            </div>
        </div>
    </div>

    <!-- غياب أسبوعي -->
    <div class="dash-chart-box" style="margin-bottom:16px">
        <div class="dash-chart-title"><i class="bi bi-graph-up" style="color:var(--green)"></i> الغياب خلال آخر 7 أيام</div>
        <div id="weekly-chart" style="display:flex;align-items:flex-end;gap:8px;height:100px;padding-top:10px"></div>
    </div>

    <!-- تنبيهات الغياب المتكرر -->
    <div class="dash-list">
        <div class="dash-list-title"><i class="bi bi-exclamation-triangle-fill" style="color:var(--red)"></i> طلاب يحتاجون متابعة (غياب متكرر)</div>
        <div id="repeat-alerts">⏳ جاري التحميل...</div>
    </div>

    <!-- واتساب جماعي -->
    <div class="dash-list">
        <div class="dash-list-title"><i class="bi bi-whatsapp" style="color:#25d366"></i> إرسال إشعار غياب واتساب</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
            <select id="whatsapp-class-select" style="flex:1;min-width:160px;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-weight:700;outline:none">
                <option value="">-- اختر الفصل --</option>
            </select>
            <button onclick="window.triggerWhatsAppBroadcast()" class="wa-btn" style="padding:9px 18px;font-size:13px">
                <i class="bi bi-whatsapp"></i> إرسال للغائبين
            </button>
        </div>
        <div id="whatsapp-result" style="font-size:13px"></div>
    </div>
    `;

    // تحميل البيانات
    await loadDashboardData(schoolId, todayISO);
}

async function loadDashboardData(schoolId, todayISO) {
    try {
        // ══ كل الـ queries بالتوازي دفعة وحدة ══
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yISO = yesterday.toISOString().slice(0,10);

        const [abSnap, lateSnap, behSnap, gateSnap, clinicSnap, stuSnap, ySnap] = await Promise.all([
            getDocs(query(collection(db,'attendance'),  where('schoolId','==',schoolId), where('date','==',todayISO), where('status','==','absent'))),
            getDocs(query(collection(db,'attendance'),  where('schoolId','==',schoolId), where('date','==',todayISO), where('status','==','late'))),
            getDocs(query(collection(db,'behavior'),    where('schoolId','==',schoolId), where('date','==',todayISO))),
            getDocs(query(collection(db,'gatepass'),    where('schoolId','==',schoolId), where('dateStr','==',todayISO))),
            getDocs(query(collection(db,'clinic'),      where('schoolId','==',schoolId), where('date','==',todayISO))),
            getDocs(query(collection(db,'students'),    where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'attendance'),  where('schoolId','==',schoolId), where('date','==',yISO), where('status','==','absent'))),
        ]);

        const totalStudents = stuSnap.size;
        const absentCount   = abSnap.size;
        const lateCount     = lateSnap.size;
        const attendRate    = totalStudents > 0
            ? Math.round(((totalStudents - absentCount) / totalStudents) * 100)
            : null;

        // ══ KPIs ══
        document.getElementById('kpi-absent').textContent    = absentCount;
        document.getElementById('kpi-late').textContent      = lateCount;
        document.getElementById('kpi-behavior').textContent  = behSnap.size;
        document.getElementById('kpi-gatepass').textContent  = gateSnap.size;
        document.getElementById('kpi-total').textContent     = totalStudents;
        document.getElementById('kpi-clinic').textContent    = clinicSnap.size;
        document.getElementById('dash-attend-rate').textContent = attendRate !== null ? attendRate + '%' : '—';

        // ══ توزيع الغياب بالفصل ══
        const byClass = {};
        abSnap.forEach(d => {
            const c = d.data().classId || '—';
            byClass[c] = (byClass[c]||0) + 1;
        });

        buildClassesChart(byClass);
        buildDonutChart(byClass);
        loadWhatsAppClasses(byClass);

        // ══ Trend مقارنة بالأمس ══
        const diff    = absentCount - ySnap.size;
        const trendEl = document.getElementById('kpi-absent-trend');
        if(diff > 0)       trendEl.innerHTML = `<span class="trend-badge trend-up">▲ ${diff} أكثر من أمس</span>`;
        else if(diff < 0)  trendEl.innerHTML = `<span class="trend-badge trend-down">▼ ${Math.abs(diff)} أقل من أمس</span>`;
        else               trendEl.innerHTML = `<span style="color:#aaa;font-size:10px">نفس أمس</span>`;

        // ══ Charts الثقيلة تُحمَّل بعد الـ KPIs عشان تظهر البيانات بسرعة ══
        buildWeeklyChart(schoolId);
        buildRepeatAlerts(schoolId);

    } catch(e) {
        console.error('Dashboard error:', e);
        window.showToast?.('⚠️ خطأ في تحميل البيانات', 'error');
    }
}

// ══ Chart: الفصول ══
function buildClassesChart(byClass) {
    const el = document.getElementById('chart-classes');
    if(!el) return;
    const sorted = Object.entries(byClass).sort((a,b)=>b[1]-a[1]).slice(0,7);
    if(!sorted.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa">لا يوجد غياب اليوم 🎉</div>'; return; }
    const max = sorted[0][1] || 1;
    const colors = ['#dc2626','#ea580c','#d97706','#1a78c2','#7c3aed','#0891b2','#16a34a'];
    el.innerHTML = sorted.map(([cls, cnt], i) => `
        <div class="bar-item">
            <span class="bar-label">${cls}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(cnt/max)*100}%;background:${colors[i%colors.length]}">${cnt}</div>
            </div>
        </div>`).join('');
}

// ══ Chart: Donut ══
function buildDonutChart(byClass) {
    const svg = document.getElementById('donut-svg');
    const leg = document.getElementById('donut-legend');
    if(!svg || !leg) return;

    const grades = {6:0, 7:0, 8:0, 9:0};
    Object.entries(byClass).forEach(([cls, cnt]) => {
        const g = parseInt(cls.split('/')[0]);
        if(grades[g] !== undefined) grades[g] += cnt;
    });

    const total = Object.values(grades).reduce((a,b)=>a+b,0) || 1;
    const colors = ['#dc2626','#1a78c2','#16a34a','#d4920a'];
    const names  = {6:'السادس',7:'السابع',8:'الثامن',9:'التاسع'};
    const r=55, cx=70, cy=70;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    let circles = '';
    Object.entries(grades).forEach(([g, cnt], i) => {
        const pct = cnt / total;
        const dash = pct * circumference;
        const rotate = (offset / total) * 360 - 90;
        circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="${colors[i]}" stroke-width="22"
            stroke-dasharray="${dash} ${circumference - dash}"
            stroke-dashoffset="${-(offset/total)*circumference}"
            transform="rotate(${rotate} ${cx} ${cy})"
            style="transition:stroke-dasharray 1s ease"/>`;
        offset += cnt;
    });

    svg.innerHTML = circles + `
        <text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="20" font-weight="900" fill="#0b2545">${total}</text>
        <text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="10" fill="#999">غائب</text>`;

    leg.innerHTML = Object.entries(grades).map(([g,cnt],i) => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${colors[i]}"></div>
            الصف ${names[g]}: <b>${cnt}</b>
        </div>`).join('');
}

// ══ Chart: أسبوعي ══
async function buildWeeklyChart(schoolId) {
    // نُحمّل الأسبوعي بعد 300ms عشان ما يبطّئ الـ KPIs
    await new Promise(r => setTimeout(r, 300));
    const el = document.getElementById('weekly-chart');
    if(!el) return;

    const days = [];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            iso:   d.toISOString().slice(0,10),
            label: d.toLocaleDateString('ar-KW',{weekday:'short'})
        });
    }

    const counts = await Promise.all(days.map(async day => {
        const snap = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('date','==',day.iso),
            where('status','==','absent')));
        return { ...day, count: snap.size };
    }));

    const max = Math.max(...counts.map(d=>d.count), 1);
    el.innerHTML = counts.map(d => {
        const h = Math.max((d.count/max)*80, d.count>0?8:0);
        const today = d.iso === getTodayISO();
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <span style="font-size:10px;font-weight:800;color:${today?'var(--red)':'var(--mid)'}">${d.count||''}</span>
            <div style="width:100%;height:${h}px;background:${today?'var(--red)':'#bcd4ec'};border-radius:4px 4px 0 0;transition:height .8s ease"></div>
            <span style="font-size:10px;font-weight:700;color:${today?'var(--navy)':'var(--mid)'}">${d.label}</span>
        </div>`;
    }).join('');
}

// ══ تنبيهات الغياب المتكرر ══
async function buildRepeatAlerts(schoolId) {
    const el = document.getElementById('repeat-alerts');
    if(!el) return;

    try {
        const snap = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('status','==','absent')));

        const byStudent = {};
        snap.forEach(d => {
            const name = d.data().studentName || d.data().name || '—';
            const cls  = d.data().classId || '';
            const phone= d.data().parentPhone || '';
            const key  = `${name}__${cls}`;
            if(!byStudent[key]) byStudent[key] = { name, cls, phone, count:0 };
            byStudent[key].count++;
        });

        const alerts = Object.values(byStudent)
            .filter(s => s.count >= 3)
            .sort((a,b) => b.count - a.count)
            .slice(0,10);

        if(!alerts.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;font-weight:700">🎉 لا يوجد طلاب بغياب متكرر</div>';
            return;
        }

        el.innerHTML = alerts.map(s => {
            const level = s.count >= 10 ? '🔴 حرمان' : s.count >= 8 ? '🟠 إنذار' : s.count >= 5 ? '🟡 استدعاء' : '📢 تنبيه';
            const phone = (s.phone||'').replace(/\D/g,'');
            return `<div class="alert-card">
                <div>
                    <div class="alert-name">${s.name} — ${s.cls}</div>
                    <div style="font-size:11px;color:var(--mid);margin-top:2px">${level}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="alert-count">${s.count} غياب</span>
                    ${phone ? `<button class="wa-btn" onclick="window.sendAbsenceAlert('${s.name}','${s.cls}','${s.count}','${phone}')">
                        <i class="bi bi-whatsapp"></i>
                    </button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch(e) { el.innerHTML = '❌ تعذر التحميل'; }
}

// ══ تحميل فصول الواتساب ══
function loadWhatsAppClasses(byClass) {
    const sel = document.getElementById('whatsapp-class-select');
    if(!sel) return;
    const classes = Object.keys(byClass).filter(c => byClass[c] > 0);
    sel.innerHTML = '<option value="">-- اختر الفصل --</option>' +
        classes.map(c=>`<option value="${c}">${c} (${byClass[c]} غائب)</option>`).join('');
}

// ══ إرسال واتساب ══
window.triggerWhatsAppBroadcast = async function() {
    const cls = document.getElementById('whatsapp-class-select')?.value;
    const res = document.getElementById('whatsapp-result');
    if(!cls) { res.innerHTML = '<span style="color:var(--red)">⚠️ اختر الفصل أولاً</span>'; return; }

    res.innerHTML = '⏳ جاري تحضير الرسائل...';
    const schoolId = getActiveSchoolId();
    const todayISO = getTodayISO();

    try {
        const snap = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('date','==',todayISO),
            where('classId','==',cls), where('status','==','absent')));

        if(snap.empty) { res.innerHTML = '<span style="color:var(--green)">✅ لا يوجد غياب في هذا الفصل</span>'; return; }

        const absentNames = [];
        snap.forEach(d => { if(d.data().studentName) absentNames.push(d.data().studentName); });

        const today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
        const msg = encodeURIComponent(
            `🏫 ${JSON.parse(localStorage.getItem('hs_user')||'{}').schoolName||'المدرسة'}\n` +
            `السلام عليكم أولياء الأمور،\n` +
            `نُعلمكم بغياب الطلاب التالية أسماؤهم اليوم ${today}:\n` +
            absentNames.map((n,i)=>`${i+1}. ${n}`).join('\n') +
            `\nيرجى التواصل مع الإدارة.`
        );

        window.open(`https://wa.me/?text=${msg}`, '_blank');
        res.innerHTML = `<span style="color:var(--green)">✅ تم فتح واتساب — ${absentNames.length} غائب في ${cls}</span>`;
    } catch(e) { res.innerHTML = `<span style="color:var(--red)">❌ ${e.message}</span>`; }
};

// ══ إرسال تنبيه غياب متكرر ══
window.sendAbsenceAlert = function(name, cls, count, phone) {
    const today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
    const level = count >= 10 ? 'حرمان من الاختبارات' : count >= 8 ? 'إنذار رسمي' : count >= 5 ? 'استدعاء ولي الأمر' : 'تنبيه';
    const msg = encodeURIComponent(
        `السلام عليكم ولي أمر الطالب ${name} — فصل ${cls}،\n` +
        `نُعلمكم بأن ابنكم بلغ عدد غياباته ${count} يوماً بتاريخ ${today}.\n` +
        `الإجراء المترتب: ${level}.\n` +
        `يرجى مراجعة الإدارة.`
    );
    window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
};
