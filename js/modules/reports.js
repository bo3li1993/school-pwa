import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    const container = document.getElementById('tab-reports');
    if (!container) return;

    container.innerHTML = `
    <div class="card">
        <h2><i class="bi bi-file-earmark-pdf-fill"></i> التقرير الأسبوعي لحالات الغياب المتكرر</h2>
        <p style="font-size:13px;color:#666;">يولّد ملف PDF رسمي يحصر كل طالب تغيّب 3 أيام أو أكثر خلال آخر 7 أيام.</p>
        <button id="btn-trigger-weekly-pdf" onclick="window.generateWeeklyPDFReportLive()" style="background:#dc2626;width:48%;margin-top:10px;font-weight:bold;padding:12px;border-radius:8px;border:none;color:#fff;cursor:pointer;font-family:'Cairo',sans-serif;">
            <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
        </button>
        <button onclick="window.generateWeeklyPDFReportLive('print')" style="background:#0b2545;width:48%;margin-top:10px;font-weight:bold;padding:12px;border-radius:8px;border:none;color:#fff;cursor:pointer;font-family:'Cairo',sans-serif;margin-right:4%;">
            <i class="bi bi-printer-fill"></i> طباعة مباشرة
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
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const dateField = d.date || d.dateStr || '';
            if (!dateField) return;
            // دعم كلا الصيغتين ISO و كويتي
            let recordDate;
            if (dateField.includes('-')) {
                recordDate = new Date(dateField);
            } else {
                const p = dateField.split('/');
                recordDate = new Date(p[0], p[1]-1, p[2]);
            }
            if (recordDate < sevenDaysAgo) return;
            const key = `${d.studentName || d.name}|||${d.classId || '-'}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const repeatedAbsentees = Object.entries(counts)
            .filter(([, count]) => count >= 3)
            .map(([key, count]) => { const [name, classId] = key.split('|||'); return { name, classId, count }; })
            .sort((a, b) => b.count - a.count);

        if (!repeatedAbsentees.length) {
            showToast('✅ لا توجد حالات غياب متكرر (3+ أيام) خلال آخر أسبوع', 'info');
            return;
        }

        // تجميع بالفصول
        const byClass = {};
        repeatedAbsentees.forEach(r => {
            if (!byClass[r.classId]) byClass[r.classId] = [];
            byClass[r.classId].push(r);
        });

        let contentHTML = `
        <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between;">
            <span style="font-weight:900; color:#dc2626; font-size:14px;">إجمالي الحالات: ${repeatedAbsentees.length} طالب</span>
            <span style="color:#666; font-size:12px;">آخر 7 أيام — ${Object.keys(byClass).length} فصل</span>
        </div>`;

        Object.keys(byClass).sort().forEach(cls => {
            const rows = byClass[cls];
            contentHTML += `
            <div class="section-title">📚 فصل ${cls} — ${rows.length} طالب</div>
            <table>
                <thead><tr><th>م</th><th>اسم الطالب</th><th>أيام الغياب</th><th>مستوى الخطورة</th></tr></thead>
                <tbody>${rows.map((r,i) => `<tr>
                    <td style="text-align:center;color:#666;">${i+1}</td>
                    <td style="font-weight:700;">${r.name}</td>
                    <td style="text-align:center;"><span class="badge-absent">${r.count} أيام</span></td>
                    <td style="text-align:center; font-size:11px; color:${r.count >= 5 ? '#dc2626' : r.count >= 4 ? '#d97706' : '#059669'}; font-weight:700;">${r.count >= 5 ? '🔴 مرتفعة' : r.count >= 4 ? '🟡 متوسطة' : '🟢 منخفضة'}</td>
                </tr>`).join('')}</tbody>
            </table>`;
        });

        await window.ManzoumaReport.exportPDF(
            contentHTML,
            'تقرير_الغياب_المتكرر',
            'التقرير الأسبوعي للغياب المتكرر',
            `الفترة: آخر 7 أيام — ${repeatedAbsentees.length} حالة في ${Object.keys(byClass).length} فصل`
        );

    } catch (err) {
        showToast('❌ خطأ أثناء توليد التقرير: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
