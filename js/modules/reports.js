// 📊 المحرك الإداري المركزي المطور لتوليد التقارير التنفيذية وحصر غياب الـ 3 أيام فأكثر
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initReportsModule() {
    console.log("📊 تم تنشيط محرك التقارير التنفيذية والأسبوعية المطورة بالخلفية.");
    
    // حقن زر التوليد الذكي داخل شاشة "اليوم والمؤشرات" ليكون تحت عين الإدارة دائماً
    setTimeout(() => {
        const classStatusDiv = document.getElementById('class-status');
        if (classStatusDiv && !document.getElementById('btn-trigger-weekly-pdf')) {
            const btn = document.createElement('button');
            btn.id = 'btn-trigger-weekly-pdf';
            btn.innerHTML = `<i class="bi bi-file-earmark-pdf-fill" style="color:#fff;"></i> ⚡ توليد وطباعة التقرير الأسبوعي الشامل للمنطقة PDF`;
            btn.style.cssText = "background:#27ae60; width:100%; margin-top:10px; font-weight:bold; font-size:13px; padding:12px; border-radius:6px;";
            btn.onclick = () => window.generateWeeklyExecutiveReport();
            classStatusDiv.appendChild(btn);
        }
    }, 1500);
}

// 🖨️ الخوارزمية المطورة لحصر غياب الـ 3 أيام وإنتاج التقرير الرسمي الفخم
window.generateWeeklyExecutiveReport = async function() {
    alert("⏳ جاري جرد الملفات السحابية وحصر الطلاب الذين تخطى غيابهم 3 أيام فأكثر...");
    
    try {
        // 1. استدعاء ومسح كولكشن الغياب الشامل
        const attSnap = await getDocs(collection(db, 'attendance'));
        let studentAbsences = {};
        
        attSnap.forEach(doc => {
            const d = doc.data();
            if (d.status === 'absent' && d.studentName) {
                const name = d.studentName.trim();
                if (!studentAbsences[name]) {
                    studentAbsences[name] = { name: name, classId: d.classId || '-', count: 0 };
                }
                studentAbsences[name].count++;
            }
        });
        
        // 🔥 التصفية الليزرية الذكية: حصر غياب الطلاب لـ 3 أيام أو أكثر وترتيبهم تنازلياً كطلب التقرير
        let repeatedAbsents = Object.values(studentAbsences)
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count);

        // 2. سحب جولات تفقد المدير الإدارية
        const managerSnap = await getDocs(collection(db, 'manager_visits'));
        let managerVisitsHtml = '';
        managerSnap.forEach(doc => {
            const d = doc.data();
            managerVisitsHtml += `<tr><td style="border:1px solid #ddd; padding:8px;">أ. ${d.teacherName || 'عضو الهيئة'}</td><td style="border:1px solid #ddd; padding:8px; text-align:center;">${d.classId || '-'}</td><td style="border:1px solid #ddd; padding:8px;">${d.notes || 'تفقد سير الحصص والاستقرار'}</td></tr>`;
        });

        // 3. سحب الزيارات الفنية للهيئة التعليمية
        const technicalSnap = await getDocs(collection(db, 'technical_visits'));
        let technicalVisitsHtml = '';
        technicalSnap.forEach(doc => {
            const d = doc.data();
            technicalVisitsHtml += `<tr><td style="border:1px solid #ddd; padding:8px;">أ. ${d.teacherName || 'المعلم المزار'}</td><td style="border:1px solid #ddd; padding:8px; text-align:center;">${d.subject || '-'}</td><td style="border:1px solid #ddd; padding:8px;">${d.visitorName || 'الموجه الفني'}</td></tr>`;
        });

        // 🎨 بناء هيكل التقرير الملوكي الموجه للمنطقة التعليمية بالخلفية
        const reportContainer = document.createElement('div');
        reportContainer.style.cssText = "position:absolute; left:-9999px; top:-9999px; width:800px; background:#fff; color:#000; padding:40px; direction:rtl; text-align:right; font-family:'Cairo', sans-serif;";
        
        reportContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1a1a2e; padding-bottom:15px; margin-bottom:25px;">
                <div>
                    <h2 style="font-size:18px; font-weight:900; color:#1a1a2e;">وزارة التربية - الإدارة العامة لمنطقة الأحمدي التعليمية</h2>
                    <h3 style="font-size:15px; font-weight:bold; color:#555; margin-top:4px;">مدرسة سالم الحسينان المتوسطة للبنين</h3>
                </div>
                <div style="text-align:left;">
                    <p style="font-size:12px; font-weight:bold;">تاريخ التوليد: ${new Date().toLocaleDateString('ar-KW')}</p>
                    <span style="background:#1a1a2e; color:#fff; padding:4px 10px; font-size:11px; font-weight:bold; border-radius:4px; display:inline-block; margin-top:5px;">تقرير أسبوعي رسمي المعتمد</span>
                </div>
            </div>

            <h1 style="text-align:center; font-size:20px; font-weight:900; color:#1a1a2e; margin-bottom:25px; background:#f4f6f9; padding:10px; border-radius:6px;">📊 التقرير الإداري والأسبوعي الموحد لحالة غياب وفحص المنشأة</h1>

            <h3 style="color:#e74c3c; font-size:14px; font-weight:900; border-right:4px solid #e74c3c; padding-right:8px; margin-bottom:10px;">🚨 أولاً: حالات الغياب التراكمي الحرج (3 أيام فأكثر):</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:25px; font-size:12px;">
                <thead>
                    <tr style="background:#fff0f0; color:#e74c3c;">
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">اسم الطالب الدراسي المعتمد</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:100px;">الفصل</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:150px;">إجمالي أيام الغياب التراكمي</th>
                    </tr>
                </thead>
                <tbody>
                    ${repeatedAbsents.map(s => `<tr><td style="border:1px solid #ddd; padding:8px;"><b>👤 ${s.name}</b></td><td style="border:1px solid #ddd; padding:8px; text-align:center;">${s.classId}</td><td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:bold; color:#e74c3c;">${s.count} أيام (مستحق إنذار خطي)</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center; padding:12px; color:green; font-weight:bold;">✓ السجلات نظيفة تماماً ولا توجد حالات غياب متكرر تخطت 3 أيام هذا الأسبوع.</td></tr>'}
                </tbody>
            </table>

            <h3 style="color:#1a1a2e; font-size:14px; font-weight:900; border-right:4px solid #1a1a2e; padding-right:8px; margin-bottom:10px;">👔 ثانياً: تفقدات وزيارات الإدارة المدرسية المقيدة:</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:25px; font-size:12px;">
                <thead>
                    <tr style="background:#f4f6f9; color:#1a1a2e;">
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">المعلم المزار</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:100px;">الفصل</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">الملاحظة والتوجيه الإداري</th>
                    </tr>
                </thead>
                <tbody>
                    ${managerVisitsHtml || '<tr><td colspan="3" style="text-align:center; padding:12px; color:#666;">💡 لم تقيد زيارات تفقدية إدارية هذا الأسبوع.</td></tr>'}
                </tbody>
            </table>

            <h3 style="color:#2980b9; font-size:14px; font-weight:900; border-right:4px solid #2980b9; padding-right:8px; margin-bottom:10px;">🏫 ثالثاً: كشف الزيارات الفنية المعتمدة للهيئة التعليمية:</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:35px; font-size:12px;">
                <thead>
                    <tr style="background:#eef7fc; color:#2980b9;">
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">اسم المعلم المزار</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:center; width:120px;">القسم الفني / المادة</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">الموجه الفني / الزائر الموثق</th>
                    </tr>
                </thead>
                <tbody>
                    ${technicalVisitsHtml || '<tr><td colspan="3" style="text-align:center; padding:12px; color:#666;">💡 لا توجد زيارات فنية منشورة حالياً بالسجل.</td></tr>'}
                </tbody>
            </table>

            <div style="display:flex; justify-content:space-between; margin-top:50px; padding:0 20px; font-size:13px; font-weight:bold;">
                <p style="text-align:center;">يعتمد،، رئيس القسم الإداري<br><br>__________________</p>
                <p style="text-align:center;">مدير مدرسة سالم الحسينان المتوسطة<br><br>__________________</p>
            </div>
        `;

        document.body.appendChild(reportContainer);

        // تشغيل محرك الطباعة والتصدير الفوري لـ PDF المعتمد
        setTimeout(() => {
            html2canvas(reportContainer, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`التقرير_الاسبوعي_التنفيذي_مدرسة_الحسينان_${new Date().toLocaleDateString('ar-KW')}.pdf`);
                
                document.body.removeChild(reportContainer);
                alert("✓ تم توليد التقرير الأسبوعي الرسمي وحصر غياب الـ 3 أيام بنجاح كامل وجاهز للإرسال للمنطقة!");
            });
        }, 1000);

    } catch(err) {
        alert("❌ تعذر تجميع التقرير التنفيذي: " + err.message);
    }
};

// دالة طباعة تبويبات اللوحات المنفصلة
window.exportAsManzoumaPDF = function(elementId, fileName) {
    const el = document.getElementById(elementId);
    if(!el) return;
    alert("⏳ جاري تحضير وطباعة كشف اللوحة الحالية...");
    html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 145);
        pdf.save(`${fileName}.pdf`);
    });
};