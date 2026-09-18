import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDepartmentsModule() {
    var container = document.getElementById('tab-departments');
    if(!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:16px">
        <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin-bottom:14px">
            <i class="bi bi-building" style="color:var(--sky)"></i> Ø£Ù‚Ø³Ø§Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø©
        </h2>
        <p style="font-size:12px;color:var(--mid);font-weight:700;margin-bottom:16px">Ø£Ø¶Ù Ø£Ù‚Ø³Ø§Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø© â€” ØªØ¸Ù‡Ø± ÙƒÙ‚Ø§Ø¦Ù…Ø© Ø¹Ù†Ø¯ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙˆØ§Ù„Ù…ÙˆØ¸ÙÙŠÙ†</p>
        <div style="display:flex;gap:8px;margin-bottom:16px">
            <input id="dept-name" placeholder="Ø§Ø³Ù… Ø§Ù„Ù‚Ø³Ù… (Ù…Ø«Ø§Ù„: Ø±ÙŠØ§Ø¶ÙŠØ§Øª)" style="flex:1;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
            <button onclick="window.addDepartment()" style="background:var(--sky);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap">
                <i class="bi bi-plus-lg"></i> Ø¥Ø¶Ø§ÙØ©
            </button>
        </div>
        <div id="dept-list"><div style="text-align:center;padding:30px;color:#aaa;font-weight:700">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div></div>
    </div>`;

    loadDepartments();
}

async function loadDepartments() {
    var list = document.getElementById('dept-list');
    if(!list) return;
    try {
        var snap = await getDocs(query(collection(db,'departments'), where('schoolId','==',getActiveSchoolId())));
        if(snap.empty) { list.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-weight:700">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ù‚Ø³Ø§Ù… â€” Ø£Ø¶Ù Ù‚Ø³Ù… Ø¬Ø¯ÙŠØ¯</div>'; return; }
        var depts = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
        list.innerHTML = depts.map(d =>
            `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border:1px solid var(--line);border-radius:10px;margin-bottom:6px">
                <span style="font-weight:800;font-size:14px;color:#111"><i class="bi bi-bookmark-fill" style="color:var(--sky);margin-left:6px"></i>${d.name}</span>
                <button onclick="window.deleteDepartment('${d.id}','${d.name}')" style="background:#fee2e2;color:#dc2626;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">Ø­Ø°Ù</button>
            </div>`
        ).join('');
    } catch(e) { list.innerHTML = '<div style="color:#dc2626;padding:20px">âŒ '+e.message+'</div>'; }
}

window.addDepartment = async function() {
    var name = document.getElementById('dept-name')?.value?.trim();
    if(!name) { window.showToast?.('Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ù‚Ø³Ù…','warning'); return; }
    try {
        await addDoc(collection(db,'departments'), { schoolId: getActiveSchoolId(), name, createdAt: serverTimestamp() });
        document.getElementById('dept-name').value = '';
        window.showToast?.('âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù‚Ø³Ù…');
        loadDepartments();
    } catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
};

window.deleteDepartment = async function(id, name) {
    if(!confirm('Ø­Ø°Ù Ù‚Ø³Ù… "'+name+'"ØŸ')) return;
    try {
        await deleteDoc(doc(db,'departments',id));
        window.showToast?.('âœ… ØªÙ… Ø§Ù„Ø­Ø°Ù');
        loadDepartments();
    } catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
};

// Ø¯Ø§Ù„Ø© Ù…Ø³Ø§Ø¹Ø¯Ø© â€” ØªÙØ³ØªØ¯Ø¹Ù‰ Ù…Ù† ØµÙØ­Ø§Øª Ø£Ø®Ø±Ù‰ Ù„Ø¬Ù„Ø¨ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… ÙƒÙ‚Ø§Ø¦Ù…Ø©
export async function getSchoolDepartments() {
    try {
        var snap = await getDocs(query(collection(db,'departments'), where('schoolId','==',getActiveSchoolId())));
        return snap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
    } catch(e) { return []; }
}