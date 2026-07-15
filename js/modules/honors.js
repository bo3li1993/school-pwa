import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const ALL_CLASSES = ['6/1','6/2','6/3','6/4','7/1','7/2','7/3','7/4','8/1','8/2','8/3','8/4','9/1','9/2','9/3','9/4'];

export async function initHonorsModule() {
    const container = document.getElementById('tab-honors');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--hover-color);">
        <h2><i class="bi bi-trophy-fill" style="color:var(--hover-color);"></i> لوحة الشرف الكبرى لفائقي المدرسة</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">قيد أسامي الفائقين الأوائل والمتميزين على مستوى مدرستكم.</p>
        <form id="honors-board-add-form" onsubmit="window.handlePostToHonorsBoardLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
                <div>
                    <label>١. اختر الفصل</label>
                    <select id="honor-std-class" onchange="window.onHonorClassChange(this.value)" required>
                        <option value="">-- اختر الفصل --</option>
                        ${ALL_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label>٢. اسم الطالب الفائق</label>
                    <select id="honor-std-name" disabled required>
                        <option value="">-- اختر الفصل أولاً --</option>
                    </select>
                </div>
                <div>
                    <label>الوسام الممنوح له</label>
                    <select id="honor-badge-title" required>
                        <option value="">-- اختر الوسام --</option>
                        <option value="المركز الأول">🥇 المركز الأول</option>
                        <option value="المركز الثاني">🥈 المركز الثاني</option>
                        <option value="المركز الثالث">🥉 المركز الثالث</option>
                        <option value="حافظ القرآن الكريم">📖 حافظ القرآن الكريم</option>
                        <option value="الانضباط المثالي">🎯 الانضباط المثالي</option>
                        <option value="الأداء الأكاديمي المتميز">⭐ الأداء الأكاديمي المتميز</option>
                        <option value="المشاركة المجتمعية">🤝 المشاركة المجتمعية</option>
                        <option value="أخرى">📌 أخرى</option>
                    </select>
                </div>
            </div>
            <button type="submit" style="width:100%; background:var(--hover-color); color:#fff; border:none; padding:10px; font-weight:bold; margin-top:10px; cursor:pointer; border-radius:5px;"><i class="bi bi-star-fill"></i> حقن ونشر اسم الفائق بلوحة الشرف</button>
        </form>
    </div>
    <div class="card" style="border-top:5px solid var(--primary-color); margin-top:20px;">
        <h2>🏆 قائمة الشرف المعتمدة</h2>
        <div id="honors-board-display-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:15px; margin-top:15px;">
            <p style="text-align:center; color:#999; font-weight:bold; grid-column:1/-1;">⏳ جاري سحب لوحة المتميزين السحابية...</p>
        </div>
    </div>`;

    loadHonorsBoardCardsLive();
}

window.onHonorClassChange = async function(classId) {
    const sel = document.getElementById('honor-std-name');
    if(!classId) { sel.innerHTML = '<option value="">-- اختر الفصل أولاً --</option>'; sel.disabled = true; return; }
    sel.innerHTML = '<option value="">⏳ جاري التحميل...</option>';
    sel.disabled = true;
    try {
        const q = query(collection(db,'students'), where('schoolId','==',getActiveSchoolId()), where('classId','==',classId));
        const snap = await getDocs(q);
        const names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        if(!names.length) { sel.innerHTML = '<option value="">⚠️ لا يوجد طلاب</option>'; return; }
        sel.innerHTML = '<option value="">-- اختر اسم الطالب --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('');
        sel.disabled = false;
    } catch(e) { sel.innerHTML = '<option value="">❌ خطأ بالتحميل</option>'; }
};

window.handlePostToHonorsBoardLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية
    const classId = document.getElementById('honor-std-class').value.trim();
    const name = document.getElementById('honor-std-name').value.trim();
    const badge = document.getElementById('honor-badge-title').value.trim();

    if(!classId || !name || !badge) { window.showToast('⚠️ يرجى تعبئة جميع الحقول'); return; }

    try {
        await addDoc(collection(db, 'honors_board'), { 
            schoolId: schoolId, // 🔑 الحماية الأمنية
            name: name, 
            classId: classId, 
            badge: badge, 
            createdAt: serverTimestamp() 
        });
        window.showToast('✓ تم بنجاح تخليد اسم الطالب بلوحة الشرف.');
        document.getElementById('honors-board-add-form').reset();
        document.getElementById('honor-std-name').innerHTML = '<option value="">-- اختر الفصل أولاً --</option>';
        document.getElementById('honor-std-name').disabled = true;
    } catch(err) { window.showToast('❌ خطأ: ' + err.message, 'error'); }
};

async function loadHonorsBoardCardsLive() {
    const grid = document.getElementById('honors-board-display-grid');
    if(!grid) return;
    
    const schoolId = getActiveSchoolId();
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

// ===== طباعة السجل =====
window.printHonorsPDF = async function() {
    const tbody = document.getElementById('honors-board-display-grid');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للتصدير', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>الاسم</th><th>الفصل</th><th>الوسام</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'لوحة_الشرف', 'لوحة الشرف');
};

window.printHonorsDirect = function() {
    const tbody = document.getElementById('honors-board-display-grid');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للطباعة', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>الاسم</th><th>الفصل</th><th>الوسام</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'لوحة الشرف');
};