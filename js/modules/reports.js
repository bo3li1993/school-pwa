// 📊 محرك التقارير الأسبوعية وتوليد الـ PDF وتصدير الـ Excel القياسي الموحد
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    console.log("📊 تم تنشيط محرك التقارير الأسبوعية وتوليد الجداول الإلكترونية بالخلفية.");
    
    // حقن وتثبيت أزرار التحكم الفورية بداخل كارت الإجراءات السريعة لشاشة المدير الرئيسية
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
            btn.innerHTML = `<i class="bi bi-file-earmark-pdf-fill"></i> 📊 إصدار التقرير الأسبوعي الشامل لحصر غياب (3 أيام+)`;
            btn.style.cssText = "background:var(--success-color); width:100%; margin-top:10px; font-weight:bold; font-size:13px; padding:12px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; gap:8px;";
            btn.onclick = () => window.generateWeeklyPDFReportLive();
            classStatusDiv.appendChild(btn);
        }
    }, 1500);
}

// 🖨️ الخوارزمية الفخمة لحصر غياب الـ 3 أيام فأكثر وتوليد ملف PDF جاهز للمنطقة والوزارة
window.generateWeeklyPDFReportLive = async function() {
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const todayStr = today.toLocaleDateString('ar-KW');
    const weekAgoStr = weekAgo.toLocaleDateString('ar-KW');

    alert("⏳ جاري جرد الملفات السحابية وحصر الطلاب ذوي الغياب المتكرر لـ 3 أيام أو أكثر...");
    
    try {
        const attSnap = await getDocs(collection(db, 'attendance'));
        let absences = {};
        
        attSnap.forEach(doc => {
            const d = doc.data();
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
                        <h2 style="font-size:16px; font-weight:900; color:#1a1a2e;">وزارة التربية - الإدارة العامة لمنطقة الفروانية التعليمية</h2>
                        <h3 style="font-size:13px; font-weight:bold; color:#444; margin-top:3px;">مدرسة سالم الحسينان المتوسطة للبنين</h3>
                    </div>
                    <div style="text-align:left;">
                        <p style="font-size:11px; font-weight:bold; color:#666;">الفترة الأسبوعية: ${weekAgoStr} - ${todayStr}</p>
                        <span style="background:#1a1a2e; color:#fff; padding:4px 12px; font-size:11px; font-weight:bold; border-radius:4px; display:inline-block; margin-top:5px;">سجل رسمي مؤتمت</span>
                    </div>
                </div>

                <h2 style="text-align:center; font-size:16px; font-weight:900; color:#1a1a2e; margin-bottom:25px; background:#f4f6f9; padding:10px; border-radius:6px;">📊 التقرير الأسبوعي التنفيذي لحالات الغياب المتكرر بالمدرسة</h2>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:12px;">
                    <thead>
                        <tr style="background:#fff0f0; color:#e74c3c; border-bottom:2px solid #ffcccc;">
                            <th style="padding:10px; text-align:center; width:50px;">#</th>
                            <th style="padding:10px; text-align:right;">اسم الطالب رباعي كما هو مقيد بالسيرفر</th>
                            <th style="padding:10px; text-align:center; width:100px;">الفصل</th>
                            <th style="padding:10px; text-align:center; width:150px;">إجمالي أيام الغياب المرصودة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${repeatedStudents.map((s, i) => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="text-align:center; padding:10px; font-weight:bold;">${i+1}</td>
                                <td style="padding:10px;"><b>👤 ${s.name}</b></td>
                                <td style="text-align:center; padding:10px; font-weight:bold; color:#2980b9;">${s.classId}</td>
                                <td style="text-align:center; padding:10px; color:#e74c3c; font-weight:900; font-size:13px;">${s.count} أيام غياب تراكمي</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:15px; color:#27ae60; font-weight:bold;">🥇 كشوف الغياب نظيفة؛ لم يتخطى أي طالب 3 أيام غياب هذا الأسبوع.</td></tr>'}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:space-between; margin-top:50px; padding:0 30px; font-size:12px; font-weight:bold;">
                    <p style="text-align:center;">يعتمد،، الهيئة الإدارية والمسؤول<br><br>____________________</p>
                    <p style="text-align:center;">مدير مدرسة سالم الحسينان<br><br>____________________</p>
                </div>
            </div>`;

        setTimeout(() => {
            const printElement = document.getElementById('weekly-report-print');
            html2canvas(printElement, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`التقرير_الاسبوعي_الرسمي_مدرسة_سالم_الحسينان_${todayStr}.pdf`);
                container.innerHTML = ""; 
                alert("✓ تم توليد وتنزيل تقرير غياب الـ 3 أيام بنجاح كملف PDF رسمي!");
            });
        }, 800);

    } catch(err) {
        alert("❌ تعذر إصدار التقرير الأسبوعي: " + err.message);
    }
};

// 🔥 حل مشكلة التقرير: دالة تصدير جداول الـ Excel النظيفة والمعرّفة بالإنجليزية بالكامل
window.exportAsManzoumaExcel = function(tableId, fileName = 'سجلات_المنظومة') {
    const table = document.getElementById(tableId);
    if(!table) { 
        alert('⚠️ خطأ: تعذر العثور على الجدول المذكور في هذه الصفحة لطبع ملف الـ Excel.'); 
        return; 
    }
    
    try {
        const wb = XLSX.utils.table_to_book(table, { sheet: "سجلات المدرسة" });
        XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString('ar-KW')}.xlsx`);
    } catch(e) {
        alert("⚠️ فشل تصدير Excel: تأكد من اكتمال تحميل مكتبة ورق العمل بالموقع الرئيسي.");
    }
};

// دالة تصدير لقطات الـ PDF للكروت الفردية
window.exportAsManzoumaPDF = function(elementId, fileName) {
    const el = document.getElementById(elementId);
    if(!el) return;
    alert("⏳ جاري تصدير لقطة الشاشة الحالية كـ PDF...");
    html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 145);
        pdf.save(`${fileName}.pdf`);
    });
};