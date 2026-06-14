import { db } from '../firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRepeatModule() {
    const container = document.getElementById('tab-repeat') || document.querySelector('.tab-content.active');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="background: #fff; border-radius: 14px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.03);">
            <h2 style="color: #1a1a2e; font-weight: 900; border-bottom: 2px solid #f4f6f9; padding-bottom: 15px; margin-bottom: 20px;">
                <i class="bi bi-exclamation-triangle-fill" style="color: #e74c3c;"></i> تقرير الغياب التراكمي وإنذارات الواتساب
            </h2>
            <div id="repeat-loading" style="text-align:center; padding:20px; font-weight:bold; color:#666;">⏳ جاري فحص سجلات المدرسة...</div>
            <div id="repeat-results"></div>
        </div>
    `;

    const user = JSON.parse(localStorage.getItem('hs_user'));
    if (!user || !user.schoolId) {
        document.getElementById('repeat-loading').innerText = "❌ خطأ: لم يتم التعرف على المدرسة.";
        return;
    }

    try {
        // جلب كل سجلات الغياب للمدرسة
        const q = query(collection(db, 'attendance'), where('schoolId', '==', user.schoolId), where('status', '==', 'absent'));
        const snap = await getDocs(q);
        
        const absences = {};
        
        // حساب التكرار
        snap.forEach(doc => {
            const d = doc.data();
            if (!absences[d.studentName]) {
                absences[d.studentName] = { name: d.studentName, classId: d.classId, count: 0 };
            }
            absences[d.studentName].count++;
        });

        // فلترة الطلاب اللي غابوا 3 مرات أو أكثر وترتيبهم
        const repeatedStudents = Object.values(absences)
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count);

        document.getElementById('repeat-loading').style.display = 'none';
        const resultsDiv = document.getElementById('repeat-results');

        if (repeatedStudents.length === 0) {
            resultsDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#e8f5e9; color:#2e7d32; border-radius:8px;">✅ لا يوجد طلاب تجاوزوا 3 أيام غياب.</div>`;
            return;
        }

        let html = '';
        repeatedStudents.forEach(student => {
            // التصميم العادي للطالب المتجاوز 3 أيام
            let cardBg = "#f8fafc";
            let borderColor = "#e2e8f0";
            let warningButton = "";

            // ⚠️ النظام التجاري الآلي: إذا تجاوز 5 أيام، يتغير لونه للأحمر ويظهر زر الواتساب الفوري
            if (student.count >= 5) {
                cardBg = "#fff1f2";
                borderColor = "#e11d48";
                warningButton = `
                    <button onclick="window.notifyParentWhatsApp('${student.name}', '${student.classId}', ${student.count})" 
                        style="background: #e11d48; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Cairo';">
                        <i class="bi bi-whatsapp"></i> إنذار ولي الأمر
                    </button>
                `;
            }

            html += `
                <div style="background: ${cardBg}; border: 1px solid ${borderColor}; border-right: 5px solid ${borderColor}; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #0f172a;">${student.name}</h3>
                        <span style="font-size: 13px; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">فصل ${student.classId}</span>
                        <span style="font-size: 13px; color: ${student.count >= 5 ? '#e11d48' : '#e67e22'}; font-weight: bold; margin-right: 10px;">
                            إجمالي الغياب: ${student.count} أيام
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
        document.getElementById('repeat-loading').innerText = "❌ حدث خطأ أثناء جلب البيانات: " + error.message;
    }
}

// دالة إرسال إنذار الغياب المتكرر المرفقة بالزر
window.notifyParentWhatsApp = function(studentName, classId, daysCount) {
    const user = JSON.parse(localStorage.getItem('hs_user'));
    const schoolName = user?.schoolName || 'المدرسة';
    
    const msg = `*إنذار غياب متكرر 🚨*\n*${schoolName}*\n\nنحيطكم علماً بأن الطالب: *${studentName}* (فصل ${classId})\nقد تجاوز الحد اللائحي المسموح وبلغ إجمالي أيام غيابه المتفرقة: *${daysCount} أيام*.\n\nيرجى مراجعة إدارة المدرسة (الأخصائي الاجتماعي) بأقرب وقت لتبرير الغياب وتجنب الإجراءات اللائحية والخصم من درجات الأعمال.\n\n_المنظومة الرقمية الشاملة_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};