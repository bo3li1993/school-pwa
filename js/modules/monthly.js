import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initMonthlyModule() {
    var container = document.getElementById('tab-monthly');
    if(!container) return;

    var months = [];
    var now = new Date();
    for(var i=0;i<6;i++) {
        var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        months.push({value:d.toISOString().slice(0,7), label:d.toLocaleDateString('ar-KW',{year:'numeric',month:'long'})});
    }

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0"><i class="bi bi-calendar-month" style="color:var(--sky)"></i> Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ù‡Ø±ÙŠ</h2>
            <div style="display:flex;gap:8px">
                <select id="monthly-month" style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700">
                    ${months.map(m=>`<option value="${m.value}">${m.label}</option>`).join('')}
                </select>
                <button onclick="window.loadMonthlyReport()" style="background:var(--sky);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">Ø¹Ø±Ø¶</button>
                <button onclick="window.printMonthlyReport()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer"><i class="bi bi-printer-fill"></i> Ø·Ø¨Ø§Ø¹Ø©</button>
            </div>
        </div>
        <div id="monthly-content"><div style="text-align:center;padding:40px;color:#aaa;font-weight:700">Ø§Ø®ØªØ± Ø§Ù„Ø´Ù‡Ø± ÙˆØ§Ø¶ØºØ· "Ø¹Ø±Ø¶"</div></div>
    </div>`;
}

window.loadMonthlyReport = async function() {
    var month = document.getElementById('monthly-month')?.value;
    if(!month) return;
    var content = document.getElementById('monthly-content');
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">â³ Ø¬Ø§Ø±ÙŠ Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±...</div>';

    try {
        var schoolId = getActiveSchoolId();
        var startDate = month + '-01';
        var endParts = month.split('-');
        var endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]), 0);
        var endDateStr = endDate.toISOString().slice(0,10);

        // Ø¬Ù„Ø¨ ÙƒÙ„ Ø§Ù„ØºÙŠØ§Ø¨ Ù„Ù„Ø´Ù‡Ø±
        var snap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('status','==','absent')));
        var records = snap.docs.map(d=>d.data()).filter(r => r.date >= startDate && r.date <= endDateStr);

        // Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨
        var studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        var totalStudents = studSnap.size;
        var schoolDays = Math.min(new Date().getDate(), endDate.getDate());

        // Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª
        var byStudent = {};
        var byClass = {};
        var byDay = {};
        records.forEach(r => {
            byStudent[r.studentName+'|'+r.classId] = (byStudent[r.studentName+'|'+r.classId]||0)+1;
            byClass[r.classId] = (byClass[r.classId]||0)+1;
            byDay[r.date] = (byDay[r.date]||0)+1;
        });

        var totalAbsent = records.length;
        var avgDaily = schoolDays > 0 ? Math.round(totalAbsent/schoolDays) : 0;
        var monthLabel = new Date(month+'-15').toLocaleDateString('ar-KW',{year:'numeric',month:'long'});

        // Ø£ÙƒØ«Ø± ÙØµÙˆÙ„ ØºÙŠØ§Ø¨Ø§Ù‹
        var topClasses = Object.entries(byClass).sort((a,b)=>b[1]-a[1]).slice(0,5);
        // Ø£ÙƒØ«Ø± Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹
        var topStudents = Object.entries(byStudent).sort((a,b)=>b[1]-a[1]).slice(0,10);

        content.innerHTML = `
        <div id="monthly-printable">
            <!-- KPI -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:var(--navy)">${totalStudents}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨</div>
                </div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#dc2626">${totalAbsent}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØºÙŠØ§Ø¨</div>
                </div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#d97706">${avgDaily}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">Ù…Ø¹Ø¯Ù„ ÙŠÙˆÙ…ÙŠ</div>
                </div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:var(--green)">${schoolDays}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">Ø£ÙŠØ§Ù… Ø¯Ø±Ø§Ø³ÙŠØ©</div>
                </div>
            </div>

            <!-- Ø£ÙƒØ«Ø± ÙØµÙˆÙ„ ØºÙŠØ§Ø¨Ø§Ù‹ -->
            <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:16px">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:10px">ðŸ“Š Ø£ÙƒØ«Ø± Ø§Ù„ÙØµÙˆÙ„ ØºÙŠØ§Ø¨Ø§Ù‹</h3>
                ${topClasses.map(([cls,count]) => {
                    var pct = totalAbsent>0 ? Math.round(count/totalAbsent*100) : 0;
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        <span style="font-weight:800;width:50px;font-size:13px">${cls}</span>
                        <div style="flex:1;background:#f0f4f8;border-radius:6px;height:22px;overflow:hidden">
                            <div style="background:#dc2626;height:100%;width:${pct}%;border-radius:6px;min-width:20px"></div>
                        </div>
                        <span style="font-weight:900;font-size:13px;color:#dc2626;width:40px;text-align:left">${count}</span>
                    </div>`;
                }).join('')}
            </div>

            <!-- Ø£ÙƒØ«Ø± Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹ -->
            <div style="background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden">
                <h3 style="font-size:14px;font-weight:900;padding:16px 16px 10px">ðŸ”´ Ø£ÙƒØ«Ø± Ø§Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ§Ø¨Ø§Ù‹</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <tr style="background:#f0f4f8"><th style="padding:8px 12px;text-align:right">#</th><th style="padding:8px 12px;text-align:right">Ø§Ù„Ø·Ø§Ù„Ø¨</th><th style="padding:8px 12px;text-align:center">Ø§Ù„ÙØµÙ„</th><th style="padding:8px 12px;text-align:center">Ø£ÙŠØ§Ù… Ø§Ù„ØºÙŠØ§Ø¨</th></tr>
                    ${topStudents.map(([key,count],i) => {
                        var [name,cls] = key.split('|');
                        var color = count>=10?'#dc2626':count>=5?'#d97706':'#6b7280';
                        return `<tr style="border-bottom:1px solid #f0f2f5"><td style="padding:8px 12px;font-weight:700;color:var(--mid)">${i+1}</td><td style="padding:8px 12px;font-weight:800">${name}</td><td style="padding:8px 12px;text-align:center">${cls}</td><td style="padding:8px 12px;text-align:center"><span style="background:${color}22;color:${color};padding:3px 12px;border-radius:8px;font-weight:900">${count}</span></td></tr>`;
                    }).join('')}
                </table>
            </div>
        </div>`;

    } catch(e) { content.innerHTML = '<div style="color:#dc2626;padding:20px;text-align:center">âŒ '+e.message+'</div>'; }
};

window.printMonthlyReport = function() {
    var month = document.getElementById('monthly-month')?.value || '';
    var content = document.getElementById('monthly-printable')?.innerHTML || '';
    var label = new Date(month+'-15').toLocaleDateString('ar-KW',{year:'numeric',month:'long'});
    if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ù‡Ø±ÙŠ â€” '+label, '');
};