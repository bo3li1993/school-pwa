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

// دالة بناء وتوليد واجهة فحص سجلات الغياب بتاريخ محدد هجائياً
export async function initDateSearchModule() {
    const container = document.getElementById('tab-date');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-calendar-search" style="color:var(--accent-color);"></i> نظام البحث والمطابقة الذكية لكشوف الغياب السنوية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى تحديد التاريخ المراد فحص سجلاته لاستدعاء كشف غياب وحضور الطلاب المعتمد من قاعدة البيانات السحابية.</p>
            
            <div style="display:flex; gap:10px; margin-bottom: 20px; align-items: center;">
                <input type="date" id="history-date-picker" style="margin-bottom:0; flex:1; text-align:center; font-weight:bold;">
                <button onclick="window.fetchAttendanceBySpecificDate()" style="background:var(--primary-color); padding:12px 25px;"><i class="bi bi-search"></i> استدعاء كشف التاريخ</button>
            </div>

            <!-- حاوية تفريغ نتائج البحث التاريخي للفصول -->
            <div id="date-search-results-area"></div>
        </div>
    `;

    container.innerHTML = html;
    
    // تعيين تاريخ اليوم كقيمة افتراضية مريحة للمستخدم
    const todayStr = new Date().toISOString().split('T')[0];
    const picker = document.getElementById('history-date-picker');
    if(picker) picker.value = todayStr;
}

// محرك الفرز السحابي لجلب سجلات الغياب والحضور بحسب اليوم المختار
window.fetchAttendanceBySpecificDate = async function() {
    const pickedDate = document.getElementById('history-date-picker').value;
    const area = document.getElementById('date-search-results-area');
    if(!pickedDate) { alert('الرجاء اختيار التاريخ أولاً!'); return; }

    // تحويل صيغة التاريخ المدخل لتطابق الصيغة العربية المخزنة بالسيرفر (يوم/شهر/سنة)
    const dateObj = new Date(pickedDate);
    const formattedDate = dateObj.toLocaleDateString('ar-KW');

    area.innerHTML = `<p style="text-align:center; font-size:13px; color:#666; font-weight:bold; padding:20px;">⏳ جاري سحب كشوف الحضور والغياب ليوم (${formattedDate}) من السيرفر...</p>`;

    try {
        const snap = await getDocs(collection(db, 'attendance'));
        let absentRecords = [];

        snap.forEach(docSnap => {
            const att = docSnap.data();
            // فلترة السجلات بناءً على التاريخ المختار وحالة الغياب فقط
            if(att.date === formattedDate && att.status === 'absent') {
                absentRecords.push({ name: att.studentName, classId: att.classId || '-' });
            }
        });

        if(absentRecords.length === 0) {
            area.innerHTML = `<p style="text-align:center; color:#27ae60; font-weight:bold; padding:20px;">✓ كشف مثالي: لا يوجد أي حالات غياب مسجلة في تاريخ (${formattedDate}).</p>`;
            return;
        }

        // ترتيب الطلاب تنازلياً أو تصاعدياً حسب الفصول لتسهيل المراجعة الإدارية
        absentRecords.sort((a, b) => a.classId.localeCompare(b.classId));

        let html = `
            <div style="background:#fff5f5; padding:12px; border-radius:6px; margin-bottom:15px; border-right:4px solid var(--danger-color); text-align:right;">
                <span style="font-size:13px; font-weight:800; color:var(--danger-color);">🔴 تم رصد عدد (${absentRecords.length}) طالب غائب في تاريخ ${formattedDate}</span>
            </div>

            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#e74c3c; color:white;">
                            <th style="padding:12px; color:white; width:80px; text-align:center;">مسلسل</th>
                            <th style="padding:12px; color:white;">اسم الطالب الغائب رباعياً</th>
                            <th style="padding:12px; color:white; width:150px; text-align:center;">الفصل الدراسي</th>
                            <th style="padding:12px; color:white; width:120px; text-align:center;">الحالة الإدارية</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        absentRecords.forEach((rec, index) => {
            html += `
                <tr style="border-bottom:1px solid #eee; background:#fff;">
                    <td style="padding:12px; text-align:center; font-weight:800; color:#666;">${index + 1}</td>
                    <td style="padding:12px; font-size:14px;"><b>${rec.name}</b></td>
                    <td style="padding:12px; text-align:center;"><span style="background:#1a1a2e; color:white; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:bold;">${rec.classId}</span></td>
                    <td style="padding:12px; text-align:center;"><span class="badge danger" style="background:var(--danger-color); font-size:11px;">غائب</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        area.innerHTML = html;

    } catch(e) {
        area.innerHTML = '<p style="text-align:center; color:red; padding:20px;">خطأ إداري في استدعاء الأرشيف التاريخي للكشوف.</p>';
    }
};