import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initArchiveModule() {
    const container = document.getElementById('tab-archive');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--navy);">
        <h2><i class="bi bi-archive-fill" style="color:var(--navy);"></i> أرشيف السنوات الدراسية السابقة</h2>
        <p style="font-size:13px; color:#666; margin-bottom:15px;">
            اختر سنة دراسية لعرض ملخص إحصائي كامل عنها (يظهر فقط بعد تنفيذ الترحيل السنوي مرة واحدة على الأقل).
        </p>
        <div id="archive-years-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
            <p style="color:#999;">⏳ جاري البحث عن سنوات مؤرشفة...</p>
        </div>
    </div>
    <div id="archive-results-area"></div>

    <div class="card" style="border-top: 4px solid var(--gold);">
        <h2><i class="bi bi-mortarboard-fill" style="color:var(--gold);"></i> أرشيف الخريجين</h2>
        <div id="graduates-list">
            <p style="text-align:center; color:#999; padding:15px;">⏳ جاري التحميل...</p>
        </div>
    </div>`;

    loadArchiveYears();
    loadGraduatesList();
}

async function loadArchiveYears() {
    const listEl = document.getElementById('archive-years-list');
    const schoolId = getActiveSchoolId();

    try {
        const snap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId)));
        const years = new Set();
        snap.forEach(d => { if (d.data().academicYear) years.add(d.data().academicYear); });

        if (!years.size) {
            listEl.innerHTML = '<p style="color:#999; padding:10px;">💡 لا توجد سنوات مؤرشفة بعد — تظهر تلقائياً بعد أول عملية ترحيل سنوي.</p>';
            return;
        }

        const sortedYears = Array.from(years).sort().reverse();
        listEl.innerHTML = sortedYears.map(y => `
            <button onclick="window.loadYearArchive('${y}')"
                style="background:var(--ice); color:var(--navy); border:1.5px solid var(--sky); padding:10px 18px; border-radius:8px; font-weight:900; cursor:pointer; font-family:'Cairo',sans-serif;">
                <i class="bi bi-calendar3"></i> ${y}
            </button>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<p style="color:red;">❌ خطأ: ${e.message}</p>`;
    }
}

window.loadYearArchive = async function(yearLabel) {
    const resultsEl = document.getElementById('archive-results-area');
    resultsEl.innerHTML = `<div class="card"><p style="text-align:center; padding:20px; color:#666; font-weight:700;">⏳ جاري تحميل إحصائيات ${yearLabel}...</p></div>`;

    const schoolId = getActiveSchoolId();

    try {
        const [attSnap, behSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('academicYear', '==', yearLabel)))
        ]);

        const absentCount = attSnap.docs.filter(d => d.data().status === 'absent').length;
        const lateCount = attSnap.docs.filter(d => d.data().status === 'late').length;

        const html = `
        <div class="card">
            <h3 style="font-size:15px; margin-bottom:14px;"><i class="bi bi-graph-up"></i> ملخص السنة الدراسية ${yearLabel}</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:16px;">
                <div style="text-align:center; background:#fef2f2; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--danger-color);">${absentCount}</div>
                    <div style="font-size:11px; color:#666;">حالة غياب</div>
                </div>
                <div style="text-align:center; background:#fffbeb; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--gold);">${lateCount}</div>
                    <div style="font-size:11px; color:#666;">حالة تأخير</div>
                </div>
                <div style="text-align:center; background:#f0fdf4; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--success-color);">${behSnap.size}</div>
                    <div style="font-size:11px; color:#666;">سجل سلوكي</div>
                </div>
                <div style="text-align:center; background:#eaf4fd; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--sky);">${gateSnap.size}</div>
                    <div style="font-size:11px; color:#666;">استئذان</div>
                </div>
                <div style="text-align:center; background:#f8fafc; padding:14px; border-radius:8px;">
                    <div style="font-size:24px; font-weight:900; color:var(--navy);">${clinicSnap.size}</div>
                    <div style="font-size:11px; color:#666;">زيارة عيادة</div>
                </div>
            </div>
            <button onclick="window.exportArchivePDF('${yearLabel}', ${absentCount}, ${lateCount}, ${behSnap.size}, ${gateSnap.size}, ${clinicSnap.size})"
                style="background:var(--danger-color); color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-file-earmark-pdf-fill"></i> تصدير تقرير الأرشيف PDF
            </button>
        </div>`;

        resultsEl.innerHTML = html;
    } catch (e) {
        resultsEl.innerHTML = `<div class="card" style="color:red;">❌ خطأ: ${e.message}</div>`;
    }
};

window.exportArchivePDF = async function(yearLabel, absent, late, behavior, gatepass, clinic) {
    const contentHTML = `
    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; text-align:center; margin-bottom:16px;">
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #dc2626;">
            <div style="font-size:22px; font-weight:900; color:#dc2626;">${absent}</div><div style="font-size:10px;">غياب</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #d97706;">
            <div style="font-size:22px; font-weight:900; color:#d97706;">${late}</div><div style="font-size:10px;">تأخير</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #059669;">
            <div style="font-size:22px; font-weight:900; color:#059669;">${behavior}</div><div style="font-size:10px;">سلوك</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #1a78c2;">
            <div style="font-size:22px; font-weight:900; color:#1a78c2;">${gatepass}</div><div style="font-size:10px;">استئذان</div>
        </div>
        <div style="border:1px solid #eee; border-radius:8px; padding:10px; border-right:4px solid #0b2545;">
            <div style="font-size:22px; font-weight:900; color:#0b2545;">${clinic}</div><div style="font-size:10px;">عيادة</div>
        </div>
    </div>`;
    await window.ManzoumaReport.exportPDF(contentHTML, `أرشيف_${yearLabel}`, `تقرير الأرشيف — السنة الدراسية ${yearLabel}`);
};

// ===== أرشيف الخريجين =====
async function loadGraduatesList() {
    const listEl = document.getElementById('graduates-list');
    const schoolId = getActiveSchoolId();

    try {
        const snap = await getDocs(query(collection(db, 'graduates'), where('schoolId', '==', schoolId)));
        if (snap.empty) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; padding:15px;">لا يوجد خريجون مؤرشفون بعد</p>';
            return;
        }

        const docs = snap.docs.sort((a, b) => (b.data().graduatedAt?.seconds || 0) - (a.data().graduatedAt?.seconds || 0));
        let html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
        html += '<thead><tr style="background:#f8fafc;"><th style="padding:8px;">الاسم</th><th style="padding:8px;">آخر فصل</th><th style="padding:8px;">سنة التخرج</th></tr></thead><tbody>';
        docs.forEach(d => {
            const g = d.data();
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; font-weight:700;">${g.name || '-'}</td>
                <td style="padding:8px;">${g.classId || '-'}</td>
                <td style="padding:8px; color:var(--gold); font-weight:700;">${g.academicYearGraduated || '-'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<p style="color:red; text-align:center; padding:15px;">❌ خطأ: ${e.message}</p>`;
    }
}
