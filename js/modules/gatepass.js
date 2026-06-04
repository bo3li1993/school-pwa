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

// دالة بناء وتوليد واجهة إصدار وتوثيق تصاريح الاستئذان
export async function initGatepassModule() {
    const container = document.getElementById('tab-gatepass');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-ticket-perforated-fill" style="color:var(--accent-color);"></i> نظام إصدار وتوثيق تصاريح الخروج المغادرة للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى تسجيل بيانات التصريح الرسمي لخروج الطالب وتحديد هوية المستلم للمطابقة الأمنية عند البوابة.</p>
            
            <form id="gatepass-log-form" onsubmit="window.submitGatepassLogForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الطالب المستأذن</label>
                        <input type="text" id="g-student-name" placeholder="أدخل اسم الطالب رباعياً" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي</label>
                        <select id="g-class-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="">اختر الفصل</option>
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم ولي الأمر / المستلم</label>
                        <input type="text" id="g-parent-name" placeholder="اسم الشخص المسؤول عن استلام الطالب" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                </div>

                <div style="text-align:right; margin-bottom:15px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">سبب الخروج والمغادرة الطارئة</label>
                    <input type="text" id="g-reason" placeholder="مثال: مراجعة طبية عاجلة / ظروف عائلية خاصة" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;">
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-printer-fill"></i> اعتماد وإصدار تصريح المغادرة السحابي فوراً</button>
            </form>
        </div>

        <!-- جدول أرشيف تصاريح الخروج الصادرة اليوم مسبقاً -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--accent-color);">
            <h2><i class="bi bi-ticket-detailed-fill"></i> أرشيف تصاريح المغادرة المعتمدة وحالة حركة البوابة الأمنية</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">وقت المغادرة بالملي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">ولي الأمر المستلم</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">السبب المعتمد</th>
                        </tr>
                    </thead>
                    <tbody id="gatepass-archive-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري مراجعة وثائق البوابة الأمنية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadGatepassArchiveFromServer();
}

// دالة معالجة وحفظ تصريح الخروج بالسيرفر الموحد لربطه ببوابة الحارس والأب
window.submitGatepassLogForm = async function(e) {
    e.preventDefault();
    
    const studentName = document.getElementById('g-student-name').value.trim();
    const classId = document.getElementById('g-class-id').value;
    const parentName = document.getElementById('g-parent-name').value.trim();
    const reason = document.getElementById('g-reason').value.trim();

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'gatepasses'), {
            studentName: studentName,
            classId: classId,
            parentName: parentName,
            reason: reason,
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });

        alert(`✓ تم اعتماد رخصة المغادرة بنجاح.\nبإمكان الطالب (${studentName}) التوجه للبوابة الأمنية الآن.`);
        document.getElementById('gatepass-log-form').reset();
        loadGatepassArchiveFromServer();
    } catch (err) {
        alert('خطأ أثناء رفع وثيقة التصريح للسيرفر: ' + err.message);
    }
};

// دالة سحب وتحديث أرشيف وثائق الخروج من السيرفر
async function loadGatepassArchiveFromServer() {
    const tbody = document.getElementById('gatepass-archive-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'gatepasses'));
        let html = ''; let count = 0;

        snap.forEach(docSnap => {
            count++;
            const g = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><span class="badge success" style="background:#27ae60; font-size:11px;">🕒 الموعد: ${g.date || ''} - ${g.time || ''}</span></td>
                  <td style="padding:12px;"><b>${g.studentName}</b></td>
                  <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${g.classId}</span></td>
                  <td style="padding:12px; font-weight:bold; color:#555;">${g.parentName}</td>
                  <td style="padding:12px;"><small style="font-weight:bold; color:#777;">${g.reason}</small></td>
                </tr>
            `;
        });

        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; font-weight:bold; padding:15px;">لم يتم إصدار أي تصاريح مغادرة أو استئذان لليوم.</td></tr>' : html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ أثناء جلب أرشيف البوابة الأمنية.</td></tr>';
    }
}