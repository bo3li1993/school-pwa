import { db, getActiveSchoolId } from "../firebase-config.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initReportsModule() {
    var container = document.getElementById("tab-reports");
    if (!container) return;

    container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
        <h2 style="font-size:18px;font-weight:900;color:var(--navy);margin-bottom:20px;">
            <i class="bi bi-file-earmark-text-fill" style="color:var(--gold);"></i> التقارير المتقدمة
        </h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">

            <!-- تقرير الغياب الشهري -->
            <div class="card" style="border-top:4px solid var(--red);">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-calendar-x-fill" style="color:var(--red);"></i> تقرير الغياب الشهري
                </h3>
                <select id="report-month-absence" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">-- اختر الشهر --</option>
                </select>
                <select id="report-class-absence" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">كل الفصول</option>
                </select>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.exportAbsenceReportPDF()" style="flex:1;background:var(--red);color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                    </button>
                    <button onclick="window.exportAbsenceReportExcel()" style="flex:1;background:#16a34a;color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-excel-fill"></i> Excel
                    </button>
                </div>
            </div>

            <!-- تقرير الإنذارات -->
            <div class="card" style="border-top:4px solid var(--gold);">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-exclamation-triangle-fill" style="color:var(--gold);"></i> تقرير الإنذارات
                </h3>
                <select id="report-month-warnings" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">-- اختر الشهر --</option>
                </select>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.exportWarningsReportPDF()" style="flex:1;background:var(--gold);color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                    </button>
                    <button onclick="window.exportWarningsReportExcel()" style="flex:1;background:#16a34a;color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-excel-fill"></i> Excel
                    </button>
                </div>
            </div>

            <!-- تقرير السلوك -->
            <div class="card" style="border-top:4px solid #8b5cf6;">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-person-exclamation-fill" style="color:#8b5cf6;"></i> تقرير السلوك
                </h3>
                <select id="report-month-behavior" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">-- اختر الشهر --</option>
                </select>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.exportBehaviorReportPDF()" style="flex:1;background:#8b5cf6;color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                    </button>
                    <button onclick="window.exportBehaviorReportExcel()" style="flex:1;background:#16a34a;color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-excel-fill"></i> Excel
                    </button>
                </div>
            </div>

            <!-- تقرير الطلاب الكامل -->
            <div class="card" style="border-top:4px solid var(--sky);">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-people-fill" style="color:var(--sky);"></i> كشف الطلاب الكامل
                </h3>
                <select id="report-class-students" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">كل الفصول</option>
                </select>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.exportStudentsFullPDF()" style="flex:1;background:var(--sky);color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                    </button>
                    <button onclick="window.exportStudentsFullExcel()" style="flex:1;background:#16a34a;color:#fff;border:none;padding:10px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                        <i class="bi bi-file-earmark-excel-fill"></i> Excel
                    </button>
                </div>
            </div>

        </div>
    </div>`;

    await loadReportFilters();
}

async function loadReportFilters() {
    var schoolId = getActiveSchoolId();

    // تحميل الأشهر
    var months = [];
    for (var i = 0; i < 12; i++) {
        var d = new Date();
        d.setMonth(d.getMonth() - i);
        var val = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
        var label = d.toLocaleDateString("ar-KW", { year:"numeric", month:"long" });
        months.push({ val: val, label: label });
    }

    ["report-month-absence","report-month-warnings","report-month-behavior"].forEach(function(id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        months.forEach(function(m) {
            sel.innerHTML += '<option value="' + m.val + '">' + m.label + '</option>';
        });
        sel.value = months[0].val;
    });

    // تحميل الفصول
    try {
        var snap = await getDocs(query(collection(db,"students"), where("schoolId","==",schoolId)));
        var classes = {};
        snap.forEach(function(d) { var c = d.data().classId; if(c) classes[c] = 1; });
        var sortedClasses = Object.keys(classes).sort();

        ["report-class-absence","report-class-students"].forEach(function(id) {
            var sel = document.getElementById(id);
            if (!sel) return;
            sortedClasses.forEach(function(c) {
                sel.innerHTML += '<option value="' + c + '">' + c + '</option>';
            });
        });
    } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
// تقرير الغياب - PDF
// ════════════════════════════════════════════════════════════════
window.exportAbsenceReportPDF = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-absence").value;
    var classId = document.getElementById("report-class-absence").value;
    if (!month) { alert("يرجى اختيار الشهر"); return; }

    var fromDate = month + "-01";
    var toDate = month + "-31";

    var q = query(collection(db,"attendance"),
        where("schoolId","==",schoolId),
        where("date",">=",fromDate),
        where("date","<=",toDate),
        where("status","==","absent"));

    if (classId) q = query(collection(db,"attendance"),
        where("schoolId","==",schoolId),
        where("classId","==",classId),
        where("date",">=",fromDate),
        where("date","<=",toDate),
        where("status","==","absent"));

    var snap = await getDocs(q);
    var currentUser = JSON.parse(localStorage.getItem("hs_user")||"{}");

    var rows = "";
    var i = 0;
    snap.forEach(function(d) {
        var a = d.data();
        i++;
        rows += '<tr><td>' + i + '</td><td style="font-weight:900;">' + (a.studentName||"--") + '</td><td>' + (a.classId||"--") + '</td><td>' + (a.date||"--") + '</td><td>' + (a.period?"الحصة "+a.period:"--") + '</td><td>' + (a.recordedBy||"--") + '</td></tr>';
    });

    var win = window.open("","_blank");
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;padding:20px;direction:rtl;font-size:13px}.header{text-align:center;border-bottom:2px solid #0b2545;margin-bottom:16px;padding-bottom:12px}h1{color:#0b2545;font-size:16px;margin:0}p{color:#666;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8fafc}.footer{margin-top:20px;text-align:center;font-size:11px;color:#999}</style></head><body>');
    win.document.write('<div class="header"><h1>تقرير الغياب الشهري</h1><p>المدرسة: ' + (currentUser.schoolName||"") + ' | الشهر: ' + month + ' | الفصل: ' + (classId||"الكل") + '</p><p>التاريخ: ' + new Date().toLocaleDateString("ar-KW") + ' | اعده: ' + (currentUser.name||"") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>اسم الطالب</th><th>الفصل</th><th>التاريخ</th><th>الحصة</th><th>المسجل</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div class="footer">إجمالي الغيابات: ' + snap.size + ' غياب</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

// ════════════════════════════════════════════════════════════════
// تقرير الغياب - Excel
// ════════════════════════════════════════════════════════════════
window.exportAbsenceReportExcel = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-absence").value;
    var classId = document.getElementById("report-class-absence").value;
    if (!month) { alert("يرجى اختيار الشهر"); return; }

    var fromDate = month + "-01";
    var toDate = month + "-31";

    var q = query(collection(db,"attendance"),
        where("schoolId","==",schoolId),
        where("date",">=",fromDate),
        where("date","<=",toDate),
        where("status","==","absent"));

    var snap = await getDocs(q);
    var rows = [["#","اسم الطالب","الفصل","التاريخ","الحصة","المسجل"]];
    var i = 0;
    snap.forEach(function(d) {
        var a = d.data();
        i++;
        rows.push([i, a.studentName||"", a.classId||"", a.date||"", a.period?"الحصة "+a.period:"", a.recordedBy||""]);
    });

    exportToCSV(rows, "تقرير-الغياب-" + month);
};

// ════════════════════════════════════════════════════════════════
// تقرير الإنذارات - PDF
// ════════════════════════════════════════════════════════════════
window.exportWarningsReportPDF = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-warnings").value;
    if (!month) { alert("يرجى اختيار الشهر"); return; }

    var snap = await getDocs(query(collection(db,"warnings"),
        where("schoolId","==",schoolId),
        where("date",">=",month+"-01"),
        where("date","<=",month+"-31")));

    var currentUser = JSON.parse(localStorage.getItem("hs_user")||"{}");
    var rows = "";
    var i = 0;
    snap.forEach(function(d) {
        var w = d.data();
        i++;
        rows += '<tr><td>' + i + '</td><td style="font-weight:900;">' + (w.studentName||"--") + '</td><td>' + (w.classId||"--") + '</td><td>' + (w.level||"--") + '</td><td>' + (w.absentDays||"--") + '</td><td>' + (w.date||"--") + '</td><td>' + (w.issuedBy||"--") + '</td></tr>';
    });

    var win = window.open("","_blank");
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;padding:20px;direction:rtl;font-size:13px}.header{text-align:center;border-bottom:2px solid #0b2545;margin-bottom:16px;padding-bottom:12px}h1{color:#0b2545;font-size:16px;margin:0}p{color:#666;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#d4920a;color:#fff;padding:8px;text-align:right;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#fff9ec}</style></head><body>');
    win.document.write('<div class="header"><h1>تقرير الإنذارات</h1><p>المدرسة: ' + (currentUser.schoolName||"") + ' | الشهر: ' + month + '</p><p>التاريخ: ' + new Date().toLocaleDateString("ar-KW") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>اسم الطالب</th><th>الفصل</th><th>مستوى الإنذار</th><th>ايام الغياب</th><th>التاريخ</th><th>الصادر من</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">إجمالي الإنذارات: ' + snap.size + '</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

window.exportWarningsReportExcel = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-warnings").value;
    if (!month) { alert("يرجى اختيار الشهر"); return; }

    var snap = await getDocs(query(collection(db,"warnings"),
        where("schoolId","==",schoolId),
        where("date",">=",month+"-01"),
        where("date","<=",month+"-31")));

    var rows = [["#","اسم الطالب","الفصل","مستوى الإنذار","ايام الغياب","التاريخ","الصادر من"]];
    var i = 0;
    snap.forEach(function(d) {
        var w = d.data();
        i++;
        rows.push([i, w.studentName||"", w.classId||"", w.level||"", w.absentDays||"", w.date||"", w.issuedBy||""]);
    });
    exportToCSV(rows, "تقرير-الإنذارات-" + month);
};

window.exportBehaviorReportPDF = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-behavior").value;
    if (!month) { alert("يرجى اختيار الشهر"); return; }

    var snap = await getDocs(query(collection(db,"behavior"),
        where("schoolId","==",schoolId),
        where("date",">=",month+"-01"),
        where("date","<=",month+"-31")));

    var currentUser = JSON.parse(localStorage.getItem("hs_user")||"{}");
    var rows = "";
    var i = 0;
    snap.forEach(function(d) {
        var b = d.data();
        i++;
        rows += '<tr><td>' + i + '</td><td style="font-weight:900;">' + (b.studentName||"--") + '</td><td>' + (b.classId||"--") + '</td><td>' + (b.action||"--") + '</td><td style="font-size:11px;">' + (b.notes||"--") + '</td><td>' + (b.date||"--") + '</td><td>' + (b.referredBy||"--") + '</td></tr>';
    });

    var win = window.open("","_blank");
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;padding:20px;direction:rtl;font-size:13px}.header{text-align:center;border-bottom:2px solid #8b5cf6;margin-bottom:16px;padding-bottom:12px}h1{color:#8b5cf6;font-size:16px;margin:0}p{color:#666;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#8b5cf6;color:#fff;padding:8px;text-align:right;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f5f3ff}</style></head><body>');
    win.document.write('<div class="header"><h1>تقرير السلوك</h1><p>المدرسة: ' + (currentUser.schoolName||"") + ' | الشهر: ' + month + '</p><p>التاريخ: ' + new Date().toLocaleDateString("ar-KW") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>اسم الطالب</th><th>الفصل</th><th>نوع السلوك</th><th>الملاحظات</th><th>التاريخ</th><th>المسجل</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">إجمالي: ' + snap.size + '</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

window.exportBehaviorReportExcel = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-behavior").value;
    if (!month) { alert("يرجى اختيار الشهر"); return; }

    var snap = await getDocs(query(collection(db,"behavior"),
        where("schoolId","==",schoolId),
        where("date",">=",month+"-01"),
        where("date","<=",month+"-31")));

    var rows = [["#","اسم الطالب","الفصل","نوع السلوك","الملاحظات","التاريخ","المسجل"]];
    var i = 0;
    snap.forEach(function(d) {
        var b = d.data();
        i++;
        rows.push([i, b.studentName||"", b.classId||"", b.action||"", b.notes||"", b.date||"", b.referredBy||""]);
    });
    exportToCSV(rows, "تقرير-السلوك-" + month);
};

window.exportStudentsFullPDF = async function() {
    var schoolId = getActiveSchoolId();
    var classId = document.getElementById("report-class-students").value;
    var currentUser = JSON.parse(localStorage.getItem("hs_user")||"{}");

    var q = classId
        ? query(collection(db,"students"), where("schoolId","==",schoolId), where("classId","==",classId))
        : query(collection(db,"students"), where("schoolId","==",schoolId));

    var snap = await getDocs(q);
    var rows = "";
    var i = 0;
    snap.forEach(function(d) {
        var s = d.data();
        i++;
        rows += '<tr><td>' + i + '</td><td style="font-weight:900;">' + (s.name||"--") + '</td><td>' + (s.classId||"--") + '</td><td>' + (s.civilId||"--") + '</td><td>' + (s.parentPhone||"--") + '</td><td>' + (s.studentId||"--") + '</td></tr>';
    });

    var win = window.open("","_blank");
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;padding:20px;direction:rtl;font-size:13px}.header{text-align:center;border-bottom:2px solid #0b2545;margin-bottom:16px;padding-bottom:12px}h1{color:#0b2545;font-size:16px;margin:0}p{color:#666;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8fafc}</style></head><body>');
    win.document.write('<div class="header"><h1>كشف الطلاب الكامل</h1><p>المدرسة: ' + (currentUser.schoolName||"") + ' | الفصل: ' + (classId||"الكل") + '</p><p>التاريخ: ' + new Date().toLocaleDateString("ar-KW") + ' | اعده: ' + (currentUser.name||"") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>اسم الطالب</th><th>الفصل</th><th>الرقم المدني</th><th>هاتف ولي الامر</th><th>رقم الطالب</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">إجمالي الطلاب: ' + snap.size + '</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

window.exportStudentsFullExcel = async function() {
    var schoolId = getActiveSchoolId();
    var classId = document.getElementById("report-class-students").value;

    var q = classId
        ? query(collection(db,"students"), where("schoolId","==",schoolId), where("classId","==",classId))
        : query(collection(db,"students"), where("schoolId","==",schoolId));

    var snap = await getDocs(q);
    var rows = [["#","اسم الطالب","الفصل","الرقم المدني","هاتف ولي الامر","رقم الطالب"]];
    var i = 0;
    snap.forEach(function(d) {
        var s = d.data();
        i++;
        rows.push([i, s.name||"", s.classId||"", s.civilId||"", s.parentPhone||"", s.studentId||""]);
    });
    exportToCSV(rows, "كشف-الطلاب-" + (classId||"الكل"));
};

// ════════════════════════════════════════════════════════════════
// تصدير CSV
// ════════════════════════════════════════════════════════════════
function exportToCSV(rows, filename) {
    var BOM = "\uFEFF";
    var csv = BOM + rows.map(function(row) {
        return row.map(function(cell) {
            var val = String(cell || "");
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        }).join(",");
    }).join("\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename + ".csv";
    a.click();
    URL.revokeObjectURL(url);
}