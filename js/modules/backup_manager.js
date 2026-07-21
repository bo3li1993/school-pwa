import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initBackupModule() {
    const container = document.getElementById('tab-backup');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--navy);">
        <h2><i class="bi bi-cloud-arrow-down-fill" style="color:var(--gold);"></i> النسخ الاحتياطي</h2>
        <p style="font-size:13px;color:#666;font-weight:600;margin-bottom:18px;">يمكنك إنشاء نسخة احتياطية كاملة لبيانات المدرسة (طلاب، حضور، سلوك) وتحميلها كملف JSON.</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;">
                <i class="bi bi-people-fill" style="font-size:28px;color:#16a34a;"></i>
                <div id="backup-students-count" style="font-size:28px;font-weight:900;color:#16a34a;">--</div>
                <div style="font-size:12px;color:#666;font-weight:700;">طالب</div>
            </div>
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:16px;text-align:center;">
                <i class="bi bi-clipboard-check" style="font-size:28px;color:#d97706;"></i>
                <div id="backup-attend-count" style="font-size:28px;font-weight:900;color:#d97706;">--</div>
                <div style="font-size:12px;color:#666;font-weight:700;">سجل حضور</div>
            </div>
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;text-align:center;">
                <i class="bi bi-shield-exclamation" style="font-size:28px;color:#7c3aed;"></i>
                <div id="backup-behavior-count" style="font-size:28px;font-weight:900;color:#7c3aed;">--</div>
                <div style="font-size:12px;color:#666;font-weight:700;">سجل سلوكي</div>
            </div>
        </div>

        <div id="backup-last" style="background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:18px;font-size:13px;font-weight:700;color:#555;">
            ⏳ جاري التحقق من آخر نسخة...
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="window.createFullBackup()" id="btn-create-backup" style="flex:1;background:var(--navy);color:#fff;border:none;padding:13px;border-radius:10px;font-family:Cairo;font-weight:900;font-size:15px;cursor:pointer;"><i class="bi bi-cloud-arrow-down-fill"></i> إنشاء نسخة احتياطية الآن</button>
            <button onclick="window.downloadLastBackup()" style="background:#f8fafc;color:var(--navy);border:1.5px solid var(--line);padding:13px 18px;border-radius:10px;font-family:Cairo;font-weight:700;font-size:14px;cursor:pointer;"><i class="bi bi-download"></i> تحميل آخر نسخة</button>
        </div>
    </div>

    <div class="card" style="margin-top:16px;border-top:5px solid var(--sky);">
        <h3><i class="bi bi-clock-history" style="color:var(--sky);"></i> سجل النسخ الاحتياطية</h3>
        <div id="backup-history" style="margin-top:12px;">⏳ جاري التحميل...</div>
    </div>`;

    await loadBackupStats();
}

let lastBackupData = null;

async function loadBackupStats() {
    const schoolId = getActiveSchoolId();
    try {
        const [studSnap, attSnap, behSnap] = await Promise.all([
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId)))
        ]);
        document.getElementById('backup-students-count').textContent = studSnap.size;
        document.getElementById('backup-attend-count').textContent = attSnap.size;
        document.getElementById('backup-behavior-count').textContent = behSnap.size;

        // آخر نسخة
        const backupSnap = await getDocs(query(
            collection(db, 'backups'),
            where('schoolId', '==', schoolId),
            orderBy('createdAt', 'desc'),
            limit(5)
        ));

        if (backupSnap.empty) {
            document.getElementById('backup-last').textContent = '⚠️ لا توجد نسخ احتياطية سابقة';
        } else {
            const last = backupSnap.docs[0].data();
            document.getElementById('backup-last').innerHTML =
                `✅ آخر نسخة: <b>${last.dateStr}</b> — ${last.studentsCount} طالب، ${last.attendanceCount} سجل حضور، بواسطة: ${last.createdBy}`;
        }

        // سجل النسخ
        const historyEl = document.getElementById('backup-history');
        if (backupSnap.empty) {
            historyEl.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:20px;">لا توجد نسخ سابقة</p>';
        } else {
            historyEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f8fafc;"><th style="padding:9px;text-align:right;">التاريخ</th><th style="padding:9px;">الطلاب</th><th style="padding:9px;">الحضور</th><th style="padding:9px;">المنشئ</th></tr></thead>
                <tbody>${backupSnap.docs.map(d => {
                    const b = d.data();
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
    const btn = document.getElementById('btn-create-backup');
    btn.innerHTML = '⏳ جاري إنشاء النسخة...';
    btn.disabled = true;

    const schoolId = getActiveSchoolId();
    const user = JSON.parse(localStorage.getItem('hs_user') || '{}');

    try {
        const [studSnap, attSnap, behSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId)))
        ]);

        const backupData = {
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

        // حفظ metadata بـ Firestore
        const dateStr = new Date().toLocaleDateString('ar-KW');
        await addDoc(collection(db, 'backups'), {
            schoolId,
            createdAt: serverTimestamp(),
            dateStr,
            createdBy: user.name || 'unknown',
            studentsCount: studSnap.size,
            attendanceCount: attSnap.size,
            behaviorCount: behSnap.size,
        });

        // تحميل ملف JSON
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${schoolId}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        window.showToast('✅ تم إنشاء النسخة الاحتياطية وتحميلها');
        document.getElementById('backup-last').innerHTML = `✅ آخر نسخة: <b>${dateStr}</b> — ${studSnap.size} طالب، بواسطة: ${user.name}`;
    } catch (e) {
        window.showToast('❌ خطأ: ' + e.message, 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-cloud-arrow-down-fill"></i> إنشاء نسخة احتياطية الآن';
        btn.disabled = false;
    }
};

window.downloadLastBackup = function() {
    if (!lastBackupData) { window.showToast('⚠️ أنشئ نسخة أولاً لتحميلها', 'info'); return; }
    const blob = new Blob([JSON.stringify(lastBackupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${lastBackupData.meta.schoolId}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
};
