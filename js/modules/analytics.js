import { db, getActiveSchoolId } from "../firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initAdvancedAnalytics() {
    var container = document.getElementById("tab-analytics");
    if (!container) return;

    container.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;padding:16px;">
        <h2 style="font-size:18px;font-weight:900;color:var(--navy);margin-bottom:20px;">
            <i class="bi bi-bar-chart-fill" style="color:var(--gold);"></i> Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø©
        </h2>

        <!-- ÙÙ„ØªØ± Ø§Ù„Ø´Ù‡Ø± -->
        <div class="card" style="padding:14px;margin-bottom:16px;">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <label style="font-weight:700;font-size:13px;">Ø§Ù„Ø´Ù‡Ø±:</label>
                <input type="month" id="analytics-month" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;">
                <button onclick="window.loadAnalyticsData()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                    <i class="bi bi-search"></i> ØªØ­Ù„ÙŠÙ„
                </button>
            </div>
        </div>

        <!-- Ø§Ù„Ø¨Ø·Ø§Ù‚Ø§Øª Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ© -->
        <div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
            <div class="stat-box" style="border-top:3px solid var(--sky);">
                <div class="num" id="an-total-students" style="color:var(--sky);">--</div>
                <div class="lbl">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--red);">
                <div class="num" id="an-total-absent" style="color:var(--red);">--</div>
                <div class="lbl">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØºÙŠØ§Ø¨</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--gold);">
                <div class="num" id="an-absence-rate" style="color:var(--gold);">--</div>
                <div class="lbl">Ù†Ø³Ø¨Ø© Ø§Ù„ØºÙŠØ§Ø¨</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--green);">
                <div class="num" id="an-warnings" style="color:var(--green);">--</div>
                <div class="lbl">Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª</div>
            </div>
            <div class="stat-box" style="border-top:3px solid #8b5cf6;">
                <div class="num" id="an-behavior" style="color:#8b5cf6;">--</div>
                <div class="lbl">Ø§Ù„Ø³Ù„ÙˆÙƒ</div>
            </div>
        </div>

        <!-- Ø§Ù„ØºÙŠØ§Ø¨ Ø­Ø³Ø¨ Ø§Ù„ÙØµÙ„ -->
        <div class="card" style="border-top:4px solid var(--sky);margin-bottom:16px;">
            <h3 style="font-size:14px;font-weight:900;margin-bottom:16px;">
                <i class="bi bi-bar-chart-fill" style="color:var(--sky);"></i> Ø§Ù„ØºÙŠØ§Ø¨ Ø­Ø³Ø¨ Ø§Ù„ÙØµÙ„
            </h3>
            <div id="chart-by-class" style="height:200px;display:flex;align-items:flex-end;gap:6px;padding:0 10px;overflow-x:auto;">
                <p style="color:#999;margin:auto;">Ø§Ø¶ØºØ· ØªØ­Ù„ÙŠÙ„ Ù„Ø¹Ø±Ø¶ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</p>
            </div>
        </div>

        <!-- Ø£ÙƒØ«Ø± Ø§Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹ -->
        <div class="card" style="border-top:4px solid var(--red);margin-bottom:16px;">
            <h3 style="font-size:14px;font-weight:900;margin-bottom:16px;">
                <i class="bi bi-person-x-fill" style="color:var(--red);"></i> Ø£ÙƒØ«Ø± 10 Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹
            </h3>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Ø§Ù„Ø·Ø§Ù„Ø¨</th>
                            <th>Ø§Ù„ÙØµÙ„</th>
                            <th>Ø¹Ø¯Ø¯ Ø§Ù„ØºÙŠØ§Ø¨Ø§Øª</th>
                            <th>Ø§Ù„Ø­Ø§Ù„Ø©</th>
                        </tr>
                    </thead>
                    <tbody id="top-absent-tbody">
                        <tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">Ø§Ø¶ØºØ· ØªØ­Ù„ÙŠÙ„ Ù„Ø¹Ø±Ø¶ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Ø§Ù„ØºÙŠØ§Ø¨ Ø­Ø³Ø¨ Ø§Ù„ÙŠÙˆÙ… -->
        <div class="card" style="border-top:4px solid var(--gold);">
            <h3 style="font-size:14px;font-weight:900;margin-bottom:16px;">
                <i class="bi bi-calendar-week-fill" style="color:var(--gold);"></i> Ø§Ù„ØºÙŠØ§Ø¨ Ø­Ø³Ø¨ Ø§Ù„ÙŠÙˆÙ…
            </h3>
            <div id="chart-by-day" style="height:200px;display:flex;align-items:flex-end;gap:4px;padding:0 10px;overflow-x:auto;">
                <p style="color:#999;margin:auto;">Ø§Ø¶ØºØ· ØªØ­Ù„ÙŠÙ„ Ù„Ø¹Ø±Ø¶ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</p>
            </div>
        </div>
    </div>`;

    // Ø¶Ø¹ Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ Ø§ÙØªØ±Ø§Ø¶ÙŠØ§Ù‹
    var now = new Date();
    var month = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
    document.getElementById("analytics-month").value = month;

    // ØªØ­Ù…ÙŠÙ„ ØªÙ„Ù‚Ø§Ø¦ÙŠ
    window.loadAnalyticsData();
}

window.loadAnalyticsData = async function() {
    var schoolId = getActiveSchoolId();
    var monthVal = document.getElementById("analytics-month").value;
    if (!monthVal) return;

    var fromDate = monthVal + "-01";
    var toDate = monthVal + "-31";

    try {
        // ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ø§Ù„ØªÙˆØ§Ø²ÙŠ
        var results = await Promise.all([
            getDocs(query(collection(db,"students"), where("schoolId","==",schoolId))),
            getDocs(query(collection(db,"attendance"), where("schoolId","==",schoolId), where("date",">=",fromDate), where("date","<=",toDate), where("status","==","absent"))),
            getDocs(query(collection(db,"warnings"), where("schoolId","==",schoolId), where("date",">=",fromDate), where("date","<=",toDate))),
            getDocs(query(collection(db,"behavior"), where("schoolId","==",schoolId), where("date",">=",fromDate), where("date","<=",toDate)))
        ]);

        var studentsSnap = results[0];
        var absenceSnap = results[1];
        var warningsSnap = results[2];
        var behaviorSnap = results[3];

        var totalStudents = studentsSnap.size;
        var totalAbsent = absenceSnap.size;
        var rate = totalStudents > 0 ? Math.round(totalAbsent / totalStudents * 100) + "%" : "0%";

        document.getElementById("an-total-students").textContent = totalStudents;
        document.getElementById("an-total-absent").textContent = totalAbsent;
        document.getElementById("an-absence-rate").textContent = rate;
        document.getElementById("an-warnings").textContent = warningsSnap.size;
        document.getElementById("an-behavior").textContent = behaviorSnap.size;

        // ---- Ø§Ù„ØºÙŠØ§Ø¨ Ø­Ø³Ø¨ Ø§Ù„ÙØµÙ„ ----
        var byClass = {};
        absenceSnap.forEach(function(d) {
            var c = d.data().classId || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";
            byClass[c] = (byClass[c] || 0) + 1;
        });

        var classes = Object.keys(byClass).sort();
        var maxClass = Math.max.apply(null, Object.values(byClass)) || 1;
        var chartClass = document.getElementById("chart-by-class");
        chartClass.innerHTML = "";

        classes.forEach(function(c) {
            var val = byClass[c];
            var h = Math.round((val / maxClass) * 160);
            var bar = document.createElement("div");
            bar.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;min-width:50px;";
            bar.innerHTML = '<div style="font-size:11px;font-weight:900;color:var(--navy);">' + val + '</div>' +
                '<div style="width:40px;height:' + h + 'px;background:var(--sky);border-radius:4px 4px 0 0;"></div>' +
                '<div style="font-size:10px;font-weight:700;color:var(--mid);text-align:center;">' + c + '</div>';
            chartClass.appendChild(bar);
        });

        if (classes.length === 0) {
            chartClass.innerHTML = '<p style="color:#999;margin:auto;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</p>';
        }

        // ---- Ø£ÙƒØ«Ø± Ø§Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹ ----
        var byStudent = {};
        absenceSnap.forEach(function(d) {
            var data = d.data();
            var key = (data.studentName || "ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ") + "||" + (data.classId || "");
            byStudent[key] = (byStudent[key] || 0) + 1;
        });

        var sortedStudents = Object.entries(byStudent)
            .sort(function(a, b) { return b[1] - a[1]; })
            .slice(0, 10);

        var tbody = document.getElementById("top-absent-tbody");
        if (sortedStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØºÙŠØ§Ø¨Ø§Øª Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø±</td></tr>';
        } else {
            var html = "";
            sortedStudents.forEach(function(entry, i) {
                var parts = entry[0].split("||");
                var name = parts[0];
                var cls = parts[1];
                var count = entry[1];
                var status = count >= 10 ? '<span style="background:#dc2626;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;">Ø®Ø·Ø±</span>' :
                             count >= 5  ? '<span style="background:#f59e0b;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;">ØªØ­Ø°ÙŠØ±</span>' :
                             '<span style="background:#059669;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;">Ø¹Ø§Ø¯ÙŠ</span>';
                html += '<tr><td>' + (i+1) + '</td><td style="font-weight:900;">' + name + '</td><td>' + cls + '</td><td style="font-weight:900;color:var(--red);">' + count + '</td><td>' + status + '</td></tr>';
            });
            tbody.innerHTML = html;
        }

        // ---- Ø§Ù„ØºÙŠØ§Ø¨ Ø­Ø³Ø¨ Ø§Ù„ÙŠÙˆÙ… ----
        var byDay = {};
        absenceSnap.forEach(function(d) {
            var date = d.data().date || "";
            if (date) byDay[date] = (byDay[date] || 0) + 1;
        });

        var days = Object.keys(byDay).sort();
        var maxDay = Math.max.apply(null, Object.values(byDay)) || 1;
        var chartDay = document.getElementById("chart-by-day");
        chartDay.innerHTML = "";

        days.forEach(function(day) {
            var val = byDay[day];
            var h = Math.round((val / maxDay) * 160);
            var shortDate = day.slice(5);
            var bar = document.createElement("div");
            bar.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;min-width:40px;";
            bar.innerHTML = '<div style="font-size:10px;font-weight:900;color:var(--navy);">' + val + '</div>' +
                '<div style="width:30px;height:' + h + 'px;background:var(--gold);border-radius:4px 4px 0 0;"></div>' +
                '<div style="font-size:9px;font-weight:700;color:var(--mid);">' + shortDate + '</div>';
            chartDay.appendChild(bar);
        });

        if (days.length === 0) {
            chartDay.innerHTML = '<p style="color:#999;margin:auto;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</p>';
        }

    } catch(e) {
        console.error("Analytics error:", e);
    }
};