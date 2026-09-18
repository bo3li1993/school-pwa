import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initWarningsModule() {
    var container = document.getElementById('tab-warnings');
    if(!container) return;

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0">
                <i class="bi bi-exclamation-triangle-fill" style="color:#d97706"></i> Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª Ø§Ù„Ø±Ø³Ù…ÙŠØ©
            </h2>
            <button onclick="window.showNewWarning()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">
                <i class="bi bi-plus-lg"></i> Ø¥ØµØ¯Ø§Ø± Ø¥Ù†Ø°Ø§Ø±
            </button>
        </div>

        <!-- Ø¥ØµØ¯Ø§Ø± Ø¥Ù†Ø°Ø§Ø± Ø¬Ø¯ÙŠØ¯ -->
        <div id="warn-new-form" style="display:none;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px">
            <h3 style="font-size:14px;font-weight:900;margin-bottom:14px">ðŸ“‹ Ø¥ØµØ¯Ø§Ø± Ø¥Ù†Ø°Ø§Ø± ØºÙŠØ§Ø¨</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">Ø§Ù„ÙØµÙ„</label>
                    <select id="warn-class" onchange="window.loadWarningStudents()" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                        <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">Ø§Ù„Ø·Ø§Ù„Ø¨</label>
                    <select id="warn-student" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                        <option value="">Ø§Ø®ØªØ± Ø§Ù„Ø·Ø§Ù„Ø¨</option>
                    </select>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±</label>
                    <select id="warn-level" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                        <option value="1">Ø¥Ù†Ø°Ø§Ø± Ø£ÙˆÙ„</option>
                        <option value="2">Ø¥Ù†Ø°Ø§Ø± Ø«Ø§Ù†ÙŠ</option>
                        <option value="3">Ø¥Ù†Ø°Ø§Ø± Ù†Ù‡Ø§Ø¦ÙŠ</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">Ø¹Ø¯Ø¯ Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</label>
                    <input type="number" id="warn-days" value="5" min="1" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                </div>
            </div>
            <div style="margin-bottom:12px">
                <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">Ù…Ù„Ø§Ø­Ø¸Ø§Øª (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</label>
                <textarea id="warn-notes" rows="2" placeholder="Ø£ÙŠ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©..." style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;resize:none"></textarea>
            </div>
            <div style="display:flex;gap:8px">
                <button onclick="window.saveWarning()" style="flex:1;background:var(--navy);color:#fff;border:none;padding:11px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;cursor:pointer">
                    <i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±
                </button>
                <button onclick="window.saveAndPrintWarning()" style="flex:1;background:#d97706;color:#fff;border:none;padding:11px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;cursor:pointer">
                    <i class="bi bi-printer-fill"></i> Ø­ÙØ¸ ÙˆØ·Ø¨Ø§Ø¹Ø©
                </button>
            </div>
        </div>

        <!-- Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥Ù†Ø°Ø§Ø±Ø§Øª -->
        <div id="warn-list" style="background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden">
            <div style="text-align:center;padding:40px;color:#aaa;font-weight:700">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
        </div>
    </div>`;

    loadWarnings();
    loadWarningClasses();
}

async function loadWarningClasses() {
    try {
        var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',getActiveSchoolId())));
        var classes = [...new Set(snap.docs.map(d => d.data().classId).filter(Boolean))].sort((a,b) => {
            var pa=a.split('/'),pb=b.split('/');
            return (parseInt(pa[0])||0)-(parseInt(pb[0])||0)||(parseInt(pa[1])||0)-(parseInt(pb[1])||0);
        });
        var sel = document.getElementById('warn-class');
        if(sel) sel.innerHTML = '<option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„</option>' + classes.map(c => '<option value="'+c+'">'+c+'</option>').join('');
    } catch(e) {}
}

window.loadWarningStudents = async function() {
    var classId = document.getElementById('warn-class')?.value;
    var sel = document.getElementById('warn-student');
    if(!classId || !sel) return;
    try {
        var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',getActiveSchoolId()), where('classId','==',classId)));
        var students = snap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = '<option value="">Ø§Ø®ØªØ± Ø§Ù„Ø·Ø§Ù„Ø¨</option>' + students.map(n => '<option value="'+n+'">'+n+'</option>').join('');
    } catch(e) {}
};

window.showNewWarning = function() {
    var form = document.getElementById('warn-new-form');
    if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.saveWarning = async function(andPrint) {
    var student = document.getElementById('warn-student')?.value;
    var classId = document.getElementById('warn-class')?.value;
    var level   = document.getElementById('warn-level')?.value;
    var days    = document.getElementById('warn-days')?.value;
    var notes   = document.getElementById('warn-notes')?.value?.trim();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');

    if(!student || !classId) { window.showToast?.('Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ ÙˆØ§Ù„Ø·Ø§Ù„Ø¨','warning'); return; }

    try {
        var data = {
            schoolId: getActiveSchoolId(),
            studentName: student,
            classId: classId,
            level: parseInt(level),
            absentDays: parseInt(days),
            notes: notes || '',
            issuedBy: me.name || '',
            issuedAt: serverTimestamp(),
            date: getTodayISO()
        };
        await addDoc(collection(db,'warnings'), data);
        window.showToast?.('âœ… ØªÙ… Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ø¥Ù†Ø°Ø§Ø±');
        document.getElementById('warn-new-form').style.display = 'none';
        loadWarnings();

        if(andPrint) printWarningDoc(data);
    } catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
};

window.saveAndPrintWarning = function() { window.saveWarning(true); };

function printWarningDoc(data) {
    var levelText = data.level===1?'Ø§Ù„Ø£ÙˆÙ„':data.level===2?'Ø§Ù„Ø«Ø§Ù†ÙŠ':'Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ';
    var content = '<div style="text-align:center;margin:30px 0 20px"><h2 style="font-size:20px;color:#d97706">âš ï¸ Ø¥Ù†Ø°Ø§Ø± ØºÙŠØ§Ø¨ '+levelText+'</h2></div>' +
        '<table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:10px;border:1px solid #ddd;font-weight:800;width:30%">Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</td><td style="padding:10px;border:1px solid #ddd">'+data.studentName+'</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ø§Ù„ÙØµÙ„</td><td style="padding:10px;border:1px solid #ddd">'+data.classId+'</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ø¹Ø¯Ø¯ Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</td><td style="padding:10px;border:1px solid #ddd">'+data.absentDays+' ÙŠÙˆÙ…</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±</td><td style="padding:10px;border:1px solid #ddd;color:#d97706;font-weight:900">'+levelText+'</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ø§Ù„ØªØ§Ø±ÙŠØ®</td><td style="padding:10px;border:1px solid #ddd">'+data.date+'</td></tr>' +
        (data.notes ? '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</td><td style="padding:10px;border:1px solid #ddd">'+data.notes+'</td></tr>' : '') +
        '</table>' +
        '<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px"><div>ØªÙˆÙ‚ÙŠØ¹ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±: ______________</div><div>ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø¯ÙŠØ±: ______________</div></div>';

    if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'Ø¥Ù†Ø°Ø§Ø± ØºÙŠØ§Ø¨ '+levelText, data.studentName+' â€” '+data.classId);
}

async function loadWarnings() {
    var list = document.getElementById('warn-list');
    if(!list) return;
    try {
        var snap = await getDocs(query(collection(db,'warnings'), where('schoolId','==',getActiveSchoolId())));
        if(snap.empty) { list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-weight:700">ðŸ“­ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ù†Ø°Ø§Ø±Ø§Øª</div>'; return; }

        var warnings = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.issuedAt?.toMillis?.()||0)-(a.issuedAt?.toMillis?.()||0));
        var levelColors = {1:'#d97706',2:'#ea580c',3:'#dc2626'};
        var levelText = {1:'Ø£ÙˆÙ„',2:'Ø«Ø§Ù†ÙŠ',3:'Ù†Ù‡Ø§Ø¦ÙŠ'};

        list.innerHTML = warnings.map(w => {
            var time = w.issuedAt?.toDate?.();
            var timeStr = time ? time.toLocaleDateString('ar-KW') : w.date||'';
            return '<div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #f0f2f5;gap:12px">' +
                '<div style="width:40px;height:40px;border-radius:10px;background:'+(levelColors[w.level]||'#d97706')+'22;color:'+(levelColors[w.level]||'#d97706')+';display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px">'+w.level+'</div>' +
                '<div style="flex:1"><div style="font-weight:800;font-size:13px;color:#111">'+w.studentName+' â€” '+w.classId+'</div>' +
                '<div style="font-size:11px;color:var(--mid)">Ø¥Ù†Ø°Ø§Ø± '+(levelText[w.level]||'')+' | '+w.absentDays+' ÙŠÙˆÙ… ØºÙŠØ§Ø¨ | '+timeStr+'</div></div>' +
                '<button onclick="window.reprintWarning(\''+w.id+'\')" style="background:none;border:1px solid var(--line);padding:6px 10px;border-radius:6px;font-size:11px;cursor:pointer"><i class="bi bi-printer"></i></button>' +
                '</div>';
        }).join('');
    } catch(e) { list.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;font-weight:700">âŒ '+e.message+'</div>'; }
}

window.reprintWarning = async function(id) {
    try {
        var snap = await getDocs(query(collection(db,'warnings'), where('__name__','==',id)));
        if(!snap.empty) {
            var data = snap.docs[0].data();
            var levelText = data.level===1?'Ø§Ù„Ø£ÙˆÙ„':data.level===2?'Ø§Ù„Ø«Ø§Ù†ÙŠ':'Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ';
            var content = '<div style="text-align:center;margin:30px 0 20px"><h2 style="font-size:20px;color:#d97706">âš ï¸ Ø¥Ù†Ø°Ø§Ø± ØºÙŠØ§Ø¨ '+levelText+'</h2></div>' +
                '<table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:10px;border:1px solid #ddd;font-weight:800;width:30%">Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</td><td style="padding:10px;border:1px solid #ddd">'+data.studentName+'</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ø§Ù„ÙØµÙ„</td><td style="padding:10px;border:1px solid #ddd">'+data.classId+'</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ø¹Ø¯Ø¯ Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</td><td style="padding:10px;border:1px solid #ddd">'+data.absentDays+' ÙŠÙˆÙ…</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±</td><td style="padding:10px;border:1px solid #ddd;color:#d97706;font-weight:900">'+levelText+'</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">Ø§Ù„ØªØ§Ø±ÙŠØ®</td><td style="padding:10px;border:1px solid #ddd">'+(data.date||'')+'</td></tr></table>' +
                '<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px"><div>ØªÙˆÙ‚ÙŠØ¹ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±: ______________</div><div>ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø¯ÙŠØ±: ______________</div></div>';
            if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'Ø¥Ù†Ø°Ø§Ø± ØºÙŠØ§Ø¨ '+levelText, data.studentName+' â€” '+data.classId);
        }
    } catch(e) { if(window.showToast) window.showToast('âŒ '+e.message,'error'); }
};
window._oldReprintWarning = async function(id) {
    try {
        var { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var snap = await getDoc(doc(db,'warnings',id));
        if(snap.exists()) printWarningDoc(snap.data());
    } catch(e) {}
};

window.editWarning = async function(id) {
    try {
        var snap = await getDocs(query(collection(db,'warnings'), where('__name__','==',id)));
        if(snap.empty) return;
        var data = snap.docs[0].data();
        var newDays = prompt('Ø¹Ø¯Ø¯ Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨:', data.absentDays);
        if(!newDays) return;
        var newLevel = prompt('Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¥Ù†Ø°Ø§Ø± (1=Ø£ÙˆÙ„ØŒ 2=Ø«Ø§Ù†ÙŠØŒ 3=Ù†Ù‡Ø§Ø¦ÙŠ):', data.level);
        if(!newLevel) return;
        var newNotes = prompt('Ù…Ù„Ø§Ø­Ø¸Ø§Øª:', data.notes||'');
        
        var { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        await updateDoc(doc(db,'warnings',id), {
            absentDays: parseInt(newDays),
            level: parseInt(newLevel),
            notes: newNotes || ''
        });
        window.showToast?.('âœ… ØªÙ… Ø§Ù„ØªØ¹Ø¯ÙŠÙ„');
        loadWarnings();
    } catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
};