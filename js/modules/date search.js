import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDateSearchModule() {
    const container = document.getElementById('tab-date');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-calendar3"></i> البحث عن سجل غياب بتاريخ معيّن</h2>
        <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-top:10px;">
            <div style="flex:1; min-width:180px;">
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">اختر التاريخ</label>
                <input type="date" id="search-date-input" style="width:100%; padding:10px; border:1px solid var(--line); border-radius:8px; font-size:14px;">
            </div>
            <button onclick="window.setTodayAndSearch()" style="background:var(--off); color:var(--primary-color); border:1px solid var(--line); padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-calendar-day"></i> اليوم
            </button>
            <button onclick="window.fetchHistoricAttendanceByClassLive()" style="background:var(--primary-color); color:#fff; border:none; padding:11px 20px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-search"></i> بحث
            </button>
            <button id="btn-historic-pdf" onclick="window.exportDateSearchPDF()" style="display:none; background:var(--success-color); color:#fff; border:none; padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-file-earmark-pdf-fill"></i> PDF
            </button>
            <button id="btn-historic-reset" onclick="window.resetHistoricSearch()" style="display:none; background:#fff; color:var(--danger-color); border:1px solid var(--danger-color); padding:11px 16px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-x-circle"></i> إعادة تعيين
            </button>
        </div>
    </div>

    <div id="historic-results-display-area" style="margin-top:16px;">
        <p style="text-align:center; padding:30px; color:#999; font-weight:bold;">💡 اختر تاريخاً ثم اضغط "بحث" لعرض سجل الغياب الخاص بذلك اليوم.</p>
    </div>`;
}

window.setTodayAndSearch = function() {
    const today = new Date();
    const iso = today.toISOString().slice(0,10);
    document.getElementById('search-date-input').value = iso;
    window.fetchHistoricAttendanceByClassLive();
};

window.resetHistoricSearch = function() {
    document.getElementById('search-date-input').value = '';
    document.getElementById('btn-historic-reset').style.display = 'none';
    document.getElementById('btn-historic-pdf').style.display = 'none';
    document.getElementById('historic-results-display-area').innerHTML =
        `<p style="text-align:center; padding:30px; color:#999; font-weight:bold;">💡 اختر تاريخاً ثم اضغط "بحث" لعرض سجل الغياب الخاص بذلك اليوم.</p>`;
};

let lastSearchedDate = '';

window.fetchHistoricAttendanceByClassLive = async function() {
    const dateInput = document.getElementById('search-date-input').value;
    const displayArea = document.getElementById('historic-results-display-area');
    const resetBtn = document.getElementById('btn-historic-reset');
    const pdfBtn = document.getElementById('btn-historic-pdf');
    const schoolId = getActiveSchoolId(); // 🏢 البصمة الأمنية للمدرسة

    if (!dateInput) { alert("⚠️ يرجى تحديد التاريخ أولاً للبدء!"); return; }

    const dParts = dateInput.split('-');
    const targetDateStr = `${parseInt(dParts[0])}/${parseInt(dParts[1])}/${parseInt(dParts[2])}`;
    lastSearchedDate = targetDateStr;

    displayArea.innerHTML = `<p style="text-align:center; padding:25px; font-weight:bold; color:var(--hover-color);">⏳ جاري فحص الكشوف السحابية الخاصة بمدرستك فقط...</p>`;
    resetBtn.style.display = 'inline-flex';
    pdfBtn.style.display = 'none';

    try {
        const q = query(collection(db, 'attendance'),
                        where('dateStr', '==', targetDateStr),
                        where('schoolId', '==', schoolId));

        const snap = await getDocs(q);

        if (snap.empty) {
            displayArea.innerHTML = `
            <div class="card" style="text-align:center; padding:30px;">
                <i class="bi bi-calendar-x" style="font-size:40px; color:var(--danger-color);"></i>
                <p style="font-weight:bold; color:#555; margin-top:10px;">لا توجد سجلات غياب للمدرسة بتاريخ: (${targetDateStr})</p>
            </div>`;
            return;
        }

        let groupedData = {};
        snap.forEach(doc => {
            const d = doc.data();
            if ((d.status === 'absent' || d.status === 'late') && d.schoolId === schoolId) {
                const classKey = d.classId ? d.classId.trim() : "فصول غير معرفة";
                if (!groupedData[classKey]) groupedData[classKey] = [];
                groupedData[classKey].push({
                    name: d.studentName || d.name || "طالب غير مسجل",
                    period: d.period || "الحصة",
                    status: d.status,
                    teacher: d.recordedBy || "عضو الهيئة"
                });
            }
        });

        const sortedClasses = Object.keys(groupedData).sort();

        if (sortedClasses.length === 0) {
            displayArea.innerHTML = `
            <div class="card" style="text-align:center; padding:30px;">
                <i class="bi bi-emoji-smile" style="font-size:40px; color:var(--success-color);"></i>
                <p style="font-weight:bold; color:#555; margin-top:10px;">لا يوجد غياب أو تأخير مسجل بهذا التاريخ — حضور كامل 🎉</p>
            </div>`;
            return;
        }

        let html = `<div class="card" style="margin-bottom:14px;">
            <h3 style="font-size:15px; color:var(--primary-color);">
                <i class="bi bi-calendar-check"></i> نتائج بحث يوم: ${targetDateStr}
                <span style="float:left; font-size:12px; color:#888; font-weight:600;">${sortedClasses.length} فصل به غياب/تأخير</span>
            </h3>
        </div>`;

        sortedClasses.forEach(classKey => {
            const rows = groupedData[classKey];
            html += `
            <div class="card" style="margin-bottom:14px;">
                <h3 style="font-size:14px; border-bottom:2px solid var(--line); padding-bottom:8px; margin-bottom:10px;">
                    <i class="bi bi-people-fill" style="color:var(--accent-color);"></i> فصل ${classKey}
                    <span style="float:left; font-size:12px; color:#888;">${rows.length} حالة</span>
                </h3>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#f4f6f9;">
                                <th style="padding:8px; text-align:right;">اسم الطالب</th>
                                <th style="padding:8px; text-align:center;">الحصة</th>
                                <th style="padding:8px; text-align:center;">الحالة</th>
                                <th style="padding:8px; text-align:right;">سجّلها</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(r => `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px;"><b>${r.name}</b></td>
                                    <td style="padding:8px; text-align:center;">${r.period}</td>
                                    <td style="padding:8px; text-align:center;">
                                        <span class="badge ${r.status === 'absent' ? 'danger' : 'warning'}">
                                            ${r.status === 'absent' ? '🔴 غائب' : '🟡 متأخر'}
                                        </span>
                                    </td>
                                    <td style="padding:8px; color:#666;">${r.teacher}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        });

        displayArea.innerHTML = html;
        lastGroupedData = groupedData;
        pdfBtn.style.display = 'inline-flex';

    } catch (err) {
        displayArea.innerHTML = `<p style="color:red; font-weight:bold;">❌ خطأ في عملية الفرز السحابي: ${err.message}</p>`;
    }
};

let lastGroupedData = {};

window.exportDateSearchPDF = function() {
    const sortedClasses = Object.keys(lastGroupedData).sort();
    if (!sortedClasses.length) { alert('⚠️ لا توجد نتائج لتصديرها.'); return; }

    const printEl = document.createElement('div');
    printEl.id = 'date-search-print-area';
    printEl.style.cssText = "padding:30px; font-family:'Cairo',sans-serif; direction:rtl; text-align:right; background:#fff; color:#000; width:800px; position:absolute; left:-9999px; top:-9999px;";

    let bodyHtml = `
        <div style="border-bottom:3px solid #1a1a2e; padding-bottom:15px; margin-bottom:20px;">
            <h2 style="font-size:16px; font-weight:900; color:#1a1a2e;">كشف الغياب والتأخير — بتاريخ ${lastSearchedDate}</h2>
        </div>`;

    sortedClasses.forEach(classKey => {
        const rows = lastGroupedData[classKey];
        bodyHtml += `
        <h3 style="font-size:13px; font-weight:900; background:#f4f6f9; padding:8px; border-radius:6px; margin:14px 0 8px;">فصل ${classKey} (${rows.length} حالة)</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:10px;">
            <thead><tr style="background:#fff0f0;"><th style="padding:6px; border:1px solid #eee;">اسم الطالب</th><th style="padding:6px; border:1px solid #eee;">الحصة</th><th style="padding:6px; border:1px solid #eee;">الحالة</th><th style="padding:6px; border:1px solid #eee;">سجّلها</th></tr></thead>
            <tbody>${rows.map(r => `
                <tr><td style="padding:6px; border:1px solid #eee;">${r.name}</td><td style="padding:6px; border:1px solid #eee; text-align:center;">${r.period}</td><td style="padding:6px; border:1px solid #eee; text-align:center;">${r.status==='absent'?'غائب':'متأخر'}</td><td style="padding:6px; border:1px solid #eee;">${r.teacher}</td></tr>`).join('')}
            </tbody>
        </table>`;
    });

    printEl.innerHTML = bodyHtml;
    document.body.appendChild(printEl);

    setTimeout(() => {
        html2canvas(printEl, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`كشف_الغياب_${lastSearchedDate.replace(/\//g,'-')}.pdf`);
            document.body.removeChild(printEl);
        });
    }, 300);
};