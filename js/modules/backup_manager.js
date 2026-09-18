import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initBackupModule() {
    var container = document.getElementById('tab-backup');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--navy);">
        <h2><i class="bi bi-cloud-arrow-down-fill" style="color:var(--gold);"></i> Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ</h2>
        <p style="font-size:13px;color:#666;font-weight:600;margin-bottom:18px;">ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙƒØ§Ù…Ù„Ø© Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø© (Ø·Ù„Ø§Ø¨ØŒ Ø­Ø¶ÙˆØ±ØŒ Ø³Ù„ÙˆÙƒ) ÙˆØªØ­Ù…ÙŠÙ„Ù‡Ø§ ÙƒÙ…Ù„Ù JSON.</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;">
                <i class="bi bi-people-fill" style="font-size:28px;color:#16a34a;"></i>
                <div id="backup-students-count" style="font-size:28px;font-weight:900;color:#16a34a;">--</div>
                <div style="font-size:12px;color:#666;font-weight:700;">Ø·Ø§Ù„Ø¨</div>
            </div>
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:16px;text-align:center;">
                <i class="bi bi-clipboard-check" style="font-size:28px;color:#d97706;"></i>
                <div id="backup-attend-count" style="font-size:28px;font-weight:900;color:#d97706;">--</div>
                <div style="font-size:12px;color:#666;font-weight:700;">Ø³Ø¬Ù„ Ø­Ø¶ÙˆØ±</div>
            </div>
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;text-align:center;">
                <i class="bi bi-shield-exclamation" style="font-size:28px;color:#7c3aed;"></i>
                <div id="backup-behavior-count" style="font-size:28px;font-weight:900;color:#7c3aed;">--</div>
                <div style="font-size:12px;color:#666;font-weight:700;">Ø³Ø¬Ù„ Ø³Ù„ÙˆÙƒÙŠ</div>
            </div>
        </div>

        <div id="backup-last" style="background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:18px;font-size:13px;font-weight:700;color:#555;">
            â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¢Ø®Ø± Ù†Ø³Ø®Ø©...
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="window.createFullBackup()" id="btn-create-backup" style="flex:1;background:var(--navy);color:#fff;border:none;padding:13px;border-radius:10px;font-family:Cairo;font-weight:900;font-size:15px;cursor:pointer;"><i class="bi bi-cloud-arrow-down-fill"></i> Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø§Ù„Ø¢Ù†</button>
            <button onclick="window.downloadLastBackup()" style="background:#f8fafc;color:var(--navy);border:1.5px solid var(--line);padding:13px 18px;border-radius:10px;font-family:Cairo;font-weight:700;font-size:14px;cursor:pointer;"><i class="bi bi-download"></i> ØªØ­Ù…ÙŠÙ„ Ø¢Ø®Ø± Ù†Ø³Ø®Ø©</button>
        </div>
    </div>

    <div class="card" style="margin-top:16px;border-top:5px solid var(--sky);">
        <h3><i class="bi bi-clock-history" style="color:var(--sky);"></i> Ø³Ø¬Ù„ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©</h3>
        <div id="backup-history" style="margin-top:12px;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
    </div>`;

    await loadBackupStats();
}

let lastBackupData = null;

async function loadBackupStats() {
    var schoolId = getActiveSchoolId();
    try {
        var _pr = await Promise.all([
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId)))
        ]);
        var studSnap = _pr[0];          var attSnap = _pr[1];          var behSnap = _pr[2]; 
        document.getElementById('backup-students-count').textContent = studSnap.size;
        document.getElementById('backup-attend-count').textContent = attSnap.size;
        document.getElementById('backup-behavior-count').textContent = behSnap.size;

        // Ø¢Ø®Ø± Ù†Ø³Ø®Ø©
        var backupSnap = await getDocs(query(
            collection(db, 'backups'),
            where('schoolId', '==', schoolId),
            orderBy('createdAt', 'desc'),
            limit(5)
        ));

        if (backupSnap.empty) {
            document.getElementById('backup-last').textContent = 'âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ø³Ø® Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø³Ø§Ø¨Ù‚Ø©';
        } else {
            var last = backupSnap.docs[0].data();
            document.getElementById('backup-last').innerHTML =
                `âœ… Ø¢Ø®Ø± Ù†Ø³Ø®Ø©: <b>${last.dateStr}</b> â€” ${last.studentsCount} Ø·Ø§Ù„Ø¨ØŒ ${last.attendanceCount} Ø³Ø¬Ù„ Ø­Ø¶ÙˆØ±ØŒ Ø¨ÙˆØ§Ø³Ø·Ø©: ${last.createdBy}`;
        }

        // Ø³Ø¬Ù„ Ø§Ù„Ù†Ø³Ø®
        var historyEl = document.getElementById('backup-history');
        if (backupSnap.empty) {
            historyEl.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:20px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ø³Ø® Ø³Ø§Ø¨Ù‚Ø©</p>';
        } else {
            historyEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f8fafc;"><th style="padding:9px;text-align:right;">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:9px;">Ø§Ù„Ø·Ù„Ø§Ø¨</th><th style="padding:9px;">Ø§Ù„Ø­Ø¶ÙˆØ±</th><th style="padding:9px;">Ø§Ù„Ù…Ù†Ø´Ø¦</th></tr></thead>
                <tbody>${backupSnap.docs.map(d => {
                    var b = d.data();
                    return `<tr style="border-bottom:1px solid #f0f0f0;">
                        <td style="padding:9px;font-weight:700;">${b.dateStr}</td>
                        <td style="padding:9px;text-align:center;">${b.studentsCount}</td>
                        <td style="padding:9px;text-align:center;">${b.attendanceCount}</td>
                        <td style="padding:9px;">${b.createdBy}</td>
                    </tr>`;
                }).join('')}</tbody></table>`;
        }
    } catch (e) {
        console.error('Backup stats error:', e);
    }
}

window.createFullBackup = async function() {
    var btn = document.getElementById('btn-create-backup');
    btn.innerHTML = 'â³ Ø¬Ø§Ø±ÙŠ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù†Ø³Ø®Ø©...';
    btn.disabled = true;

    var schoolId = getActiveSchoolId();
    var user = JSON.parse(localStorage.getItem('hs_user') || '{}');

    try {
        var _pr = await Promise.all([
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId)))
        ]);
        var studSnap = _pr[0];          var attSnap = _pr[1];          var behSnap = _pr[2];          var gateSnap = _pr[3];          var clinicSnap = _pr[4]; 

        var backupData = {
            meta: {
                schoolId,
                schoolName: user.schoolName,
                createdAt: new Date().toISOString(),
                createdBy: user.name,
                version: '2.0'
            },
            students: studSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            attendance: attSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            behavior: behSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            gatepass: gateSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            clinic: clinicSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        };

        lastBackupData = backupData;

        // Ø­ÙØ¸ metadata Ø¨Ù€ Firestore
        var dateStr = getTodayISO();
        await addDoc(collection(db, 'backups'), {
            schoolId,
            createdAt: serverTimestamp(),
            dateStr,
            createdBy: user.name || 'unknown',
            studentsCount: studSnap.size,
            attendanceCount: attSnap.size,
            behaviorCount: behSnap.size,
        });

        // ØªØ­Ù…ÙŠÙ„ Ù…Ù„Ù JSON
        var blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = `backup_${schoolId}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        window.showToast('âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙˆØªØ­Ù…ÙŠÙ„Ù‡Ø§');
        const backupEl = document.getElementById('backup-last'); backupEl.textContent = `âœ… Ø¢Ø®Ø± Ù†Ø³Ø®Ø©: ${dateStr} â€” ${studSnap.size} Ø·Ø§Ù„Ø¨ØŒ Ø¨ÙˆØ§Ø³Ø·Ø©: ${user.name}`;
    } catch (e) {
        window.showToast('âŒ Ø®Ø·Ø£: ' + e.message, 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-cloud-arrow-down-fill"></i> Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø§Ù„Ø¢Ù†';
        btn.disabled = false;
    }
};

window.downloadLastBackup = function() {
    if (!lastBackupData) { window.showToast('âš ï¸ Ø£Ù†Ø´Ø¦ Ù†Ø³Ø®Ø© Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªØ­Ù…ÙŠÙ„Ù‡Ø§', 'info'); return; }
    var blob = new Blob([JSON.stringify(lastBackupData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = `backup_${lastBackupData.meta.schoolId}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
};
