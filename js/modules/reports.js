// 📊 المحرك المركزي الذكي لتوليد التقارير التنفيذية والأسبوعية بصيغة PDF المعتمدة
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    console.log("📊 تم تشغيل وتنشيط محرك التقارير التنفيذية بالخلفية بنجاح.");
    
    // حقن زر التوليد الفوري الذكي داخل لوحة "اليوم والمؤشرات" ليكون تحت عين المدير علطول
    setTimeout(() => {
        const classStatusDiv = document.getElementById('class-status');
        if (classStatusDiv && !document.getElementById('btn-trigger-weekly-pdf')) {
            const btn = document.createElement('button');
            btn.id = 'btn-trigger-weekly-pdf';
            btn.innerHTML = `<i class="bi bi-file-earmark-pdf-fill" style="color:#fff;"></i> ⚡ توليد وطباعة التقرير الأسبوعي الشامل للمنطقة PDF`;
            btn.style.cssText = "background:#27ae60; width:100%; margin-top:10px; font-weight:bold; font-size:13px; padding:12px; border-radius:6px;";
            btn.onclick = () => window.generateWeeklyExecutivePDF();
            classStatusDiv.appendChild(btn);
        }
    }, 1500);
}

// 🖨️ دالة جلب البيانات السحابية طيران وتوليد التقرير الأسبوعي الفخم
window.generateWeeklyExecutivePDF = async function() {
    alert("⏳ جاري جلب السجلات التراكمية، وحصر غياب الحصص، والزيارات الفنية من السيرفر...");
    
    try {
        // 1. سحب داتا الغياب لفحص الغياب المتكرر
        const attSnap = await getDocs(collection(db, 'attendance'));
        let studentAbsences = {};
        attSnap.forEach(doc => {
            const d = doc.data();
            if (d.status === 'absent' && d.studentName) {
                const name = d.studentName.trim();
                if (!studentAbsences[name]) studentAbsences[name] = { name: name, classId: d.classId || '-', count: 0 };
                studentAbsences[name].count++;
            }
        });
        
        // تصفية الطلاب الذين غيابهم متكرر (مثلاً غابوا يومين أو أكثر)
        let repeatedAbsents = Object.values(studentAbsences).filter(s => s.count >= 2).sort((a,b) => b.count - a.count);

        // 2. سحب زيارات وتفقدات المدير الإدارية
        const managerSnap = await getDocs(collection(db, 'manager_visits'));
        let managerVisitsHtml = '';
        let mCount = 0;
        managerSnap.forEach(doc => {
            const d = doc.data();
            managerVisitsHtml += `<tr><td>${d.teacherName || 'عضو الهيئة'}</td><td style="text-align:center;">${d.classId || '-'}</td><td>${d.notes || 'تفقد سير الحصص والاستقرار البنائي'}</td></tr>`;
            mCount++;
        });

        // 3. سحب الزيارات الفنية والتوجيه
        const technicalSnap = await getDocs(collection(db, 'technical_visits'));
        let technicalVisitsHtml = '';
        let tCount = 0;
        technicalSnap.forEach(doc => {
            const d = doc.data();
            technicalVisitsHtml += `<tr><td>${d.teacherName || 'المعلم المزار'}</td><td style="text-align:center;">${d.subject || '-'}</td><td>${d.visitorName || 'الموجه الفني / رئيس القسم'}</td></tr>`;
            tCount++;
        });

        // 🎨 إنشاء حاوية هيدن مؤقتة وبنائها بتصميم رسمي فخم چدام عيون المنطقة التعليمية
        const reportContainer = document.createElement('div');
        reportContainer.style.cssText = "position:absolute; left:-9999px; top:-9999px; width:800px; background:#fff; color:#000; padding:40px; direction:rtl; text-align:right; font-family:'Cairo', sans-serif;";
        
        reportContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1a1a2e; padding-bottom:15px; margin-bottom:25px;">
                <div>
                    <h2 style="font-size:20px; font-weight:900; color:#1a1a2e;">وزارة التربية - الإدارة العامة لمنطقة الأحمدي التعليمية</h2>
                    <h3 style="font-size:16px; font-weight:bold; color:#555; margin-top:4px;">مدرسة سالم الحسينان المتوسطة للبنين</h3>
                </div>
                <div style="text-align:left;">
                    <p style="font-size:12px; font-weight:bold;">تاريخ التوليد آلياً: ${new Date().toLocaleDateString('ar-KW')}</p>
                    <span style="background:#1a1a2e; color:#fff; padding:4px 10px; font-size:11px; font-weight:bold; border-radius:4px; display:inline-block; margin-top:5px;">تقرير تنفيذي رسمي</span>
                </div>
            </div>

            <h1 style="text-align:center; font-size:22px; font-weight:900; color:#1a1a2e; margin-bottom:25px; background:#f4f6f9; padding:10px; border-radius:6px;">📊 التقرير الإداري والأسبوعي الموحد لحالة المنشأة</h1>

            <!-- القسم الأول: رادار الغياب المتكرر للطلاب -->
            <h3 style="color:#e74c3c; font-size:15px; font-weight:900; border-right:4px solid #e74c3c; padding-right:8px; margin-bottom:10px;">🔴 أولاً: رصد حالات الغياب التراكمي والمتكرر (أسبوعي):</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:25px; font-size:12px;">
                <thead>
                    <tr style="background:#fff0f0; color:#e74c3c;">
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">اسم الطالب الدراسي</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:100px;">الفصل</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:150px;">إجمالي أيام الغياب</th>
                    </tr>
                </thead>
                <tbody>
                    ${repeatedAbsents.map(s => `<tr><td style="border:1px solid #ddd; padding:8px;"><b>👤 ${s.name}</b></td><td style="border:1px solid #ddd; padding:8px; text-align:center;">${s.classId}</td><td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:bold; color:#e74c3c;">${s.count} أيام غياب</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center; padding:12px; color:green; font-weight:bold;">✓ كشوف الرصد نظيفة تماماً ولا يوجد حالات غياب متكرر هذا الأسبوع.</td></tr>'}
                </tbody>
            </table>

            <!-- القسم الثاني: جرد تفقدات وزيارات المدير -->
            <h3 style="color:#1a1a2e; font-size:15px; font-weight:900; border-right:4px solid #1a1a2e; padding-right:8px; margin-bottom:10px;">👔 ثانياً: تفقدات وزيارات الإدارة المدرسية المعتمدة:</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:25px; font-size:12px;">
                <thead>
                    <tr style="background:#f4f6f9; color:#1a1a2e;">
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">المعلم المزار</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:100px;">الفصل الدراسي</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">التوجيه والملاحظة الإدارية المرصودة</th>
                    </tr>
                </thead>
                <tbody>
                    ${managerVisitsHtml || '<tr><td colspan="3" style="text-align:center; padding:12px; color:#666;">💡 لم يتم تقييد زيارات إدارية للمدير في هذه الفترة.</td></tr>'}
                </tbody>
            </table>

            <!-- القسم الثالث: الزيارات الفنية والتوجيه -->
            <h3 style="color:#2980b9; font-size:15px; font-weight:900; border-right:4px solid #2980b9; padding-right:8px; margin-bottom:10px;">🏫 ثالثاً: كشف الزيارات الفنية المعتمدة للهيئة التعليمية:</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:35px; font-size:12px;">
                <thead>
                    <tr style="background:#eef7fc; color:#2980b9;">
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">اسم المعلم</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:120px;">المادة / القسم الفني</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">الموجه الفني / الزائر</th>
                    </tr>
                </thead>
                <tbody>
                    ${technicalVisitsHtml || '<tr><td colspan="3" style="text-align:center; padding:12px; color:#666;">💡 لا توجد زيارات فنية منشورة حالياً بالسجل السحابي.</td></tr>'}
                </tbody>
            </table>

            <!-- توقيعات الاعتماد الرسمية للمنطقة -->
            <div style="display:flex; justify-content:space-between; margin-top:50px; padding:0 20px; font-size:13px; font-weight:bold;">
                <p style="text-align:center;">يعتمد،، رئيس القسم الإداري<br><br>__________________</p>
                <p style="text-align:center;">مدير مدرسة سالم الحسينان المتوسطة<br><br>__________________</p>
            </div>
        `;

        document.body.appendChild(reportContainer);

        // ⚡ سحر الطباعة الرقمية وحقن إعدادات المقاس التجاري لـ html2canvas و jspdf المعتمد بالمشروع
        setTimeout(() => {
            html2canvas(reportContainer, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`التقرير_الاسبوعي_الشامل_مدرسة_الحسينان_${new Date().toLocaleDateString('ar-KW')}.pdf`);
                
                // إزالة الحاوية المؤقتة من الشاشة فور إتمام التحميل
                document.body.removeChild(reportContainer);
                alert("✓ تم توليد التقرير الأسبوعي الرسمي بنجاح كامل وجاهز للطباعة الفورية أو الإرسال للمنطقة التعليمية!");
            });
        }, 1000);

    } catch(err) {
        alert("❌ تعذر تجميع التقرير السحابي: " + err.message);
    }
};

// 📄 دالة طباعة اللوحات الحالية العادية المعتمدة سلفاً بالسستم
window.exportAsManzoumaPDF = function(elementId, fileName) {
    const el = document.getElementById(elementId);
    if(!el) return;
    alert("⏳ جاري تحضير وطباعة اللوحة الحالية كتقرير منفصل...");
    html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 145);
        pdf.save(`${fileName}.pdf`);
    });
};