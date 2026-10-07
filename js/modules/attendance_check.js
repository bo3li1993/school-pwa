import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initAttendanceCheckModule() {
    var container = document.getElementById('tab-attendance-check');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .ac-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-bottom:14px}
        .ac-title{font-size:14px;font-weight:900;color:#0b2545;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .ac-period-tabs{display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap}
        .ac-period-btn{padding:8px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:#fff;color:#6b7280;transition:all .2s}
        .ac-period-btn.active{background:#0b2545;color:#fff;border-color:#0b2545}
        .class-status-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
        .class-status-box{border-radius:10px;padding:12px;text-align:center;cursor:default}
        .cs-registered{background:#f0fdf4;border:1.5px solid #86efac}
        .cs-no-absence{background:#f0fdf4;border:1.5px solid #86efac}
        .cs-not-registered{background:#fef2f2;border:1.5px solid #fca5a5;animation:pulse 2s infinite}
        .cs-unknown{background:#f8fafc;border:1.5px solid #e5e7eb}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}
        .cs-name{font-size:14px;font-weight:900;color:#0b2545;margin-bottom:4px}
        .cs-status{font-size:11px;font-weight:700}
        .cs-registered .cs-status{color:#16a34a}
        .cs-no-absence .cs-status{color:#16a34a}
        .cs-not-registered .cs-status{color:#dc2626}
        .cs-unknown .cs-status{color:#6b7280}
        .summary-bar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .sum-box{flex:1;min-width:80px;padding:10px;border-radius:8px;text-align:center}
        .sum-num{font-size:22px;font-weight:900}
        .sum-lbl{font-size:10px;font-weight:700;color:#6b7280}
    </style>

    <div class="ac-card">
        <div class="ac-title">📋 فصول لم تسجل الغياب</div>
        
        <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
            <input type="date" id="ac-date" style="padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;outline:none">
            <button onclick="acRefresh()" style="background:#0b2545;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer">
                <i class="bi bi-arrow-clockwise"></i> تحديث
            </button>
            <button onclick="acRefreshAuto()" style="background:#16a34a;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-weight:700;font-size:13px;cursor:pointer">
                <i class="bi bi-broadcast"></i> تحديث تلقائي
            </button>
        </div>

        <div class="ac-period-tabs" id="ac-periods">
            <button class="ac-period-btn active" onclick="acSelectPeriod('الحصة الأولى',this)">الحصة الأولى</button>
            <button class="ac-period-btn" onclick="acSelectPeriod('الحصة الثانية',this)">الحصة الثانية</button>
            <button class="ac-period-btn" onclick="acSelectPeriod('الحصة الثالثة',this)">الحصة الثالثة</button>
            <button class="ac-period-btn" onclick="acSelectPeriod('الحصة الرابعة',this)">الحصة الرابعة</button>
            <button class="ac-period-btn" onclick="acSelectPeriod('الحصة الخامسة',this)">الحصة الخامسة</button>
            <button class="ac-period-btn" onclick="acSelectPeriod('الحصة السادسة',this)">الحصة السادسة</button>
        </div>

        <div class="summary-bar" id="ac-summary"></div>
        <div class="class-status-grid" id="ac-classes-grid">
            <div style="text-align:center;padding:30px;color:#6b7280;grid-column:1/-1">⏳ جاري التحميل...</div>
        </div>
    </div>

    <div class="ac-card" id="ac-not-registered-list" style="display:none">
        <div class="ac-title" style="color:#dc2626">⚠️ الفصول التي لم تسجل</div>
        <div id="ac-not-list"></div>
    </div>
    `;

    // تعيين التاريخ
    document.getElementById('ac-date').value = getTodayISO();

    window._acPeriod = 'الحصة الأولى';
    window._acAutoInterval = null;

    acRefresh();
}

window.acSelectPeriod = function(period, btn) {
    window._acPeriod = period;
    document.querySelectorAll('.ac-period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    acRefresh();
};

window.acRefreshAuto = function() {
    if (window._acAutoInterval) {
        clearInterval(window._acAutoInterval);
        window._acAutoInterval = null;
        if (window.showToast) window.showToast('⏹ إيقاف التحديث التلقائي');
        return;
    }
    window._acAutoInterval = setInterval(acRefresh, 30000);
    if (window.showToast) window.showToast('✅ تحديث تلقائي كل 30 ثانية');
    acRefresh();
};

window.acRefresh = async function() {
    var grid = document.getElementById('ac-classes-grid');
    var summary = document.getElementById('ac-summary');
    if (!grid) return;

    var schoolId = getActiveSchoolId();
    var date = document.getElementById('ac-date')?.value || getTodayISO();
    var period = window._acPeriod || 'الحصة الأولى';

    grid.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280;grid-column:1/-1">⏳ جاري التحميل...</div>';

    try {
        // جلب كل الفصول
        var studSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        var classes = [...new Set(studSnap.docs.map(d => d.data().classId).filter(Boolean))].sort();

        // جلب الغياب المسجل لهذا اليوم والحصة
        var attSnap = await getDocs(query(collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('date', '==', date)));

        // جلب سجلات "لا يوجد غياب"
        var logsSnap = await getDocs(query(collection(db, 'attendance_logs'),
            where('schoolId', '==', schoolId),
            where('date', '==', date),
            where('period', '==', period)));

        // الفصول اللي سجلت غياب في هذه الحصة
        var classesWithAbsence = new Set(
            attSnap.docs
                .filter(d => d.data().period === period)
                .map(d => d.data().classId)
        );

        // الفصول اللي سجلت "لا يوجد غياب"
        var classesNoAbsence = new Set(
            logsSnap.docs.map(d => d.data().classId)
        );

        // بناء النتائج
        var registered = 0, notRegistered = 0, noAbsence = 0;
        var notRegList = [];

        var html = classes.map(cls => {
            var hasAbsence = classesWithAbsence.has(cls);
            var hasNoAbsence = classesNoAbsence.has(cls);

            if (hasAbsence) {
                registered++;
                return `<div class="class-status-box cs-registered">
                    <div class="cs-name">${cls}</div>
                    <div class="cs-status">✅ سجّل غياب</div>
                </div>`;
            } else if (hasNoAbsence) {
                noAbsence++;
                return `<div class="class-status-box cs-no-absence">
                    <div class="cs-name">${cls}</div>
                    <div class="cs-status">✅ لا يوجد غياب</div>
                </div>`;
            } else {
                notRegistered++;
                notRegList.push(cls);
                return `<div class="class-status-box cs-not-registered">
                    <div class="cs-name">${cls}</div>
                    <div class="cs-status">❌ لم يسجل</div>
                </div>`;
            }
        }).join('');

        grid.innerHTML = html || '<div style="text-align:center;padding:20px;color:#6b7280;grid-column:1/-1">لا يوجد فصول</div>';

        // ملخص
        summary.innerHTML = `
            <div class="sum-box" style="background:#f0fdf4"><div class="sum-num" style="color:#16a34a">${registered + noAbsence}</div><div class="sum-lbl">سجّل ✅</div></div>
            <div class="sum-box" style="background:#fef2f2"><div class="sum-num" style="color:#dc2626">${notRegistered}</div><div class="sum-lbl">لم يسجل ❌</div></div>
            <div class="sum-box" style="background:#f1f5f9"><div class="sum-num" style="color:#374151">${classes.length}</div><div class="sum-lbl">إجمالي الفصول</div></div>
        `;

        // قائمة الفصول التي لم تسجل
        var notList = document.getElementById('ac-not-registered-list');
        var notListContent = document.getElementById('ac-not-list');
        if (notRegistered > 0) {
            notList.style.display = 'block';
            notListContent.innerHTML = notRegList.map(cls => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#fef2f2;border-radius:8px;margin-bottom:6px">
                    <i class="bi bi-exclamation-triangle-fill" style="color:#dc2626"></i>
                    <span style="font-weight:900;font-size:14px">${cls}</span>
                    <span style="font-size:12px;color:#6b7280;margin-right:auto">${period} — ${date}</span>
                </div>
            `).join('');
        } else {
            notList.style.display = 'none';
        }

    } catch(e) {
        grid.innerHTML = `<div style="text-align:center;padding:20px;color:#dc2626;grid-column:1/-1">❌ ${e.message}</div>`;
    }
};
