import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const cardsContainer = document.getElementById('stats-cards');
    if (!cardsContainer) return;

    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية الديناميكية
    const todayISO = getTodayISO();      // 📅 التاريخ الدولي الموحد

    try {
        // الاستعلامات المفلترة على المدرسة الحالية فقط
        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const qAtt = query(collection(db, 'attendance'), where('schoolId', '==', schoolId));
        const qGate = query(collection(db, 'gatepass'), where('schoolId', '==', schoolId));

        const [studentsSnap, attSnap, gateSnap] = await Promise.all([
            getDocs(qStudents),
            getDocs(qAtt),
            getDocs(qGate)
        ]);

        // جرد الطلاب التابعين للمدرسة المحددة فقط
        let totalStudents = studentsSnap.size;
        // الفولباك للمدرسة القديمة الحسينان إذا كانت داتا قديمة بدون schoolId
        if (totalStudents === 0 && schoolId === 'hosainan') {
            const allStudents = await getDocs(collection(db, 'students'));
            totalStudents = allStudents.size;
        }
        if (totalStudents === 0) totalStudents = 380; 

        let absentToday = 0;
        let gatepassToday = 0;
        let hasRecordsToday = false;
        
        const weeklyAbsents = {};
        const weeklyPresents = {};

        // 1. جرد كشوف الرصد للمدرسة الحالية
        attSnap.forEach(doc => {
            const d = doc.data();
            const dateMatch = d.date === todayISO || d.dateStr === todayISO;
            
            if (dateMatch) {
                hasRecordsToday = true;
                if (d.status === 'absent') absentToday++;
            }
            
            // تجميع الأيام السابقة (مع مراعاة التوافقية)
            if (d.date) {
                if (d.status === 'absent') weeklyAbsents[d.date] = (weeklyAbsents[d.date] || 0) + 1;
                else if (d.status === 'present') weeklyPresents[d.date] = (weeklyPresents[d.date] || 0) + 1;
            }
        });

        // 2. جرد عداد حالات استئذان اليوم للمدرسة الحالية
        gateSnap.forEach(doc => {
            const d = doc.data();
            const gateDateMatch = d.date === todayISO || d.dateStr === todayISO;
            if (gateDateMatch) gatepassToday++;
        });

        if (!hasRecordsToday) {
            cardsContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; background:#fff3cd; border-radius:12px; border:2px solid #ffc107; direction:rtl; width:100%;">
                    <h3 style="color:#856404; font-weight:900;"><i class="bi bi-hourglass-split"></i> لم يتم تسجيل الغياب بعد لهذا اليوم</h3>
                    <p style="color:#666; font-size:13px; font-weight:bold; margin-top:5px;">في انتظار قيام أعضاء هيئة التعليم برصد الحصة الأولى لتنشيط العدادات والشارتات لايف...</p>
                </div>`;
            destroyExistingCharts();
            return;
        }

        let presentToday = totalStudents - absentToday;
        if (presentToday < 0) presentToday = 0;

        // 4. ضخ كروت العدادات
        cardsContainer.innerHTML = `
            <div class="stat-card" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
                <h3 style="font-size:36px; font-weight:900;">${totalStudents}</h3>
                <p style="font-size:13px; font-weight:bold; opacity:0.9;"><i class="bi bi-people"></i> إجمالي المقيدين بالمدرسة</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                <h3 style="font-size:36px; font-weight:900;">${presentToday}</h3>
                <p style="font-size:13px; font-weight:bold; opacity:0.9;"><i class="bi bi-check-circle"></i> حضور الطلاب اليوم</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);">
                <h3 style="font-size:36px; font-weight:900;">${absentToday}</h3>
                <p style="font-size:13px; font-weight:bold; opacity:0.9;"><i class="bi bi-x-circle"></i> غياب الطلاب اليوم</p>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);">
                <h3 style="font-size:36px; font-weight:900;">${gatepassToday}</h3>
                <p style="font-size:13px; font-weight:bold; opacity:0.9;"><i class="bi bi-ticket-perforated"></i> حالات استئذان اليوم</p>
            </div>
        `;

        const sortedDates = Object.keys(weeklyAbsents).sort().slice(-7);
        const activeAbsentsCounts = sortedDates.map(d => weeklyAbsents[d] || 0);
        const activePresentsCounts = sortedDates.map(d => weeklyPresents[d] || totalStudents);

        setupChartsDomLayout();
        renderAdvancedGraphics(presentToday, absentToday, sortedDates, activeAbsentsCounts, activePresentsCounts);

    } catch(e) {
        cardsContainer.innerHTML = `<div style="color:red; font-weight:bold; grid-column: 1/-1; text-align:center;">❌ خطأ في معالجة المؤشرات: ${e.message}</div>`;
    }
}

function setupChartsDomLayout() {
    const todayCanvas = document.getElementById('attendanceChart');
    if (!todayCanvas) return;

    const parentCard = todayCanvas.parentElement;
    if (!document.getElementById('weeklyAttendanceChart')) {
        const divider = document.createElement('div');
        divider.style.cssText = "border-top:1px dashed #ddd; margin:20px 0; padding-top:15px;";
        divider.innerHTML = `<h2 style="font-size:14px; font-weight:900; color:#1a1a2e; text-align:center; margin-bottom:10px;"><i class="bi bi-bar-chart-line-fill" style="color:#e67e22;"></i> المنحنى البياني الإحصائي لآخر 7 أيام</h2>`;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'weeklyAttendanceChart';
        newCanvas.style.cssText = "max-height:160px; width:100%;";
        parentCard.appendChild(divider);
        parentCard.appendChild(newCanvas);
    }
}

function renderAdvancedGraphics(present, absent, labels, absentsData, presentsData) {
    const ctxToday = document.getElementById('attendanceChart');
    const ctxWeekly = document.getElementById('weeklyAttendanceChart');

    if (ctxToday) {
        if (window.myLiveAttendanceChart) window.myLiveAttendanceChart.destroy();
        window.myLiveAttendanceChart = new Chart(ctxToday, {
            type: 'doughnut',
            data: { labels: ['حضور اليوم', 'غياب اليوم'], datasets: [{ data: [present, absent], backgroundColor: ['#27ae60', '#e74c3c'], borderWidth: 0 }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', weight: 'bold', size: 11 } } } } }
        });
    }

    if (ctxWeekly) {
        if (window.myWeeklyAttendanceChart) window.myWeeklyAttendanceChart.destroy();
        window.myWeeklyAttendanceChart = new Chart(ctxWeekly, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'غائب', data: absentsData, backgroundColor: '#ef4444', borderRadius: 4 },
                    { label: 'حاضر', data: presentsData, backgroundColor: '#10b981', borderRadius: 4 }
                ]
            },
            options: { responsive: true, scales: { x: { ticks: { font: { family: 'Cairo', size: 9, weight: 'bold' } } }, y: { beginAtZero: true } } }
        });
    }
}

function destroyExistingCharts() {
    if (window.myLiveAttendanceChart) { window.myLiveAttendanceChart.destroy(); window.myLiveAttendanceChart = null; }
    if (window.myWeeklyAttendanceChart) { window.myWeeklyAttendanceChart.destroy(); window.myWeeklyAttendanceChart = null; }
}