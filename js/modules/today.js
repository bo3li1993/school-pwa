import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const cardsContainer = document.getElementById('stats-cards');
    if (!cardsContainer) return;

    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية الديناميكية للـ SaaS
    const todayISO = getTodayISO();       // 📅 التاريخ الموحد بصيغة YYYY-MM-DD

    try {
        // سحب البيانات بشكل متوازي لضمان سرعة الاستجابة القصوى
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
        if (totalStudents === 0) totalStudents = 0; // البداية الصفرية الآمنة

        let absentToday = 0;
        let gatepassToday = 0;
        let hasRecordsToday = false;
        
        const weeklyAbsents = {};
        const weeklyPresents = {};
        
        // استخدام Map لدمج سجلات الحصص السبع ومنع تكرار حساب حضور/غياب الطالب الواحد اليوم
        const studentDailyStatusMap = new Map();

        // تحليل البيانات المفلترة
        attSnap.forEach(doc => {
            const d = doc.data();
            
            // 🔒 التحسين المطلوب: مقارنة تاريخ متعددة ومحمية من فجوات التوقيت والسيرفر
            const dDate = d.date || d.dateStr || '';
            const dCreated = d.createdAt ? d.createdAt.toDate().toISOString().slice(0, 10) : '';
            const dateMatch = (dDate === todayISO || dCreated === todayISO);
            
            if (dateMatch) {
                hasRecordsToday = true;
                const sName = d.studentName || d.name;
                
                if (sName) {
                    // إذا رُصد غياب الطالب في أي حصة اليوم، يُثبت غيابه الإجمالي
                    if (d.status === 'absent') {
                        studentDailyStatusMap.set(sName, 'absent');
                    } else if (!studentDailyStatusMap.has(sName)) {
                        studentDailyStatusMap.set(sName, d.status);
                    }
                }
            }
            
            // تجميع بيانات الرسم البياني الأسبوعي التراكمي
            const graphDate = d.date || dCreated;
            if (graphDate) {
                if (d.status === 'absent') {
                    weeklyAbsents[graphDate] = (weeklyAbsents[graphDate] || 0) + 1;
                } else if (d.status === 'present') {
                    weeklyPresents[graphDate] = (weeklyPresents[graphDate] || 0) + 1;
                }
            }
        });

        // فرز واحتساب الحالات الصافية اليومية بعد عزل التكرار
        studentDailyStatusMap.forEach((status) => {
            if (status === 'absent') absentToday++;
        });

        // جرد استئذانات بوابة الحارس لليوم الحالي بمقارنة ذكية ومزدوجة
        gateSnap.forEach(doc => {
            const d = doc.data();
            const dCreated = d.createdAt ? d.createdAt.toDate().toISOString().slice(0, 10) : '';
            const gateDateMatch = (d.date === todayISO || d.dateStr === todayISO || dCreated === todayISO);
            
            if (gateDateMatch) gatepassToday++;
        });

        // إذا لم يقم المعلمون برصد أي حصة لليوم حتى الآن، نعرض ديباجة التنبيه المنتظر
        if (!hasRecordsToday) {
            cardsContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; background:#fff3cd; border-radius:12px; border:2px solid #ffc107; width: 100%;">
                    <h3 style="color:#856404; font-weight:900;"><i class="bi bi-hourglass-split"></i> لم يتم تسجيل الغياب بعد لهذا اليوم الدراسي</h3>
                    <p style="font-weight:bold; color: #856404; font-size:13px; margin-top:4px;">في انتظار قيام أعضاء الهيئة التعليمية برصد الحصة الأولى لتنشيط العدادات والمؤشرات البيانية لايف...</p>
                </div>`;
            return;
        }

        let presentToday = Math.max(0, totalStudents - absentToday);

        // حقن العدادات (Cards) بالتصميم الانسيابي المعتمد
        cardsContainer.innerHTML = `
            <div class="stat-card" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; border-radius: 12px; text-align: center; color: #fff;">
                <h3 style="font-size:36px; font-weight:900; line-height:1.2;">${totalStudents}</h3>
                <p style="font-size:13px; font-weight:bold; margin-top:4px;"><i class="bi bi-people"></i> المقيدون</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; border-radius: 12px; text-align: center; color: #fff;">
                <h3 style="font-size:36px; font-weight:900; line-height:1.2;">${presentToday}</h3>
                <p style="font-size:13px; font-weight:bold; margin-top:4px;"><i class="bi bi-check-circle"></i> الحضور</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); padding: 20px; border-radius: 12px; text-align: center; color: #fff;">
                <h3 style="font-size:36px; font-weight:900; line-height:1.2;">${absentToday}</h3>
                <p style="font-size:13px; font-weight:bold; margin-top:4px;"><i class="bi bi-x-circle"></i> الغياب</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%); padding: 20px; border-radius: 12px; text-align: center; color: #fff;">
                <h3 style="font-size:36px; font-weight:900; line-height:1.2;">${gatepassToday}</h3>
                <p style="font-size:13px; font-weight:bold; margin-top:4px;"><i class="bi bi-ticket-perforated"></i> الاستئذان</p>
            </div>
        `;

        const sortedDates = Object.keys(weeklyAbsents).sort().slice(-7);
        const activeAbsentsCounts = sortedDates.map(d => weeklyAbsents[d] || 0);
        const activePresentsCounts = sortedDates.map(d => weeklyPresents[d] || totalStudents);

        // استدعاء محركات الرسم الجرافيكي المعتمدة باللوحة
        if (typeof window.setupChartsDomLayout === 'function') window.setupChartsDomLayout();
        if (typeof window.renderAdvancedGraphics === 'function') {
            window.renderAdvancedGraphics(presentToday, absentToday, sortedDates, activeAbsentsCounts, activePresentsCounts);
        }

    } catch(e) {
        cardsContainer.innerHTML = `<div style="color:var(--danger-color); font-weight:bold; text-align:right; padding:15px;">❌ خطأ في معالجة رادار المؤشرات: ${e.message}</div>`;
    }
}