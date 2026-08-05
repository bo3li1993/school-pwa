import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════════════════════
// الكشف اليومي الشامل — غياب اليوم لكل الفصول
// للمدير + المساعد + المشرف + الأخصائي
// ══════════════════════════════════════════════════════════════

export async function initDailyReportModule() {
    const container = document.getElementById('tab-daily-report');
    if(!container) return;

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0">
                <i class="bi bi-clipboard-data-fill" style="color:var(--sky)"></i> كشف الغياب اليومي
            </h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <input type="date" id="dr-date" value="${getTodayISO()}" onchange="window.loadDailyReport()" 
                    style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                <select id="dr-class-filter" onchange="window.filterDailyReport()"
                    style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700">
                    <option value="all">كل الفصول</option>
                </select>
                <button onclick="window.printDailyReport()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">
                    <i class="bi bi-printer-fill"></i> طباعة
                </button>
            </div>
        </div>

        <!-- ملخص KPI -->
        <div id="dr-kpi" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:24px;font-weight:900;color:var(--navy)" id="dr-total-students">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">إجمالي الطلاب</div>
            </div>
            <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:24px;font-weight:900;color:#dc2626" id="dr-total-absent">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">غائب</div>
            </div>
            <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:24px;font-weight:900;color:#d97706" id="dr-total-late">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">متأخر</div>
            </div>
            <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:24px;font-weight:900;color:var(--green)" id="dr-rate">-</div>
                <div style="font-size:11px;color:var(--mid);font-weight:700">نسبة الحضور</div>
            </div>
        </div>

        <!-- الجدول -->
        <div id="dr-content" style="background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden">
            <div style="text-align:center;padding:40px;color:#aaa;font-weight:700">⏳ جاري التحميل...</div>
        </div>
    </div>`;

    window.loadDailyReport();
}

let _allRecords = [];
let _allClasses = [];

window.loadDailyReport = async function() {
    const schoolId = getActiveSchoolId();
    const date = document.getElementById('dr-date')?.value || getTodayISO();
    const content = document.getElementById('dr-content');
    const classFilter = document.getElementById('dr-class-filter');

    content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-weight:700">⏳ جاري التحميل...</div>';

    try {
        // جلب الغياب
        const snap = await getDocs(query(
            collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('date', '==', date)
        ));

        _allRecords = snap.docs.map(d => ({id: d.id, ...d.data()}));

        // جلب كل الطلاب لحساب الإحصائيات
        const studSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        const totalStudents = studSnap.size;

        // استخراج الفصول
        _allClasses = [...new Set(_allRecords.map(r => r.classId))].sort((a,b) => {
            var pa = a.split('/'), pb = b.split('/');
            return (parseInt(pa[0])||0) - (parseInt(pb[0])||0) || (parseInt(pa[1])||0) - (parseInt(pb[1])||0);
        });

        // تحديث فلتر الفصول
        classFilter.innerHTML = '<option value="all">كل الفصول</option>' +
            _allClasses.map(c => '<option value="'+c+'">'+c+'</option>').join('');

        // KPI
        const absentRecords = _allRecords.filter(r => r.status === 'absent');
        const lateRecords = _allRecords.filter(r => r.status === 'late');
        const uniqueAbsent = [...new Set(absentRecords.map(r => r.studentName))];
        const uniqueLate = [...new Set(lateRecords.map(r => r.studentName))];

        document.getElementById('dr-total-students').textContent = totalStudents;
        document.getElementById('dr-total-absent').textContent = uniqueAbsent.length;
        document.getElementById('dr-total-late').textContent = uniqueLate.length;
        const rate = totalStudents > 0 ? Math.round(((totalStudents - uniqueAbsent.length) / totalStudents) * 100) : 0;
        document.getElementById('dr-rate').textContent = rate + '%';

        renderDailyTable('all');

    } catch(e) {
        content.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;font-weight:700">❌ '+e.message+'</div>';
    }
};

window.filterDailyReport = function() {
    const classId = document.getElementById('dr-class-filter')?.value || 'all';
    renderDailyTable(classId);
};

function renderDailyTable(filterClass) {
    const content = document.getElementById('dr-content');
    let records = _allRecords;
    if(filterClass !== 'all') records = records.filter(r => r.classId === filterClass);

    if(!records.length) {
        content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-weight:700">📭 لا يوجد غياب مسجّل</div>';
        return;
    }

    // ترتيب بالفصل ثم الاسم
    records.sort((a,b) => {
        var pa = (a.classId||'').split('/'), pb = (b.classId||'').split('/');
        var diff = (parseInt(pa[0])||0) - (parseInt(pb[0])||0) || (parseInt(pa[1])||0) - (parseInt(pb[1])||0);
        return diff || (a.studentName||'').localeCompare(b.studentName||'', 'ar');
    });

    // تجميع بالفصل
    const byClass = {};
    records.forEach(r => {
        if(!byClass[r.classId]) byClass[r.classId] = [];
        byClass[r.classId].push(r);
    });

    const statusLabels = {absent:'غائب', late:'متأخر', excused:'مستأذن'};
    const statusColors = {absent:'#dc2626', late:'#d97706', excused:'#2563eb'};

    let html = '';
    const classes = Object.keys(byClass).sort((a,b) => {
        var pa = a.split('/'), pb = b.split('/');
        return (parseInt(pa[0])||0) - (parseInt(pb[0])||0) || (parseInt(pa[1])||0) - (parseInt(pb[1])||0);
    });

    classes.forEach(cls => {
        const classRecords = byClass[cls];
        html += '<div style="border-bottom:1px solid var(--line);padding:12px 16px;background:#f8fafc">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-weight:900;color:var(--navy);font-size:14px">📚 الفصل '+cls+'</span>' +
            '<span style="font-size:12px;color:var(--mid);font-weight:700">'+classRecords.length+' سجل</span>' +
            '</div></div>';

        html += '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
            '<tr style="background:#f0f4f8"><th style="padding:8px 12px;text-align:right;font-weight:800;color:var(--navy)">الطالب</th>' +
            '<th style="padding:8px 12px;text-align:center;font-weight:800;color:var(--navy)">الحالة</th>' +
            '<th style="padding:8px 12px;text-align:center;font-weight:800;color:var(--navy)">الحصة</th>' +
            '<th style="padding:8px 12px;text-align:right;font-weight:800;color:var(--navy)">سجّلها</th>' +
            '<th style="padding:8px 12px;text-align:center;font-weight:800;color:var(--navy)">الوقت</th></tr>';

        classRecords.forEach(r => {
            const time = r.createdAt?.toDate?.();
            const timeStr = time ? time.toLocaleTimeString('ar-KW', {hour:'2-digit', minute:'2-digit'}) : '-';
            html += '<tr style="border-bottom:1px solid #f0f2f5">' +
                '<td style="padding:8px 12px;font-weight:700">'+(r.studentName||'-')+'</td>' +
                '<td style="padding:8px 12px;text-align:center"><span style="background:'+(statusColors[r.status]||'#666')+'22;color:'+(statusColors[r.status]||'#666')+';padding:3px 10px;border-radius:6px;font-size:11px;font-weight:800">'+(statusLabels[r.status]||r.status)+'</span></td>' +
                '<td style="padding:8px 12px;text-align:center;font-weight:700">'+(r.period||'-')+'</td>' +
                '<td style="padding:8px 12px;font-weight:600;color:var(--mid);font-size:12px">'+(r.recordedBy||'-')+'</td>' +
                '<td style="padding:8px 12px;text-align:center;font-size:11px;color:var(--mid)">'+timeStr+'</td></tr>';
        });
        html += '</table>';
    });

    content.innerHTML = html;
}

// ══ طباعة ══
window.printDailyReport = function() {
    const date = document.getElementById('dr-date')?.value || getTodayISO();
    const classId = document.getElementById('dr-class-filter')?.value || 'all';
    const subtitle = classId === 'all' ? 'جميع الفصول' : 'الفصل ' + classId;

    if(window.ManzoumaReport) {
        const content = document.getElementById('dr-content')?.innerHTML || '';
        window.ManzoumaReport.printDirect(content, 'كشف الغياب اليومي — ' + date, subtitle);
    }
};