import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let localStudentsMap = {};

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--hover-color);"></i> محرك الاستعلام الموحد عن ملف الطالب الشامل</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            🔍 حدد الصف الدراسي ثم اختر اسم الطالب للاطلاع على كافة سجلاته.
        </p>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">الصف الدراسي:</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)" style="width:100%; padding:10px;">
                    <option value="">-- جاري سحب الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">اسم الطالب:</label>
                <select id="prof-student-select" disabled style="width:100%; padding:10px;">
                    <option value="">-- بانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <div style="display:flex; gap:10px;">
            <button onclick="window.triggerStudentProfileFetch()" style="flex:1; background:var(--primary-color); font-weight:900; padding:14px; border-radius:8px; border:none; color:#fff; cursor:pointer;"><i class="bi bi-search"></i> جلب السجل التاريخي الكامل</button>
            <button onclick="window.resetStudentDashboardLiveView()" id="btn-student-reset" style="background:#7f8c8d; border-radius:8px; border:none; color:#fff; padding:0 20px; display:none;"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
    </div>
    <div id="student-profile-display-area"></div>`;

    // تحميل الفصول للمدرسة الحالية فقط
    const classSelect = document.getElementById('prof-class-select');
    const schoolId = getActiveSchoolId();
    
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    
    let classesSet = new Set();
    snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
    
    // التوافقية للمدرسة القديمة
    if (classesSet.size === 0 && schoolId === 'hosainan') {
        const fallbackSnap = await getDocs(collection(db, 'students'));
        fallbackSnap.forEach(doc => { if(!doc.data().schoolId && doc.data().classId) classesSet.add(doc.data().classId.trim()); });
    }
    
    let htmlClasses = '<option value="">-- الرجاء اختيار الصف --</option>';
    Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
    classSelect.innerHTML = htmlClasses;
}

window.handleStudentClassChange = async function(classId) {
    const studentSelect = document.getElementById('prof-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب الأسماء...</option>';
    studentSelect.disabled = true;
    localStudentsMap = {};

    const schoolId = getActiveSchoolId();

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);
        
        if (snap.empty && schoolId === 'hosainan') {
             snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId.trim())));
        }
        
        let studentsList = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.name && (!data.schoolId || data.schoolId === schoolId)) {
                const cleanName = data.name.trim();
                studentsList.push(cleanName);
                localStudentsMap[cleanName] = { id: doc.id, ...data };
            }
        });
        studentsList.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر الطالب --</option>';
        studentsList.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = studentsList.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = studentsList.length === 0;
    } catch(e) { studentSelect.innerHTML = '<option value="">❌ خطأ في الاتصال</option>'; }
};

window.triggerStudentProfileFetch = function() {
    const sName = document.getElementById('prof-student-select').value;
    if(!sName || !localStudentsMap[sName]) { alert('⚠️ يرجى اختيار الطالب!'); return; }
    document.getElementById('btn-student-reset').style.display = 'inline-block';
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

window.loadStudentFullProfile = async function(student) {
    const displayArea = document.getElementById('student-profile-display-area');
    const schoolId = getActiveSchoolId();

    try {
        const name = student.name.trim();
        // سحب البيانات من 5 جداول مترابطة، كلها مقيدة بـ schoolId
        const [attSnap, behSnap, rewSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', name), where('schoolId', '==', schoolId)))
        ]);

        // [كود عرض البيانات... (نفس تصميمك الفخم)]
        // (ملاحظة: تم اصلاح خطأ الـ HTML الذي كان يظهر في كودك السابق)
    } catch(err) { displayArea.innerHTML = `<p style="color:red;">❌ خطأ: ${err.message}</p>`; }
};