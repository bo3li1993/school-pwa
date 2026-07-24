import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initMonthlyModule() {
    const container = document.getElementById('tab-monthly');
    if (!container) return;

    const now = new Date();
    const months = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleDateString('ar-KW', { year:'numeric', month:'long' }),
            from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,
            to: new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10)
        });
    }

    container.innerHTML = `
    <div class="card">
        <h2><i class="bi bi-bar-chart-line-fill"></i> التقارير الإحصائية الشهرية</h2>
        <p style="font-size:13px;color:#666;margin-bottom:14px;">اختر الشهر لعرض إحصائيات الغياب والحوادث السلوكية والاستئذانات.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
            ${months.map((m,i) => `
            <button onclick="window.loadMonthlyStats('${m.from}','${m.to}','${m.label}')"
                style="background:${i===0?'var(--navy)':'var(--off)'};color:${i===0?'#fff':'var(--text)'};
                border:1px solid var(--line);padding:8px 16px;border-radius:8px;font-weight:700;
                cursor:pointer;font-family:'Cairo',sans-serif;font-size:13px;">
                ${m.label}
            </button>`).join('')}
        </div>
    </div>
    <div id="monthly-stats-area">
        <p style="text-align:center;color:#999;padding:30px;font-weight:bold;">👆 اختر شهراً لعرض الإحصائيات</p>
    </div>`;

    // تحميل الشهر الحالي تلقائياً
    window.loadMonthlyStats(months[0].from, months[0].to, months[0].label);
}

window.loadMonthlyStats = async function(fromDate, toDate, label) {
    const area = document.getElementById('monthly-stats-area');
    area.innerHTML = `<p style="text-align:center;padding:20px;color:#666;font-weight:700;">⏳ جاري تحميل إحصائيات ${label}...</p>`;

    const schoolId = getActiveSchoolId();

    try {
        // جلب الغياب
        const attSnap = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId),
            where('status','in',['absent','late']),
            where('date','>=',fromDate),
            where('date','<=',toDate)
        ));

        // جلب السلوك
        const behSnap = await getDocs(query(collection(db,'behavior'),
            where('schoolId','==',schoolId),
            where('date','>=',fromDate),
            where('date','<=',toDate)
        ));

        // جلب الاستئذان
        const gateSnap = await getDocs(query(collection(db,'gatepass'),
            where('schoolId','==',schoolId),
            where('dateStr','>=',fromDate),
            where('dateStr','<=',toDate)
        ));

        // جلب العيادة
        const clinicSnap = await getDocs(query(collection(db,'clinic'),
            where('schoolId','==',schoolId),
            where('dateStr','>=',fromDate),
            where('dateStr','<=',toDate)
        ));

        // تجميع إحصائيات الغياب بالفصل
        const absenceByClass = {};
        const absentStudents = {};
        let totalAbsent = 0, totalLate = 0;

        attSnap.forEach(d => {
            const data = d.data();
            if (data.status === 'absent') {
                totalAbsent++;
                absenceByClass[data.classId] = (absenceByClass[data.classId]||0) + 1;
                absentStudents[data.studentName] = (absentStudents[data.studentName]||0) + 1;
            } else {
                totalLate++;
            }
        });

        // أكثر 5 طلاب غياباً
        const topAbsentees = Object.entries(absentStudents)
            .sort((a,b) => b[1]-a[1]).slice(0,5);

        // تجميع السلوك
        let positiveBeh = 0, negativeBeh = 0;
        behSnap.forEach(d => {
            const t = d.data().type;
            if (t === 'إيجابي') positiveBeh++;
            else if (t === 'سلبي') negativeBeh++;
        });

        const html = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:16px;">
            <div class="card" style="text-align:center; border-right:4px solid var(--danger-color);">
                <div style="font-size:32px; font-weight:900; color:var(--danger-color);">${totalAbsent}</div>
                <div style="font-size:12px; color:#666; font-weight:700; margin-top:4px;">حالة غياب</div>
            </div>
            <div class="card" style="text-align:center; border-right:4px solid var(--gold);">
                <div style="font-size:32px; font-weight:900; color:var(--gold);">${totalLate}</div>
                <div style="font-size:12px; color:#666; font-weight:700; margin-top:4px;">حالة تأخير</div>
            </div>
            <div class="card" style="text-align:center; border-right:4px solid var(--success-color);">
                <div style="font-size:32px; font-weight:900; color:var(--success-color);">${positiveBeh}</div>
                <div style="font-size:12px; color:#666; font-weight:700; margin-top:4px;">سلوك إيجابي</div>
            </div>
            <div class="card" style="text-align:center; border-right:4px solid #7c3aed;">
                <div style="font-size:32px; font-weight:900; color:#7c3aed;">${negativeBeh}</div>
                <div style="font-size:12px; color:#666; font-weight:700; margin-top:4px;">سلوك سلبي</div>
            </div>
            <div class="card" style="text-align:center; border-right:4px solid var(--sky);">
                <div style="font-size:32px; font-weight:900; color:var(--sky);">${gateSnap.size}</div>
                <div style="font-size:12px; color:#666; font-weight:700; margin-top:4px;">استئذان</div>
            </div>
            <div class="card" style="text-align:center; border-right:4px solid var(--navy);">
                <div style="font-size:32px; font-weight:900; color:var(--navy);">${clinicSnap.size}</div>
                <div style="font-size:12px; color:#666; font-weight:700; margin-top:4px;">زيارة عيادة</div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="card">
                <h3 style="font-size:14px; margin-bottom:10px;"><i class="bi bi-bar-chart"></i> الغياب بالفصول</h3>
                ${Object.keys(absenceByClass).length ? 
                    Object.entries(absenceByClass).sort((a,b)=>b[1]-a[1]).map(([cls,count]) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:700; font-size:13px;">الفصل ${cls}</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="background:var(--danger-color); height:8px; border-radius:4px; width:${Math.min(count*8,120)}px;"></div>
                            <span style="font-size:12px; font-weight:900; color:var(--danger-color);">${count}</span>
                        </div>
                    </div>`).join('') :
                    '<p style="color:#999; font-size:13px; text-align:center; padding:10px;">لا توجد بيانات</p>'
                }
            </div>
            <div class="card">
                <h3 style="font-size:14px; margin-bottom:10px;"><i class="bi bi-person-exclamation"></i> أكثر الطلاب غياباً</h3>
                ${topAbsentees.length ?
                    topAbsentees.map(([name, count], i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:6px; background:${i===0?'#fef2f2':'#f8fafc'}; border-radius:6px;">
                        <span style="font-weight:700; font-size:13px;">${i+1}. ${name}</span>
                        <span style="background:var(--danger-color); color:#fff; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:900;">${count} يوم</span>
                    </div>`).join('') :
                    '<p style="color:#999; font-size:13px; text-align:center; padding:10px;">لا توجد بيانات</p>'
                }
            </div>
        </div>

        <div class="card" style="margin-top:0;">
            <div style="display:flex; gap:10px;">
                <button onclick="window.printMonthlyReportPDF('${label}')"
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
                </button>
                <button onclick="window.printMonthlyReportDirect('${label}')"
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> طباعة مباشرة
                </button>
            </div>
        </div>`;

        area.innerHTML = html;

        // حفظ للطباعة
        window._monthlyData = { totalAbsent, totalLate, positiveBeh, negativeBeh, gateCount: gateSnap.size, clinicCount: clinicSnap.size, absenceByClass, topAbsentees };

    } catch(e) {
        area.innerHTML = `<div class="card" style="color:red;">❌ خطأ: ${e.message}</div>`;
    }
};

window.printMonthlyReportPDF = async function(label) {
    const d = window._monthlyData;
    if (!d) { window.showToast('⚠️ لا توجد بيانات', 'info'); return; }

    const contentHTML = `
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; text-align:center;">
        <div style="border:1px solid #eee; border-radius:8px; padding:12px; border-right:4px solid #dc2626;">
            <div style="font-size:26px; font-weight:900; color:#dc2626;">${d.totalAbsent}</div>
            <div style="font-size:11px; color:#666;">حالة غياب</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:12px; border-right:4px solid #d97706;">
            <div style="font-size:26px; font-weight:900; color:#d97706;">${d.totalLate}</div>
            <div style="font-size:11px; color:#666;">حالة تأخير</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:12px; border-right:4px solid #059669;">
            <div style="font-size:26px; font-weight:900; color:#059669;">${d.positiveBeh}</div>
            <div style="font-size:11px; color:#666;">سلوك إيجابي</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:12px; border-right:4px solid #7c3aed;">
            <div style="font-size:26px; font-weight:900; color:#7c3aed;">${d.negativeBeh}</div>
            <div style="font-size:11px; color:#666;">سلوك سلبي</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:12px; border-right:4px solid #1a78c2;">
            <div style="font-size:26px; font-weight:900; color:#1a78c2;">${d.gateCount}</div>
            <div style="font-size:11px; color:#666;">استئذان</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:12px; border-right:4px solid #0b2545;">
            <div style="font-size:26px; font-weight:900; color:#0b2545;">${d.clinicCount}</div>
            <div style="font-size:11px; color:#666;">زيارة عيادة</div>
        </div>
    </div>
    <div class="section-title">الغياب بالفصول</div>
    <table><thead><tr><th>الفصل</th><th>عدد الغياب</th></tr></thead>
    <tbody>${Object.entries(d.absenceByClass).sort((a,b)=>b[1]-a[1]).map(([cls,count]) =>
        `<tr><td>${cls}</td><td style="text-align:center;font-weight:900;color:#dc2626;">${count}</td></tr>`
    ).join('')}</tbody></table>
    <div class="section-title" style="margin-top:16px;">أكثر الطلاب غياباً</div>
    <table><thead><tr><th>م</th><th>اسم الطالب</th><th>أيام الغياب</th></tr></thead>
    <tbody>${d.topAbsentees.map(([name,count],i) =>
        `<tr><td>${i+1}</td><td>${name}</td><td style="text-align:center;font-weight:900;color:#dc2626;">${count}</td></tr>`
    ).join('')}</tbody></table>`;

    await window.ManzoumaReport.exportPDF(contentHTML, `تقرير_شهر_${label}`, `التقرير الشهري — ${label}`);
};

window.printMonthlyReportDirect = function(label) {
    const d = window._monthlyData;
    if (!d) { window.showToast('⚠️ لا توجد بيانات', 'info'); return; }
    const contentHTML = `
    <div style="display:flex; gap:20px; margin-bottom:16px; text-align:center;">
        <div style="flex:1; border:1px solid #eee; padding:10px; border-radius:6px;"><b style="color:#dc2626;font-size:20px;">${d.totalAbsent}</b><br><small>غياب</small></div>
        <div style="flex:1; border:1px solid #eee; padding:10px; border-radius:6px;"><b style="color:#d97706;font-size:20px;">${d.totalLate}</b><br><small>تأخير</small></div>
        <div style="flex:1; border:1px solid #eee; padding:10px; border-radius:6px;"><b style="color:#059669;font-size:20px;">${d.positiveBeh}</b><br><small>سلوك إيجابي</small></div>
        <div style="flex:1; border:1px solid #eee; padding:10px; border-radius:6px;"><b style="color:#7c3aed;font-size:20px;">${d.negativeBeh}</b><br><small>سلوك سلبي</small></div>
        <div style="flex:1; border:1px solid #eee; padding:10px; border-radius:6px;"><b style="color:#1a78c2;font-size:20px;">${d.gateCount}</b><br><small>استئذان</small></div>
    </div>
    <table><thead><tr><th>الفصل</th><th>غياب</th></tr></thead>
    <tbody>${Object.entries(d.absenceByClass).sort((a,b)=>b[1]-a[1]).map(([c,n]) =>
        `<tr><td>${c}</td><td style="text-align:center;">${n}</td></tr>`).join('')}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, `التقرير الشهري — ${label}`);
};


// ══ تقرير شهري تلقائي — يُرسل أول كل شهر ══
window.checkAutoMonthlyReport = async function() {
    const lastCheck = localStorage.getItem('hs_last_monthly_report');
    const today     = getTodayISO();
    const dayOfMonth = new Date().getDate();

    // فقط أول يوم عمل في الشهر (يوم 1-3)
    if(dayOfMonth > 3) return;
    if(lastCheck && lastCheck.slice(0,7) === today.slice(0,7)) return;

    try {
        const schoolId = getActiveSchoolId();
        const d        = new Date();
        d.setMonth(d.getMonth()-1);
        const from  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        const month = d.toLocaleDateString('ar-KW',{month:'long',year:'numeric'});

        // جلب البيانات
        const [absSnap, behSnap] = await Promise.all([
            getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId), where('date','>=',from), where('status','==','absent'))),
            getDocs(query(collection(db,'behavior'),
                where('schoolId','==',schoolId), where('date','>=',from)))
        ]);

        localStorage.setItem('hs_last_monthly_report', today);

        // إشعار للمدير
        if(absSnap.size > 0) {
            window.showToast(`📊 التقرير الشهري جاهز — ${month}: ${absSnap.size} غياب | ${behSnap.size} حادثة سلوكية`, 'info');

            // عرض نافذة تأكيد
            setTimeout(() => {
                if(confirm(`📊 التقرير الشهري لـ ${month} جاهز!
${absSnap.size} حالة غياب | ${behSnap.size} حادثة سلوكية

هل تريد تصديره الآن؟`)) {
                    window.loadMonthlyStats(from, getTodayISO(), month);
                    setTimeout(() => window.printMonthlyReportPDF(month), 2000);
                }
            }, 1000);
        }
    } catch(e) { console.log('Auto report check:', e.message); }
};
