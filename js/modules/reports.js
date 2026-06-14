import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    console.log("📊 تم تنشيط محرك التقارير الأسبوعية الموحد (SaaS Mode).");
    
    setTimeout(() => {
        const classStatusDiv = document.getElementById('class-status');
        if (classStatusDiv && !document.getElementById('btn-trigger-weekly-pdf')) {
            if (!document.getElementById('weekly-report-container')) {
                const reportArea = document.createElement('div');
                reportArea.id = 'weekly-report-container';
                document.body.appendChild(reportArea);
            }

            const btn = document.createElement('button');
            btn.id = 'btn-trigger-weekly-pdf';
            btn.innerHTML = `<i class="bi bi-file-earmark-pdf-fill"></i> 📊 إصدار التقرير الأسبوعي الشامل`;
            btn.style.cssText = "background:var(--success-color); width:100%; margin-top:10px; font-weight:bold; font-size:13px; padding:12px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; gap:8px; border:none; color:#fff; cursor:pointer;";
            btn.onclick = () => window.generateWeeklyPDFReportLive();
            classStatusDiv.appendChild(btn);
        }
    }, 1500);
}

window.generateWeeklyPDFReportLive = async function() {
    const schoolId = getActiveSchoolId(); // 🏢 البصمة الأمنية
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const todayStr = today.toLocaleDateString('ar-KW');
    const weekAgoStr = weekAgo.toLocaleDateString('ar-KW');

    alert("⏳ جاري جرد البيانات السحابية لمدرستك وحصر الغياب...");
    
    try {
        // استعلام فلترة حسب المدرسة فقط
        const q = query(collection(db, 'attendance'), where('schoolId', '==', schoolId));
        let attSnap = await getDocs(q);

        // توافقية البيانات القديمة (سالم الحسينان)
        if (attSnap.empty && schoolId === 'hosainan') {
            attSnap = await getDocs(getActiveSchoolId() ? query(collection(db, 'attendance'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'attendance'));
        }
        
        let absences = {};
        
        attSnap.forEach(doc => {
            const d = doc.data();
            // حماية إضافية للبيانات المختلطة
            if (d.schoolId && d.schoolId !== schoolId) return;

            if (d.status === 'absent' && d.studentName) {
                const key = d.studentName.trim();
                if (!absences[key]) {
                    absences[key] = { name: key, classId: d.classId || '-', count: 0 };
                }
                absences[key].count++;
            }
        });
        
        const repeatedStudents = Object.values(absences)
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count);

        const container = document.getElementById('weekly-report-container');
        container.innerHTML = `
            <div id="weekly-report-print" style="padding:35px; font-family:'Cairo', sans-serif; direction:rtl; text-align:right; background:#fff; color:#000; width:800px; position:absolute; left:-9999px; top:-9999px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1a1a2e; padding-bottom:15px; margin-bottom:25px;">
                    <div>
                        <h2 style="font-size:16px; font-weight:900; color:#1a1a2e;">وزارة التربية - الإدارة التعليمية</h2>
                        <h3 style="font-size:13px; font-weight:bold; color:#444; margin-top:3px;">المنظومة السحابية الموحدة</h3>
                    </div>
                    <div style="text-align:left;">
                        <p style="font-size:11px; font-weight:bold; color:#666;">الفترة: ${weekAgoStr} - ${todayStr}</p>
                    </div>
                </div>

                <h2 style="text-align:center; font-size:16px; font-weight:900; color:#1a1a2e; margin-bottom:25px; background:#f4f6f9; padding:10px; border-radius:6px;">📊 التقرير الأسبوعي لحالات الغياب التراكمي (3 أيام+)</h2>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:12px;">
                    <thead>
                        <tr style="background:#fff0f0; color:#e74c3c; border-bottom:2px solid #ffcccc;">
                            <th style="padding:10px; text-align:center; width:50px;">#</th>
                            <th style="padding:10px; text-align:right;">اسم الطالب</th>
                            <th style="padding:10px; text-align:center; width:100px;">الفصل</th>
                            <th style="padding:10px; text-align:center; width:150px;">أيام الغياب</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${repeatedStudents.map((s, i) => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="text-align:center; padding:10px; font-weight:bold;">${i+1}</td>
                                <td style="padding:10px;"><b>👤 ${s.name}</b></td>
                                <td style="text-align:center; padding:10px; font-weight:bold; color:#2980b9;">${s.classId}</td>
                                <td style="text-align:center; padding:10px; color:#e74c3c; font-weight:900;">${s.count} أيام</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:15px; color:#27ae60; font-weight:bold;">🥇 كشوف الغياب نظيفة هذا الأسبوع.</td></tr>'}
                    </tbody>
                </table>
            </div>`;

        // دالة الطباعة (نفس كودك السابق)
        setTimeout(() => {
            const printElement = document.getElementById('weekly-report-print');
            html2canvas(printElement, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`تقرير_الغياب_${todayStr}.pdf`);
                container.innerHTML = ""; 
                alert("✓ تم توليد التقرير بنجاح!");
            });
        }, 800);

    } catch(err) {
        alert("❌ تعذر إصدار التقرير: " + err.message);
    }
};

window.exportAsManzoumaExcel = function(tableId, fileName = 'سجلات_المنظومة') {
    const table = document.getElementById(tableId);
    if(!table) { alert('⚠️ تعذر العثور على الجدول.'); return; }
    try {
        const wb = XLSX.utils.table_to_book(table, { sheet: "البيانات" });
        XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString('ar-KW')}.xlsx`);
    } catch(e) { alert("⚠️ فشل تصدير Excel."); }
};

window.exportAsManzoumaPDF = function(elementId, fileName) {
    const el = document.getElementById(elementId);
    if(!el) return;
    html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 145);
        pdf.save(`${fileName}.pdf`);
    });
};