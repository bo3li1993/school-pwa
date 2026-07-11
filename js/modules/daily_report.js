import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDailyReportModule() {
    const container = document.getElementById('tab-daily-report');
    if (!container) return;

    container.innerHTML = `
    <div class="card">
        <h2><i class="bi bi-calendar-week-fill"></i> كشف يومي شامل</h2>
        <p style="font-size:13px; color:#666; margin-bottom:12px;">اختر التاريخ لعرض كشف الغياب، الاستئذانات، وزيارات العيادة.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
            <div style="flex:1; min-width:180px;">
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:4px;">التاريخ</label>
                <input type="date" id="dr-date-input" style="width:100%; padding:10px; border:1px solid var(--line); border-radius:8px; font-size:14px;">
            </div>
            <button onclick="window.setDrToday()" style="background:var(--off); color:var(--navy); border:1px solid var(--line); padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo';">
                📅 اليوم
            </button>
            <button onclick="window.loadDailyReport()" style="background:var(--navy); color:#fff; border:none; padding:11px 20px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo';">
                <i class="bi bi-search"></i> عرض
            </button>
        </div>
    </div>

    <div id="dr-results" style="margin-top:4px;"></div>`;

    // ضع تاريخ اليوم افتراضياً
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('dr-date-input').value = today;
}

window.setDrToday = function() {
    document.getElementById('dr-date-input').value = new Date().toISOString().slice(0,10);
};

window.loadDailyReport = async function() {
    const dateVal = document.getElementById('dr-date-input').value;
    if (!dateVal) { alert('⚠️ اختر التاريخ أولاً'); return; }

    // صيغة ISO مطابقة لما تحفظه attendance.js و teacher.html
    const isoDate = dateVal; // format: 2026-07-11

    const results = document.getElementById('dr-results');
    results.innerHTML = `<p style="text-align:center; padding:20px; color:#999; font-weight:bold;">⏳ جاري جمع التقارير...</p>`;

    const schoolId = getActiveSchoolId();
    let html = '';

    // ===== أ) كشف الغياب مجمّع بالفصل =====
    try {
        const q = query(collection(db,'attendance'), where('schoolId','==',schoolId), where('date','==',isoDate));
        const snap = await getDocs(q);
        const byClass = {};
        snap.forEach(docSnap => {
            const dd = docSnap.data();
            if (dd.status !== 'absent' && dd.status !== 'late') return;
            const cls = dd.classId || '—';
            if (!byClass[cls]) byClass[cls] = [];
            byClass[cls].push(dd);
        });

        const classes = Object.keys(byClass).sort();
        const totalAbsent = snap.docs.filter(d => d.data().status === 'absent').length;
        const totalLate = snap.docs.filter(d => d.data().status === 'late').length;

        html += `<div class="card" style="border-right:5px solid var(--danger-color);">
            <h3 style="font-size:15px; color:var(--danger-color); margin-bottom:8px;"><i class="bi bi-calendar-x-fill"></i> الغياب والتأخير — ${isoDate} &nbsp; <span style="font-size:12px; font-weight:600; color:#666;">(${totalAbsent} غياب · ${totalLate} تأخير)</span></h3>`;

        if (!classes.length) {
            html += `<p style="text-align:center; color:var(--success-color); font-weight:bold; padding:15px;">✅ لا يوجد غياب أو تأخير مسجّل لهذا اليوم.</p>`;
        } else {
            classes.forEach(cls => {
                const rows = byClass[cls];
                html += `<div style="margin-bottom:12px;">
                    <h4 style="font-size:13px; font-weight:900; color:var(--navy); background:#f8fafc; padding:6px 10px; border-radius:6px; margin-bottom:6px;">فصل ${cls} — ${rows.length} حالة</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
                        <thead><tr style="background:#f4f6f9;"><th style="padding:6px;">الطالب</th><th style="padding:6px;">الحصة</th><th style="padding:6px;">الحالة</th><th style="padding:6px;">المعلم</th></tr></thead>
                        <tbody>${rows.map(r => `<tr style="border-bottom:1px solid #eee;">
                            <td style="padding:6px; font-weight:bold;">${r.studentName || r.name || '-'}</td>
                            <td style="padding:6px; text-align:center;">${r.period || '-'}</td>
                            <td style="padding:6px; text-align:center;"><span style="padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700; color:#fff; background:${r.status==='absent'?'var(--danger-color)':'var(--accent-color)'};">${r.status==='absent'?'غائب':'متأخر'}</span></td>
                            <td style="padding:6px; color:#666;">${r.teacherName || r.recordedBy || '-'}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>`;
            });
        }
        html += `</div>`;
    } catch(e) { html += `<div class="card" style="color:red;">خطأ بالغياب: ${e.message}</div>`; }

    // ===== ب) الاستئذانات =====
    try {
        const q = query(collection(db,'gatepass'), where('schoolId','==',schoolId), where('date','==',isoDate));
        const snap = await getDocs(q);
        let rows = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            rows += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px; font-weight:bold;">${d.studentName || '-'}</td>
                <td style="padding:6px; text-align:center;">${d.classId || '-'}</td>
                <td style="padding:6px;">${d.reason || '-'}</td>
                <td style="padding:6px;">${d.relative || '-'}</td>
            </tr>`;
        });

        html += `<div class="card" style="border-right:5px solid var(--success-color);">
            <h3 style="font-size:15px; color:var(--success-color); margin-bottom:8px;"><i class="bi bi-ticket-detailed-fill"></i> الاستئذانات — ${isoDate} &nbsp;<span style="font-size:12px; color:#666;">(${snap.size})</span></h3>
            ${snap.size ? `<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><thead><tr style="background:#f4f6f9;"><th style="padding:6px;">الطالب</th><th style="padding:6px;">الفصل</th><th style="padding:6px;">السبب</th><th style="padding:6px;">المستلم</th></tr></thead><tbody>${rows}</tbody></table>` : `<p style="text-align:center; color:#999; padding:15px;">💡 لا توجد استئذانات لهذا اليوم.</p>`}
        </div>`;
    } catch(e) { html += `<div class="card" style="color:red;">خطأ بالاستئذان: ${e.message}</div>`; }

    // ===== ج) زيارات العيادة =====
    try {
        const q = query(collection(db,'clinic'), where('schoolId','==',schoolId), where('date','==',isoDate));
        const snap = await getDocs(q);
        let rows = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            rows += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px; font-weight:bold;">${d.studentName || '-'}</td>
                <td style="padding:6px; text-align:center;">${d.classId || '-'}</td>
                <td style="padding:6px; color:var(--danger-color); font-weight:bold;">${d.complaint || '-'}</td>
                <td style="padding:6px;">${d.treatment || '-'}</td>
            </tr>`;
        });

        html += `<div class="card" style="border-right:5px solid var(--gold);">
            <h3 style="font-size:15px; color:var(--gold); margin-bottom:8px;"><i class="bi bi-heart-pulse-fill"></i> زيارات العيادة — ${isoDate} &nbsp;<span style="font-size:12px; color:#666;">(${snap.size})</span></h3>
            ${snap.size ? `<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><thead><tr style="background:#f4f6f9;"><th style="padding:6px;">الطالب</th><th style="padding:6px;">الفصل</th><th style="padding:6px;">الشكوى</th><th style="padding:6px;">العلاج</th></tr></thead><tbody>${rows}</tbody></table>` : `<p style="text-align:center; color:#999; padding:15px;">💡 لا توجد زيارات عيادة لهذا اليوم.</p>`}
        </div>`;
    } catch(e) { html += `<div class="card" style="color:red;">خطأ بالعيادة: ${e.message}</div>`; }

    results.innerHTML = html;
};
