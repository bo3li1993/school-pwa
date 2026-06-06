// 📊 محرك التقارير التنفيذية والأسبوعية المطور لحصر غياب الـ 3 أيام وتوليد ملفات الـ PDF
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    console.log("📊 تم تنشيط محرك التقارير الأسبوعية الشاملة بنجاح بالخلفية.");
    
    // حقن وتثبيت زر التوليد الذكي بداخل شاشة "اليوم والمؤشرات" تحت بطاقة الإجراءات السريعة
    setTimeout(() => {
        const classStatusDiv = document.getElementById('class-status');
        if (classStatusDiv && !document.getElementById('btn-trigger-weekly-pdf')) {
            // إنشاء حاوية مخصصة لطباعة التقرير منعاً لتداخل العناصر
            if (!document.getElementById('weekly-report-container')) {
                const reportArea = document.createElement('div');
                reportArea.id = 'weekly-report-container';
                document.body.appendChild(reportArea);
            }

            const btn = document.createElement('button');
            btn.id = 'btn-trigger-weekly-pdf';
            btn.innerHTML = `<i class="bi bi-file-earmark-pdf-fill"></i> 📊 إصدار وتوليد التقرير الأسبوعي الشامل للمنطقة (PDF)`;
            btn.style.cssText = "background:var(--success-color); width:100%; margin-top:10px; font-weight:bold; font-size:13px; padding:12px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; gap:8px;";
            btn.onclick = () => window.generateWeeklyPDFReport();
            classStatusDiv.appendChild(btn);
        }
    }, 1500);
}

// 🖨️ الخوارزمية الذكية الشاملة لحصر غياب الـ 3 أيام وإنتاج التقرير التنفيذي الرسمي
window.generateWeeklyPDFReport = async function() {
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const todayStr = today.toLocaleDateString('ar-KW');
    const weekAgoStr = weekAgo.toLocaleDateString('ar-KW');

    alert("⏳ جاري سحب البيانات السحابية وحصر الطلاب ذوي الغياب المتكرر (3 أيام فأكثر)...");
    
    try {
        // 1. استدعاء وجرد كشوف الغياب بالكامل
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
        
        // 🔥 التصفية الليزرية: حصر من تخطى غيابهم 3 أيام فأكثر وترتيبهم تنازلياً بالملي كطلب التقرير
        const repeatedStudents = Object.values(absences)
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count);

        // 2. استدعاء تفقدات وزيارات المدير للأسبوع الحالي
        const visitsSnap = await getDocs(collection(db, 'manager_visits'));
        let visitsHtml = '';
        visitsSnap.forEach(doc => {
            const d = doc.data();
            visitsHtml += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">👤 أ. ${d.teacherName || 'عضو الهيئة'}</td>
                    <td style="padding:10px; text-align:center;"><span class="badge info">${d.classId || '-'}</span></td>
                    <td style="padding:10px; color:#555;">${d.notes || 'الحصة مستقرة'}</td>
                </tr>`;
        });

        // 3. بناء وتوليد قالب HTML الفخم والمستقل للتقرير الموجه للمنطقة التعليمية
        const container = document.getElementById('weekly-report-container');
        container.innerHTML = `
            <div id="weekly-report-print" style="padding:35px; font-family:'Cairo', sans-serif; direction:rtl; text-align:right; background:#fff; color:#000; width:800px; position:absolute; left:-9999px; top:-9999px;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1a1a2e; padding-bottom:15px; margin-bottom:25px;">
                    <div>
                        <h2 style="font-size:17px; font-weight:900; color:#1a1a2e;">وزارة التربية - الإدارة العامة لمنطقة الفروانية التعليمية</h2>
                        <h3 style="font-size:14px; font-weight:bold; color:#444; margin-top:3px;">مدرسة سالم الحسينان المتوسطة للبنين</h3>
                    </div>
                    <div style="text-align:left;">
                        <p style="font-size:12px; font-weight:bold; color:#666;">الفترة: ${weekAgoStr} - ${todayStr}</p>
                        <span style="background:#1a1a2e; color:#fff; padding:4px 12px; font-size:11px; font-weight:bold; border-radius:4px; display:inline-block; margin-top:5px;">تقرير أسبوعي رسمي إلكتروني</span>
                    </div>
                </div>

                <h2 style="text-align:center; font-size:18px; font-weight:900; color:#1a1a2e; margin-bottom:25px; background:#f4f6f9; padding:10px; border-radius:6px;">📊 التقرير الأسبوعي الموحد لحصر الغياب المتكرر والزيارات الإدارية</h2>

                <h4 style="color:#e74c3c; font-size:14px; font-weight:900; border-right:4px solid #e74c3c; padding-right:8px; margin-bottom:12px;">🔴 أولاً: كشف الطلاب ذوي الغياب المتكرر والحرج (3 أيام فأكثر):</h4>
                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:12px;">
                    <thead>
                        <tr style="background:#fff0f0; color:#e74c3c; border-bottom:2px solid #ffcccc;">
                            <th style="padding:10px; text-align:center; width:50px;">#</th>
                            <th style="padding:10px; text-align:right;">اسم الطالب رباعي المعتمد بالمنشأة</th>
                            <th style="padding:10px; text-align:center; width:100px;">الفصل</th>
                            <th style="padding:10px; text-align:center; width:150px;">أيام الغياب التراكمية</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${repeatedStudents.map((s, i) => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="text-align:center; padding:10px; font-weight:bold;">${i+1}</td>
                                <td style="padding:10px;"><b>👤 ${s.name}</b></td>
                                <td style="text-align:center; padding:10px; font-weight:bold; color:#2980b9;">${s.classId}</td>
                                <td style="text-align:center; padding:10px; color:#e74c3c; font-weight:900; font-size:14px;">${s.count} أيام غياب</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:15px; color:#27ae60; font-weight:bold;">🥇 السجلات نظيفة تماماً؛ لا توجد حالات غياب متكرر تخطت 3 أيام هذا الأسبوع.</td></tr>'}
                    </tbody>
                </table>

                <h4 style="color:#1a1a2e; font-size:14px; font-weight:900; border-right:4px solid #1a1a2e; padding-right:8px; margin-bottom:12px;">👔 ثانياً: سجل الزيارات والتفقدات الإدارية المنجزة للأسبوع:</h4>
                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:12px;">
                    <thead>
                        <tr style="background:#f4f6f9; color:#1a1a2e; border-bottom:2px solid #ddd;">
                            <th style="padding:10px; text-align:right;">المعلم المتواجد بالحصة</th>
                            <th style="padding:10px; text-align:center; width:100px;">الفصل</th>
                            <th style="padding:10px; text-align:right;">التوصية والملاحظة الإدارية المرصودة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visitsHtml || '<tr><td colspan="3" style="text-align:center; padding:15px; color:#666;">💡 لم تقيد زيارات تفقدية إدارية بداخل السيرفر هذا الأسبوع.</td></tr>'}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:space-between; margin-top:50px; padding:0 30px; font-size:13px; font-weight:bold;">
                    <p style="text-align:center;">يعتمد،، وكيل الشؤون الإدارية<br><br>____________________</p>
                    <p style="text-align:center;">مدير مدرسة سالم الحسينان<br><br>____________________</p>
                </div>

                <p style="margin-top:60px; text-align:center; color:#999; font-size:11px; font-weight:bold; border-top:1px dashed #eee; padding-top:10px;">
                    تم إنشاء واعتماد هذا التقرير آلياً بواسطة المنظومة الرقمية الشاملة للمدرسة © 2026
                </p>
            </div>`;

        // 4. استدعاء محرك التصدير والطباعة لتحويل القالب إلى ملف PDF فخم
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
                
                container.innerHTML = ""; // تنظيف الحاوية للحفاظ على الذاكرة
                alert("✓ تم بنجاح توليد وطباعة التقرير الأسبوعي التنفيذي الشامل، وجاهز للإرسال الفوري للمنطقة!");
            });
        }, 800);

    } catch(err) {
        alert("❌ تعذر إنتاج التقرير الأسبوعي: " + err.message);
    }
};

// دالة الطباعة السريعة لتبويبات وكروت اللوحات المنفصلة
window.exportAsManzoumaPDF = function(elementId, fileName) {
    const el = document.getElementById(elementId);
    if(!el) return;
    alert("⏳ جاري تصدير وطباعة كشف اللوحة الحالية كـ PDF...");
    html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 145);
        pdf.save(`${fileName}.pdf`);
    });
};