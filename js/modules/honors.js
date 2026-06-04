import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء وتوليد واجهة لوحة الشرف والتميز الطلابي
export async function initHonorsModule() {
    const container = document.getElementById('tab-honors');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid #e1b12c; text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-trophy-fill" style="color:#e1b12c;"></i> نظام إدارة وتكريم الطلاب الفائقين والمتميزين (لوحة الشرف الرقمية)</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى تسجيل بيانات الطالب المتميز ونوع الثناء الممنوح له لبث التكريم على السيرفر وإخطار ولي الأمر فوراً.</p>
            
            <form id="honor-add-form" onsubmit="window.submitHonorForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الطالب المكرم رباعياً</label>
                        <input type="text" id="h-student-name" placeholder="أدخل اسم الطالب بالفصحى" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي</label>
                        <select id="h-class-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">بند التميز وبراءة التكريم</label>
                        <select id="h-honor-type" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="التميز السلوكي والأخلاق الرفيعة">التميز السلوكي والأخلاق الرفيعة</option>
                            <option value="المواظبة المثالية (سجل خالي من الغياب)">المواظبة المثالية (سجل خالي من الغياب)</option>
                            <option value="التفوق العلمي الباهر وحصد الدرجات العظمى">التفوق العلمي الباهر وحصد الدرجات العظمى</option>
                            <option value="المشاركة الفعالة في الأنشطة المدرسية">المشاركة الفعالة في الأنشطة المدرسية</option>
                        </select>
                    </div>
                </div>

                <button type="submit" style="background:#1a1a2e; color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-award-fill" style="color:#e1b12c;"></i> اعتماد الطالب في لوحة الشرف الكبرى وبث التكريم</button>
            </form>
        </div>

        <!-- معرض لوحة الشرف الفخم -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fdfbf7; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid #e1b12c;">
            <h2 style="color:#1a1a2e;"><i class="bi bi-stars" style="color:#e1b12c;"></i> معرض فرسان التميز ولوحة الشرف المعتمدة للمدرسة</h2>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px; margin-top:15px;" id="honors-cards-area">
                <p style="text-align:center; color:#999; grid-column: 1/-1; padding:20px; font-weight:bold;">جاري استدعاء فرسان التميز من السيرفر...</p>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadHonorsBoardFromServer();
}

// دالة حفظ وبث التكريم السحابي
window.submitHonorForm = async function(e) {
    e.preventDefault();
    const studentName = document.getElementById('h-student-name').value.trim();
    const classId = document.getElementById('h-class-id').value;
    const honorType = document.getElementById('h-honor-type').value;
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'honors_board'), {
            studentName: studentName,
            classId: classId,
            honorType: honorType,
            date: currentDate,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم بنجاح تعميد وإدراج الطالب (${studentName}) في لوحة الشرف الرسمية للمدرسة.`);
        document.getElementById('honor-add-form').reset();
        loadHonorsBoardFromServer();
    } catch (err) { alert('خطأ أثناء رفع بيانات التكريم: ' + err.message); }
};

// دالة جلب وعرض كروت الفائقين بشكل فخم ومميز تجارياً
async function loadHonorsBoardFromServer() {
    const area = document.getElementById('honors-cards-area');
    if (!area) return;

    try {
        const snap = await getDocs(collection(db, 'honors_board'));
        let html = ''; let count = 0;

        snap.forEach(docSnap => {
            count++;
            const h = docSnap.data();
            html += `
                <div style="background:#fff; border:1px solid #f3e5ab; border-radius:8px; padding:15px; box-shadow:0 4px 8px rgba(225,177,44,0.05); position:relative; border-right:5px solid #e1b12c;">
                    <i class="bi bi-award-fill" style="position:absolute; left:15px; top:15px; font-size:24px; color:#e1b12c;"></i>
                    <h4 style="font-size:14px; color:#1a1a2e; margin-bottom:4px; font-weight:900;">${h.studentName}</h4>
                    <span style="background:#1a1a2e; color:white; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">الصف ${h.classId}</span>
                    <p style="font-size:11px; color:#e67e22; font-weight:800; margin-top:8px;"><i class="bi bi-star-fill"></i> ${h.honorType}</p>
                    <div style="margin-top:10px; padding-top:6px; border-top:1px dashed #eee; text-align:left;">
                        <small style="font-size:10px; color:#999; font-weight:bold;">تاريخ التكريم: ${h.date || ''}</small>
                    </div>
                </div>
            `;
        });

        area.innerHTML = count === 0 ? '<p style="text-align:center; color:#999; grid-column:1/-1; padding:20px; font-weight:bold;">لوحة الشرف خالية من المكرمين حالياً، بانتظار إدراج الفرسان.</p>' : html;
    } catch (e) { area.innerHTML = '<p style="text-align:center; color:red; grid-column:1/-1; padding:20px;">خطأ في استدعاء لوحة التكريم الفنية.</p>'; }
}