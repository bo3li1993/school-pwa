import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initHonorsModule() {
    const container = document.getElementById('tab-honors_board');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--hover-color); background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-trophy-fill" style="color:var(--hover-color);"></i> لوحة الشرف الكبرى لفائقي المدرسة</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">قيد أسامي الفائقين الأوائل والمتميزين على مستوى مدرستكم.</p>
        <form id="honors-board-add-form" onsubmit="window.handlePostToHonorsBoardLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
                <div><label>اسم الطالب الفائق</label><input type="text" id="honor-std-name" placeholder="أدخل اسم الفائق رباعي" required style="width:100%; padding:8px;"></div>
                <div><label>الصف الدراسي</label><input type="text" id="honor-std-class" placeholder="مثال: 8/3" required style="width:100%; padding:8px;"></div>
                <div><label>الوسام الممنوح له</label><input type="text" id="honor-badge-title" placeholder="مثال: المركز الأول" required style="width:100%; padding:8px;"></div>
            </div>
            <button type="submit" style="width:100%; background:var(--hover-color); color:#fff; border:none; padding:10px; font-weight:bold; margin-top:10px; cursor:pointer; border-radius:5px;"><i class="bi bi-star-fill"></i> حقن ونشر اسم الفائق بلوحة الشرف</button>
        </form>
    </div>
    <div class="card" style="border-top:5px solid var(--primary-color); margin-top:20px; padding:20px; border-radius:12px;">
        <h2>🏆 قائمة الشرف المعتمدة</h2>
        <div id="honors-board-display-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:15px; margin-top:15px;">
            <p style="text-align:center; color:#999; font-weight:bold; grid-column:1/-1;">⏳ جاري سحب لوحة المتميزين السحابية...</p>
        </div>
    </div>`;

    loadHonorsBoardCardsLive();
}

window.handlePostToHonorsBoardLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية
    const name = document.getElementById('honor-std-name').value.trim();
    const classId = document.getElementById('honor-std-class').value.trim();
    const badge = document.getElementById('honor-badge-title').value.trim();
    
    try {
        await addDoc(collection(db, 'honors_board'), { 
            schoolId: schoolId, // 🔑 الحماية الأمنية
            name: name, 
            classId: classId, 
            badge: badge, 
            createdAt: serverTimestamp() 
        });
        alert('✓ تم بنجاح تخليد اسم الطالب بلوحة الشرف.');
        document.getElementById('honors-board-add-form').reset();
    } catch(err) { alert('خطأ: ' + err.message); }
};

async function loadHonorsBoardCardsLive() {
    const grid = document.getElementById('honors-board-display-grid');
    if(!grid) return;
    
    const schoolId = getActiveSchoolId();
    // جلب بيانات المدرسة الحالية فقط
    const q = query(collection(db, 'honors_board'), where('schoolId', '==', schoolId));
    
    onSnapshot(q, (snap) => {
        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            html += `
            <div style="background:#fffcf5; border:1px solid var(--hover-color); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                <div style="font-size:30px; color:var(--hover-color);"><i class="bi bi-award-fill"></i></div>
                <h4 style="font-weight:900; color:var(--primary-color); margin:10px 0;">${d.name || '-'}</h4>
                <p style="font-size:12px; font-weight:bold; color:#777; margin:3px 0;">الفصل: ${d.classId || '-'}</p>
                <span class="badge warning" style="background:var(--accent-color); font-size:11px; color:#fff; padding:3px 8px; border-radius:4px;">🏆 ${d.badge || '-'}</span>
            </div>`;
        });
        grid.innerHTML = html || `<p style="text-align:center; color:#999; grid-column:1/-1; font-weight:bold;">💡 اللوحة بانتظار قيد الفائقين الأوائل.</p>`;
    });
}