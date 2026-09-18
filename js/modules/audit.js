import { db, getActiveSchoolId } from "../firebase-config.js";
import { collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initAuditModule() {
    var container = document.getElementById("tab-audit");
    if (!container) return;

    container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <h2 style="font-size:18px;font-weight:900;color:var(--navy);">
                <i class="bi bi-shield-lock-fill" style="color:var(--gold);"></i> Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ ÙˆØ§Ù„Ø¹Ù…Ù„ÙŠØ§Øª
            </h2>
            <div style="display:flex;gap:8px;">
                <select id="audit-filter" onchange="window.loadAuditLog()" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;">
                    <option value="50">Ø¢Ø®Ø± 50 Ø¹Ù…Ù„ÙŠØ©</option>
                    <option value="100">Ø¢Ø®Ø± 100 Ø¹Ù…Ù„ÙŠØ©</option>
                    <option value="200">Ø¢Ø®Ø± 200 Ø¹Ù…Ù„ÙŠØ©</option>
                </select>
                <button onclick="window.loadAuditLog()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                    <i class="bi bi-arrow-clockwise"></i> ØªØ­Ø¯ÙŠØ«
                </button>
            </div>
        </div>

        <!-- Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø³Ø±ÙŠØ¹Ø© -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
            <div class="stat-box" style="border-top:3px solid var(--sky);">
                <div class="num" id="audit-total" style="color:var(--sky);">--</div>
                <div class="lbl">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--red);">
                <div class="num" id="audit-logins" style="color:var(--red);">--</div>
                <div class="lbl">ØªØ³Ø¬ÙŠÙ„Ø§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--gold);">
                <div class="num" id="audit-changes" style="color:var(--gold);">--</div>
                <div class="lbl">ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--green);">
                <div class="num" id="audit-exports" style="color:var(--green);">--</div>
                <div class="lbl">ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±</div>
            </div>
        </div>

        <!-- Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø³Ø¬Ù„ -->
        <div class="card" style="border-top:4px solid var(--navy);">
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Ø§Ù„ÙˆÙ‚Øª</th>
                            <th>Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</th>
                            <th>Ø§Ù„Ø¹Ù…Ù„ÙŠØ©</th>
                            <th>Ø§Ù„ØªÙØ§ØµÙŠÙ„</th>
                            <th>Ø§Ù„Ø­Ø§Ù„Ø©</th>
                        </tr>
                    </thead>
                    <tbody id="audit-tbody">
                        <tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;

    window.loadAuditLog();
}

window.loadAuditLog = async function() {
    var tbody = document.getElementById("audit-tbody");
    var schoolId = getActiveSchoolId();
    var limitNum = parseInt(document.getElementById("audit-filter").value) || 50;

    try {
        var snap = await getDocs(query(
            collection(db, "audit_log"),
            where("schoolId", "==", schoolId),
            orderBy("createdAt", "desc"),
            limit(limitNum)
        ));

        document.getElementById("audit-total").textContent = snap.size;

        var logins = 0;
        var changes = 0;
        var exports = 0;

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ø¨Ø¹Ø¯</td></tr>';
            return;
        }

        var html = "";
        snap.forEach(function(d) {
            var log = d.data();
            var action = log.action || "";
            var time = log.createdAt && log.createdAt.toDate ? log.createdAt.toDate().toLocaleString("ar-KW") : "--";
            var user = log.performedBy || log.userId || "--";
            var details = log.details || log.message || "";

            if (action.includes("login")) logins++;
            else if (action.includes("export") || action.includes("pdf") || action.includes("excel")) exports++;
            else changes++;

            var actionLabel = getActionLabel(action);
            var statusColor = action.includes("delete") ? "#dc2626" : action.includes("add") || action.includes("create") ? "#059669" : "#1a78c2";

            html += '<tr>';
            html += '<td style="font-size:11px;color:var(--mid);">' + time + '</td>';
            html += '<td style="font-weight:900;">' + user + '</td>';
            html += '<td><span style="background:' + statusColor + ';color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;">' + actionLabel + '</span></td>';
            html += '<td style="font-size:12px;">' + details + '</td>';
            html += '<td><i class="bi bi-check-circle-fill" style="color:#059669;"></i></td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;
        document.getElementById("audit-logins").textContent = logins;
        document.getElementById("audit-changes").textContent = changes;
        document.getElementById("audit-exports").textContent = exports;

    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;padding:20px;">Ø®Ø·Ø§: ' + e.message + '</td></tr>';
    }
};

function getActionLabel(action) {
    var labels = {
        "login": "ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„",
        "logout": "ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬",
        "add_student": "Ø§Ø¶Ø§ÙØ© Ø·Ø§Ù„Ø¨",
        "delete_student": "Ø­Ø°Ù Ø·Ø§Ù„Ø¨",
        "edit_student": "ØªØ¹Ø¯ÙŠÙ„ Ø·Ø§Ù„Ø¨",
        "add_user": "Ø§Ø¶Ø§ÙØ© Ù…Ø³ØªØ®Ø¯Ù…",
        "delete_user": "Ø­Ø°Ù Ù…Ø³ØªØ®Ø¯Ù…",
        "export_pdf": "ØªØµØ¯ÙŠØ± PDF",
        "export_excel": "ØªØµØ¯ÙŠØ± Excel",
        "archive_year": "Ø§Ø±Ø´ÙØ© Ø³Ù†ÙˆÙŠØ©",
        "reset_password": "ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±",
        "add_attendance": "ØªØ³Ø¬ÙŠÙ„ ØºÙŠØ§Ø¨",
        "add_behavior": "ØªØ³Ø¬ÙŠÙ„ Ø³Ù„ÙˆÙƒ",
        "add_warning": "Ø§ØµØ¯Ø§Ø± Ø§Ù†Ø°Ø§Ø±"
    };
    return labels[action] || action;
}

// Ø¯Ø§Ù„Ø© Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª
export async function logAuditAction(action, details, userId, userName) {
    try {
        var schoolId = getActiveSchoolId();
        await addDoc(collection(db, "audit_log"), {
            schoolId: schoolId,
            action: action,
            details: details || "",
            userId: userId || "",
            performedBy: userName || "",
            createdAt: serverTimestamp()
        });
    } catch(e) {
        console.warn("Audit log error:", e.message);
    }
}