// 📊 محرك توليد العدادات والمؤشرات الحية والرسم البياني اليومي المطور
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const cardsContainer = document.getElementById('stats-cards');
    if (!cardsContainer) return;

    try {
        const todayStr = new Date().toLocaleDateString('ar-KW');
        
        // ⏳ جلب المؤشرات من السيرفر بالتاريخ الموحد ar-KW
        const [studentsSnap, attSnap, gateSnap] = await Promise.all([
            getDocs(collection(db, 'students')),
            getDocs(collection(db, 'attendance')),
            getDocs(collection(db, 'gatepass'))
        ]);

        let totalStudents = studentsSnap.size || 380; // الكثافة المعيارية للمدرسة
        let absentToday = 0;
        let gatepassToday = 0;
        let hasRecordsToday = false;

        // 1. جرد وحساب الغياب الفعلي لليوم الحالي فقط وفحص وجود حركة رصد
        attSnap.forEach(doc => {
            const d = doc.data();
            if (d.date === todayStr) {
                hasRecordsToday = true;
                if (d.status === 'absent') {
                    absentToday++;
                }
            }
        });

        // 2. حل ثغرة عداد الاستئذان: جرد وتصفية الحالات لتاريخ اليوم الحالي فقط
        gateSnap.forEach(doc => {
            const d = doc.data();
            if (d.date === todayStr || (d.createdAt && d.createdAt.toDate().toLocaleDateString('ar-KW') === todayStr)) {
                gatepassToday++;
            }
        });

        // 3. حل الثغرة المنطقية: لو لم يقم أي معلم برصد الحضور والغياب لليوم حتى الآن
        if (!hasRecordsToday) {
            cardsContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; background:#fff3cd; border-radius:12px; border:2px solid #ffc107; direction:rtl; width:100%;">
                    <h3 style="color:#856404; font-weight:900;"><i class="bi bi-hourglass-split"></i> لم يتم تسجيل الغياب بعد لهذا اليوم</h3>
                    <p style="color:#666; font-size:13px; font-weight:bold; margin-top:5px;">في انتظار قيام أعضاء هيئة التعليم برصد الحصة الأولى لتنشيط العدادات لايف...</p>
                </div>`;
            
            // تدمير شارت الرسم البياني القديم لمنع تداخل الرسوم
            const canvas = document.getElementById('attendanceChart');
            if (canvas && window.myLiveAttendanceChart) {
                window.myLiveAttendanceChart.destroy();
                window.myLiveAttendanceChart = null;
            }
            return;
        }

        // 4. الحساب الرياضي الصحيح للحضور: (إجمالي الطلاب - الغائبين الفعليين)
        let presentToday = totalStudents - absentToday;
        if (presentToday < 0) presentToday = 0;

        // 🎨 ضخ بطاقات العدادات بتصميم فخم ومحدث بالملي
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

        // 📈 إعادة بناء وتوليد المنحنى الدائري للحضور والغياب الفعلي
        renderAttendanceChartLive(presentToday, absentToday);

    } catch(e) {
        cardsContainer.innerHTML = `<div style="color:red; font-weight:bold; grid-column: 1/-1; text-align:center;">❌ خطأ في تحديث المؤشرات: ${e.message}</div>`;
    }
}

function renderAttendanceChartLive(present, absent) {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas) return;

    if (window.myLiveAttendanceChart) {
        window.myLiveAttendanceChart.destroy();
    }

    window.myLiveAttendanceChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['حضور', 'غياب'],
            datasets: [{
                data: [present, absent],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Cairo', weight: 'bold' } } }
            }
        }
    });
}