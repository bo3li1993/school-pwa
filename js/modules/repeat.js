import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRepeatModule() {
    var container = document.getElementById('tab-repeat');
    if(!container) return;

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin-bottom:4px">
            <i class="bi bi-exclamation-circle-fill" style="color:#dc2626"></i> Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ù…ØªÙƒØ±Ø±
        </h2>
        <p style="font-size:12px;color:var(--mid);font-weight:700;margin-bottom:16px">Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù„ÙŠ ØºØ§Ø¨ÙˆØ§ Ø£ÙƒØ«Ø± Ù…Ù† 3 Ø£ÙŠØ§Ù…</p>

        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <select id="rep-class" onchange="window.loadRepeatAbsent()" style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700">
                <option value="all">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>
            </select>
            <select id="rep-min" onchange="window.loadRepeatAbsent()" style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                <option value="3">3+ Ø£ÙŠØ§Ù…</option>
                <option value="5">5+ Ø£ÙŠØ§Ù…</option>
                <option value="10">10+ Ø£ÙŠØ§Ù…</option>
                <option value="15">15+ Ø£ÙŠØ§Ù…</option>
            </select>
            <button onclick="window.printRepeatReport()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">
                <i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø©
            </button>
        </div>

        <div id="rep-content" style="background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden">
            <div style="text-align:center;padding:40px;color:#aaa;font-weight:700">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
        </div>
    </div>`;

    await loadRepeatClasses();
    window.loadRepeatAbsent();
}

async function loadRepeatClasses() {
    try {
        var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',getActiveSchoolId())));
        var classes = [...new Set(snap.docs.map(d=>d.data().classId).filter(Boolean))].sort((a,b)=>{
            var pa=a.split('/'),pb=b.split('/');
            return (parseInt(pa[0])||0)-(parseInt(pb[0])||0)||(parseInt(pa[1])||0)-(parseInt(pb[1])||0);
        });
        var sel = document.getElementById('rep-class');
        if(sel) sel.innerHTML = '<option value="all">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>' + classes.map(c=>'<option value="'+c+'">'+c+'</option>').join('');
    } catch(e) {}
}

window.loadRepeatAbsent = async function() {
    var content = document.getElementById('rep-content');
    var classFilter = document.getElementById('rep-class')?.value || 'all';
    var minDays = parseInt(document.getElementById('rep-min')?.value || '3');

    content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-weight:700">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>';

    try {
        var q = classFilter === 'all'
            ? query(collection(db,'attendance'), where('schoolId','==',getActiveSchoolId()), where('status','==','absent'))
            : query(collection(db,'attendance'), where('schoolId','==',getActiveSchoolId()), where('status','==','absent'), where('classId','==',classFilter));

        var snap = await getDocs(q);

        // Ø¹Ø¯Ù‘ Ø§Ù„ØºÙŠØ§Ø¨ Ù„ÙƒÙ„ Ø·Ø§Ù„Ø¨
        var counts = {};
        snap.docs.forEach(d => {
            var r = d.data();
            var key = r.studentName + '|' + r.classId;
            if(!counts[key]) counts[key] = { name: r.studentName, classId: r.classId, days: new Set(), records: [] };
            counts[key].days.add(r.date);
            counts[key].records.push(r);
        });

        // ÙÙ„ØªØ± Ø¨Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ ÙˆØªØ±ØªÙŠØ¨
        var results = Object.values(counts)
            .map(c => ({...c, totalDays: c.days.size}))
            .filter(c => c.totalDays >= minDays)
            .sort((a,b) => b.totalDays - a.totalDays);

        if(!results.length) {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-weight:700">âœ… Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨ Ù…ØªØ¬Ø§ÙˆØ²ÙŠÙ† Ø§Ù„Ø­Ø¯</div>';
            return;
        }

        content.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
            '<tr style="background:#f0f4f8"><th style="padding:10px 12px;text-align:right;font-weight:800">#</th>' +
            '<th style="padding:10px 12px;text-align:right;font-weight:800">Ø§Ù„Ø·Ø§Ù„Ø¨</th>' +
            '<th style="padding:10px 12px;text-align:center;font-weight:800">Ø§Ù„ÙØµÙ„</th>' +
            '<th style="padding:10px 12px;text-align:center;font-weight:800">Ø¹Ø¯Ø¯ Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</th>' +
            '<th style="padding:10px 12px;text-align:center;font-weight:800">ØªÙØ§ØµÙŠÙ„</th></tr>' +
            results.map((r,idx) => {
                var color = r.totalDays >= 15 ? '#dc2626' : r.totalDays >= 10 ? '#ea580c' : r.totalDays >= 5 ? '#d97706' : '#6b7280';
                return '<tr style="border-bottom:1px solid #f0f2f5">' +
                    '<td style="padding:10px 12px;font-weight:700;color:var(--mid)">'+(idx+1)+'</td>' +
                    '<td style="padding:10px 12px;font-weight:800">'+r.name+'</td>' +
                    '<td style="padding:10px 12px;text-align:center;font-weight:700">'+r.classId+'</td>' +
                    '<td style="padding:10px 12px;text-align:center"><span style="background:'+color+'22;color:'+color+';padding:4px 12px;border-radius:8px;font-weight:900;font-size:14px">'+r.totalDays+'</span></td>' +
                    '<td style="padding:10px 12px;text-align:center"><button onclick="window.showStudentAbsentHistory(\''+r.name.replace(/'/g,"\\'")+'\',\''+r.classId+'\')" style="background:var(--ice);color:var(--sky);border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer"><i class="bi bi-eye"></i> Ø¹Ø±Ø¶</button></td></tr>';
            }).join('') + '</table>';

    } catch(e) {
        content.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;font-weight:700">âŒ '+e.message+'</div>';
    }
};

// ØªÙØ§ØµÙŠÙ„ ØºÙŠØ§Ø¨ Ø·Ø§Ù„Ø¨ Ù…Ø¹ÙŠÙ†
window.showStudentAbsentHistory = async function(name, classId) {
    try {
        var snap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',getActiveSchoolId()), where('studentName','==',name), where('classId','==',classId)));
        var records = snap.docs.map(d=>d.data()).sort((a,b)=>(a.date||'').localeCompare(b.date||''));

        var html = '<div style="padding:16px"><h3 style="font-size:15px;font-weight:900;margin-bottom:12px">ðŸ“‹ Ø³Ø¬Ù„ ØºÙŠØ§Ø¨: '+name+' â€” '+classId+'</h3>' +
            '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:8px;text-align:center">Ø§Ù„Ø­Ø§Ù„Ø©</th><th style="padding:8px;text-align:center">Ø§Ù„Ø­ØµØ©</th><th style="padding:8px;text-align:right">Ø³Ø¬Ù‘Ù„Ù‡Ø§</th></tr>' +
            records.map(r => {
                var statusLabel = r.status==='absent'?'ØºØ§Ø¦Ø¨':r.status==='late'?'Ù…ØªØ£Ø®Ø±':r.status;
                var statusColor = r.status==='absent'?'#dc2626':'#d97706';
                return '<tr style="border-bottom:1px solid #f0f2f5"><td style="padding:8px">'+r.date+'</td><td style="padding:8px;text-align:center;color:'+statusColor+';font-weight:800">'+statusLabel+'</td><td style="padding:8px;text-align:center">'+(r.period||'-')+'</td><td style="padding:8px;font-size:11px;color:var(--mid)">'+(r.recordedBy||'-')+'</td></tr>';
            }).join('') + '</table>' +
            '<div style="margin-top:12px;display:flex;gap:8px"><button onclick="window.loadRepeatAbsent()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">â† Ø±Ø¬ÙˆØ¹</button>' +
            '<button onclick="window.printStudentHistory(\''+name.replace(/'/g,"\\'")+'\',\''+classId+'\')" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer"><i class="bi bi-printer"></i> Ø·Ø¨Ø§Ø¹Ø©</button></div></div>';

        document.getElementById('rep-content').innerHTML = html;
    } catch(e) {}
};

window.printStudentHistory = function(name, classId) {
    var content = document.getElementById('rep-content')?.innerHTML || '';
    if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'ØªÙ‚Ø±ÙŠØ± ØºÙŠØ§Ø¨ Ø·Ø§Ù„Ø¨', name + ' â€” ' + classId);
};

window.printRepeatReport = function() {
    var content = document.getElementById('rep-content')?.innerHTML || '';
    if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØºÙŠØ§Ø¨ Ø§Ù„Ù…ØªÙƒØ±Ø±', '');
};