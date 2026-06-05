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

// دالة بناء وتوليد واجهة نظام الغياب المتكرر والإنذارات المدرسية
export async function initRepeatModule() {
    const container = document.getElementById('tab-repeat');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <div>
                    <h2><i class="bi bi-exclamation-triangle-fill" style="color:var(--danger-color);"></i> رادار كشف الغياب المتكرر والإنذارات السلوكية</h2>
                    <p style="font-size:12px; color:#666; font-weight:bold; margin-top:4px;">يقوم النظام تلقائياً بتحليل سجلات الحضور السحابية وتجميع الطلاب الذين تكرر غيابهم لإصدار إنذارات فورية.</p>
                </div>
                <button onclick="window.exportAsManzoumaExcel('repeat-absence-table', 'كشف_الغياب_المتكرر')" style="background:var(--success-color); font-size:13px; padding:8px 16px;">
                    <i class="bi bi-file-earmark-excel-fill"></i> تصدير الكشف الحالي Excel
                </button>
            </div>

            <div style="overflow-x:auto; margin-top:15px;">
                <table id="repeat-absence-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب الدراسي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">الفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center; color:var(--danger-color);">إجمالي أيام الغياب</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">مستوى الإجراء الإداري</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">حالة المتابعة</th>
                        </tr>
                    </thead>
                    <tbody id="repeat-absence-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري تشغيل الرادار وفحص السجلات السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    calculateRepeatAbsenceLive();
}

// محرك ذكي مفرز لحساب وتجميع الغياب التراكمي لكل طالب حياً
async function calculateRepeatAbsenceLive() {
    const tbody = document.getElementById('repeat-absence-tbody');
    if (!tbody) return;

    try {
        // جلب كل سجلات الغياب المقيدة بالسيرفر
        const snap = await getDocs(collection(db, 'attendance'));
        let absenceTracker = {};

        // تجميع غياب كل طالب على حدة وحساب التكرار
        snap.forEach(docSnap => {
            const att = docSnap.data();
            if (att.status === 'absent') {
                const sName = att.studentName || att.name;
                if (sName) {
                    if (!absenceTracker[sName]) {
                        absenceTracker[sName] = {
                            name: sName,
                            classId: att.classId || 'غير محدد',
                            absentDays: 0
                        };
                    }
                    absenceTracker[sName].absentDays++;
                }
            }
        });

        // تحويل البيانات لمصفوفة وفرزها من الأكثر غياباً للأقل
        let sortedStudents = Object.values(absenceTracker);
        // تصفية الكشف لعرض فقط الطلاب الذين غابوا مرتين أو أكثر لتسليط الضوء عليهم
        let repeatStudents = sortedStudents.filter(s => s.absentDays >= 2);
        repeatStudents.sort((a, b) => b.absentDays - a.absentDays);

        let html = '';
        repeatStudents.forEach(s => {
            let actionBadge = '';
            let statusText = '';

            // تحديد نوع الإنذار والإجراء الإداري بحسب الأنظمة التربوية الرسمية للكويت
            if (s.absentDays >= 5) {
                actionBadge = `<span class="badge danger" style="background:#c0392b; padding:4px 8px;">🚨 إنذار ثالث + استدعاء ولي أمر</span>`;
                statusText = `<b style="color:#c0392b;">حرج جداً</b>`;
            } else if (s.absentDays >= 3) {
                actionBadge = `<span class="badge warning" style="background:#d35400; padding:4px 8px;">⚠️ إنذار ثاني خطي</span>`;
                statusText = `<b style="color:#d35400;">تحت المتابعة</b>`;
            } else {
                actionBadge = `<span class="badge info" style="background:#2980b9; padding:4px 8px;">✉️ إنذار أول شفهي</span>`;
                statusText = `<span style="color:#2980b9; font-weight:bold;">تنبيه أولي</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;"><b>👤 ${s.name}</b></td>
                    <td style="padding:12px; text-align:center;"><span class="badge info">${s.classId}</span></td>
                    <td style="padding:12px; text-align:center; font-weight:900; color:var(--danger-color); font-size:16px;">${s.absentDays} أيام</td>
                    <td style="padding:12px; text-align:center;">${actionBadge}</td>
                    <td style="padding:12px; text-align:center; font-size:12px;">${statusText}</td>
                </tr>
            `;
        });

        tbody.innerHTML = repeatStudents.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#27ae60; padding:20px; font-weight:bold;">🥇 مبروك! لا يوجد طلاب مسجلين في قائمة الغياب المتكرر حالياً.</td></tr>' : html;

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ رادار الغياب: ${e.message}</td></tr>`;
    }
}