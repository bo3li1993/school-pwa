// محرك أدوات التقارير التجارية الموحدة للمنظومة (PDF & Excel Engine)

// 1. دالة تصدير أي جدول ديناميكي إلى ملف Excel معتمد فوراً
window.exportAs المنظومةExcel = function(tableId, fileName = 'تقرير_المدرسة') {
    const table = document.getElementById(tableId);
    if (!table) {
        alert('⚠️ تنبيه إداري: لم يتم العثور على الجدول المراد تصديره حالياً.');
        return;
    }
    
    try {
        // تحويل الجدول إلى كائن ورقة عمل Excel مفرز
        const wb = XLSX.utils.table_to_book(table, { sheet: "سجلات المنظومة" });
        // كتابة وتنزيل الملف بجهاز الموظف فوراً
        XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString('ar-KW')}.xlsx`);
    } catch (error) {
        alert('خطأ أثناء توليد ملف الـ Excel: ' + error.message);
    }
};

// 2. دالة تحويل وتصوير أي حاوية أو كشف إلى مستند PDF رسمي فخم
window.exportAsالمنظومةPDF = function(elementId, reportTitle = 'تقرير رسمي') {
    const element = document.getElementById(elementId);
    if (!element) {
        alert('⚠️ تنبيه إداري: لم يتم العثور على القسم المراد طباعته.');
        return;
    }

    alert('⏳ جاري تشغيل محرك التصوير السحابي وتحويل المستند إلى PDF، يرجى الانتظار...');

    // إعدادات التصوير بدقة عالية جداً تناسب الطابعات المدرسية
    const opt = {
        margin: 10,
        filename: `${reportTitle}_${new Date().toLocaleDateString('ar-KW')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        html2canvas(element, opt.html2canvas).then((canvas) => {
            const imgData = canvas.toDataURL('image/jpeg');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF(opt.jsPDF);
            
            const imgWidth = 190; // مقاس الحجم المتوافق مع ورقة A4
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // في حال كان التقرير طويل ويحتوي على صفحات متعددة تلقائياً
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save(opt.filename);
        });
    } catch (err) {
        alert('خطأ أثناء معالجة أمر الطباعة الرقمي: ' + err.message);
    }
};

// دالة تفعيل المحرك تلقائياً عند الاستدعاء
export function initReportsModule() {
    console.log('✓ تم تشغيل محرك التقارير بنجاح وبانتظار أوامر الطباعة.');
}