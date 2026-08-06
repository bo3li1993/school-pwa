import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDepartmentsModule() {
    const container = document.getElementById('tab-departments');
    if(!container) return;
    const schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:16px">
        <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin-bottom:14px">
            <i class="bi bi-building" style="color:var(--sky)"></i> أقسام المدرسة
        </h2>
        <p style="font-size:12px;color:var(--mid);font-weight:700;margin-bottom:16px">أضف أقسام المدرسة — تظهر كقائمة عند المعلمين والموظفين</p>
        <div style="display:flex;gap:8px;margin-bottom:16px">
            <input id="dept-name" placeholder="اسم القسم (مثال: رياضيات)" style="flex:1;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
            <button onclick="window.addDepartment()" style="background:var(--sky);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap">
                <i class="bi bi-plus-lg"></i> إضافة
            </button>
        </div>
        <div id="dept-list"><div style="text-align:center;padding:30px;color:#aaa;font-weight:700">⏳ جاري التحميل...</div></div>
    </div>`;

    loadDepartments();
}

async function loadDepartments() {
    const list = document.getElementById('dept-list');
    if(!list) return;
    try {
        const snap = await getDocs(query(collection(db,'departments'), where('schoolId','==',getActiveSchoolId())));
        if(snap.empty) { list.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-weight:700">لا توجد أقسام — أضف قسم جديد</div>'; return; }
        const depts = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
        list.innerHTML = depts.map(d =>
            `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border:1px solid var(--line);border-radius:10px;margin-bottom:6px">
                <span style="font-weight:800;font-size:14px;color:#111"><i class="bi bi-bookmark-fill" style="color:var(--sky);margin-left:6px"></i>${d.name}</span>
                <button onclick="window.deleteDepartment('${d.id}','${d.name}')" style="background:#fee2e2;color:#dc2626;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">حذف</button>
            </div>`
        ).join('');
    } catch(e) { list.innerHTML = '<div style="color:#dc2626;padding:20px">❌ '+e.message+'</div>'; }
}

window.addDepartment = async function() {
    const name = document.getElementById('dept-name')?.value?.trim();
    if(!name) { window.showToast?.('اكتب اسم القسم','warning'); return; }
    try {
        await addDoc(collection(db,'departments'), { schoolId: getActiveSchoolId(), name, createdAt: serverTimestamp() });
        document.getElementById('dept-name').value = '';
        window.showToast?.('✅ تم إضافة القسم');
        loadDepartments();
    } catch(e) { window.showToast?.('❌ '+e.message,'error'); }
};

window.deleteDepartment = async function(id, name) {
    if(!confirm('حذف قسم "'+name+'"؟')) return;
    try {
        await deleteDoc(doc(db,'departments',id));
        window.showToast?.('✅ تم الحذف');
        loadDepartments();
    } catch(e) { window.showToast?.('❌ '+e.message,'error'); }
};

// دالة مساعدة — تُستدعى من صفحات أخرى لجلب الأقسام كقائمة
export async function getSchoolDepartments() {
    try {
        const snap = await getDocs(query(collection(db,'departments'), where('schoolId','==',getActiveSchoolId())));
        return snap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
    } catch(e) { return []; }
}