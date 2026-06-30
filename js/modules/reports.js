import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    const container = document.getElementById('tab-reports');
    if (!container) return;

    container.innerHTML = `
    <div class="card">
        <h2><i class="bi bi-file-earmark-pdf-fill"></i> التقرير الأسبوعي لحالات الغياب المتكرر</h2>
        <p style="font-size:13px;color:#666;">يولّد ملف PDF رسمي يحصر كل طالب تغيّب 3 أيام أو أكثر خلال آخر 7 أيام.</p>
        <button id="btn-trigger-weekly-pdf" onclick="window.generateWeeklyPDFReportLive()" style="background:var(--success-color);width:100%;margin-top:10px;font-weight:bold;padding:12px;border-radius:8px;border:none;color:#fff;cursor:pointer;">
            <i class="bi bi-file-earmark-pdf-fill"></i> إصدار التقرير الأسبوعي الشامل
        </button>
    </div>
    <div id="weekly-report-container"></div>`;
}

window.generateWeeklyPDFReportLive = async function() {
    const btn = document.getElementById('btn-trigger-weekly-pdf');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري تجهيز التقرير...';

    try {
        const schoolId = getActiveSchoolId();
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const q = query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('status', '==', 'absent'));
        const snap = await getDocs(q);

        const counts = {};
        snap.forEach(doc => {
            const d = doc.data();
            if (!d.dateStr && !d.date) return;
            const dateParts = (d.dateStr || d.date).split('/');
            if (dateParts.length !== 3) return;
            const recordDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            if (recordDate < sevenDaysAgo) return;

            const key = `${d.studentName || d.name}|||${d.classId || '-'}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const repeatedAbsentees = Object.entries(counts)
            .filter(([, count]) => count >= 3)
            .map(([key, count]) => { const [name, classId] = key.split('|||'); return { name, classId, count }; })
            .sort((a, b) => b.count - a.count);

        if (!repeatedAbsentees.length) {
            alert('✅ لا توجد حالات غياب متكرر (3 أيام أو أكثر) خلال آخر 7 أيام.');
            return;
        }

        const printEl = document.createElement('div');
        printEl.style.cssText = "padding:30px; font-family:'Cairo',sans-serif; direction:rtl; text-align:right; background:#fff; color:#000; width:800px; position:absolute; left:-9999px; top:-9999px;";
        printEl.innerHTML = `
            <div style="border-bottom:3px solid #1a1a2e; padding-bottom:15px; margin-bottom:20px;">
                <h2 style="font-size:16px; font-weight:900; color:#1a1a2e;">التقرير الأسبوعي لحالات الغياب المتكرر</h2>
                <p style="font-size:11px; color:#666;">آخر 7 أيام — ${repeatedAbsentees.length} حالة مرصودة</p>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead><tr style="background:#fff0f0;"><th style="padding:8px; border:1px solid #eee;">اسم الطالب</th><th style="padding:8px; border:1px solid #eee;">الفصل</th><th style="padding:8px; border:1px solid #eee;">عدد أيام الغياب</th></tr></thead>
                <tbody>${repeatedAbsentees.map(r => `<tr><td style="padding:8px; border:1px solid #eee;">${r.name}</td><td style="padding:8px; border:1px solid #eee; text-align:center;">${r.classId}</td><td style="padding:8px; border:1px solid #eee; text-align:center; color:#dc2626; font-weight:bold;">${r.count}</td></tr>`).join('')}</tbody>
            </table>`;
        document.body.appendChild(printEl);

        await new Promise(r => setTimeout(r, 200));
        const canvas = await html2canvas(printEl, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`تقرير_الغياب_المتكرر_${today.toISOString().slice(0,10)}.pdf`);
        document.body.removeChild(printEl);

    } catch (err) {
        alert('❌ خطأ أثناء توليد التقرير: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
