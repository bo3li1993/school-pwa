import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initCoverageModule() {
    var container = document.getElementById('tab-coverage');
    if (!container) return;

    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--sky);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <h2><i class="bi bi-journal-text" style="color:var(--sky);"></i> Ø§Ù„ØªØºØ·ÙŠØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©</h2>
            <button onclick="window.showAddCoverageModal()"
                style="background:var(--sky); color:#fff; border:none; padding:9px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                <i class="bi bi-plus-circle-fill"></i> ØªØ³Ø¬ÙŠÙ„ ØªØºØ·ÙŠØ©
            </button>
        </div>
        <p style="font-size:12px; color:var(--mid); margin-bottom:16px;">ØªØ³Ø¬ÙŠÙ„ Ø­ØµØµ Ø§Ù„ØªØºØ·ÙŠØ© Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†</p>

        <!-- ÙÙ„Ø§ØªØ± -->
        <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
            <input type="date" id="cov-filter-date" value="${today}" onchange="window.loadCoverage()"
                style="padding:8px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; outline:none;">
            <button onclick="window.loadCoverage()"
                style="background:var(--navy); color:#fff; border:none; padding:8px 16px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                <i class="bi bi-search"></i> Ø¨Ø­Ø«
            </button>
            <button onclick="document.getElementById('cov-filter-date').value=''; window.loadCoverage()"
                style="background:#fff; color:var(--mid); border:1.5px solid var(--line); padding:8px 16px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                Ø§Ù„ÙƒÙ„
            </button>
        </div>

        <!-- Ø§Ù„Ø¬Ø¯ÙˆÙ„ -->
        <div style="overflow-x:auto;">
            <div id="cov-list"><div style="text-align:center; padding:30px; color:var(--mid);">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div></div>
        </div>
    </div>

    <!-- Ø¥Ø­ØµØ§Ø¡Ø§Øª -->
    <div class="card" style="border-top:5px solid var(--gold); margin-top:14px;">
        <h3 style="font-size:14px; font-weight:900; margin-bottom:14px;"><i class="bi bi-bar-chart-fill" style="color:var(--gold);"></i> Ø¥Ø­ØµØ§Ø¡Ø§Øª Ø§Ù„ØªØºØ·ÙŠØ©</h3>
        <div id="cov-stats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
            <div style="text-align:center; padding:15px; color:var(--mid);">â³</div>
        </div>
    </div>

    <!-- Modal Ø¥Ø¶Ø§ÙØ© ØªØºØ·ÙŠØ© -->
    <div id="cov-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:480px; width:92%; direction:rtl; max-height:90vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-weight:900; color:var(--navy); margin:0; font-size:15px;"><i class="bi bi-journal-plus"></i> ØªØ³Ø¬ÙŠÙ„ ØªØºØ·ÙŠØ© Ø¯Ø±Ø§Ø³ÙŠØ©</h3>
                <button onclick="document.getElementById('cov-modal').style.display='none'" style="background:none;border:none;font-size:22px;cursor:pointer;">âœ•</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„ØºØ§Ø¦Ø¨ *</label>
                    <select id="cov-absent-teacher" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff; box-sizing:border-box;">
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¹Ù„Ù… --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…ØºØ·ÙŠ *</label>
                    <select id="cov-cover-teacher" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff; box-sizing:border-box;">
                        <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¹Ù„Ù… --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ø§Ù„ØµÙ *</label>
                    <input type="text" id="cov-class" placeholder="6/1"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ø§Ù„Ù…Ø§Ø¯Ø©</label>
                    <input type="text" id="cov-subject" placeholder="Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ø§Ù„Ø­ØµØ© *</label>
                    <select id="cov-period" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff; box-sizing:border-box;">
                        ${[1,2,3,4,5,6,7].map(p=>`<option value="${p}">Ø§Ù„Ø­ØµØ© ${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
                    <input type="date" id="cov-date" value="${today}"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label>
                <textarea id="cov-notes" placeholder="Ù…Ù„Ø§Ø­Ø¸Ø§Øª..."
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; min-height:60px; resize:vertical; box-sizing:border-box;"></textarea>
            </div>
            <button onclick="window.saveCoverage()"
                style="width:100%; background:var(--sky); color:#fff; border:none; padding:13px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:900; font-size:14px; cursor:pointer;">
                <i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ø§Ù„ØªØºØ·ÙŠØ©
            </button>
        </div>
    </div>`;

    await loadTeachersForCoverage();
    await window.loadCoverage();
    await loadCoverageStats();
}

async function loadTeachersForCoverage() {
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,'users'), where('schoolId','==',schoolId)));
        var teachers = snap.docs.map(d=>d.data()).filter(u=>u.role==='teacher').sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
        var opts = teachers.map(t=>`<option value="${t.name}">${t.name}${t.department?' ('+t.department+')':''}</option>`).join('');
        ['cov-absent-teacher','cov-cover-teacher'].forEach(id=>{
            var el=document.getElementById(id);
            if(el) el.innerHTML += opts;
        });
    } catch(e) {}
}

window.loadCoverage = async function() {
    var listEl = document.getElementById('cov-list');
    if (!listEl) return;
    var schoolId = getActiveSchoolId();
    var dateFilter = document.getElementById('cov-filter-date')?.value;

    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--mid);">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>';

    try {
        var q = query(collection(db,'coverage'), where('schoolId','==',schoolId));
        var snap = await getDocs(q);
        var records = snap.docs.map(d=>({id:d.id,...d.data()}))
            .filter(r => !dateFilter || r.date === dateFilter)
            .sort((a,b)=>(b.date||'').localeCompare(a.date||''));

        if (!records.length) {
            listEl.innerHTML = '<div style="text-align:center; padding:30px; color:var(--mid); font-weight:700;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØºØ·ÙŠØ§Øª Ù…Ø³Ø¬Ù„Ø©</div>';
            return;
        }

        listEl.innerHTML = `<table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:var(--navy); color:#fff;">
                    <th style="padding:10px 12px;">#</th>
                    <th style="padding:10px 12px;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„ØºØ§Ø¦Ø¨</th>
                    <th style="padding:10px 12px;">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…ØºØ·ÙŠ</th>
                    <th style="padding:10px 12px;">Ø§Ù„ØµÙ</th>
                    <th style="padding:10px 12px;">Ø§Ù„Ù…Ø§Ø¯Ø©</th>
                    <th style="padding:10px 12px; text-align:center;">Ø§Ù„Ø­ØµØ©</th>
                    <th style="padding:10px 12px;">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                    <th style="padding:10px 12px; text-align:center;">Ø¥Ø¬Ø±Ø§Ø¡</th>
                </tr>
            </thead>
            <tbody>
                ${records.map((r,i) => `
                <tr style="border-bottom:1px solid #f0f0f0; ${i%2?'background:#fafbfc;':''}">
                    <td style="padding:10px 12px; color:#aaa; font-size:12px;">${i+1}</td>
                    <td style="padding:10px 12px; font-weight:700;">${r.absentTeacher||'-'}</td>
                    <td style="padding:10px 12px; color:var(--sky); font-weight:700;">${r.coverTeacher||'-'}</td>
                    <td style="padding:10px 12px;">${r.classId||'-'}</td>
                    <td style="padding:10px 12px; font-size:12px; color:#666;">${r.subject||'-'}</td>
                    <td style="padding:10px 12px; text-align:center;">
                        <span style="background:var(--ice); color:var(--sky); padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">Ø­${r.period||'-'}</span>
                    </td>
                    <td style="padding:10px 12px; font-size:12px;">${r.date||'-'}</td>
                    <td style="padding:10px 12px; text-align:center;">
                        <button onclick="window.deleteCoverage('${r.id}')"
                            style="background:#fef2f2; color:#dc2626; border:none; padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif;">
                            ðŸ—‘ Ø­Ø°Ù
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) {
        listEl.innerHTML = `<div style="color:red; padding:20px;">âŒ ${e.message}</div>`;
    }
};

window.showAddCoverageModal = function() {
    document.getElementById('cov-modal').style.display = 'flex';
};

window.saveCoverage = async function() {
    var absentTeacher = document.getElementById('cov-absent-teacher').value;
    var coverTeacher = document.getElementById('cov-cover-teacher').value;
    var classId = document.getElementById('cov-class').value.trim();
    var subject = document.getElementById('cov-subject').value.trim();
    var period = document.getElementById('cov-period').value;
    var date = document.getElementById('cov-date').value;
    var notes = document.getElementById('cov-notes').value.trim();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');

    if (!absentTeacher || !coverTeacher || !classId) {
        window.showToast?.('Ø£ÙƒÙ…Ù„ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©', 'warning');
        return;
    }

    try {
        await addDoc(collection(db,'coverage'), {
            schoolId: getActiveSchoolId(),
            absentTeacher, coverTeacher, classId, subject,
            period: parseInt(period), date, notes,
            recordedBy: me.name || me.userId,
            createdAt: serverTimestamp()
        });
        window.showToast?.('âœ… ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØªØºØ·ÙŠØ©');
        document.getElementById('cov-modal').style.display = 'none';
        ['cov-absent-teacher','cov-cover-teacher','cov-class','cov-subject','cov-notes'].forEach(id=>{
            var el=document.getElementById(id); if(el) el.value='';
        });
        await window.loadCoverage();
        await loadCoverageStats();
    } catch(e) {
        window.showToast?.('âŒ ' + e.message, 'error');
    }
};

window.deleteCoverage = async function(id) {
    if (!confirm('Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„ØªØºØ·ÙŠØ©ØŸ')) return;
    try {
        await deleteDoc(doc(db,'coverage',id));
        window.showToast?.('âœ… ØªÙ… Ø§Ù„Ø­Ø°Ù');
        await window.loadCoverage();
        await loadCoverageStats();
    } catch(e) {
        window.showToast?.('âŒ ' + e.message, 'error');
    }
};

async function loadCoverageStats() {
    var statsEl = document.getElementById('cov-stats');
    if (!statsEl) return;
    var schoolId = getActiveSchoolId();
    var today = getTodayISO();

    try {
        var snap = await getDocs(query(collection(db,'coverage'), where('schoolId','==',schoolId)));
        var records = snap.docs.map(d=>d.data());
        var todayRecords = records.filter(r=>r.date===today);

        // Ø£ÙƒØ«Ø± Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ØºÙŠØ§Ø¨Ø§Ù‹
        var absentCount = {};
        records.forEach(r=>{ absentCount[r.absentTeacher] = (absentCount[r.absentTeacher]||0)+1; });
        var topAbsent = Object.entries(absentCount).sort((a,b)=>b[1]-a[1])[0];

        // Ø£ÙƒØ«Ø± Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ØªØºØ·ÙŠØ©
        var coverCount = {};
        records.forEach(r=>{ coverCount[r.coverTeacher] = (coverCount[r.coverTeacher]||0)+1; });
        var topCover = Object.entries(coverCount).sort((a,b)=>b[1]-a[1])[0];

        statsEl.innerHTML = [
            { icon:'ðŸ“‹', num: records.length, label:'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªØºØ·ÙŠØ§Øª' },
            { icon:'ðŸ“…', num: todayRecords.length, label:'ØªØºØ·ÙŠØ§Øª Ø§Ù„ÙŠÙˆÙ…' },
            { icon:'âš ï¸', num: topAbsent ? topAbsent[0] : '-', label:'Ø£ÙƒØ«Ø± ØºÙŠØ§Ø¨Ø§Ù‹', small: true },
            { icon:'ðŸŒŸ', num: topCover ? topCover[0] : '-', label:'Ø£ÙƒØ«Ø± ØªØºØ·ÙŠØ©', small: true },
        ].map(s => `
            <div style="background:#fff; border-radius:12px; padding:14px; border:1px solid var(--line); text-align:center;">
                <span style="font-size:24px; display:block; margin-bottom:6px;">${s.icon}</span>
                <span style="font-size:${s.small?'13':'22'}px; font-weight:900; display:block; color:var(--navy); margin-bottom:3px;">${s.num}</span>
                <span style="font-size:11px; font-weight:700; color:var(--mid);">${s.label}</span>
            </div>`).join('');
    } catch(e) {
        statsEl.innerHTML = `<div style="color:red; padding:10px;">âŒ ${e.message}</div>`;
    }
}
