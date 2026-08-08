import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const container = document.getElementById('tab-index');
    if(!container) return;
    const schoolId = getActiveSchoolId();
    const today = getTodayISO();
    const me = JSON.parse(localStorage.getItem('hs_user')||'{}');

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin-bottom:14px">
            <i class="bi bi-speedometer2" style="color:var(--sky)"></i> لوحة المؤشرات — ${new Date().toLocaleDateString('ar-KW',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </h2>

        <!-- KPI -->
        <div id="kpi-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
            <div class="kpi-card" style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;text-align:center">
                <div style="font-size:30px;font-weight:900;color:var(--navy)" id="kpi-students">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">إجمالي الطلاب</div>
            </div>
            <div class="kpi-card" style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;text-align:center">
                <div style="font-size:30px;font-weight:900;color:#dc2626" id="kpi-absent">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">غائب اليوم</div>
            </div>
            <div class="kpi-card" style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;text-align:center">
                <div style="font-size:30px;font-weight:900;color:#d97706" id="kpi-late">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">متأخر</div>
            </div>
            <div class="kpi-card" style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;text-align:center">
                <div style="font-size:30px;font-weight:900;color:var(--green)" id="kpi-rate">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">نسبة الحضور</div>
            </div>
        </div>

        <!-- رسم بياني — الغياب بالفصول -->
        <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px">
            <h3 style="font-size:14px;font-weight:900;color:var(--navy);margin-bottom:12px">📊 الغياب حسب الفصل</h3>
            <div id="chart-classes" style="display:flex;align-items:flex-end;gap:6px;height:160px;direction:ltr"></div>
        </div>

        <!-- رسم بياني — الغياب آخر 7 أيام -->
        <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px">
            <h3 style="font-size:14px;font-weight:900;color:var(--navy);margin-bottom:12px">📈 الغياب — آخر 7 أيام</h3>
            <div id="chart-week" style="display:flex;align-items:flex-end;gap:8px;height:140px;direction:ltr"></div>
        </div>

        <!-- أكثر طلاب غياب -->
        <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px">
            <h3 style="font-size:14px;font-weight:900;color:var(--navy);margin-bottom:12px">🔴 أكثر 5 طلاب غياباً</h3>
            <div id="top-absent" style="font-size:13px">⏳ جاري التحميل...</div>
        </div>

        <!-- إعلانات -->
        <div id="admin-announcements"></div>
    </div>`;

    loadDashboard(schoolId, today);
}

async function loadDashboard(schoolId, today) {
    try {
        // إجمالي الطلاب
        const studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        const totalStudents = studSnap.size;
        document.getElementById('kpi-students').textContent = totalStudents;

        // غياب اليوم
        const attSnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('date','==',today)));
        const records = attSnap.docs.map(d=>d.data());
        const absentNames = new Set(); const lateNames = new Set();
        records.forEach(r => { if(r.status==='absent') absentNames.add(r.studentName); if(r.status==='late') lateNames.add(r.studentName); });

        document.getElementById('kpi-absent').textContent = absentNames.size;
        document.getElementById('kpi-late').textContent = lateNames.size;
        const rate = totalStudents > 0 ? Math.floor(((totalStudents - absentNames.size)/totalStudents)*100*10)/10 : 0;
        document.getElementById('kpi-rate').textContent = rate + '%';

        // رسم الغياب بالفصول
        const byClass = {};
        records.filter(r=>r.status==='absent').forEach(r => { byClass[r.classId] = (byClass[r.classId]||0)+1; });
        const classes = Object.keys(byClass).sort((a,b)=>{var pa=a.split('/'),pb=b.split('/');return(parseInt(pa[0])||0)-(parseInt(pb[0])||0)||(parseInt(pa[1])||0)-(parseInt(pb[1])||0)});
        const maxVal = Math.max(...Object.values(byClass), 1);
        const chartDiv = document.getElementById('chart-classes');
        chartDiv.innerHTML = classes.map(c => {
            const pct = (byClass[c]/maxVal)*100;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                <div style="font-size:10px;font-weight:900;color:#dc2626;margin-bottom:4px">${byClass[c]}</div>
                <div style="width:100%;background:#dc262633;border-radius:6px 6px 0 0;height:${Math.max(pct,8)}%;min-height:8px;transition:height .5s"></div>
                <div style="font-size:9px;font-weight:700;color:var(--mid);margin-top:4px;writing-mode:vertical-rl;transform:rotate(180deg)">${c}</div>
            </div>`;
        }).join('') || '<div style="color:#aaa;font-size:13px;padding:20px;text-align:center;width:100%">لا يوجد غياب اليوم ✅</div>';

        // آخر 7 أيام
        const days = [];
        for(var i=6;i>=0;i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
            days.push(d.toISOString().slice(0,10));
        }
        // جلب كل الغياب
        const weekSnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('status','==','absent')));
        const weekData = {};
        days.forEach(d => weekData[d] = 0);
        weekSnap.docs.forEach(d => { const r=d.data(); if(weekData[r.date]!==undefined) weekData[r.date]++; });
        const weekMax = Math.max(...Object.values(weekData), 1);
        const weekChart = document.getElementById('chart-week');
        weekChart.innerHTML = days.map(d => {
            const val = weekData[d];
            const pct = (val/weekMax)*100;
            const dayName = new Date(d).toLocaleDateString('ar-KW',{weekday:'short'});
            const isToday = d === today;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                <div style="font-size:10px;font-weight:900;color:${isToday?'var(--sky)':'#666'};margin-bottom:4px">${val}</div>
                <div style="width:100%;background:${isToday?'var(--sky)':'#e5e7eb'};border-radius:6px 6px 0 0;height:${Math.max(pct,5)}%;min-height:5px"></div>
                <div style="font-size:9px;font-weight:${isToday?'900':'600'};color:${isToday?'var(--sky)':'var(--mid)'};margin-top:4px">${dayName}</div>
            </div>`;
        }).join('');

        // أكثر 5 طلاب غياباً
        const studentCounts = {};
        weekSnap.docs.forEach(d => { const r=d.data(); studentCounts[r.studentName+'|'+r.classId] = (studentCounts[r.studentName+'|'+r.classId]||0)+1; });
        const topAbsent = Object.entries(studentCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        const topDiv = document.getElementById('top-absent');
        topDiv.innerHTML = topAbsent.length ? topAbsent.map((t,i) => {
            const [key,count] = t; const [name,cls] = key.split('|');
            const color = count>=10?'#dc2626':count>=5?'#d97706':'#6b7280';
            return `<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f2f5;gap:10px">
                <span style="width:24px;height:24px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">${i+1}</span>
                <span style="flex:1;font-weight:700">${name}</span>
                <span style="font-size:11px;color:var(--mid)">${cls}</span>
                <span style="background:${color}22;color:${color};padding:2px 10px;border-radius:6px;font-weight:900;font-size:12px">${count} يوم</span>
            </div>`;
        }).join('') : '<div style="color:#16a34a;font-weight:700">✅ لا يوجد طلاب متكرري الغياب</div>';

        // إعلانات
        const annSnap = await getDocs(query(collection(db,'school_announcements'), where('schoolId','==',schoolId), where('active','==',true)));
        const annDiv = document.getElementById('admin-announcements');
        if(annSnap.size > 0 && annDiv) {
            annDiv.innerHTML = `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:14px;padding:16px">
                <h3 style="font-size:14px;font-weight:900;color:#92400e;margin-bottom:8px">📢 إعلانات المدرسة</h3>
                ${annSnap.docs.map(d=>`<div style="font-size:13px;color:#78350f;padding:6px 0;border-bottom:1px solid #fde68a;font-weight:600">${d.data().text}</div>`).join('')}
            </div>`;
        }

    } catch(e) {
        console.error('Dashboard:', e);
        document.getElementById('kpi-students').textContent = '!';
    }
}