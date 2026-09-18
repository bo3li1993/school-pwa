import { db, getActiveSchoolId } from "../firebase-config.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initReportsModule() {
    var container = document.getElementById("tab-reports");
    if (!container) return;

    container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
        <h2 style="font-size:18px;font-weight:900;color:var(--navy);margin-bottom:20px;">
            <i class="bi bi-file-earmark-text-fill" style="color:var(--gold);"></i> Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø©
        </h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">

            <!-- ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø´Ù‡Ø±ÙŠ -->
            <div class="card" style="border-top:4px solid var(--red);">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-calendar-x-fill" style="color:var(--red);"></i> ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø´Ù‡Ø±ÙŠ
                </h3>
                <select id="report-month-absence" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ø´Ù‡Ø± --</option>
                </select>
                <select id="report-class-absence" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>
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

            <!-- ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª -->
            <div class="card" style="border-top:4px solid var(--gold);">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-exclamation-triangle-fill" style="color:var(--gold);"></i> ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª
                </h3>
                <select id="report-month-warnings" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ø´Ù‡Ø± --</option>
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

            <!-- ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø³Ù„ÙˆÙƒ -->
            <div class="card" style="border-top:4px solid #8b5cf6;">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-person-exclamation-fill" style="color:#8b5cf6;"></i> ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø³Ù„ÙˆÙƒ
                </h3>
                <select id="report-month-behavior" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ø´Ù‡Ø± --</option>
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

            <!-- ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙƒØ§Ù…Ù„ -->
            <div class="card" style="border-top:4px solid var(--sky);">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:12px;">
                    <i class="bi bi-people-fill" style="color:var(--sky);"></i> ÙƒØ´Ù Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙƒØ§Ù…Ù„
                </h3>
                <select id="report-class-students" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;margin-bottom:10px;">
                    <option value="">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>
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

    // ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£Ø´Ù‡Ø±
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

    // ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙØµÙˆÙ„
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØºÙŠØ§Ø¨ - PDF
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
window.exportAbsenceReportPDF = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-absence").value;
    var classId = document.getElementById("report-class-absence").value;
    if (!month) { alert("ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´Ù‡Ø±"); return; }

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
        rows += '<tr><td>' + i + '</td><td style="font-weight:900;">' + (a.studentName||"--") + '</td><td>' + (a.classId||"--") + '</td><td>' + (a.date||"--") + '</td><td>' + (a.period?"Ø§Ù„Ø­ØµØ© "+a.period:"--") + '</td><td>' + (a.recordedBy||"--") + '</td></tr>';
    });

    var win = window.open("","_blank");
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;padding:20px;direction:rtl;font-size:13px}.header{text-align:center;border-bottom:2px solid #0b2545;margin-bottom:16px;padding-bottom:12px}h1{color:#0b2545;font-size:16px;margin:0}p{color:#666;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8fafc}.footer{margin-top:20px;text-align:center;font-size:11px;color:#999}</style></head><body>');
    win.document.write('<div class="header"><h1>ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ø´Ù‡Ø±ÙŠ</h1><p>Ø§Ù„Ù…Ø¯Ø±Ø³Ø©: ' + (currentUser.schoolName||"") + ' | Ø§Ù„Ø´Ù‡Ø±: ' + month + ' | Ø§Ù„ÙØµÙ„: ' + (classId||"Ø§Ù„ÙƒÙ„") + '</p><p>Ø§Ù„ØªØ§Ø±ÙŠØ®: ' + new Date().toLocaleDateString("ar-KW") + ' | Ø§Ø¹Ø¯Ù‡: ' + (currentUser.name||"") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø­ØµØ©</th><th>Ø§Ù„Ù…Ø³Ø¬Ù„</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div class="footer">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØºÙŠØ§Ø¨Ø§Øª: ' + snap.size + ' ØºÙŠØ§Ø¨</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØºÙŠØ§Ø¨ - Excel
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
window.exportAbsenceReportExcel = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-absence").value;
    var classId = document.getElementById("report-class-absence").value;
    if (!month) { alert("ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´Ù‡Ø±"); return; }

    var fromDate = month + "-01";
    var toDate = month + "-31";

    var q = query(collection(db,"attendance"),
        where("schoolId","==",schoolId),
        where("date",">=",fromDate),
        where("date","<=",toDate),
        where("status","==","absent"));

    var snap = await getDocs(q);
    var rows = [["#","Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨","Ø§Ù„ÙØµÙ„","Ø§Ù„ØªØ§Ø±ÙŠØ®","Ø§Ù„Ø­ØµØ©","Ø§Ù„Ù…Ø³Ø¬Ù„"]];
    var i = 0;
    snap.forEach(function(d) {
        var a = d.data();
        i++;
        rows.push([i, a.studentName||"", a.classId||"", a.date||"", a.period?"Ø§Ù„Ø­ØµØ© "+a.period:"", a.recordedBy||""]);
    });

    exportToCSV(rows, "ØªÙ‚Ø±ÙŠØ±-Ø§Ù„ØºÙŠØ§Ø¨-" + month);
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª - PDF
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
window.exportWarningsReportPDF = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-warnings").value;
    if (!month) { alert("ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´Ù‡Ø±"); return; }

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
    win.document.write('<div class="header"><h1>ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª</h1><p>Ø§Ù„Ù…Ø¯Ø±Ø³Ø©: ' + (currentUser.schoolName||"") + ' | Ø§Ù„Ø´Ù‡Ø±: ' + month + '</p><p>Ø§Ù„ØªØ§Ø±ÙŠØ®: ' + new Date().toLocaleDateString("ar-KW") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±</th><th>Ø§ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ØµØ§Ø¯Ø± Ù…Ù†</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª: ' + snap.size + '</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

window.exportWarningsReportExcel = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-warnings").value;
    if (!month) { alert("ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´Ù‡Ø±"); return; }

    var snap = await getDocs(query(collection(db,"warnings"),
        where("schoolId","==",schoolId),
        where("date",">=",month+"-01"),
        where("date","<=",month+"-31")));

    var rows = [["#","Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨","Ø§Ù„ÙØµÙ„","Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±","Ø§ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨","Ø§Ù„ØªØ§Ø±ÙŠØ®","Ø§Ù„ØµØ§Ø¯Ø± Ù…Ù†"]];
    var i = 0;
    snap.forEach(function(d) {
        var w = d.data();
        i++;
        rows.push([i, w.studentName||"", w.classId||"", w.level||"", w.absentDays||"", w.date||"", w.issuedBy||""]);
    });
    exportToCSV(rows, "ØªÙ‚Ø±ÙŠØ±-Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª-" + month);
};

window.exportBehaviorReportPDF = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-behavior").value;
    if (!month) { alert("ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´Ù‡Ø±"); return; }

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
    win.document.write('<div class="header"><h1>ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø³Ù„ÙˆÙƒ</h1><p>Ø§Ù„Ù…Ø¯Ø±Ø³Ø©: ' + (currentUser.schoolName||"") + ' | Ø§Ù„Ø´Ù‡Ø±: ' + month + '</p><p>Ø§Ù„ØªØ§Ø±ÙŠØ®: ' + new Date().toLocaleDateString("ar-KW") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ù†ÙˆØ¹ Ø§Ù„Ø³Ù„ÙˆÙƒ</th><th>Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ù…Ø³Ø¬Ù„</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ' + snap.size + '</div>');
    win.document.write("</body></html>");
    win.document.close();
    setTimeout(function() { win.print(); }, 600);
};

window.exportBehaviorReportExcel = async function() {
    var schoolId = getActiveSchoolId();
    var month = document.getElementById("report-month-behavior").value;
    if (!month) { alert("ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´Ù‡Ø±"); return; }

    var snap = await getDocs(query(collection(db,"behavior"),
        where("schoolId","==",schoolId),
        where("date",">=",month+"-01"),
        where("date","<=",month+"-31")));

    var rows = [["#","Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨","Ø§Ù„ÙØµÙ„","Ù†ÙˆØ¹ Ø§Ù„Ø³Ù„ÙˆÙƒ","Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª","Ø§Ù„ØªØ§Ø±ÙŠØ®","Ø§Ù„Ù…Ø³Ø¬Ù„"]];
    var i = 0;
    snap.forEach(function(d) {
        var b = d.data();
        i++;
        rows.push([i, b.studentName||"", b.classId||"", b.action||"", b.notes||"", b.date||"", b.referredBy||""]);
    });
    exportToCSV(rows, "ØªÙ‚Ø±ÙŠØ±-Ø§Ù„Ø³Ù„ÙˆÙƒ-" + month);
};

window.exportStudentsFullPDF = async function() {
    var schoolId = getActiveSchoolId();
    var classId = document.getElementById("report-class-students").value;
    var currentUser = JSON.parse(localStorage.getItem("hs_user")||"{}");

    var q = classId
        ? query(collection(db,"students"), where("schoolId","==",schoolId), where("classId","==",classId))
        : query(collection(db,"students"), where("schoolId","==",schoolId));

    var snap = await getDocs(q);
    // ØªØ±ØªÙŠØ¨ Ø£Ø¨Ø¬Ø¯ÙŠ: Ø£ÙˆÙ„Ø§Ù‹ Ø¨Ø§Ù„ØµÙ (6/1ØŒ 6/2...7/1...) Ø«Ù… Ø£Ø¨Ø¬Ø¯ÙŠ Ø¨Ø§Ù„Ø§Ø³Ù…
    var students = snap.docs.map(function(d) { return d.data(); });
    students.sort(function(a, b) {
        var ca = (a.classId||"").split("/").map(Number);
        var cb = (b.classId||"").split("/").map(Number);
        if ((ca[0]||0) !== (cb[0]||0)) return (ca[0]||0) - (cb[0]||0);
        if ((ca[1]||0) !== (cb[1]||0)) return (ca[1]||0) - (cb[1]||0);
        return (a.name||"").localeCompare(b.name||"", "ar");
    });
    var rows = "";
    students.forEach(function(s, idx) {
        var i = idx + 1;
        rows += '<tr><td>' + i + '</td><td style="font-weight:900;">' + (s.name||"--") + '</td><td>' + (s.classId||"--") + '</td><td>' + (s.civilId||"--") + '</td><td>' + (s.parentPhone||"--") + '</td><td>' + (s.studentId||"--") + '</td></tr>';
    });

    var win = window.open("","_blank");
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;padding:20px;direction:rtl;font-size:13px}.header{text-align:center;border-bottom:2px solid #0b2545;margin-bottom:16px;padding-bottom:12px}h1{color:#0b2545;font-size:16px;margin:0}p{color:#666;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f8fafc}</style></head><body>');
    win.document.write('<div class="header"><h1>ÙƒØ´Ù Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙƒØ§Ù…Ù„</h1><p>Ø§Ù„Ù…Ø¯Ø±Ø³Ø©: ' + (currentUser.schoolName||"") + ' | Ø§Ù„ÙØµÙ„: ' + (classId||"Ø§Ù„ÙƒÙ„") + '</p><p>Ø§Ù„ØªØ§Ø±ÙŠØ®: ' + new Date().toLocaleDateString("ar-KW") + ' | Ø§Ø¹Ø¯Ù‡: ' + (currentUser.name||"") + '</p></div>');
    win.document.write('<table><thead><tr><th>#</th><th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ÙØµÙ„</th><th>Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ</th><th>Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø§Ù…Ø±</th><th>Ø±Ù‚Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th></tr></thead><tbody>' + rows + '</tbody></table>');
    win.document.write('<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨: ' + snap.size + '</div>');
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
    var rows = [["#","Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨","Ø§Ù„ÙØµÙ„","Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ","Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø§Ù…Ø±","Ø±Ù‚Ù… Ø§Ù„Ø·Ø§Ù„Ø¨"]];
    var i = 0;
    var students2 = snap.docs.map(function(d) { return d.data(); });
    students2.sort(function(a, b) {
        var ca = (a.classId||"").split("/").map(Number);
        var cb = (b.classId||"").split("/").map(Number);
        if ((ca[0]||0) !== (cb[0]||0)) return (ca[0]||0) - (cb[0]||0);
        if ((ca[1]||0) !== (cb[1]||0)) return (ca[1]||0) - (cb[1]||0);
        return (a.name||"").localeCompare(b.name||"", "ar");
    });
    students2.forEach(function(s, idx) {
        rows.push([idx+1, s.name||"", s.classId||"", s.civilId||"", s.parentPhone||"", s.studentId||""]);
    });
    exportToCSV(rows, "ÙƒØ´Ù-Ø§Ù„Ø·Ù„Ø§Ø¨-" + (classId||"Ø§Ù„ÙƒÙ„"));
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ØªØµØ¯ÙŠØ± CSV
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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