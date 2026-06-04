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

// دالة بناء وتوليد واجهة بوابة الحارس والأمن والسلامة
export async function initGuardModule() {
    const container = document.getElementById('tab-guard');
    if (!container) return;

    let html = `
        <!-- الجزء الأول: رادار مطابقة تصاريح خروج الطلاب الفورية -->
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fffdfd; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); margin-bottom:20px;">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-shield-lock-fill" style="color:var(--danger-color);"></i> رادار مطابقة تذاكر وتصاريح خروج الطلاب (بوابة الأمن)</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">يتم تحديث هذه القائمة تلقائياً بحسب التصاريح الصادرة من إدارة المدرسة للسماح بخروج الطالب فوراً.</p>
            
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#fff5f5;">
                            <th style="padding:12px; border-bottom:2px solid #fbc2c2;">وقت الاعتماد</th>
                            <th style="padding:12px; border-bottom:2px solid #fbc2c2;">اسم الطالب</th>
                            <th style="padding:12px; border-bottom:2px solid #fbc2c2;">الفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #fbc2c2;">الشخص المستلم</th>
                            <th style="padding:12px; border-bottom:2px solid #fbc2c2;">حالة التصريح</th>
                        </tr>
                    </thead>
                    <tbody id="guard-live-gatepasses-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px;">جاري فحص تصاريح المغادرة النشطة...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- الجزء الثاني: سجل مراجعات وتوثيق الضيوف والزوار للعيان -->
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-person-badge-fill" style="color:var(--primary-color);"></i> سجل توثيق مراجعات الزوار والضيوف الرسميين</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يجب تقييد بيانات أي زائر يدخل المنشأة التعليمية لأسباب تنظيمية وأمنية مستدامة.</p>
            
            <form id="visitor-log-form" onsubmit="window.submitVisitorLogForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الزائر الكريم</label>
                        <input type="text" id="guard-v-name" placeholder="أدخل الاسم بالكامل" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">رقم الهاتف / الهوية</label>
                        <input type="text" id="guard-v-phone" placeholder="أدخل رقم التواصل" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">سبب الزيارة والجهة المستهدفة</label>
                        <input type="text" id="guard-v-reason" placeholder="مثال: مراجعة شؤون طلبة / اجتماع إدارة" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;">
                    </div>
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-shield-check"></i> توثيق وحفظ بيانات الزائر بالسيرفر</button>
            </form>

            <hr style="border:0; border-top:1px solid #eee; margin:25px 0;">
            <h3 style="font-size:14px; color:var(--primary-color); margin-bottom:15px; font-weight:800;">📋 قائمة الزوار الذين تم رصدهم وتوثيقهم مسبقاً</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">تاريخ ودقيقة الدخول</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الزائر</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">رقم التواصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الغرض من الزيارة</th>
                        </tr>
                    </thead>
                    <tbody id="visitors-archive-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري تحميل سجل الزيارات الأمنية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadLiveGatepassesForGuard();
    loadVisitorsLogArchive();
}

// دالة فحص وتحديث رادار تصاريح خروج الطلاب من سيرفر الفايربيس للربط بين الإدارة والحارس
async function loadLiveGatepassesForGuard() {
    const tbody = document.getElementById('guard-live-gatepasses-tbody');
    if(!tbody) return;
    try {
        const snap = await getDocs(collection(db, 'gatepasses'));
        let html = ''; let count = 0;
        snap.forEach(docSnap => {
            count++;
            const g = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee; background:#fffdfd;">
                    <td style="padding:12px;"><small>${g.date || ''} - ${g.time || ''}</small></td>
                    <td style="padding:12px; color:var(--primary-color);"><b>${g.studentName}</b></td>
                    <td style="padding:12px;"><span style="background:var(--primary-color); color:white; padding:2px 6px; border-radius:4px; font-size:11px;">${g.classId}</span></td>
                    <td style="padding:12px; font-weight:bold; color:#555;">${g.parentName}</td>
                    <td style="padding:12px;"><span class="badge success" style="background:#27ae60; font-size:11px;"><i class="bi bi-check2-circle"></i> مصرح بالخروج</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">لا توجد تصاريح خروج نشطة أو معتمدة حالياً.</td></tr>' : html;
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">خطأ في رصد الرادار السحابي.</td></tr>'; }
}

// دالة تسجيل وحفظ الزوار الجدد في قاعدة البيانات
window.submitVisitorLogForm = async function(e) {
    e.preventDefault();
    const name = document.getElementById('guard-v-name').value.trim();
    const phone = document.getElementById('guard-v-phone').value.trim();
    const reason = document.getElementById('guard-v-reason').value.trim();

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'visitor_logs'), {
            visitorName: name,
            visitorPhone: phone,
            reason: reason,
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم توثيق دخول الزائر (${name}) بنجاح بسجلات الأمن والسلامة.`);
        document.getElementById('visitor-log-form').reset();
        loadVisitorsLogArchive();
    } catch(err) { alert('خطأ أثناء حفظ الحركة الأمنية: ' + err.message); }
};

// دالة جلب وعرض أرشيف سجل الزوار
async function loadVisitorsLogArchive() {
    const tbody = document.getElementById('visitors-archive-tbody');
    if(!tbody) return;
    try {
        const snap = await getDocs(collection(db, 'visitor_logs'));
        let html = ''; let count = 0;
        snap.forEach(docSnap => {
            count++;
            const v = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;"><small>${v.date || ''}<br>${v.time || ''}</small></td>
                    <td style="padding:12px;"><b>${v.visitorName}</b></td>
                    <td style="padding:12px; font-weight:bold; color:#666;">${v.visitorPhone}</td>
                    <td style="padding:12px;"><small style="font-weight:bold; color:#555;">${v.reason}</small></td>
                </tr>
            `;
        });
        tbody.innerHTML = count === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">سجل المراجعات والزوار خالي من الحركات حالياً.</td></tr>' : html;
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">خطأ في تحميل الأرشيف الأمني.</td></tr>'; }
}