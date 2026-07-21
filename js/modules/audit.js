import { db, getActiveSchoolId } from '../firebase-config.js';
import {
    collection, addDoc, getDocs, query, where, orderBy, limit,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ===== تسجيل عملية بسجل المراجعات =====
export async function logAudit(action, details = {}) {
    try {
        const user = JSON.parse(localStorage.getItem('hs_user') || '{}');
        const schoolId = getActiveSchoolId();
        if (!schoolId) return;
        await addDoc(collection(db, 'audit_log'), {
            schoolId,
            userId: user.userId || 'unknown',
            userName: user.name || 'مجهول',
            userRole: user.role || 'unknown',
            action,
            details,
            timestamp: serverTimestamp(),
            dateStr: new Date().toLocaleDateString('ar-KW'),
            timeStr: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })
        });
    } catch (e) {
        console.warn('Audit log failed:', e.message);
    }
}

// ===== واجهة سجل المراجعات =====
export async function initAuditModule() {
    const container = document.getElementById('tab-audit');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--navy);padding:0;overflow:hidden;">
        <div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);">
            <h2 style="margin:0;font-size:17px;"><i class="bi bi-journal-text" style="color:var(--gold);"></i> سجل العمليات</h2>
            <button onclick="window.exportAuditExcel()" style="background:#16a34a;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-file-earmark-excel-fill"></i> تصدير Excel</button>
        </div>
        <div style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid var(--line);display:flex;gap:10px;flex-wrap:wrap;">
            <select id="audit-filter-action" onchange="window.filterAuditLog()" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;background:#fff;">
                <option value="">كل العمليات</option>
                <option value="ADD_STUDENT">إضافة طالب</option>
                <option value="EDIT_STUDENT">تعديل طالب</option>
                <option value="DELETE_STUDENT">حذف طالب</option>
                <option value="ATTENDANCE">تسجيل غياب</option>
                <option value="BEHAVIOR">سلوك</option>
                <option value="GATEPASS">استئذان</option>
                <option value="LOGIN">دخول</option>
                <option value="DELETE_ALL">حذف جماعي</option>
            </select>
            <select id="audit-filter-user" onchange="window.filterAuditLog()" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;background:#fff;">
                <option value="">كل المستخدمين</option>
            </select>
            <span id="audit-count" style="background:var(--ice);color:var(--sky);padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;white-space:nowrap;">0 سجل</span>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
                <thead>
                    <tr style="background:var(--navy);color:#fff;text-align:right;">
                        <th style="padding:11px 14px;">التاريخ والوقت</th>
                        <th style="padding:11px 14px;">المستخدم</th>
                        <th style="padding:11px 14px;">الصلاحية</th>
                        <th style="padding:11px 14px;">العملية</th>
                        <th style="padding:11px 14px;">التفاصيل</th>
                    </tr>
                </thead>
                <tbody id="audit-tbody">
                    <tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">⏳ جاري التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </div>`;

    await loadAuditLog();
}

let allAuditLogs = [];

const ACTION_LABELS = {
    ADD_STUDENT: { label: 'إضافة طالب', color: '#16a34a', icon: 'bi-person-plus' },
    EDIT_STUDENT: { label: 'تعديل طالب', color: '#1a78c2', icon: 'bi-pencil' },
    DELETE_STUDENT: { label: 'حذف طالب', color: '#dc2626', icon: 'bi-trash3' },
    DELETE_ALL: { label: 'حذف جماعي', color: '#7f1d1d', icon: 'bi-trash3-fill' },
    ATTENDANCE: { label: 'تسجيل غياب', color: '#d97706', icon: 'bi-clipboard-check' },
    BEHAVIOR: { label: 'سلوك', color: '#7c3aed', icon: 'bi-shield-exclamation' },
    GATEPASS: { label: 'استئذان', color: '#0891b2', icon: 'bi-door-open' },
    LOGIN: { label: 'دخول النظام', color: '#059669', icon: 'bi-box-arrow-in-right' },
    TRANSFER: { label: 'نقل طلاب', color: '#d97706', icon: 'bi-arrow-left-right' },
};

const ROLE_LABELS = {
    admin: 'مدير', assistant_manager: 'مساعد مدير',
    wing_supervisor: 'مشرف جناح', social_worker: 'أخصائي',
    teacher: 'معلم', department_head: 'رئيس قسم'
};

async function loadAuditLog() {
    const schoolId = getActiveSchoolId();
    try {
        const snap = await getDocs(query(
            collection(db, 'audit_log'),
            where('schoolId', '==', schoolId),
            orderBy('timestamp', 'desc'),
            limit(500)
        ));
        allAuditLogs = [];
        let usersSet = new Set();
        snap.forEach(d => {
            const data = d.data();
            allAuditLogs.push({ id: d.id, ...data });
            if (data.userName) usersSet.add(data.userName);
        });

        // تعبئة فلتر المستخدمين
        const userSelect = document.getElementById('audit-filter-user');
        userSelect.innerHTML = '<option value="">كل المستخدمين</option>' +
            [...usersSet].map(u => `<option value="${u}">${u}</option>`).join('');

        renderAuditTable(allAuditLogs);
    } catch (e) {
        document.getElementById('audit-tbody').innerHTML =
            `<tr><td colspan="5" style="text-align:center;padding:30px;color:#dc2626;">❌ ${e.message}</td></tr>`;
    }
}

function renderAuditTable(logs) {
    document.getElementById('audit-count').textContent = `${logs.length} سجل`;
    const tbody = document.getElementById('audit-tbody');
    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">لا توجد سجلات</td></tr>';
        return;
    }
    tbody.innerHTML = logs.map(log => {
        const meta = ACTION_LABELS[log.action] || { label: log.action, color: '#666', icon: 'bi-circle' };
        const detailsText = Object.entries(log.details || {}).map(([k, v]) => `${k}: ${v}`).join(' | ');
        return `<tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:9px 14px;font-size:12px;color:var(--mid);">${log.dateStr || '-'}<br><span style="font-size:11px;">${log.timeStr || ''}</span></td>
            <td style="padding:9px 14px;font-weight:700;">${log.userName || '-'}</td>
            <td style="padding:9px 14px;"><span style="background:#f1f5f9;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;">${ROLE_LABELS[log.userRole] || log.userRole || '-'}</span></td>
            <td style="padding:9px 14px;"><span style="background:${meta.color}18;color:${meta.color};padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;"><i class="bi ${meta.icon}"></i> ${meta.label}</span></td>
            <td style="padding:9px 14px;font-size:12px;color:#555;">${detailsText || '-'}</td>
        </tr>`;
    }).join('');
}

window.filterAuditLog = function() {
    const action = document.getElementById('audit-filter-action').value;
    const user = document.getElementById('audit-filter-user').value;
    const filtered = allAuditLogs.filter(l =>
        (!action || l.action === action) && (!user || l.userName === user)
    );
    renderAuditTable(filtered);
};

window.exportAuditExcel = function() {
    const data = allAuditLogs.map(l => ({
        'التاريخ': l.dateStr || '',
        'الوقت': l.timeStr || '',
        'المستخدم': l.userName || '',
        'الصلاحية': ROLE_LABELS[l.userRole] || l.userRole || '',
        'العملية': ACTION_LABELS[l.action]?.label || l.action || '',
        'التفاصيل': Object.entries(l.details || {}).map(([k,v]) => `${k}: ${v}`).join(' | ')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل العمليات');
    XLSX.writeFile(wb, `audit_log_${new Date().toISOString().slice(0,10)}.xlsx`);
    window.showToast('✅ تم تصدير سجل العمليات');
};
