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

// دالة بناء وتوليد واجهة سجل العيادة المدرسية الطبية
export async function initClinicModule() {
    const container = document.getElementById('tab-clinic');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid #3498db; text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-heart-pulse-fill" style="color:#3498db;"></i> نظام توثيق الإحالات والزيارات الطبية لعيادة المدرسة</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى تسجيل بيانات الزيارة الطبية للطالب بدقة لأرشفة السجل الصحي وإخطار ولي الأمر فوراً.</p>
            
            <form id="clinic-log-form" onsubmit="window.submitClinicLogForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الطالب المراجع</label>
                        <input type="text" id="c-student-name" placeholder="أدخل اسم الطالب رباعياً" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي الحالي</label>
                        <select id="c-class-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="">اختر الفصل</option>
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الأعراض / الشكوى المرضية</label>
                        <input type="text" id="c-symptoms" placeholder="مثال: ارتفاع حرارة / صداع / إصابة صفية" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                </div>

                <div style="text-align:right; margin-bottom:15px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">التدبير الطبي المتخذ والإجراء</label>
                    <textarea id="c-action" rows="2" placeholder="مثال: إعطاء خافض حرارة / تواصل مع ولي الأمر للمغادرة / نقل للمستشفى" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;"></textarea>
                </div>

                <button type="submit" style="background:#3498db; color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-shield-plus"></i> اعتماد وتوثيق السجل الصحي بالطبي السحابي</button>
            </form>
        </div>

        <!-- جدول أرشيف التقارير الصحية -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--primary-color);">
            <h2><i class="bi bi-medical-checklist"></i> أرشيف سجلات المراجعات الصحية لعيادة المدرسة</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التاريخ والوقت</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الأعراض الطبية</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الإجراء المتخذ</th>
                        </tr>
                    </thead>
                    <tbody id="clinic-archive-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري استدعاء الملفات الطبية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadClinicArchiveFromServer();
}

// دالة معالجة وضخ حركات العيادة في قاعدة البيانات
window.submitClinicLogForm = async function(e) {
    e.preventDefault();
    
    const studentName = document.getElementById('c-student-name').value.trim();
    const classId = document.getElementById('c-class-id').value;
    const symptoms = document.getElementById('c-symptoms').value.trim();
    const action = document.getElementById('c-action').value.trim();

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'clinic_logs'), {
            studentName: studentName,
            classId: classId,
            symptoms: symptoms,
            action: action,
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });

        alert(`✓ تم توقيع السجل الصحي للطالب (${studentName}) بنجاح.`);
        document.getElementById('clinic-log-form').reset();
        loadClinicArchiveFromServer();
    } catch (err) {
        alert('خطأ أثناء حفظ الحركة الصحية بالسيرفر: ' + err.message);
    }
};

// دالة سحب وعرض التقارير الطبية المؤرشفة
async function loadClinicArchiveFromServer() {
    const tbody = document.getElementById('clinic-archive-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'clinic_logs'));
        let html = ''; let count = 0;

        snap.forEach(docSnap => {
            count++;
            const c = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${c.date || ''}<br>${c.time || ''}</small></td>
                  <td style="padding:12px;"><b>${c.studentName}</b></td>
                  <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${c.classId}</span></td>
                  <td style="padding:12px; color:var(--danger-color); font-weight:bold;">${c.symptoms}</td>
                  <td style="padding:12px;"><small style="color:#555; font-weight:bold;">${c.action}</small></td>
                </tr>
            `;
        });

        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; font-weight:bold; padding:15px;">لا توجد سجلات زيارات مؤرشفة للعيادة الطبية حالياً.</td></tr>' : html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ أثناء سحب الأرشيف الطبي.</td></tr>';
    }
}