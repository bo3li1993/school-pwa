import { db } from '../firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRepeatModule() {
    const container = document.getElementById('tab-repeat') || document.querySelector('.tab-content.active');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="background: #fff; border-radius: 14px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.03); direction: rtl; text-align: right;">
            <h2 style="color: #1a1a2e; font-weight: 900; border-bottom: 2px solid #f4f6f9; padding-bottom: 15px; margin-bottom: 20px;">
                <i class="bi bi-exclamation-triangle-fill" style="color: #e74c3c;"></i> تقرير الغياب التراكمي (آخر 30 يوماً) وإنذارات الواتساب
            </h2>
            <div id="repeat-loading" style="text-align:center; padding:20px; font-weight:bold; color:#666;">⏳ جاري فحص سجلات المدرسة الذكية...</div>
            <div id="repeat-results"></div>
        </div>
    `;

    const user = JSON.parse(localStorage.getItem('hs_user'));
    if (!user || !user.schoolId) {
        document.getElementById('repeat-loading').innerText = "❌ خطأ: لم يتم التعرف على هوية المدرسة.";
        return;
    }

    try {
        // جلب سجلات الغياب للمدرسة الحالية
        const q = query(collection(db, 'attendance'), where('schoolId', '==', user.schoolId), where('status', '==', 'absent'));
        const snap = await getDocs(q);
        
        const absences = {};
        
        // حساب تاريخ قطع الـ 30 يوماً الماضية
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            
            // تطبيق الفلتر الزمني الذكي لآخر 30 يوماً فقط
            let withinRange = true;
            if(d.createdAt && d.createdAt.toDate) {
                withinRange = d.createdAt.toDate() >= cutoffDate;
            }
            
            if (d.status === 'absent' && d.studentName && withinRange) {
                if (!absences[d.studentName]) {
                    absences[d.studentName] = { name: d.studentName, classId: d.classId, count: 0 };
                }
                absences[d.studentName].count++;
            }
        });

        // تصفية الطلاب الذين غابوا 3 مرات فأكثر خلال الـ 30 يوماً وترتيبهم تنازلياً
        const repeatedStudents = Object.values(absences)
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count);

        document.getElementById('repeat-loading').style.display = 'none';
        const resultsDiv = document.getElementById('repeat-results');

        if (repeatedStudents.length === 0) {
            resultsDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#e8f5e9; color:#2e7d32; border-radius:8px; font-weight: bold;">✅ لا يوجد طلاب تجاوزوا حد الغياب خلال الـ 30 يوماً الماضية.</div>`;
            return;
        }

        let html = '';
        repeatedStudents.forEach(student => {
            let cardBg = "#f8fafc";
            let borderColor = "#e2e8f0";
            let warningButton = "";

            // ⚠️ ميزة التطوير التجاري: إذا وصل الغياب 5 أيام فأكثر، يتم تفعيل جرس الإنذار وتوليد زر الواتساب
            if (student.count >= 5) {
                cardBg = "#fff1f2";
                borderColor = "#e74c3c";
                warningButton = `
                    <button onclick="window.notifyAbsence('${student.name}', '${student.classId}', ${student.count})" 
                        style="background: #e74c3c; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: 'Cairo'; font-size: 12px;">
                        <i class="bi bi-whatsapp"></i> إشعار ولي الأمر
                    </button>
                `;
            }

            html += `
                <div style="background: ${cardBg}; border: 1px solid ${borderColor}; border-right: 5px solid ${borderColor}; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #0f172a; font-weight: 700;">${student.name}</h3>
                        <span style="font-size: 12px; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: 600;">فصل ${student.classId}</span>
                        <span style="font-size: 12px; color: ${student.count >= 5 ? '#e74c3c' : '#e67e22'}; font-weight: 900; margin-right: 10px;">
                            أيام الغياب (آخر 30 يوم): ${student.count} يوم
                        </span>
                    </div>
                    <div>
                        ${warningButton}
                    </div>
                </div>
            `;
        });

        resultsDiv.innerHTML = html;

    } catch (error) {
        document.getElementById('repeat-loading').innerText = "❌ حدث خطأ سحابي: " + error.message;
    }
}

// دالة بث إشعار إنذار الغياب التراكمي لولي الأمر مجاناً عبر الواتساب
window.notifyAbsence = function(studentName, classId, daysCount) {
    const user = JSON.parse(localStorage.getItem('hs_user'));
    const schoolName = user?.schoolName || 'المدرسة';
    
    const msg = `*إنذار غياب رسمي عاجل ⚠️*\n*الملف الإداري لـ ${schoolName}*\n\nنحيطكم علماً بأن الطالب: *${studentName}* (فصل ${classId})\nقد تكرر غيابه خلال الـ 30 يوماً الماضية وبلغ إجمالي الغياب المتفرق: *${daysCount} أيام*.\n\nيرجى مراجعة مكتب الأخصائي الاجتماعي بالمدرسة فوراً لتبرير الغياب وتجنب تطبيق اللوائح المدرسية الخاصة بالدرجات.\n\n_المنظومة الرقمية الشاملة_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};