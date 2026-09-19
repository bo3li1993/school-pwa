import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════════════════════
// موديول المشغول الفعلي — توزيع المعلمين بحسب أقسامهم
// يعرض: كل قسم → معلميه → حصصهم → غيابهم → تقييمهم
// ══════════════════════════════════════════════════════════════

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

    <!-- هيدر -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div>
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0">
                <i class="bi bi-diagram-3-fill" style="color:var(--sky)"></i> المشغول الفعلي للمعلمين
            </h2>
            <p style="font-size:12px;color:var(--mid);font-weight:700;margin:4px 0 0">توزيع المعلمين بحسب الأقسام مع الإحصائيات</p>
        </div>
        <button class="wl-export" onclick="window.exportWorkloadPDF()">
            <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
        </button>
    </div>

    <!-- فلتر -->
    <div class="wl-filter">
        <select id="wl-filter-dept" onchange="window.filterWorkload()">
            <option value="">كل الأقسام</option>
        </select>
        <select id="wl-filter-role" onchange="window.filterWorkload()">
            <option value="">كل الأدوار</option>
            <option value="teacher">معلم</option>
            <option value="department_head">رئيس قسم</option>
            <option value="admin">إدارة</option>
            <option value="social_worker">أخصائي</option>
        </select>
    </div>

    <!-- ملخص سريع -->
    <div class="wl-summary" id="wl-summary">
        <div class="wl-summary-card"><div class="n" id="wl-total-teachers">—</div><div class="l">إجمالي المعلمين</div></div>
        <div class="wl-summary-card"><div class="n" id="wl-total-depts">—</div><div class="l">الأقسام</div></div>
        <div class="wl-summary-card"><div class="n" id="wl-total-visits">—</div><div class="l">زيارات فنية</div></div>
        <div class="wl-summary-card"><div class="n" id="wl-avg-visits">—</div><div class="l">متوسط الزيارات</div></div>
    </div>

    <!-- المحتوى -->
    <div id="wl-content">
        <div style="text-align:center;padding:40px;color:var(--mid)">⏳ جاري تحميل البيانات...</div>
    </div>
    `;

    await loadWorkloadData();
}

// ══ تحميل البيانات ══
let _workloadData = null;

async function loadWorkloadData() {
    var schoolId = getActiveSchoolId();

    try {
        // جلب المعلمين والزيارات بالتوازي
        var _pr = await Promise.all([
            getDocs(query(collection(db,'users'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'technical_visits'), where('schoolId','==',schoolId)))
        ]);
        var usersSnap = _pr[0];          var visitsSnap = _pr[1]; 

        // بناء خريطة الزيارات
        var visitsByTeacher = {};
        visitsSnap.forEach(d => {
            var name = d.data().teacherName || '—';
            if(!visitsByTeacher[name]) visitsByTeacher[name] = { count:0, ratings:[] };
            visitsByTeacher[name].count++;
            if(d.data().overallRating) visitsByTeacher[name].ratings.push(d.data().overallRating);
        });

        // تنظيم المعلمين بحسب القسم
        var depts = {};
        var roleLabel = {
            admin:            'مدير / مساعد',
            assistant_manager:'مساعد مدير',
            wing_supervisor:  'مشرف جناح',
            department_head:  'رئيس قسم',
            teacher:          'معلم',
            social_worker:    'أخصائي اجتماعي',
            guard:            'حارس',
            nurse:            'ممرض',
        };

        usersSnap.forEach(d => {
            var u = d.data();
            if(!u.name) return;

            // القسم: من حقل department أو من الدور
            var dept = u.department?.trim() ||
                (u.role === 'admin' || u.role === 'assistant_manager' ? 'الإدارة' :
                 u.role === 'wing_supervisor' ? 'الإشراف' :
                 u.role === 'guard'           ? 'الأمن والحراسة' :
                 u.role === 'social_worker'   ? 'الخدمة الاجتماعية' :
                 u.role === 'nurse'           ? 'العيادة المدرسية' :
                 'غير محدد');

            if(!depts[dept]) depts[dept] = [];

            var visits  = visitsByTeacher[u.name] || { count:0, ratings:[] };
            var perfScore = visits.ratings.length > 0
                ? calcPerfScore(visits.ratings) : null;

            depts[dept].push({
                name:     u.name,
                userId:   u.userId || '—',
                role:     roleLabel[u.role] || u.role || '—',
                visits:   visits.count,
                perfScore,
                perfLabel: perfScore === null ? '—' : perfScore >= 80 ? 'ممتاز' : perfScore >= 60 ? 'جيد' : 'يحتاج متابعة',
                perfClass: perfScore === null ? '' : perfScore >= 80 ? 'high' : perfScore >= 60 ? 'medium' : 'low',
            });
        });

        // ترتيب المعلمين داخل كل قسم
        Object.keys(depts).forEach(dept => {
            depts[dept].sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        });

        _workloadData = depts;

        // ملخص سريع
        var totalTeachers = Object.values(depts).flat().length;
        var totalVisits   = visitsSnap.size;
        document.getElementById('wl-total-teachers').textContent = totalTeachers;
        document.getElementById('wl-total-depts').textContent    = Object.keys(depts).length;
        document.getElementById('wl-total-visits').textContent   = totalVisits;
        document.getElementById('wl-avg-visits').textContent     =
            totalTeachers > 0 ? (totalVisits/totalTeachers).toFixed(1) : '0';

        // ملء فلتر الأقسام
        var deptSel = document.getElementById('wl-filter-dept');
        if(deptSel) {
            deptSel.innerHTML = '<option value="">كل الأقسام</option>' +
                Object.keys(depts).sort().map(d=>`<option value="${d}">${d}</option>`).join('');
        }

        renderWorkload(depts);

    } catch(e) {
        document.getElementById('wl-content').innerHTML =
            `<div style="text-align:center;padding:30px;color:var(--red)">❌ ${e.message}</div>`;
    }
}

function calcPerfScore(ratings) {
    var scores = { 'ممتاز':100, 'جيد جداً':80, 'جيد':60, 'مقبول':40, 'ضعيف':20 };
    var vals   = ratings.map(r => scores[r] || 60).filter(v => v);
    return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
}

// ══ رسم الأقسام ══
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
                <span class="wl-dept-count">${teachers.length} معلم</span>
                <i class="bi bi-chevron-down" id="chevron-${idx}" style="transition:transform .3s"></i>
            </div>
        </div>
        <div class="wl-dept-body" id="dept-${idx}">
            <div class="wl-header-row" style="margin-top:12px">
                <span>اسم المعلم</span>
                <span style="text-align:center">الزيارات</span>
                <span style="text-align:center">الدور</span>
                <span style="text-align:center">النتيجة</span>
                <span style="text-align:center">الأداء</span>
            </div>
            ${teachers.map(t => `
            <div class="wl-teacher-row">
                <div class="wl-name">👤 ${t.name}</div>
                <div class="wl-num" style="color:${t.visits>0?'var(--sky)':'var(--mid)'};font-size:16px;font-weight:900">${t.visits}</div>
                <div class="wl-num" style="color:var(--mid);font-size:11px">${t.role}</div>
                <div class="wl-num">${t.perfScore !== null ? t.perfScore+'%' : '—'}</div>
                <div class="wl-badge">
                    ${t.visits > 0
                        ? `<span class="wl-perf ${t.perfClass}">${t.perfLabel}</span>`
                        : '<span style="color:#aaa;font-size:11px;font-weight:700">لم يُزار</span>'}
                </div>
            </div>`).join('')}
        </div>
    </div>`).join('');

    // افتح أول قسم تلقائياً
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

// ══ فلتر ══
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

// ══ تصدير PDF ══
window.exportWorkloadPDF = async function() {
    if(!_workloadData) { window.showToast?.('⚠️ لا توجد بيانات','warning'); return; }

    var tableHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#0b2545;color:#fff">
            <th style="padding:8px">القسم</th>
            <th style="padding:8px">المعلم</th>
            <th style="padding:8px">الدور</th>
            <th style="padding:8px;text-align:center">الزيارات</th>
            <th style="padding:8px;text-align:center">الأداء</th>
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
        await window.ManzoumaReport.exportPDF(tableHTML, 'المشغول_الفعلي', 'المشغول الفعلي للمعلمين بحسب الأقسام', '');
    } else {
        // طباعة مباشرة
        var htmlContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                <title>المشغول الفعلي</title>
                <style>body{font-family:'Cairo',sans-serif;padding:20px}h1{font-size:16px;margin-bottom:16px}</style>
                </head><body><h1>المشغول الفعلي للمعلمين</h1>${tableHTML}</body></html>`;
        var blob    = new Blob([htmlContent], { type:'text/html;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);
        var win     = window.open(blobUrl, '_blank');
        if(!win) {
            // iOS fallback
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column';
            overlay.innerHTML = `<div style="padding:12px 16px;background:#0b2545;color:#fff;font-family:Cairo,sans-serif;display:flex;justify-content:space-between">
                <span style="font-weight:800">معاينة الطباعة</span>
                <div style="display:flex;gap:8px">
                    <button id="_pb" style="background:#25d366;color:#fff;border:none;padding:7px 14px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:800;cursor:pointer">🖨️ طباعة</button>
                    <button id="_cb" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:7px 12px;border-radius:6px;cursor:pointer">✕</button>
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
