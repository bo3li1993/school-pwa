import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء وتوليد واجهة رصد انضباط وسلوك الطلاب
export async function initBehaviorModule() {
    const container = document.getElementById('tab-behavior');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-exclamation-octagon-fill" style="color:var(--accent-color);"></i> نظام رصد ومتابعة الانضباط السلوكي للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى تسجيل الإجراء أو المخالفة السلوكية المرصودة للطالب لتوثيقها سحابياً وإحالتها لولي الأمر للاعتماد.</p>
            
            <form id="behavior-log-form" onsubmit="window.submitBehaviorLogForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الطالب المشهود بحقه الإجراء</label>
                        <input type="text" id="b-student-name" placeholder="أدخل اسم الطالب رباعياً" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي</label>
                        <select id="b-class-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="">اختر الفصل</option>
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">نوع المخالفة / بطاقة الرصد</label>
                        <select id="b-behavior-type" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="">اختر نوع الإجراء السلوكي</option>
                            <option value="تنبيه شفهي: عدم الالتزام بالزي المدرسي الرسمي">تنبيه شفهي: عدم الالتزام بالزي المدرسي الرسمي</option>
                            <option value="بطاقة صفراء: إثارة الفوضى داخل الفصل الدراسي">بطاقة صفراء: إثارة الفوضى داخل الفصل الدراسي</option>
                            <option value="بطاقة برتقالية: تكرار عدم حل الواجبات المدرسية">بطاقة برتقالية: تكرار عدم حل الواجبات المدرسية</option>
                            <option value="بطاقة حمراء: التأخر المتكرر عن طابور الصباح">بطاقة حمراء: التأخر المتكرر عن طابور الصباح</option>
                            <option value="إحالة إدارية: الخروج من الفصل دون إذن المعلم">إحالة إدارية: الخروج من الفصل دون إذن المعلم</option>
                        </select>
                    </div>
                </div>

                <button type="submit" style="background:var(--accent-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-file-earmark-medical-fill"></i> تسجيل الإجراء السلوكي وإحاطة ولي الأمر فورياً</button>
            </form>
        </div>

        <!-- جدول أرشيف المخالفات السلوكية وحالة اعتماد ولي الأمر -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--primary-color);">
            <h2><i class="bi bi-shield-exclamation"></i> أرشيف سجلات الانضباط السلوكي العام وحالة الاعتماد الرقمي</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التاريخ والوقت</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">طبيعة الإجراء السلوكي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">حالة توقيع ولي الأمر</th>
                        </tr>
                    </thead>
                    <tbody id="behavior-archive-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري تدقيق السجلات السلوكية السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadBehaviorArchiveFromServer();
}

// دالة معالجة وحفظ البيانات بالسيرفر
window.submitBehaviorLogForm = async function(e) {
    e.preventDefault();
    
    const studentName = document.getElementById('b-student-name').value.trim();
    const classId = document.getElementById('b-class-id').value;
    const behaviorType = document.getElementById('b-behavior-type').value;

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'behavior'), {
            studentName: studentName,
            classId: classId,
            behaviorType: behaviorType,
            parentAcknowledged: false, // افتراضي غير موقع لغاية ما يدش الأب ويوقع
            acknowledgedAt: "",
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });

        alert(`✓ تم تقييد الإجراء السلوكي بنجاح ضد الطالب (${studentName}) وبانتظار اعتماد ولي الأمر.`);
        document.getElementById('behavior-log-form').reset();
        loadBehaviorArchiveFromServer();
    } catch (err) {
        alert('خطأ أثناء تسجيل المخالفة بالسيرفر: ' + err.message);
    }
};

// دالة جلب وعرض أرشيف السلوك مع فحص حالة توقيع الأب حياً
async function loadBehaviorArchiveFromServer() {
    const tbody = document.getElementById('behavior-archive-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'behavior'));
        let html = ''; let count = 0;

        snap.forEach(docSnap => {
            count++;
            const b = docSnap.data();
            
            // تحديد شارة التوقيع الرقمي للأب
            let signBadge = `<span class="badge warning" style="background:var(--accent-color);"><i class="bi bi-clock"></i> قيد انتظار التوقيع</span>`;
            if(b.parentAcknowledged) {
                signBadge = `<span class="badge success" style="background:var(--success-color);" title="${b.acknowledgedAt || ''}"><i class="bi bi-patch-check-fill"></i> تم الاعتماد إلكترونياً</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${b.date || ''}<br>${b.time || ''}</small></td>
                  <td style="padding:12px;"><b>${b.studentName}</b></td>
                  <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${b.classId}</span></td>
                  <td style="padding:12px; font-weight:bold; color:#555;">${b.behaviorType}</td>
                  <td style="padding:12px;">${signBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; font-weight:bold; padding:15px;">لا توجد إجراءات سلوكية مقيدة بالسيرفر حالياً.</td></tr>' : html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ أثناء سحب سجلات الانضباط.</td></tr>';
    }
}