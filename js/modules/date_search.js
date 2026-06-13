import { db, getActiveSchoolId } from '../firebase-config.js'; // تأكدنا من استدعاء البصمة
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ... (باقي كود initDateSearchModule كما هو)

window.fetchHistoricAttendanceByClassLive = async function() {
    const dateInput = document.getElementById('search-date-input').value;
    const displayArea = document.getElementById('historic-results-display-area');
    const resetBtn = document.getElementById('btn-historic-reset');
    const schoolId = getActiveSchoolId(); // 🏢 البصمة الأمنية للمدرسة

    if(!dateInput) { alert("⚠️ يرجى تحديد التاريخ أولاً للبدء!"); return; }

    const dParts = dateInput.split('-');
    const targetDateStr = `${parseInt(dParts[0])}/${parseInt(dParts[1])}/${parseInt(dParts[2])}`;

    displayArea.innerHTML = `<p style="text-align:center; padding:25px; font-weight:bold; color:var(--hover-color);">⏳ جاري فحص الكشوف السحابية الخاصة بمدرستك فقط...</p>`;
    resetBtn.style.display = 'inline-flex';

    try {
        // الاستعلام الأمني المباشر (مربوط بـ schoolId)
        const q = query(collection(db, 'attendance'), 
                        where('dateStr', '==', targetDateStr), 
                        where('schoolId', '==', schoolId));
        
        const snap = await getDocs(q);

        if(snap.empty) {
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
            // تصفية إضافية لضمان عدم وجود بيانات مختلطة
            if((d.status === 'absent' || d.status === 'late') && d.schoolId === schoolId) {
                const classKey = d.classId ? d.classId.trim() : "فصول غير معرفة";
                if(!groupedData[classKey]) groupedData[classKey] = [];
                groupedData[classKey].push({
                    name: d.studentName || d.name || "طالب غير مسجل",
                    period: d.period || "الحصة",
                    status: d.status,
                    teacher: d.recordedBy || "عضو الهيئة"
                });
            }
        });

        // ... (باقي كود العرض كما هو - سيعمل بكفاءة عالية)
        const sortedClasses = Object.keys(groupedData).sort();
        // [كود العرض اللي كتبته أنت بيكمل هنا...]
        
    } catch(err) {
        displayArea.innerHTML = `<p style="color:red; font-weight:bold;">❌ خطأ في عملية الفرز السحابي: ${err.message}</p>`;
    }
};