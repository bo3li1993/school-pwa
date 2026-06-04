import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء واجهة تحليل كفاءة أداء الأقسام الدراسية
export async function initTeacherPerfModule() {
    const container = document.getElementById('tab-teacher-perf');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--hover-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-graph-up-arrow" style="color:var(--hover-color);"></i> لوحة قياس وتحليل كفاءة أداء الأقسام الفنية والمعلمين</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">تقوم اللوحة باحتساب متوسط التقييمات الفنية التراكمية بناءً على استمارات رصد الحصص والزيارات المعتمدة لكل قسم.</p>
            
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">القسم الفني / المادة الدراسية</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">عدد الزيارات المرصودة</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">متوسط الدرجة التراكمية</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">نسبة الكفاءة العامة للقسم</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">مستوى استقرار القسم</th>
                        </tr>
                    </thead>
                    <tbody id="perf-departments-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري تحليل ومعالجة مؤشرات الأداء السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    calculateDepartmentPerformance();
}

// محرك فرز وتحليل متوسطات درجات الأقسام من السيرفر
async function calculateDepartmentPerformance() {
    const tbody = document.getElementById('perf-departments-tbody');
    if (!tbody) return;

    // قائمة الأقسام الأساسية بالمدرسة لضمان ظهورها حتى لو لم ترصد لها زيارات بعد
    let deptsData = {
        "التربية الإسلامية": { totalScore: 0, visitsCount: 0 },
        "اللغة العربية": { totalScore: 0, visitsCount: 0 },
        "اللغة الإنجليزية": { totalScore: 0, visitsCount: 0 },
        "الرياضيات": { totalScore: 0, visitsCount: 0 },
        "العلوم": { totalScore: 0, visitsCount: 0 },
        "الاجتماعيات": { totalScore: 0, visitsCount: 0 },
        "الحاسوب": { totalScore: 0, visitsCount: 0 }
    };

    try {
        const snap = await getDocs(collection(db, 'technical_visits'));
        
        // قراءة وتحليل مجموع الدرجات الفنية لكل قسم
        snap.forEach(docSnap => {
            const v = docSnap.data();
            const dName = v.deptName;
            if (deptsData[dName]) {
                deptsData[dName].totalScore += v.totalScore || 0;
                deptsData[dName].visitsCount += 1;
            }
        });

        let html = '';
        
        for (let deptName in deptsData) {
            const d = deptsData[deptName];
            
            // حساب المتوسط والنسبة المئوية (الدرجة العظمى للاستمارة هي 90)
            let avgScore = d.visitsCount > 0 ? (d.totalScore / d.visitsCount).toFixed(1) : 0;
            let percentage = d.visitsCount > 0 ? ((avgScore / 90) * 100).toFixed(1) : 0;
            
            // تحديد حالة استقرار كفاءة القسم
            let statusBadge = `<span class="badge" style="background:#7f8c8d;">لم يُرصد بعد</span>`;
            let badgeBg = '#27ae60';
            
            if (d.visitsCount > 0) {
                if (percentage >= 85) {
                    statusBadge = `<span class="badge success" style="background:#27ae60;"><i class="bi bi-check-circle-fill"></i> أداء متميز (امتياز)</span>`;
                } else if (percentage >= 70) {
                    statusBadge = `<span class="badge info" style="background:#3498db;"><i class="bi bi-info-circle-fill"></i> أداء مستقر (جيد جداً)</span>`;
                    badgeBg = '#3498db';
                } else {
                    statusBadge = `<span class="badge danger" style="background:#e74c3c;"><i class="bi bi-exclamation-circle-fill"></i> يتطلب متابعة توجيهية</span>`;
                    badgeBg = '#e74c3c';
                }
            }

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:14px;"><b>${deptName}</b></td>
                    <td style="padding:14px; text-align:center; font-weight:700; color:#555;">${d.visitsCount} زيارات</td>
                    <td style="padding:14px; text-align:center; font-weight:800; color:var(--primary-color);">${d.visitsCount > 0 ? avgScore + ' / 90' : '-'}</td>
                    <td style="padding:14px; text-align:center;">
                        <span style="background:${d.visitsCount > 0 ? badgeBg : '#eee'}; color:${d.visitsCount > 0 ? '#fff' : '#999'}; padding:3px 9px; border-radius:12px; font-size:12px; font-weight:bold;">
                            ${d.visitsCount > 0 ? percentage + '%' : '-'}
                        </span>
                    </td>
                    <td style="padding:14px;">${statusBadge}</td>
                </tr>
            `;
        }

        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ أثناء معالجة مؤشرات كفاءة الأداء.</td></tr>';
    }
}