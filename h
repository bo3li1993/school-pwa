<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ترحيل بيانات الحسينان</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cairo',sans-serif;background:#f8f9fc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:#fff;border-radius:16px;padding:32px;max-width:560px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);border:1px solid #e5e7eb}
h1{font-size:18px;font-weight:900;color:#0b2545;margin-bottom:6px}
p{font-size:13px;color:#6b7280;margin-bottom:24px;line-height:1.7}
.btn{width:100%;padding:13px;background:#0b2545;color:#fff;border:none;border-radius:10px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;transition:background .2s}
.btn:hover{background:#134074}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.green{background:#059669}
.log{background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:16px;font-size:12px;line-height:1.8;max-height:300px;overflow-y:auto;font-family:monospace;white-space:pre-wrap;color:#374151;margin-top:16px;display:none}
.progress{background:#e5e7eb;border-radius:8px;height:8px;margin:12px 0;overflow:hidden;display:none}
.progress-bar{height:100%;background:#1a78c2;border-radius:8px;transition:width .3s}
.summary{background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:14px;margin-top:12px;font-size:13px;font-weight:700;color:#065f46;display:none}
.warn{background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:16px;font-size:12.5px;color:#92400e;font-weight:700}
</style>
</head>
<body>
<div class="box">
  <h1>🔄 ترحيل بيانات متوسطة سالم الحسينان</h1>
  <div class="warn">⚠️ شغّلها مرة وحدة فقط — هذي الأداة تضيف schoolId: "hosainan" لكل سجلات المدرسة القديمة</div>
  <p>
    تضيف <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">schoolId: "hosainan"</code>
    لكل سجلات الطلاب، الغياب، الزيارات وكل البيانات القديمة التي رُفعت قبل نظام تعدد المدارس.
  </p>

  <button class="btn" id="btn-start" onclick="startMigration()">
    🚀 ابدأ الترحيل الآن
  </button>

  <div class="progress" id="prog">
    <div class="progress-bar" id="prog-bar" style="width:0%"></div>
  </div>

  <div class="summary" id="summary"></div>
  <div class="log" id="log"></div>
</div>

<script type="module">
import { db } from './js/firebase-config.js';
import { collection, getDocs, writeBatch, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const SCHOOL_ID = 'hosainan';

const COLLECTIONS = [
    'attendance', 'students', 'users', 'behavior', 'behavior_logs',
    'clinic', 'gatepass', 'gatepasses', 'rewards', 'honors_board',
    'technical_visits', 'manager_visits', 'announcements',
    'school_threads', 'wing_rounds', 'visitors', 'visitors_logs',
    'circulars', 'emergency_alerts', 'class_distribution',
    'notifications_queue', 'fcm_tokens'
];

function log(msg) {
    const el = document.getElementById('log');
    el.style.display = 'block';
    el.textContent += msg + '\n';
    el.scrollTop = el.scrollHeight;
}
function setProgress(pct) { document.getElementById('prog-bar').style.width = pct + '%'; }

window.startMigration = async function() {
    const btn = document.getElementById('btn-start');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الترحيل...';
    document.getElementById('prog').style.display = 'block';

    let totalUpdated = 0, totalSkipped = 0, totalErrors = 0;

    for(let i = 0; i < COLLECTIONS.length; i++) {
        const colName = COLLECTIONS[i];
        setProgress(Math.round((i / COLLECTIONS.length) * 100));

        try {
            const snap = await getDocs(collection(db, colName));
            if(snap.empty) { log(`⏭ ${colName}: فارغة`); continue; }

            const needsUpdate = snap.docs.filter(d => !d.data().schoolId);
            const alreadyHas  = snap.docs.length - needsUpdate.length;

            if(needsUpdate.length === 0) {
                log(`✅ ${colName}: كل الـ ${alreadyHas} سجل لديه schoolId بالفعل`);
                totalSkipped += alreadyHas;
                continue;
            }

            const BATCH_SIZE = 400;
            for(let j = 0; j < needsUpdate.length; j += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = needsUpdate.slice(j, j + BATCH_SIZE);
                chunk.forEach(docSnap => {
                    batch.update(doc(db, colName, docSnap.id), { schoolId: SCHOOL_ID });
                });
                await batch.commit();
            }

            log(`✅ ${colName}: رحّلت ${needsUpdate.length} سجل${alreadyHas ? ` (${alreadyHas} موجود مسبقاً)` : ''}`);
            totalUpdated += needsUpdate.length;
            totalSkipped += alreadyHas;

        } catch(err) {
            log(`❌ ${colName}: ${err.message}`);
            totalErrors++;
        }
    }

    setProgress(100);

    // إنشاء/تأكيد سجل المدرسة
    try {
        const schoolRef = doc(db, 'schools', SCHOOL_ID);
        const schoolSnap = await getDoc(schoolRef);
        if(!schoolSnap.exists()) {
            await setDoc(schoolRef, {
                name: 'متوسطة سالم الحسينان للبنين',
                plan: 'enterprise', status: 'active',
                subscriptionEnd: '2027-12-31',
                createdAt: new Date().toISOString()
            });
            log(`✅ schools/${SCHOOL_ID}: تم إنشاء سجل المدرسة`);
        } else {
            log(`✅ schools/${SCHOOL_ID}: موجود بالفعل`);
        }
    } catch(e) { log(`⚠️ schools: ${e.message}`); }

    // تأكيد ربط حساب 6464 بالمدرسة
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let fixedAdmin = 0;
        const batch = writeBatch(db);
        usersSnap.forEach(d => {
            const u = d.data();
            if(String(u.userId) === '6464' && !u.schoolId) {
                batch.update(doc(db, 'users', d.id), { schoolId: SCHOOL_ID });
                fixedAdmin++;
            }
        });
        if(fixedAdmin > 0) { await batch.commit(); log(`✅ تم ربط حساب المدير 6464 بـ schoolId: ${SCHOOL_ID}`); }
    } catch(e) { log(`⚠️ users: ${e.message}`); }

    const summaryEl = document.getElementById('summary');
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `🎉 اكتمل الترحيل!<br>✅ رُحِّل: ${totalUpdated} سجل<br>⏭ موجود مسبقاً: ${totalSkipped} سجل<br>${totalErrors ? `❌ أخطاء: ${totalErrors}` : '✅ صفر أخطاء'}`;

    btn.innerHTML = '✅ اكتمل الترحيل';
    btn.className = 'btn green';
    btn.disabled = false;
    btn.onclick = null;
};
</script>
</body>
</html>
