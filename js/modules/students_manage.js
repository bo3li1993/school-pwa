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

// دالة بناء واجهة إدارة الطلاب ورفع الملفات الجماعية
export async function initStudentsManageModule() {
    const container = document.getElementById('tab-students-manage');
    if (!container) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; text-align: right;">
            
            <!-- 1. واجهة رفع قوائم الطلاب جماعياً عبر ملف Excel -->
            <div class="card" style="border-top: 5px solid var(--success-color); background:#fffdf5; padding:20px; border-radius:12px;">
                <h2><i class="bi bi-file-earmark-excel-fill" style="color:var(--success-color);"></i> رفع وتحديث قوائم طلاب المدرسة جماعياً (Excel Bulk Upload)</h2>
                <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">يرجى اختيار ملف Excel يحتوي على أعمدة [اسم الطالب] و [الفصل] لرفع البيانات وضخها دفعة واحدة في السيرفر السحابي.</p>
                
                <div style="border: 2px dashed var(--success-color); padding: 20px; text-align: center; border-radius: 8px; background: #fafffa; margin-bottom: 12px;">
                    <input type="file" id="excel-bulk-file-input" accept=".xlsx, .xls" onchange="window.handleStudentsExcelUpload(event)" style="display:none;">
                    <button onclick="document.getElementById('excel-bulk-file-input').click()" style="background:var(--success-color); padding:10px 20px;"><i class="bi bi-cloud-arrow-up-fill"></i> اختر ملف الـ Excel من جهازك</button>
                    <p id="excel-upload-status-text" style="font-size:12px; margin-top:10px; color:#666; font-weight:bold;">ولم يتم اختيار أي ملف حالياً</p>
                </div>
            </div>

            <!-- 2. واجهة إضافة طالب مفرد يدوياً -->
            <div class="card" style="border-top: 5px solid var(--primary-color); background:#fff; padding:20px; border-radius:12px;">
                <h2><i class="bi bi-person-plus-fill"></i> تسجيل وإضافة طالب فردي يدوياً بقاعدة البيانات</h2>
                <form id="single-student-form" onsubmit="window.submitSingleStudentForm(event)">
                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:15px; margin-bottom:12px;">
                        <div>
                            <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الطالب رباعياً</label>
                            <input type="text" id="sm-student-name" placeholder="أدخل اسم الطالب بالكامل" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                        </div>
                        <div>
                            <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي</label>
                            <select id="sm-class-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                                <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                                <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                                <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                                <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" style="background:var(--primary-color); width:100%; padding:12px;"><i class="bi bi-plus-circle-fill"></i> حفظ وإدراج الطالب بقاعدة البيانات</button>
                </form>
            </div>

        </div>
    `;

    container.innerHTML = html;
}

// محرك قراءة وتحليل ملف الإكسيل وضخ الأسماء جماعياً بالفايربيس
window.handleStudentsExcelUpload = function(e) {
    const file = e.target.files[0];
    const statusText = document.getElementById('excel-upload-status-text');
    if (!file) return;

    statusText.innerHTML = `⏳ جاري فحص وقراءة ملف: <b>${file.name}</b>...`;

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // تحويل الأسطر إلى كائن JSON مفرز
            const rows = XLSX.utils.sheet_to_json(worksheet);
            
            if (rows.length === 0) {
                statusText.innerHTML = `<span style="color:red;">⚠️ الملف فارغ أو يحتوي على بيانات غير صالحة!</span>`;
                return;
            }

            statusText.innerHTML = `🚀 جاري ضخ عدد (${rows.length}) طالب إلى خادم السحاب السحابي، يرجى الانتظار...`;
            
            let successCount = 0;
            const studentsRef = collection(db, 'students');

            for (let row of rows) {
                // مطابقة الأسماء المعتادة للأعمدة (اسم الطالب / الفصل)
                let name = row["اسم الطالب"] || row["Name"] || row["الاسم"];
                let cls = row["الفصل"] || row["Class"] || row["الصف"];

                if (name && cls) {
                    await addDoc(studentsRef, {
                        name: name.toString().trim(),
                        classId: cls.toString().trim(),
                        createdAt: serverTimestamp()
                    });
                    successCount++;
                }
            }

            statusText.innerHTML = `<span style="color:green;"><b>✓ نجاح تجاري:</b> تم رفع وضخ عدد (${successCount}) طالب بنجاح إلى السيرفر وتوزيعهم على الفصول!</span>`;
            alert(`✓ تَمّ رَفْع جَدْوَل الطلاب جَمَاعِيّاً بِنَجَاح لِعَدَد (${successCount}) طَالِب.`);
        } catch (err) {
            statusText.innerHTML = `<span style="color:red;">❌ خطأ في معالجة تركيب ملف الإكسيل: ${err.message}</span>`;
        }
    };
    reader.readAsBinaryString(file);
};

// دالة حفظ الطالب الفردي يدوياً
window.submitSingleStudentForm = async function(e) {
    e.preventDefault();
    const name = document.getElementById('sm-student-name').value.trim();
    const classId = document.getElementById('sm-class-id').value;

    try {
        await addDoc(collection(db, 'students'), {
            name: name,
            classId: classId,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم تسجيل الطالب (${name}) بنجاح وتسكينه بصف ${classId}.`);
        document.getElementById('single-student-form').reset();
    } catch (err) { alert('خطأ أثناء تسجيل الطالب: ' + err.message); }
};