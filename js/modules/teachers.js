import { db, getActiveSchoolId } from "../firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const ROLE_LABELS = {
    admin: "مدير", assistant_manager: "مدير مساعد", wing_supervisor: "مشرف جناح",
    department_head: "رئيس قسم", social_worker: "أخصائي اجتماعي",
    nurse: "ممرض/ة", guard: "حارس أمن", teacher: "معلم"
};

var allTeachersCache = [];

export async function initTeachersModule() {
    var container = document.getElementById("tab-teachers");
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--navy);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <h2 style="margin:0;"><i class="bi bi-address-card-fill" style="color:var(--navy);"></i> دليل الهيئة التعليمية والإدارية</h2>
            <span id="teachers-count-badge" style="background:var(--ice); color:var(--sky); padding:5px 14px; border-radius:8px; font-weight:900; font-size:13px;">⏳</span>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
            <input type="text" id="teachers-search" placeholder="🔍 بحث بالاسم أو ID..." oninput="window.filterTeachers()"
                style="padding:9px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:Cairo,sans-serif; font-size:13px; flex:1; min-width:160px; outline:none;">
            <select id="teachers-role-filter" onchange="window.filterTeachers()"
                style="padding:9px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:Cairo,sans-serif; font-size:13px; background:#fff; outline:none;">
                <option value="">كل الأدوار</option>
                <option value="admin">مدير</option>
                <option value="assistant_manager">مدير مساعد</option>
                <option value="wing_supervisor">مشرف جناح</option>
                <option value="department_head">رئيس قسم</option>
                <option value="social_worker">أخصائي اجتماعي</option>
                <option value="nurse">ممرض/ة</option>
                <option value="guard">حارس أمن</option>
                <option value="teacher">معلم</option>
            </select>
            <select id="teachers-dept-filter" onchange="window.filterTeachers()"
                style="padding:9px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:Cairo,sans-serif; font-size:13px; background:#fff; outline:none;">
                <option value="">كل الأقسام</option>
            </select>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:var(--navy); color:#fff;">
                        <th style="padding:10px 12px;">#</th>
                        <th style="padding:10px 12px;">الاسم</th>
                        <th style="padding:10px 12px;">المعرّف</th>
                        <th style="padding:10px 12px;">الدور</th>
                        <th style="padding:10px 12px;">القسم</th>
                        <th style="padding:10px 12px;">الحالة</th>
                    </tr>
                </thead>
                <tbody id="teachers-directory-tbody">
                    <tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">⏳ جاري التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;

    try {
        var snap = await getDocs(query(collection(db, "users"), where("schoolId", "==", schoolId)));
        allTeachersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

        var departments = [...new Set(allTeachersCache.map(u => u.department).filter(Boolean))].sort();
        var deptFilter = document.getElementById("teachers-dept-filter");
        departments.forEach(dept => {
            var opt = document.createElement("option");
            opt.value = dept; opt.textContent = dept;
            deptFilter.appendChild(opt);
        });

        renderTeachers(allTeachersCache);
    } catch(e) {
        document.getElementById("teachers-directory-tbody").innerHTML =
            `<tr><td colspan="6" style="color:red; text-align:center; padding:20px;">❌ ${e.message}</td></tr>`;
    }
}

function renderTeachers(users) {
    var tbody = document.getElementById("teachers-directory-tbody");
    var badge = document.getElementById("teachers-count-badge");
    if (!tbody) return;
    if (badge) badge.textContent = users.length + " موظف";

    if (!users.length) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#aaa;'>لا يوجد موظفون بهذه الفلاتر</td></tr>";
        return;
    }

    tbody.innerHTML = users.map((u, i) => {
        var roleName = ROLE_LABELS[u.role] || u.role || "-";
        var isActive = u.status !== "suspended";
        return `<tr style="border-bottom:1px solid #f0f0f0; ${i%2?"background:#fafbfc;":""}">
            <td style="padding:10px 12px; color:#aaa;">${i+1}</td>
            <td style="padding:10px 12px; font-weight:700;">👤 ${u.name || "-"}</td>
            <td style="padding:10px 12px; font-size:12px; font-family:monospace; color:var(--mid);">${u.userId || "-"}</td>
            <td style="padding:10px 12px;"><span style="background:var(--ice); color:var(--sky); padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">${roleName}</span></td>
            <td style="padding:10px 12px; font-size:12px; color:#666;">${u.department || "-"}</td>
            <td style="padding:10px 12px;"><span style="background:${isActive?"#f0fdf4":"#fef2f2"}; color:${isActive?"#16a34a":"#dc2626"}; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">${isActive?"✅ نشط":"⏸ موقوف"}</span></td>
        </tr>`;
    }).join("");
}

window.filterTeachers = function() {
    var search = document.getElementById("teachers-search").value.toLowerCase().trim();
    var roleFilter = document.getElementById("teachers-role-filter").value;
    var deptFilter = document.getElementById("teachers-dept-filter").value;
    var filtered = allTeachersCache.filter(u =>
        (!search || (u.name||"").toLowerCase().includes(search) || (u.userId||"").toLowerCase().includes(search)) &&
        (!roleFilter || u.role === roleFilter) &&
        (!deptFilter || u.department === deptFilter)
    );
    renderTeachers(filtered);
};
