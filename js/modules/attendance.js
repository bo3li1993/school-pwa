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

// دالة بناء وتوليد واجهة رصد الغياب والحضور داخل التبويب الإداري
export async function initAttendanceModule() {
    const container = document.getElementById('tab-absent');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-calendar-check-fill" style="color:var(--danger-color);"></i> نظام رصد ومتابعة الحضور والغياب اليومي للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى اختيار الفصل الدراسي لعرض قوائم أسماء الطلاب ورصد حالات الحضور والغياب فوراً.</p>
            
            <div style="margin-bottom: 20px; text-align:right;">
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي المراد رصده</label>
                <select id="att-class-select" onchange="window.loadStudentsForAttendance()" style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                    <option value="">اختر الفصل الدراسي</option>
                    <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                    <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                    <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                    <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                </select>
            </div>

            <!-- حاوية ديناميكية لحقن أسماء طلاب الفصل المختار -->
            <div id="attendance-students-area"></div>
        </div>
    `;
    container.innerHTML = html;
}

// دالة سحب وفك أسماء الطلاب التابعين للفصل المحدد من السيرفر
window.loadStudentsForAttendance = async function() {
    const classId = document.getElementById('att-class-select').value;
    const area = document.getElementById('attendance-students-area');
    if(!classId) { area.innerHTML = ''; return; }
    
    area.innerHTML = '<p style="text-align:center; font-size:13px; color:#666; font-weight:bold; padding:15px;">جاري تحميل قوائم أسماء الطلاب من السيرفر السحابي...</p>';
    
    try {
        const snap = await getDocs(collection(db, 'students'));
        let studentsList = [];
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            if(d.classId === classId || d.class === classId) {
                studentsList.push({id: docSnap.id, name: d.name || d.studentName});
            }
        });
        
        if(studentsList.length === 0) {
            area.innerHTML = '<p style="text-align:center; color:var(--danger-color); font-weight:bold; padding:15px;">تنبيه: لا يوجد طلاب مسجلين في هذا الفصل حالياً بالسجلات.</p>';
            return;
        }
        
        // ترتيب أسماء الطلاب هجائياً بشكل رسمي ممتاز
        studentsList.sort((a,b) => a.name.localeCompare(b, 'ar'));
        
        let html = `
            <form onsubmit="window.submitClassAttendanceForm(event)">
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        `;
        
        studentsList.forEach((student, index) => {
            html += `
                <div style="background:#f8f9fa; padding:12px 15px; border-radius:8px; border-right:4px solid var(--success-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; text-align:right;">
                    <span style="font-size:13px; font-weight:700; color:#333;">${index + 1}. ${student.name}</span>
                    <div style="display:flex; gap:15px; direction:ltr;">
                        <label style="font-size:12px; font-weight:700; cursor:pointer; color:var(--success-color);"><input type="radio" name="student-status-${student.id}" value="present" checked data-name="${student.name}"> حاضر</label>
                        <label style="font-size:12px; font-weight:700; cursor:pointer; color:var(--danger-color);"><input type="radio" name="student-status-${student.id}" value="absent"> غائب</label>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-cloud-arrow-up-fill"></i> اعتماد وحفظ كشف الحضور والغياب اليومي بالسيرفر</button>
            </form>
        `;
        
        area.innerHTML = html;
    } catch(e) {
        area.innerHTML = '<p style="text-align:center; color:red; font-weight:bold; padding:15px;">خطأ أثناء استدعاء بيانات الطلاب من قاعدة البيانات.</p>';
    }
};

// دالة معالجة وضخ حركات الغياب والحضور في جدول الحضور الموحد مع التوثيق الزمني
window.submitClassAttendanceForm = async function(e) {
    e.preventDefault();
    const classId = document.getElementById('att-class-select').value;
    const radios = document.querySelectorAll(`#attendance-students-area input[type="radio"]:checked`);
    
    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');
    
    let loggedCount = 0;
    try {
        for(let radio of radios) {
            const studentId = radio.name.replace('student-status-', '');
            const status = radio.value;
            const studentName = radio.getAttribute('data-name');
            
            // حقن الحركة مباشرة بجدول الـ attendance المركزي المربوط بملف أولياء الأمور
            await addDoc(collection(db, 'attendance'), {
                studentId: studentId,
                studentName: studentName,
                classId: classId,
                status: status,
                date: currentDate,
                time: currentTime,
                createdAt: serverTimestamp()
            });
            loggedCount++;
        }
        alert(`✓ تم اعتماد الحضور والغياب لفصل (${classId}) بنجاح.\nإجمالي الطلاب الذين تم رصدهم: ${loggedCount}`);
        document.getElementById('att-class-select').value = '';
        document.getElementById('attendance-students-area').innerHTML = '';
    } catch(err) {
        alert('خطأ أثناء مزامنة وحفظ الكشف بالسيرفر: ' + err.message);
    }
};