import { db, getActiveSchoolId } from "../firebase-config.js";
import { collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function initAuditModule() {
    var container = document.getElementById("tab-audit");
    if (!container) return;

    container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <h2 style="font-size:18px;font-weight:900;color:var(--navy);">
                <i class="bi bi-shield-lock-fill" style="color:var(--gold);"></i> سجل التدقيق والعمليات
            </h2>
            <div style="display:flex;gap:8px;">
                <select id="audit-filter" onchange="window.loadAuditLog()" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;">
                    <option value="50">آخر 50 عملية</option>
                    <option value="100">آخر 100 عملية</option>
                    <option value="200">آخر 200 عملية</option>
                </select>
                <button onclick="window.loadAuditLog()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:6px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;">
                    <i class="bi bi-arrow-clockwise"></i> تحديث
                </button>
            </div>
        </div>

        <!-- إحصائيات سريعة -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
            <div class="stat-box" style="border-top:3px solid var(--sky);">
                <div class="num" id="audit-total" style="color:var(--sky);">--</div>
                <div class="lbl">إجمالي العمليات</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--red);">
                <div class="num" id="audit-logins" style="color:var(--red);">--</div>
                <div class="lbl">تسجيلات الدخول</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--gold);">
                <div class="num" id="audit-changes" style="color:var(--gold);">--</div>
                <div class="lbl">تعديلات البيانات</div>
            </div>
            <div class="stat-box" style="border-top:3px solid var(--green);">
                <div class="num" id="audit-exports" style="color:var(--green);">--</div>
                <div class="lbl">تصدير التقارير</div>
            </div>
        </div>

        <!-- جدول السجل -->
        <div class="card" style="border-top:4px solid var(--navy);">
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>الوقت</th>
                            <th>المستخدم</th>
                            <th>العملية</th>
                            <th>التفاصيل</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody id="audit-tbody">
                        <tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">جاري التحميل...</td></tr>
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">لا توجد سجلات بعد</td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;padding:20px;">خطا: ' + e.message + '</td></tr>';
    }
};

function getActionLabel(action) {
    var labels = {
        "login": "تسجيل دخول",
        "logout": "تسجيل خروج",
        "add_student": "اضافة طالب",
        "delete_student": "حذف طالب",
        "edit_student": "تعديل طالب",
        "add_user": "اضافة مستخدم",
        "delete_user": "حذف مستخدم",
        "export_pdf": "تصدير PDF",
        "export_excel": "تصدير Excel",
        "archive_year": "ارشفة سنوية",
        "reset_password": "تغيير كلمة المرور",
        "add_attendance": "تسجيل غياب",
        "add_behavior": "تسجيل سلوك",
        "add_warning": "اصدار انذار"
    };
    return labels[action] || action;
}

// دالة لتسجيل العمليات
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