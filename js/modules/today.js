import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const container = document.getElementById('tab-index');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const schoolId = getActiveSchoolId();
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const todayISO = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('ar-KW', { weekday: 'long' });
    const dateAr = d.toLocaleDateString('ar-KW', { year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
    <!-- ترحيب -->
    <div style="background:linear-gradient(135deg,var(--navy) 0%,#1a4a8a 100%);border-radius:16px;padding:22px 24px;margin-bottom:18px;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
            <div style="font-size:13px;opacity:.75;font-weight:600;">${dayName}، ${dateAr}</div>
            <h2 style="margin:4px 0 0;font-size:20px;font-weight:900;">مرحباً، ${user.name || 'المدير'} 👋</h2>
            <div style="font-size:12px;opacity:.65;margin-top:3px;">${user.schoolName || ''}</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,.1);padding:12px 20px;border-radius:12px;">
            <div id="dash-attend-rate" style="font-size:32px;font-weight:900;color:var(--gold);">--</div>
            <div style="font-size:11px;opacity:.8;">نسبة الحضور اليوم</div>
        </div>
    </div>

    <!-- بطاقات الإحصائيات -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:18px;">
        <div style="background:#fff;border-radius:12px;padding:16px;border-bottom:4px solid #dc2626;box-shadow:0 1px 4px rgba(0,0,0,.07);">
            <div style="font-size:11px;color:#999;font-weight:700;">غياب اليوم</div>
            <div id="dash-absent" style="font-size:36px;font-weight:900;color:#dc2626;line-height:1.2;">--</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:16px;border-bottom:4px solid #d97706;box-shadow:0 1px 4px rgba(0,0,0,.07);">
            <div style="font-size:11px;color:#999;font-weight:700;">تأخير اليوم</div>
            <div id="dash-late" style="font-size:36px;font-weight:900;color:#d97706;line-height:1.2;">--</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:16px;border-bottom:4px solid #7c3aed;box-shadow:0 1px 4px rgba(0,0,0,.07);">
            <div style="font-size:11px;color:#999;font-weight:700;">حوادث سلوكية</div>
            <div id="dash-behavior" style="font-size:36px;font-weight:900;color:#7c3aed;line-height:1.2;">--</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:16px;border-bottom:4px solid #0891b2;box-shadow:0 1px 4px rgba(0,0,0,.07);">
            <div style="font-size:11px;color:#999;font-weight:700;">استئذان اليوم</div>
            <div id="dash-gatepass" style="font-size:36px;font-weight:900;color:#0891b2;line-height:1.2;">--</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:16px;border-bottom:4px solid #16a34a;box-shadow:0 1px 4px rgba(0,0,0,.07);">
            <div style="font-size:11px;color:#999;font-weight:700;">إجمالي الطلاب</div>
            <div id="dash-total" style="font-size:36px;font-weight:900;color:#16a34a;line-height:1.2;">--</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:16px;border-bottom:4px solid #d4920a;box-shadow:0 1px 4px rgba(0,0,0,.07);">
            <div style="font-size:11px;color:#999;font-weight:700;">زيارات فنية (شهر)</div>
            <div id="dash-visits" style="font-size:36px;font-weight:900;color:#d4920a;line-height:1.2;">--</div>
        </div>
    </div>

    <!-- غياب متكرر تنبيه -->
    <div id="dash-repeat-alert" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:14px 18px;margin-bottom:18px;">
        <div style="font-weight:900;color:#dc2626;margin-bottom:8px;"><i class="bi bi-exclamation-circle-fill"></i> طلاب تجاوزوا 5 أيام غياب هذا الشهر</div>
        <div id="dash-repeat-list" style="font-size:13px;color:#555;"></div>
    </div>

    <!-- إجراءات سريعة -->
    <div style="background:#fff;border-radius:14px;padding:18px;margin-bottom:18px;border:1px solid var(--line);">
        <h3 style="margin:0 0 14px;font-size:15px;font-weight:900;color:var(--navy);"><i class="bi bi-lightning-charge-fill" style="color:var(--gold);"></i> إجراءات سريعة</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
            <button onclick="window.switchTab('tab-attendance')" style="background:var(--navy);color:#fff;border:none;padding:12px;border-radius:10px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;"><i class="bi bi-clipboard-check" style="font-size:16px;"></i> تسجيل الغياب</button>
            <button onclick="window.switchTab('tab-behavior')" style="background:#7c3aed;color:#fff;border:none;padding:12px;border-radius:10px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;"><i class="bi bi-shield-exclamation" style="font-size:16px;"></i> تسجيل سلوك</button>
            <button onclick="window.switchTab('tab-gatepass')" style="background:#0891b2;color:#fff;border:none;padding:12px;border-radius:10px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;"><i class="bi bi-door-open" style="font-size:16px;"></i> استئذان</button>
            <button onclick="window.switchTab('tab-visits')" style="background:#d4920a;color:#fff;border:none;padding:12px;border-radius:10px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;"><i class="bi bi-clipboard-data" style="font-size:16px;"></i> زيارة فنية</button>
        </div>
    </div>

    <!-- بث الواتساب -->
    <div style="background:#fff;border-radius:14px;padding:18px;border:1px solid var(--line);">
        <h3 style="margin:0 0 14px;font-size:15px;font-weight:900;color:var(--navy);"><i class="bi bi-whatsapp" style="color:#25d366;"></i> بث إشعار الغياب</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <select id="whatsapp-class-select" style="flex:1;min-width:160px;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;">
                <option value="">-- اختر الفصل --</option>
            </select>
            <button onclick="window.triggerWhatsAppBroadcast()" style="background:#25d366;color:#fff;border:none;padding:11px 20px;border-radius:8px;font-family:Cairo;font-weight:900;font-size:14px;cursor:pointer;white-space:nowrap;"><i class="bi bi-whatsapp"></i> بث الآن</button>
        </div>
        <div id="whatsapp-result" style="margin-top:10px;font-size:13px;"></div>
    </div>`;

    if (!schoolId) return;

    try {
        // سحب كل البيانات بالتوازي
        const [attSnap, behavSnap, gateSnap, totalSnap, visitsSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('date', '==', todayISO))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('dateStr', '==', new Date().toLocaleDateString('ar-KW')))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('dateStr', '==', new Date().toLocaleDateString('ar-KW')))),
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'visits'), where('schoolId', '==', schoolId)))
        ]);

        let absent = 0, late = 0;
        attSnap.forEach(d => {
            if (d.data().status === 'absent') absent++;
            if (d.data().status === 'late') late++;
        });

        const total = totalSnap.size;
        const attended = total - absent;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

        document.getElementById('dash-absent').textContent = absent;
        document.getElementById('dash-late').textContent = late;
        document.getElementById('dash-behavior').textContent = behavSnap.size;
        document.getElementById('dash-gatepass').textContent = gateSnap.size;
        document.getElementById('dash-total').textContent = total;
        document.getElementById('dash-attend-rate').textContent = rate + '%';

        // زيارات الشهر الحالي
        const thisMonth = new Date().toISOString().slice(0, 7);
        let monthVisits = 0;
        visitsSnap.forEach(d => { if ((d.data().dateStr || '').startsWith(thisMonth) || (d.data().date || '').startsWith(thisMonth)) monthVisits++; });
        document.getElementById('dash-visits').textContent = monthVisits;

        // تعبئة فصول واتساب
        const classes = [...new Set(totalSnap.docs.map(d => d.data().classId).filter(Boolean))].sort();
        document.getElementById('whatsapp-class-select').innerHTML =
            '<option value="">-- اختر الفصل --</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');

        // غياب متكرر
        checkRepeatAbsence(schoolId, totalSnap.docs);

    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

async function checkRepeatAbsence(schoolId, studentDocs) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const snap = await getDocs(query(
            collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('date', '>=', monthStart),
            where('status', '==', 'absent')
        ));

        const counts = {};
        snap.forEach(d => {
            const n = d.data().studentName;
            if (n) counts[n] = (counts[n] || 0) + 1;
        });

        const atRisk = Object.entries(counts).filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]);
        if (atRisk.length > 0) {
            document.getElementById('dash-repeat-alert').style.display = 'block';
            document.getElementById('dash-repeat-list').innerHTML = atRisk.slice(0, 8).map(([name, count]) =>
                `<span style="display:inline-block;background:#fff;border:1px solid #fca5a5;padding:3px 10px;border-radius:6px;margin:2px 3px;font-weight:700;">${name} <span style="color:#dc2626;">(${count} أيام)</span></span>`
            ).join('');
        }
    } catch (e) { }
}

window.triggerWhatsAppBroadcast = async function() {
    const classId = document.getElementById('whatsapp-class-select').value;
    if (!classId) { window.showToast('اختر الفصل أولاً', 'info'); return; }

    const schoolId = getActiveSchoolId();
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const todayISO = d.toISOString().split('T')[0];

    const resultEl = document.getElementById('whatsapp-result');
    resultEl.innerHTML = '<span style="color:#999;">⏳ جاري الحصر...</span>';

    try {
        const [attSnap, studSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('date', '==', todayISO))),
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId), where('classId', '==', classId)))
        ]);

        const absentNames = new Set();
        attSnap.forEach(doc => { if (doc.data().classId === classId && doc.data().status === 'absent') absentNames.add(doc.data().studentName); });

        if (!absentNames.size) { resultEl.innerHTML = '<span style="color:#16a34a;font-weight:700;">✅ لا يوجد غياب في هذا الفصل اليوم</span>'; return; }

        let sent = 0;
        studSnap.forEach(doc => {
            const data = doc.data();
            if (absentNames.has(data.name) && data.parentPhone) {
                const msg = `السلام عليكم ولي أمر الطالب ${data.name}،\nنُعلمكم بغياب ابنكم اليوم ${d.toLocaleDateString('ar-KW')} عن المدرسة.\nالرجاء التواصل معنا.\nإدارة ${JSON.parse(localStorage.getItem('hs_user') || '{}').schoolName || 'المدرسة'}`;
                const phone = data.parentPhone.replace(/^0/, '965').replace(/[^0-9]/g, '');
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                sent++;
            }
        });

        resultEl.innerHTML = `<span style="color:#16a34a;font-weight:700;">✅ تم فتح ${sent} محادثة واتساب للغائبين</span>`;
    } catch (e) {
        resultEl.innerHTML = `<span style="color:#dc2626;">❌ ${e.message}</span>`;
    }
};
