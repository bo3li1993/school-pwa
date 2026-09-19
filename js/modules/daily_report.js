import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

var PERIODS = ['الحصة الأولى','الحصة الثانية','الحصة الثالثة','الحصة الرابعة','الحصة الخامسة','الحصة السادسة','الحصة السابعة'];

export async function initDailyReportModule() {
    var container = document.getElementById('tab-daily-report');
    if (!container) return;

    var html = '';
    html += '<div style="max-width:900px;margin:0 auto;padding:16px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">';
    html += '<h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0"><i class="bi bi-clipboard-data-fill" style="color:var(--sky)"></i> الكشف اليومي</h2>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
    html += '<input type="date" id="dr-date" value="' + getTodayISO() + '" style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px">';
    html += '<select id="dr-class" style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700"><option value="">اختر الفصل</option></select>';
    html += '<button onclick="window.loadDailyAttSheet()" style="background:var(--sky);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:800;cursor:pointer"><i class="bi bi-eye"></i> عرض</button>';
    html += '<button onclick="window.printDailySheet()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:800;cursor:pointer"><i class="bi bi-printer-fill"></i> طباعة</button>';
    html += '</div></div>';
    html += '<div id="dr-content"><div style="text-align:center;padding:40px;color:#aaa;font-weight:700">اختر التاريخ والفصل ثم اضغط عرض</div></div>';
    html += '</div>';
    container.innerHTML = html;

    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        var classes = [];
        snap.forEach(function(d) { var c = d.data().classId; if (c && classes.indexOf(c) === -1) classes.push(c); });
        classes.sort(function(a,b) {
            var pa = a.split('/'), pb = b.split('/');
            return (parseInt(pa[0])||0)-(parseInt(pb[0])||0)||(parseInt(pa[1])||0)-(parseInt(pb[1])||0);
        });
        var sel = document.getElementById('dr-class');
        for (var i = 0; i < classes.length; i++) {
            sel.innerHTML += '<option value="' + classes[i] + '">' + classes[i] + '</option>';
        }
    } catch(e) {}
}

window.loadDailyAttSheet = async function() {
    var date = document.getElementById('dr-date').value;
    var classId = document.getElementById('dr-class').value;
    var content = document.getElementById('dr-content');
    if (!date || !classId) { if (window.showToast) window.showToast('اختر التاريخ والفصل','warning'); return; }

    content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">جاري التحميل...</div>';
    var schoolId = getActiveSchoolId();

    try {
        var studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId), where('classId','==',classId)));
        var students = [];
        studSnap.forEach(function(d) { var n = d.data().name; if (n) students.push(n); });
        students.sort(function(a,b) { return a.localeCompare(b,'ar'); });

        var attSnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('classId','==',classId), where('date','==',date)));

        var attMap = {};
        attSnap.forEach(function(d) {
            var r = d.data();
            var sn = r.studentName;
            if (!sn) return;
            if (!attMap[sn]) attMap[sn] = {};
            var pIdx = PERIODS.indexOf(r.period);
            if (pIdx === -1) {
                var pNum = parseInt(r.period);
                if (!isNaN(pNum) && pNum >= 1 && pNum <= 7) pIdx = pNum - 1;
            }
            if (pIdx !== -1) {
                attMap[sn][pIdx] = { status: r.status, recordedBy: r.recordedBy || '' };
            }
        });

        var periodTeacher = {};
        attSnap.forEach(function(d) {
            var r = d.data();
            var pIdx = PERIODS.indexOf(r.period);
            if (pIdx === -1) { var pNum = parseInt(r.period); if (!isNaN(pNum)) pIdx = pNum-1; }
            if (pIdx !== -1 && r.recordedBy) periodTeacher[pIdx] = r.recordedBy;
        });

        var completeRows = {};
        for (var cn = 0; cn < students.length; cn++) {
            var sn = students[cn];
            var hasRecord = attMap[sn] && Object.keys(attMap[sn]).length > 0;
            completeRows[sn] = hasRecord;
        }

        var now = new Date(date);
        var dayName = now.toLocaleDateString('ar-KW', {weekday:'long'});

        var tbl = '';
        tbl += '<div id="dr-print-area">';
        tbl += '<div style="text-align:center;margin-bottom:12px">';
        tbl += '<div style="font-size:15px;font-weight:900;color:var(--navy)">كشف الحضور والغياب</div>';
        tbl += '<div style="font-size:13px;font-weight:700">الصف: ' + classId + ' &nbsp;|&nbsp; ' + dayName + ' ' + date + '</div>';
        tbl += '</div>';

        tbl += '<div style="overflow-x:auto">';
        tbl += '<table style="width:100%;border-collapse:collapse;font-size:12px;direction:rtl" id="att-sheet-table">';

        tbl += '<thead>';
        tbl += '<tr style="background:#0b2545;color:#fff">';
        tbl += '<th style="padding:8px;border:1px solid #ddd;min-width:30px;text-align:center">م</th>';
        tbl += '<th style="padding:8px;border:1px solid #ddd;min-width:160px;text-align:right">اسم الطالب</th>';
        for (var p = 0; p < PERIODS.length; p++) {
            tbl += '<th style="padding:6px 4px;border:1px solid #ddd;text-align:center;min-width:70px;font-size:11px">';
            tbl += 'الحصة ' + (p+1);
            tbl += '</th>';
        }
        tbl += '</tr>';

        tbl += '<tr style="background:#eaf4fd">';
        tbl += '<td style="border:1px solid #ddd"></td>';
        tbl += '<td style="border:1px solid #ddd;padding:4px 8px;font-size:10px;color:var(--mid);font-weight:700">المعلم المسجّل</td>';
        for (var p2 = 0; p2 < PERIODS.length; p2++) {
            var tName = periodTeacher[p2] || '';
            tbl += '<td style="border:1px solid #ddd;padding:3px 4px;text-align:center;font-size:9px;color:#555;font-weight:600">' + tName + '</td>';
        }
        tbl += '</tr>';
        tbl += '</thead>';

        tbl += '<tbody>';
        for (var s = 0; s < students.length; s++) {
            var sName = students[s];
            var isComplete = completeRows[sName];
            var rowBg = !isComplete ? '#f5f5f5' : (s % 2 === 0 ? '#fff' : '#f8f9fc');
            var rowOpacity = !isComplete ? '0.7' : '1';

            tbl += '<tr style="background:' + rowBg + ';opacity:' + rowOpacity + '">';
            tbl += '<td style="padding:7px 4px;border:1px solid #ddd;text-align:center;font-weight:700;color:#aaa">' + (s+1) + '</td>';
            tbl += '<td style="padding:7px 10px;border:1px solid #ddd;font-weight:800">' + sName + '</td>';
            for (var p3 = 0; p3 < PERIODS.length; p3++) {
                var cell = attMap[sName] ? attMap[sName][p3] : null;
                var symbol = '';
                var cellBg = '';
                var cellColor = '';
                if (!cell) {
                    if (!isComplete) {
                        symbol = '?';
                        cellColor = '#9ca3af';
                    } else {
                        symbol = '&#10003;';
                        cellColor = '#16a34a';
                    }
                } else if (cell.status === 'present') {
                    symbol = '&#10003;';
                    cellColor = '#16a34a';
                } else if (cell.status === 'absent') {
                    symbol = '&#10005;';
                    cellBg = '#fee2e2';
                    cellColor = '#dc2626';
                } else if (cell.status === 'late') {
                    symbol = '&#9716;';
                    cellBg = '#fef3c7';
                    cellColor = '#d97706';
                }
                tbl += '<td style="padding:6px 2px;border:1px solid #ddd;text-align:center;background:' + cellBg + '">';
                tbl += '<div style="font-size:16px;font-weight:900;color:' + cellColor + '">' + symbol + '</div>';
                tbl += '</td>';
            }
            tbl += '</tr>';
        }
        tbl += '</tbody>';
        tbl += '</table>';
        tbl += '</div>';

        var absCount = 0;
        var lateCount = 0;
        attSnap.forEach(function(d) {
            var r = d.data();
            if (r.status === 'absent') absCount++;
            if (r.status === 'late') lateCount++;
        });
        tbl += '<div style="display:flex;gap:16px;margin-top:12px;font-size:12px;font-weight:700">';
        tbl += '<span>إجمالي الطلاب: <b>' + students.length + '</b></span>';
        tbl += '<span style="color:#dc2626">غائب: <b>' + absCount + '</b></span>';
        tbl += '<span style="color:#d97706">متأخر: <b>' + lateCount + '</b></span>';
        tbl += '</div>';

        tbl += '<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px;border-right:3px solid #6b7280;font-size:11px;color:#666">';
        tbl += '<div style="font-weight:700;margin-bottom:6px">وسيلة الإيضاح:</div>';
        tbl += '<div>✓ = حاضر | ✕ = غائب | ⊔ = متأخر | ? = لم يتم التسجيل</div>';
        tbl += '<div style="margin-top:6px;color:#9ca3af">الصفوف الفاتحة = لم يتم تسجيل الحضور من المعلم</div>';
        tbl += '</div>';

        tbl += '</div>';

        content.innerHTML = tbl;

    } catch(e) {
        content.innerHTML = '<div style="color:#dc2626;padding:20px">خطأ: ' + e.message + '</div>';
    }
};

window.printDailySheet = function() {
    var area = document.getElementById('dr-print-area');
    if (!area) { if (window.showToast) window.showToast('اضغط عرض أولاً','warning'); return; }
    var date = document.getElementById('dr-date').value || '';
    var classId = document.getElementById('dr-class').value || '';
    var content = area.innerHTML;
    var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">';
    html += '<style>';
    html += 'body{font-family:Cairo,Arial,sans-serif;direction:rtl;padding:20px;font-size:12px}';
    html += 'table{width:100%;border-collapse:collapse}';
    html += 'th,td{border:1px solid #999;padding:5px;text-align:center}';
    html += 'th{background:#0b2545;color:#fff}';
    html += '@media print{body{padding:10px}}';
    html += '</style></head><body>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:10px">';
    html += '<div style="font-size:11px">وزارة التربية</div>';
    html += '<div style="font-size:14px;font-weight:900">كشف الحضور والغياب — الصف ' + classId + '</div>';
    html += '<div style="font-size:11px">' + date + '</div>';
    html += '</div>';
    html += content;
    html += '<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:11px">';
    html += '<div>توقيع المعلم: ______________</div>';
    html += '<div>توقيع المدير: ______________</div>';
    html += '</div>';
    html += '</body></html>';
    var blob = new Blob([html], {type:'text/html;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (w) setTimeout(function() { w.print(); URL.revokeObjectURL(url); }, 800);
};
