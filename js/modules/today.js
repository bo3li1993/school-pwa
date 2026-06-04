import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// إعدادات ومفاتيح قواعد البيانات السحابية المعتمدة للمدرسة
const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// دالة بناء واحتساب مؤشرات الداشبورد الرئيسية حياً من السيرفر
export async function initTodayModule() {
    const statsContainer = document.getElementById('stats-cards');
    if (!statsContainer) return;

    // وضع حالة تحميل مؤقتة فخمة لحين جلب البيانات الفورية
    statsContainer.innerHTML = `
        <div class="stat-card" style="grid-column: 1/-1; padding: 20px; font-weight: bold; background: linear-gradient(135deg, var(--primary-color) 0%, #2c2c54 100%);">
            <i class="bi bi-arrow-clockwise rotate-loading"></i> جاري فحص سجلات الحضور والغياب وضخ المؤشرات الحيوية لايف...
        </div>
    `;

    try {
        // 1. جلب إجمالي عدد الطلاب الفعلي المقيدين بالسيرفر
        const studentsSnap = await getDocs(collection(db, 'students'));
        let totalStudents = studentsSnap.size || 0;

        // 2. جلب وتصفية غياب اليوم الحالي بالملي
        const todayDateStr = new Date().toLocaleDateString('ar-KW');
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        
        let absentCount = 0;
        attendanceSnap.forEach(docSnap => {
            const att = docSnap.data();
            if (att.date === todayDateStr && att.status === 'absent') {
                absentCount++;
            }
        });

        // 3. احتساب عدد الحاضرين تلقائياً
        let presentCount = totalStudents - absentCount;
        if (presentCount < 0) presentCount = 0;

        // 4. حقن وتحديث كروت الشاشة بالأرقام الحية الصادقة
        statsContainer.innerHTML = `
            <div class="stat-card"><h3>${totalStudents}</h3><p>إجمالي طلاب المدرسة</p></div>
            <div class="stat-card" style="background:linear-gradient(135deg,#2ecc71 0%,#1abc9c 100%)"><h3>${presentCount}</h3><p>حاضرون اليوم</p></div>
            <div class="stat-card" style="background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%)"><h3>${absentCount}</h3><p>غائبون اليوم</p></div>
        `;

        // 5. تحديث الرسم البياني الدائري (Chart.js) حياً بناءً على الأرقام اليديدة
        renderLiveAttendanceChart(presentCount, absentCount);

    } catch (e) {
        statsContainer.innerHTML = `
            <div class="stat-card" style="grid-column: 1/-1; background:var(--danger-color); color:white;">
                ⚠️ خطأ أثناء مزامنة المؤشرات الحية: ${e.message}
            </div>
        `;
    }
}

// دالة تحديث وإعادة رسم البياني الدائري حياً دون تداخل بالذاكرة
function renderLiveAttendanceChart(present, absent) {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    // تدمير الرسم القديم المعلق إن وجد لمنع التداخل البصري
    if (window.myLiveChartInstance) {
        window.myLiveChartInstance.destroy();
    }

    window.myLiveChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['حضور', 'غياب'],
            datasets: [{
                data: [present, absent],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });
}