import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, writeBatch, doc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء واجهة محرك التوزيع وإعادة هيكلة الفصول من قوقل شيت
export async function initDistributionModule() {
    const container = document.getElementById('tab-classes');
    if (!container) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; text-align: right;">
            
            <!-- لوحة التحكم في رفع وتحديث كشوف التوزيع -->
            <div class="card" style="border-top: 5px solid var(--accent-color); background:#fff; padding:20px; border-radius:12px;">
                <h2><i class="bi bi-diagram-3-fill" style="color:var(--accent-color);"></i> محرك إعادة توزيع الطلاب وتحديث الفصول (من Google Sheets)</h2>
                <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">نزل كشف التوزيع الحالي من Google Sheets كملف Excel، ثم ارفعه هنا ليقوم النظام بإعادة تسكين وتوزيع الطلاب على فصولهم الجديدة فوراً بالسيرفر.</p>
                
                <div style="border: 2px dashed var(--accent-color); padding: 25px; text-align: center; border-radius: 8px; background: #fffbf7; margin-bottom: 15px;">
                    <input type="file" id="excel-dist-file-input" accept=".xlsx, .xls" onchange="window.handleClassDistributionExcel(event)" style="display:none;">
                    <button onclick="document.getElementById('excel-dist-file-input').click()" style="background:var(--accent-color); padding:11px 22px;"><i class="bi bi-cloud-upload-fill"></i> اختيار ملف كشف التوزيع اليديد</button>
                    <p id="dist-upload-status" style="font-size:12px; margin-top:10px; color:#555; font-weight:bold;">بانتظار رفع ملف التوزيع...</p>
                </div>
            </div>

            <!-- جدول استعراض إحصائيات توزيع الفصول الحالية لايف -->
            <div class="card" style="border-top: 5px solid var(--primary-color); background:#fff; padding:20px; border-radius:12px;">
                <h2><i class="bi bi-table"></i> الكثافة الطلابية الحالية بالفصول المقيدة بالسيرفر</h2>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل الدراسي</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">عدد الطلاب الحاليين</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">الحالة الإدارية</th>
                            </tr>
                        </thead>
                        <tbody id="distribution-classes-tbody">
                            <tr><td colspan="3" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري فحص كثافة الفصول السحابية...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;
    loadClassesDensityLive();
}

// محرك قراءة الكشف وإعادة التوزيع الفوري بالفايربيس
window.handleClassDistributionExcel = function(e) {
    const file = e.target.files[0];
    const status = document.getElementById('dist-upload-status');
    if (!file) return;

    status.innerHTML = `⏳ جاري تحليل وقراءة كشف التوزيع: <b>${file.name}</b>...`;

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (rows.length === 0) {
                status.innerHTML = `<span style="color:red;">⚠️ المستند فارغ أو تركيبته غير صالحة!</span>`;
                return;
            }

            status.innerHTML = `🚀 جاري فحص ومطابقة أسامي الطلاب وتحديث فصولهم بالسيرفر...`;
            
            let updatedCount = 0;
            const studentsRef = collection(db, 'students');

            for (let row of rows) {
                let sName = row["اسم الطالب"] || row["Name"] || row["الاسم"];
                let newClass = row["الفصل"] || row["Class"] || row["الصف"];

                if (sName && newClass) {
                    // البحث عن الطالب بالاسم لتحديث فصله الحالي
                    const q = query(studentsRef, where("name", "==", sName.toString().trim()));
                    const querySnap = await getDocs(q);

                    if (!querySnap.empty) {
                        // إذا الطالب موجود، نحدث فصله فوراً
                        const studentDocDoc = doc(db, 'students', querySnap.docs[0].id);
                        const batch = writeBatch(db);
                        batch.update(studentDocDoc, { classId: newClass.toString().trim() });
                        await batch.commit();
                        updatedCount++;
                    } else {
                        // إذا الطالب يدّيد ومو مسجل بالسستم كلش، نضيفه ونحط فصله علطول
                        await addDoc(studentsRef, {
                            name: sName.toString().trim(),
                            classId: newClass.toString().trim(),
                            createdAt: serverTimestamp()
                        });
                        updatedCount++;
                    }
                }
            }

            status.innerHTML = `<span style="color:green;"><b>✓ تم التوزيع بنجاح:</b> تم تحديث وتوزيع عدد (${updatedCount}) طالب على فصولهم الجديدة حياً!</span>`;
            alert(`✓ تَمّتْ إِعَادَةُ تَوْزِيعِ وَتَسْكِينِ عَدَد (${updatedCount}) طَالِب بِنَجَاحِ تِجَارِيّ.`);
            loadClassesDensityLive();

        } catch (err) {
            status.innerHTML = `<span style="color:red;">❌ خطأ في معالجة ملف التوزيع: ${err.message}</span>`;
        }
    };
    reader.readAsBinaryString(file);
};

// دالة حساب كثافة الفصول لايف من السيرفر
async function loadClassesDensityLive() {
    const tbody = document.getElementById('distribution-classes-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'students'));
        let classDensity = {};

        snap.forEach(d => {
            const std = d.data();
            const cId = std.classId || 'غير موزع';
            classDensity[cId] = (classDensity[cId] || 0) + 1;
        });

        let html = '';
        let sortedClasses = Object.keys(classDensity).sort();

        sortedClasses.forEach(cId => {
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;"><b>🏫 الصف / الفصل ${cId}</b></td>
                    <td style="padding:12px; text-align:center; font-weight:900; color:var(--primary-color); font-size:15px;">${classDensity[cId]} طالب</td>
                    <td style="padding:12px; text-align:center;"><span class="badge success">مستقر ومكتمل</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = sortedClasses.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">لا توجد فصول أو طلاب مقيدين حالياً لبدء التوزيع.</td></tr>' : html;

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red; padding:15px;">خطأ في جلب مؤشرات الفصول.</td></tr>';
    }
}