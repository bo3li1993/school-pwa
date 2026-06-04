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

// دالة بناء واجهة استعراض وقوائم الفصول الدراسية هجائياً
export async function initClassesModule() {
    const container = document.getElementById('tab-classes');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-houses-fill" style="color:var(--accent-color);"></i> نظام إدارة واستعراض قوائم الفصول الدراسية المعتمدة</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى اختيار الصف الدراسي لتوليد واستعراض القائمة الرسمية لأسماء الطلاب هجائياً من الخادم السحابي.</p>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اختر الفصل المراد عرضه</label>
                <select id="cls-view-select" onchange="window.loadClassRosterRoster()" style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                    <option value="">-- اختر الفصل الدراسي --</option>
                    <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                    <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                    <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                    <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                </select>
            </div>

            <div id="class-roster-display-area"></div>
        </div>
    `;

    container.innerHTML = html;
}

// دالة جلب وفرز أسماء الطلاب التابعين للفصل هجائياً بشكل منظم جداً
window.loadClassRosterRoster = async function() {
    const classId = document.getElementById('cls-view-select').value;
    const area = document.getElementById('class-roster-display-area');
    if(!classId) { area.innerHTML = ''; return; }

    area.innerHTML = '<p style="text-align:center; font-size:13px; color:#666; font-weight:bold; padding:20px;">جاري فحص وتوليد قائمة الفصل من السيرفر السحابي...</p>';

    try {
        const snap = await getDocs(collection(db, 'students'));
        let classStudents = [];

        snap.forEach(docSnap => {
            const s = docSnap.data();
            if(s.classId === classId || s.class === classId) {
                classStudents.push({ id: docSnap.id, name: s.name || s.studentName });
            }
        });

        if(classStudents.length === 0) {
            area.innerHTML = '<p style="text-align:center; color:var(--danger-color); font-weight:bold; padding:20px;">⚠️ تنبيه: لا يوجد طلاب مسجلين في هذا الفصل حالياً بقاعدة البيانات.</p>';
            return;
        }

        // ترتيب أسماء طلاب الفصل هجائياً بالملي
        classStudents.sort((a, b) => a.name.localeCompare(b, 'ar'));

        let html = `
            <div style="background:#f8f9fa; padding:12px; border-radius:6px; margin-bottom:15px; display:flex; justify-content:between; align-items:center; border-right:4px solid var(--accent-color);">
                <span style="font-size:13px; font-weight:800; color:var(--primary-color);">📊 إحصائية سريعة للفصل (${classId}): إجمالي الطلاب المقيدين بالفصل = ${classStudents.length} طالب</span>
            </div>

            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#1a1a2e; color:white;">
                            <th style="padding:12px; border-bottom:2px solid #ddd; color:white; width:80px; text-align:center;">مسلسل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; color:white;">اسم الطالب الدراسي المعتمد</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; color:white; width:150px; text-align:center;">رقم الملف الرقمي</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        classStudents.forEach((student, index) => {
            html += `
                <tr style="border-bottom:1px solid #eee; background:#fff;">
                    <td style="padding:12px; text-align:center; font-weight:800; color:#666; background:#fdfdfd;">${index + 1}</td>
                    <td style="padding:12px; font-size:14px;"><b>${student.name}</b></td>
                    <td style="padding:12px; text-align:center;"><span style="font-family:monospace; background:#e1b12c; color:#111; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold;">ID-${student.id.substring(0,5).toUpperCase()}</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            
            <button onclick="window.printClassRosterText('${classId}')" style="background:#27ae60; color:white; margin-top:15px; width:100%; padding:12px; font-size:14px;"><i class="bi bi-printer-fill"></i> طباعة كشف أسماء الفصل الرسمي (PDF)</button>
        `;

        area.innerHTML = html;
    } catch(e) {
        area.innerHTML = '<p style="text-align:center; color:red; padding:20px;">خطأ أثناء الاتصال بالخادم جراء استدعاء القوائم الفصيلية.</p>';
    }
};

// دالة طباعة سريعة ومعتمدة للكشف الإداري للفصل
window.printClassRosterText = function(classId) {
    alert(`جاري تجهيز أمر الطباعة لكشف كشوف أسماء طلاب فصل ${classId} المعتمد...`);
    window.print();
};