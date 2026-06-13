import { db, SCHOOL_ID } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initStudentsManageModule() {
    const container = document.getElementById('tab-students-manage');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--primary-color);">
        <h2><i class="bi bi-person-plus-fill"></i> قيد وتثبيت طالب جديد بالفصول المعتمدة</h2>
        <form id="new-student-enroll-form" onsubmit="window.handleEnrollNewStudentLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                <div><label>اسم الطالب رباعي</label><input type="text" id="std-new-name" placeholder="أدخل اسم الطالب المعتمد" required></div>
                <div><label>الرقم المدني / الدراسي (User ID ولي الأمر)</label><input type="text" id="std-new-id" placeholder="أدخل الرقم السري الموحد للباب" required></div>
                <div><label>توزيع الفصل الدراسي</label>
                    <select id="std-new-class" required>
                        <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                        <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                        <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                        <option value="9/1">9/1</option><option value="9/2">9/2</option>
                    </select>
                </div>
            </div>
            <button type="submit" style="background:var(--success-color); width:100%; font-weight:bold; margin-top:10px;"><i class="bi bi-cloud-check-fill"></i> تثبيت وقيد الطالب سحابياً فوراً</button>
        </form>
    </div>`;
}

window.handleEnrollNewStudentLive = async function(e) {
    e.preventDefault();
    const name = document.getElementById('std-new-name').value.trim();
    const id = document.getElementById('std-new-id').value.trim();
    const classId = document.getElementById('std-new-class').value;
    try {
        // 🏢 ربط قيد الطالب يدوياً بالـ SCHOOL_ID المعتمد بمشروعك
        await addDoc(collection(db, 'students'), { 
            schoolId: SCHOOL_ID,
            name: name, 
            userId: id, 
            classId: classId, 
            createdAt: serverTimestamp() 
        });
        alert(`✓ تم بنجاح قيد وتثبيت الطالب: ${name}\nفي الصف: ${classId}`);
        document.getElementById('new-student-enroll-form').reset();
    } catch(err) { alert('خطأ في الاتصال: ' + err.message); }
};