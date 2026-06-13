import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const cardsContainer = document.getElementById('stats-cards');
    if (!cardsContainer) return;

    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية
    const todayISO = getTodayISO();       // 📅 التاريخ الموحد

    try {
        // سحب البيانات بشكل متوازي لضمان سرعة الاستجابة
        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const qAtt = query(collection(db, 'attendance'), where('schoolId', '==', schoolId));
        const qGate = query(collection(db, 'gatepass'), where('schoolId', '==', schoolId));

        const [studentsSnap, attSnap, gateSnap] = await Promise.all([
            getDocs(qStudents),
            getDocs(qAtt),
            getDocs(qGate)
        ]);

        // جرد الطلاب (مع دعم توافقية البيانات القديمة)
        let totalStudents = studentsSnap.size;
        if (totalStudents === 0 && schoolId === 'hosainan') {
            const allStudents = await getDocs(collection(db, 'students'));
            totalStudents = allStudents.size;
        }
        if (totalStudents === 0) totalStudents = 0; // البداية الصفرية

        let absentToday = 0;
        let gatepassToday = 0;
        let hasRecordsToday = false;
        
        const weeklyAbsents = {};
        const weeklyPresents = {};

        // تحليل البيانات المفلترة
        attSnap.forEach(doc => {
            const d = doc.data();
            const dateMatch = d.date === todayISO || d.dateStr === todayISO;
            
            if (dateMatch) {
                hasRecordsToday = true;
                if (d.status === 'absent') absentToday++;
            }
            
            // بيانات الرسم البياني
            if (d.date) {
                if (d.status === 'absent') weeklyAbsents[d.date] = (weeklyAbsents[d.date] || 0) + 1;
                else if (d.status === 'present') weeklyPresents[d.date] = (weeklyPresents[d.date] || 0) + 1;
            }
        });

        gateSnap.forEach(doc => {
            const d = doc.data();
            const gateDateMatch = d.date === todayISO || d.dateStr === todayISO;
            if (gateDateMatch) gatepassToday++;
        });

        if (!hasRecordsToday) {
            cardsContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; background:#fff3cd; border-radius:12px; border:2px solid #ffc107;">
                    <h3 style="color:#856404; font-weight:900;"><i class="bi bi-hourglass-split"></i> لم يتم تسجيل الغياب بعد لهذا اليوم</h3>
                    <p style="font-weight:bold;">في انتظار قيام أعضاء هيئة التعليم برصد الحصة الأولى لتنشيط العدادات...</p>
                </div>`;
            return;
        }

        let presentToday = Math.max(0, totalStudents - absentToday);

        // حقن العدادات (Cards)
        cardsContainer.innerHTML = `
            <div class="stat-card" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
                <h3 style="font-size:36px; font-weight:900;">${totalStudents}</h3>
                <p style="font-size:13px; font-weight:bold;"><i class="bi bi-people"></i> المقيدون</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                <h3 style="font-size:36px; font-weight:900;">${presentToday}</h3>
                <p style="font-size:13px; font-weight:bold;"><i class="bi bi-check-circle"></i> الحضور</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);">
                <h3 style="font-size:36px; font-weight:900;">${absentToday}</h3>
                <p style="font-size:13px; font-weight:bold;"><i class="bi bi-x-circle"></i> الغياب</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);">
                <h3 style="font-size:36px; font-weight:900;">${gatepassToday}</h3>
                <p style="font-size:13px; font-weight:bold;"><i class="bi bi-ticket-perforated"></i> الاستئذان</p>
            </div>
        `;

        const sortedDates = Object.keys(weeklyAbsents).sort().slice(-7);
        const activeAbsentsCounts = sortedDates.map(d => weeklyAbsents[d] || 0);
        const activePresentsCounts = sortedDates.map(d => weeklyPresents[d] || totalStudents);

        // نداء دوال الجرافيكس (الموجودة في ملفاتك الأخرى)
        setupChartsDomLayout();
        renderAdvancedGraphics(presentToday, absentToday, sortedDates, activeAbsentsCounts, activePresentsCounts);

    } catch(e) {
        cardsContainer.innerHTML = `<div style="color:red; font-weight:bold;">❌ خطأ في معالجة المؤشرات: ${e.message}</div>`;
    }
}