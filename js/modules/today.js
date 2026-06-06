// 📊 محرك توليد العدادات اليومية ومؤشر المقارنة البيانية الأسبوعية التراكمية الشاملة
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const cardsContainer = document.getElementById('stats-cards');
    if (!cardsContainer) return;

    try {
        const todayStr = new Date().toLocaleDateString('ar-KW');
        
        const [studentsSnap, attSnap, gateSnap] = await Promise.all([
            getDocs(collection(db, 'students')),
            getDocs(collection(db, 'attendance')),
            getDocs(collection(db, 'gatepass'))
        ]);

        let totalStudents = studentsSnap.size || 380; 
        let absentToday = 0;
        let gatepassToday = 0;
        let hasRecordsToday = false;
        
        // 📈 وعاء تجميع البيانات الإحصائية الأسبوعية المقترحة بالتقرير
        const weeklyData = {};

        // جرد كشوف الرصد وتجميع المنحنى اليومي والأسبوعي معاً بمسحة واحدة
        attSnap.forEach(doc => {
            const d = doc.data();
            
            // أ) جرد الداتا الفورية لليوم الحالي
            if (d.date === todayStr) {
                hasRecordsToday = true;
                if (d.status === 'absent') absentToday++;
            }
            
            // ب) تجميع خط الغياب التراكمي للأسبوع لفرزه لاحقاً بالشارت
            if (d.date && d.status === 'absent') {
                weeklyData[d.date] = (weeklyData[d.date] || 0) + 1;
            }
        });

        // جرد عداد حقيبة استئذان اليوم
        gateSnap.forEach(doc => {
            const d = doc.data();
            if (d.date === todayStr || (d.createdAt && d.createdAt.toDate().toLocaleDateString('ar-KW') === todayStr)) {
                gatepassToday++;
            }
        });

        if (!hasRecordsToday) {
            cardsContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; background:#fff3cd; border-radius:12px; border:2px solid #ffc107; direction:rtl; width:100%;">
                    <h3 style="color:#856404; font-weight:900;"><i class="bi bi-hourglass-split"></i> لم يتم تسجيل الغياب بعد لهذا اليوم</h3>
                    <p style="color:#666; font-size:13px; font-weight:bold; margin-top:5px;">في انتظار قيام أعضاء هيئة التعليم برصد الحصة الأولى لتنشيط العدادات لايف...</p>
                </div>`;
            
            const canvas = document.getElementById('attendanceChart');
            if (canvas && window.myLiveAttendanceChart) {
                window.myLiveAttendanceChart.destroy();
                window.myLiveAttendanceChart = null;
            }
            return;
        }

        let presentToday = totalStudents - absentToday;
        if (presentToday < 0) presentToday = 0;

        // ضخ كروت العدادات الأربعة المعتمدة
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

        // فرز وتصفية آخر 7 أيام رصد لرفع جودة التحليل الإحصائي المقارن للمدير
        const sortedDates = Object.keys(weeklyData).sort().slice(-7);
        const weeklyCounts = sortedDates.map(d => weeklyData[d]);

        // بناء الشارت المزدوج الشامل (اليومي + الأسبوعي)
        renderAdvancedAttendanceCharts(presentToday, absentToday, sortedDates, weeklyCounts);

    } catch(e) {
        cardsContainer.innerHTML = `<div style="color:red; font-weight:bold; grid-column: 1/-1; text-align:center;">❌ خطأ في معالجة المؤشرات: ${e.message}</div>`;
    }
}

function renderAdvancedAttendanceCharts(present, absent, weeklyLabels, weeklyCounts) {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas) return;

    if (window.myLiveAttendanceChart) {
        window.myLiveAttendanceChart.destroy();
    }

    // بناء المخطط الدائري الشامل لليوم مع دمج بيانات المقارنة الأسبوعية التراكمية في تلميحات الشاشة
    window.myLiveAttendanceChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['حضور فعلي اليوم', 'غياب كلي اليوم'],
            datasets: [{
                data: [present, absent],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Cairo', weight: 'bold', size: 11 } } },
                tooltip: {
                    callbacks: {
                        afterBody: function() {
                            if(weeklyLabels.length > 0) {
                                return `\n📊 المنحنى التراكمي لآخر غياب:\n` + weeklyLabels.map((d, i) => ` • تاريخ ${d}: ${weeklyCounts[i]} غائب`).join('\n');
                            }
                            return '';
                        }
                    },
                    bodyFont: { family: 'Cairo', weight: 'bold' },
                    titleFont: { family: 'Cairo', weight: 'bold' }
                }
            }
        }
    });
}