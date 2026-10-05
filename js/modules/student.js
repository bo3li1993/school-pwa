import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, limit, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initStudentModule() {
    var container = document.getElementById('tab-student');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    // جلب الفصول من Firestore
    var classes = [];
    try {
        var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        classes = [...new Set(snap.docs.map(d => d.data().classId).filter(Boolean))].sort();
    } catch(e) {}

    var classOptions = classes.map(c => `<option value="${c}">${c}</option>`).join('');

    container.innerHTML = `
    <style>
        .sf-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .sf-title{font-size:14px;font-weight:900;color:#0b2545;margin-bottom:12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f0f2f5;padding-bottom:10px}
        .kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}
        .kpi-box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;text-align:center}
        .kpi-val{font-size:22px;font-weight:900}
        .kpi-lbl{font-size:10px;color:#6b7280;font-weight:700}
        .sec-tabs{display:flex;gap:4px;margin-bottom:12px;background:#f1f5f9;border-radius:8px;padding:3px;flex-wrap:wrap}
        .sec-tab{flex:1;padding:7px;border:none;border-radius:6px;font-family:Cairo,sans-serif;font-size:11px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s;min-width:80px}
        .sec-tab.active{background:#fff;color:#0b2545;box-shadow:0 1px 4px rgba(0,0,0,.08)}
        .sec-panel{display:none}.sec-panel.active{display:block}
        .data-table{width:100%;border-collapse:collapse;font-size:12px}
        .data-table th{background:#0b2545;color:#fff;padding:8px 10px;text-align:right;font-weight:700}
        .data-table td{padding:8px 10px;border-bottom:1px solid #f0f2f5;vertical-align:middle}
        .data-table tr:hover td{background:#fafafa}
        .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
        .risk-red{background:#fee2e2;color:#dc2626}
        .risk-orange{background:#fff7ed;color:#ea580c}
        .risk-green{background:#f0fdf4;color:#16a34a}
        .photo-wrap{width:80px;height:100px;border-radius:8px;border:2px solid #e5e7eb;overflow:hidden;cursor:pointer;position:relative;flex-shrink:0}
        .photo-wrap img{width:100%;height:100%;object-fit:cover}
        .photo-placeholder{width:100%;height:100%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:32px}
        .photo-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s}
        .photo-wrap:hover .photo-overlay{opacity:1}
        .btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
        .btn-primary{background:#0b2545;color:#fff}
        .btn-gold{background:#d4920a;color:#fff}
        .btn-green{background:#16a34a;color:#fff}
        .btn-sky{background:#1a78c2;color:#fff}
        .btn-sm{padding:4px 10px;font-size:11px}
        .note-item{padding:10px;border-bottom:1px solid #f0f2f5;font-size:13px}
        .note-author{font-weight:700;color:#0b2545;font-size:12px}
        .note-date{font-size:10px;color:#9ca3af}
        .bar-chart{display:flex;align-items:flex-end;gap:3px;height:80px;margin-top:8px}
        .bar-col{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1}
        .bar-fill{width:100%;border-radius:3px 3px 0 0;min-height:2px;transition:height .3s}
        .bar-lbl{font-size:8px;color:#6b7280;text-align:center}
        .bar-val{font-size:8px;font-weight:900;color:#374151}
        .risk-meter{display:flex;gap:8px;align-items:center;padding:10px;border-radius:8px;margin-bottom:10px}
        .inp-note{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-family:Cairo,sans-serif;font-size:13px;outline:none;resize:vertical;min-height:60px}
        .inp-note:focus{border-color:#1a78c2}
        .contact-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0f2f5;font-size:13px}
    </style>

    <!-- بحث -->
    <div class="sf-card">
        <div class="sf-title"><i class="bi bi-person-badge" style="color:#1a78c2"></i> ملف الطالب</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">١. اختر الفصل</label>
                <select id="st-class" onchange="window.loadClassStudents(this.value)"
                    style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;outline:none">
                    <option value="">-- اختر الفصل --</option>
                    ${classOptions}
                </select>
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">٢. اختر الطالب</label>
                <select id="st-student" disabled onchange="window.showStudentProfile(this.value)"
                    style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;outline:none">
                    <option value="">-- اختر الفصل أولاً --</option>
                </select>
            </div>
        </div>
    </div>

    <div id="st-results"></div>
    `;
}

window.loadClassStudents = async function(classId) {
    var sel = document.getElementById('st-student');
    if (!sel) return;
    sel.innerHTML = '<option>⏳ جاري التحميل...</option>';
    sel.disabled = true;
    if (!classId) { sel.innerHTML = '<option>-- اختر الفصل أولاً --</option>'; return; }
    try {
        var snap = await getDocs(query(collection(db, 'students'),
            where('schoolId', '==', getActiveSchoolId()),
            where('classId', '==', classId)));
        var students = snap.docs.map(d => ({id: d.id, ...d.data()}))
            .filter(s => s.name)
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        sel.innerHTML = '<option value="">-- اختر الطالب --</option>' +
            students.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        sel.disabled = false;
    } catch(e) { sel.innerHTML = '<option>❌ خطأ</option>'; }
};

window.showStudentProfile = async function(studentName) {
    var results = document.getElementById('st-results');
    if (!results || !studentName) { if (results) results.innerHTML = ''; return; }
    results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">⏳ جاري تحميل الملف الكامل...</div>';

    var schoolId = getActiveSchoolId();
    var classId = document.getElementById('st-class').value;

    try {
        var [stuSnap, attSnap, behSnap, gateSnap, clinicSnap, rewardSnap, warnSnap, noteSnap, honorSnap, contactSnap] = await Promise.all([
            getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId), where('name', '==', studentName), where('classId', '==', classId))),
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'rewards'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'warnings'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'student_notes'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'honors_board'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'principal_chats'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
        ]);

        var stuData = stuSnap.docs[0]?.data() || {};
        var stuId = stuSnap.docs[0]?.id || '';

        var totalAbs = attSnap.docs.filter(d => d.data().status === 'absent').length;
        var totalLate = attSnap.docs.filter(d => d.data().status === 'late').length;
        var totalBeh = behSnap.size;
        var totalGate = gateSnap.size;
        var totalClinic = clinicSnap.size;
        var totalRewards = rewardSnap.docs.reduce((s, d) => s + parseInt(d.data().points || 0), 0);
        var totalWarn = warnSnap.size;
        var totalNotes = noteSnap.size;
        var totalHonor = honorSnap.size;

        // مستوى الخطر
        var riskScore = (totalAbs * 2) + (totalWarn * 3) + totalBeh;
        var riskLevel = riskScore >= 15 ? '🔴 خطر عالي' : riskScore >= 6 ? '🟡 تنبيه' : '🟢 طبيعي';
        var riskClass = riskScore >= 15 ? 'risk-red' : riskScore >= 6 ? 'risk-orange' : 'risk-green';

        // رسم بياني للغياب بالشهر
        var byMonth = {};
        attSnap.docs.filter(d => d.data().status === 'absent').forEach(d => {
            var m = (d.data().date || '').slice(0, 7);
            if (m) byMonth[m] = (byMonth[m] || 0) + 1;
        });
        var months = Object.keys(byMonth).sort().slice(-6);
        var maxV = Math.max(...Object.values(byMonth), 1);
        var chartHTML = months.length ? `
            <div class="bar-chart">
                ${months.map(m => {
                    var v = byMonth[m];
                    var h = Math.round(v / maxV * 70);
                    var color = v >= 5 ? '#dc2626' : v >= 3 ? '#f59e0b' : '#1a78c2';
                    return `<div class="bar-col">
                        <div class="bar-val">${v}</div>
                        <div class="bar-fill" style="height:${h}px;background:${color}"></div>
                        <div class="bar-lbl">${m.slice(5)}</div>
                    </div>`;
                }).join('')}
            </div>` : '<div style="text-align:center;color:#16a34a;padding:10px;font-size:12px;font-weight:700">✅ لا يوجد غياب</div>';

        var photoHTML = stuData.photoURL
            ? `<img src="${stuData.photoURL}" alt="${studentName}">`
            : `<div class="photo-placeholder">👤</div>`;

        results.innerHTML = `
        <!-- بطاقة الطالب -->
        <div class="sf-card">
            <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
                <div class="photo-wrap" onclick="document.getElementById('photo-upload').click()">
                    ${photoHTML}
                    <div class="photo-overlay"><i class="bi bi-camera-fill" style="color:#fff;font-size:20px"></i></div>
                </div>
                <input type="file" id="photo-upload" accept="image/*" style="display:none" onchange="window.uploadStudentPhoto('${stuId}','${studentName}')">
                <div style="flex:1">
                    <div style="font-size:18px;font-weight:900;color:#0b2545;margin-bottom:4px">${studentName}</div>
                    <div style="font-size:13px;color:#6b7280;margin-bottom:2px">📚 الفصل: <strong>${classId}</strong>${stuData.studentId ? ` · رقم: <strong>${stuData.studentId}</strong>` : ''}</div>
                    ${stuData.civilId ? `<div style="font-size:12px;color:#6b7280;margin-bottom:2px">🪪 المدني: <strong>${stuData.civilId}</strong></div>` : ''}
                    ${stuData.parentName ? `<div style="font-size:12px;color:#6b7280;margin-bottom:2px">👨 ولي الأمر: <strong>${stuData.parentName}</strong></div>` : ''}
                    ${stuData.parentPhone ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px">📱 <strong>${stuData.parentPhone}</strong></div>` : ''}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                        <span class="badge ${riskClass}">${riskLevel}</span>
                        ${totalRewards > 0 ? `<span class="badge" style="background:#fef3c7;color:#92400e">🏆 ${totalRewards} نقطة</span>` : ''}
                        ${totalHonor > 0 ? `<span class="badge" style="background:#dcfce7;color:#15803d">🌟 لوحة الشرف</span>` : ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;flex-direction:column">
                    <button class="btn btn-gold btn-sm" onclick="window.printStudentProfile('${studentName}','${classId}')">
                        <i class="bi bi-printer"></i> طباعة الملف
                    </button>
                    ${stuData.parentPhone ? `<a href="https://wa.me/965${stuData.parentPhone}" target="_blank" class="btn btn-sm" style="background:#25d366;color:#fff"><i class="bi bi-whatsapp"></i> واتساب</a>` : ''}
                    ${stuData.parentPhone ? `<a href="tel:${stuData.parentPhone}" class="btn btn-sm" style="background:#1a78c2;color:#fff"><i class="bi bi-telephone"></i> اتصال</a>` : ''}
                </div>
            </div>
        </div>

        <!-- KPIs -->
        <div class="kpi-row">
            ${kpi('غياب', totalAbs, '#dc2626')}
            ${kpi('تأخر', totalLate, '#d97706')}
            ${kpi('سلوك', totalBeh, '#7c3aed')}
            ${kpi('استئذان', totalGate, '#0891b2')}
            ${kpi('عيادة', totalClinic, '#16a34a')}
        </div>

        <!-- رسم بياني -->
        <div class="sf-card">
            <div class="sf-title"><i class="bi bi-bar-chart-fill" style="color:#1a78c2"></i> غياب آخر 6 أشهر</div>
            ${chartHTML}
        </div>

        <!-- تبويبات التفاصيل -->
        <div class="sf-card">
            <div class="sec-tabs">
                <button class="sec-tab active" onclick="stTab('st-att',this)"><i class="bi bi-calendar-x"></i> الغياب (${totalAbs + totalLate})</button>
                <button class="sec-tab" onclick="stTab('st-beh',this)"><i class="bi bi-shield-exclamation"></i> السلوك (${totalBeh})</button>
                <button class="sec-tab" onclick="stTab('st-gate',this)"><i class="bi bi-door-open"></i> الاستئذان (${totalGate})</button>
                <button class="sec-tab" onclick="stTab('st-clinic',this)"><i class="bi bi-heart-pulse"></i> العيادة (${totalClinic})</button>
                <button class="sec-tab" onclick="stTab('st-rewards',this)"><i class="bi bi-star-fill"></i> النقاط (${totalRewards})</button>
                <button class="sec-tab" onclick="stTab('st-notes',this)"><i class="bi bi-pencil-square"></i> ملاحظات (${totalNotes})</button>
                <button class="sec-tab" onclick="stTab('st-contact',this)"><i class="bi bi-telephone"></i> التواصل (${contactSnap.size})</button>
                ${totalWarn ? `<button class="sec-tab" onclick="stTab('st-warn',this)"><i class="bi bi-exclamation-triangle-fill" style="color:#dc2626"></i> إنذارات (${totalWarn})</button>` : ''}
                ${totalHonor ? `<button class="sec-tab" onclick="stTab('st-honor',this)"><i class="bi bi-trophy" style="color:#d4920a"></i> الشرف (${totalHonor})</button>` : ''}
            </div>

            <div class="sec-panel active" id="st-att">${buildAttTable(attSnap.docs)}</div>
            <div class="sec-panel" id="st-beh">${buildBehTable(behSnap.docs)}</div>
            <div class="sec-panel" id="st-gate">${buildGateTable(gateSnap.docs)}</div>
            <div class="sec-panel" id="st-clinic">${buildClinicTable(clinicSnap.docs)}</div>
            <div class="sec-panel" id="st-rewards">${buildRewardsTable(rewardSnap.docs, totalRewards)}</div>
            <div class="sec-panel" id="st-notes">
                ${buildNotesSection(noteSnap.docs, stuId, studentName, schoolId)}
            </div>
            <div class="sec-panel" id="st-contact">
                ${buildContactSection(contactSnap.docs, stuData)}
            </div>
            ${totalWarn ? `<div class="sec-panel" id="st-warn">${buildWarnTable(warnSnap.docs)}</div>` : ''}
            ${totalHonor ? `<div class="sec-panel" id="st-honor">${buildHonorTable(honorSnap.docs)}</div>` : ''}
        </div>
        `;

    } catch(e) {
        results.innerHTML = `<div style="text-align:center;padding:20px;color:#dc2626;font-weight:700">❌ ${e.message}</div>`;
    }
};

window.stTab = function(id, btn) {
    document.querySelectorAll('.sec-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sec-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    btn.classList.add('active');
};

function kpi(label, val, color) {
    return `<div class="kpi-box"><div class="kpi-val" style="color:${color}">${val}</div><div class="kpi-lbl">${label}</div></div>`;
}

function buildAttTable(docs) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:700">✅ لا يوجد غياب أو تأخر</div>';
    var sorted = docs.slice().sort((a, b) => (b.data().date || '').localeCompare(a.data().date || ''));
    return `<div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>الحالة</th><th>الحصة</th><th>سجّلها</th></tr></thead>
        <tbody>${sorted.map(d => {
            var r = d.data();
            var color = r.status === 'absent' ? '#dc2626' : '#d97706';
            var label = r.status === 'absent' ? 'غائب' : 'متأخر';
            return `<tr><td>${r.date || '—'}</td><td><span class="badge" style="background:${color}22;color:${color}">${label}</span></td><td>${r.period || '—'}</td><td style="font-size:11px;color:#6b7280">${r.recordedBy || '—'}</td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

function buildBehTable(docs) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:700">✅ لا توجد حوادث سلوكية</div>';
    var sorted = docs.slice().sort((a, b) => (b.data().date || '').localeCompare(a.data().date || ''));
    return `<div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>الإجراء</th><th>بواسطة</th></tr></thead>
        <tbody>${sorted.map(d => {
            var r = d.data();
            return `<tr><td>${r.date || '—'}</td><td>${r.type || r.violationType || '—'}</td><td style="font-size:11px">${r.action || r.actionTaken || '—'}</td><td style="font-size:11px;color:#6b7280">${r.recordedBy || '—'}</td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

function buildGateTable(docs) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:700">✅ لا توجد استئذانات</div>';
    var sorted = docs.slice().sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));
    return `<div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>السبب</th><th>المستلم</th></tr></thead>
        <tbody>${sorted.map(d => {
            var r = d.data();
            var date = r.date || (r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('ar-KW') : '—');
            return `<tr><td>${date}</td><td>${r.reason || '—'}</td><td>${r.relative || '—'}</td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

function buildClinicTable(docs) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:700">✅ لا توجد زيارات للعيادة</div>';
    var sorted = docs.slice().sort((a, b) => (b.data().date || '').localeCompare(a.data().date || ''));
    return `<div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>الشكوى</th><th>العلاج</th><th>النتيجة</th></tr></thead>
        <tbody>${sorted.map(d => {
            var r = d.data();
            return `<tr><td>${r.date || '—'}</td><td>${r.complaint || '—'}</td><td style="font-size:11px">${r.treatment || '—'}</td><td><span class="badge" style="background:#eaf4fd;color:#1a78c2">${r.result || '—'}</span></td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

function buildRewardsTable(docs, total) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#6b7280;font-weight:700">لا توجد نقاط مسجلة</div>';
    var sorted = docs.slice().sort((a, b) => (b.data().date || '').localeCompare(a.data().date || ''));
    return `<div style="background:linear-gradient(135deg,#0b2545,#1a4a8a);border-radius:10px;padding:16px;text-align:center;margin-bottom:12px;color:#fff">
        <div style="font-size:11px;opacity:.7">إجمالي الرصيد</div>
        <div style="font-size:36px;font-weight:900">${total}</div>
        <div style="font-size:12px;opacity:.8">نقطة</div>
    </div>
    <div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>السبب</th><th>النقاط</th><th>بواسطة</th></tr></thead>
        <tbody>${sorted.map(d => {
            var r = d.data();
            var color = r.points > 0 ? '#16a34a' : '#dc2626';
            return `<tr><td>${r.date || '—'}</td><td>${r.reason || '—'}</td><td style="font-weight:900;color:${color}">${r.points > 0 ? '+' : ''}${r.points}</td><td style="font-size:11px;color:#6b7280">${r.grantedBy || '—'}</td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

function buildNotesSection(docs, stuId, studentName, schoolId) {
    var notesList = docs.length
        ? docs.slice().sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
            .map(d => {
                var r = d.data();
                var date = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('ar-KW') : '—';
                return `<div class="note-item">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span class="note-author">${r.addedBy || '—'}</span>
                        <span class="note-date">${date}</span>
                    </div>
                    <div style="color:#374151">${r.note || '—'}</div>
                </div>`;
            }).join('')
        : '<div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px">لا توجد ملاحظات</div>';

    return `<div style="margin-bottom:12px">
        <textarea id="st-new-note" class="inp-note" placeholder="اكتب ملاحظة جديدة..."></textarea>
        <button class="btn btn-sky btn-sm" style="margin-top:6px" onclick="window.addStudentNote('${stuId}','${studentName}','${schoolId}')">
            <i class="bi bi-plus"></i> إضافة ملاحظة
        </button>
    </div>
    <div id="st-notes-list">${notesList}</div>`;
}

function buildContactSection(docs, stuData) {
    var contactLog = docs.length
        ? docs.slice().sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
            .map(d => {
                var r = d.data();
                var date = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('ar-KW') : '—';
                return `<div class="contact-item">
                    <i class="bi bi-telephone-fill" style="color:#1a78c2"></i>
                    <div style="flex:1">
                        <div style="font-weight:700">${r.subject || 'تواصل مع ولي الأمر'}</div>
                        <div style="font-size:11px;color:#6b7280">${date} · ${r.by || '—'}</div>
                    </div>
                </div>`;
            }).join('')
        : '<div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px">لا يوجد سجل تواصل</div>';

    return `<div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap">
        ${stuData.parentPhone ? `<a href="https://wa.me/965${stuData.parentPhone}" target="_blank" class="btn btn-sm" style="background:#25d366;color:#fff"><i class="bi bi-whatsapp"></i> واتساب</a>` : ''}
        ${stuData.parentPhone ? `<a href="tel:${stuData.parentPhone}" class="btn btn-sm" style="background:#1a78c2;color:#fff"><i class="bi bi-telephone"></i> ${stuData.parentPhone}</a>` : ''}
        ${!stuData.parentPhone ? '<div style="color:#9ca3af;font-size:12px">لا يوجد رقم مسجل</div>' : ''}
    </div>
    <div>${contactLog}</div>`;
}

function buildWarnTable(docs) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:700">✅ لا توجد إنذارات</div>';
    var sorted = docs.slice().sort((a, b) => (b.data().date || '').localeCompare(a.data().date || ''));
    return `<div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>نوع الإنذار</th><th>السبب</th><th>بواسطة</th></tr></thead>
        <tbody>${sorted.map(d => {
            var r = d.data();
            return `<tr><td>${r.date || '—'}</td><td><span class="badge risk-red">${r.type || 'إنذار'}</span></td><td style="font-size:11px">${r.reason || '—'}</td><td style="font-size:11px;color:#6b7280">${r.issuedBy || '—'}</td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

function buildHonorTable(docs) {
    if (!docs.length) return '<div style="text-align:center;padding:20px;color:#6b7280">لا يوجد</div>';
    return `<div style="overflow-x:auto"><table class="data-table">
        <thead><tr><th>التاريخ</th><th>السبب</th><th>بواسطة</th></tr></thead>
        <tbody>${docs.map(d => {
            var r = d.data();
            return `<tr><td>${r.date || '—'}</td><td>🌟 ${r.reason || r.achievement || '—'}</td><td style="font-size:11px;color:#6b7280">${r.addedBy || '—'}</td></tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

window.addStudentNote = async function(stuId, studentName, schoolId) {
    var note = document.getElementById('st-new-note')?.value.trim();
    if (!note) return;
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    try {
        await addDoc(collection(db, 'student_notes'), {
            schoolId, studentName, stuId,
            note, addedBy: me.name || '—',
            createdAt: serverTimestamp()
        });
        if (window.showToast) window.showToast('✅ تم إضافة الملاحظة');
        document.getElementById('st-new-note').value = '';
        // تحديث القائمة
        var snap = await getDocs(query(collection(db, 'student_notes'), where('schoolId', '==', schoolId), where('studentName', '==', studentName)));
        var list = document.getElementById('st-notes-list');
        if (list) {
            list.innerHTML = snap.docs.slice().sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
                .map(d => {
                    var r = d.data();
                    var date = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('ar-KW') : '—';
                    return `<div class="note-item"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:700;font-size:12px">${r.addedBy || '—'}</span><span style="font-size:10px;color:#9ca3af">${date}</span></div><div style="color:#374151">${r.note}</div></div>`;
                }).join('') || '<div style="color:#9ca3af;padding:16px;text-align:center">لا توجد ملاحظات</div>';
        }
    } catch(e) { if (window.showToast) window.showToast('❌ ' + e.message, 'error'); }
};

window.uploadStudentPhoto = async function(stuId, studentName) {
    var file = document.getElementById('photo-upload')?.files[0];
    if (!file || !stuId) return;
    if (file.size > 2000000) { if (window.showToast) window.showToast('الصورة أكبر من 2MB', 'error'); return; }
    try {
        var reader = new FileReader();
        reader.onload = async function(e) {
            var base64 = e.target.result;
            await updateDoc(doc(db, 'students', stuId), { photoURL: base64 });
            if (window.showToast) window.showToast('✅ تم رفع الصورة');
            var wrap = document.querySelector('.photo-wrap');
            if (wrap) wrap.innerHTML = `<img src="${base64}" alt="${studentName}"><div class="photo-overlay"><i class="bi bi-camera-fill" style="color:#fff;font-size:20px"></i></div>`;
        };
        reader.readAsDataURL(file);
    } catch(e) { if (window.showToast) window.showToast('❌ ' + e.message, 'error'); }
};

window.printStudentProfile = async function(studentName, classId) {
    var user = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var schoolId = getActiveSchoolId();
    try {
        var [attSnap, behSnap, gateSnap, clinicSnap, warnSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
            getDocs(query(collection(db, 'warnings'), where('schoolId', '==', schoolId), where('studentName', '==', studentName))),
        ]);
        var totalAbs = attSnap.docs.filter(d => d.data().status === 'absent').length;
        var totalLate = attSnap.docs.filter(d => d.data().status === 'late').length;

        var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
        <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:11px}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        th{background:#0b2545;color:#fff;padding:7px;text-align:right}td{padding:6px 7px;border:1px solid #ddd}
        h3{font-size:13px;color:#0b2545;margin:14px 0 6px;border-bottom:2px solid #0b2545;padding-bottom:4px}
        .kpi-row{display:flex;gap:8px;margin-bottom:14px}.kpi{flex:1;text-align:center;border:1px solid #ddd;border-radius:6px;padding:8px}
        .kpi-v{font-size:20px;font-weight:900}.kpi-l{font-size:9px;color:#666}
        @page{size:A4;margin:10mm}</style></head><body>
        <div style="border-bottom:3px double #0b2545;margin-bottom:14px;padding-bottom:10px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:10px">دولة الكويت<br>وزارة التربية</div>
            <div style="text-align:center"><div style="font-size:16px;font-weight:900;color:#0b2545">ملف الطالب</div>
            <div style="font-size:14px;font-weight:700">${studentName} — ${classId}</div></div>
            <div style="font-size:10px;text-align:left">${user.schoolName || ''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
        </div>
        <div class="kpi-row">
            <div class="kpi"><div class="kpi-v" style="color:#dc2626">${totalAbs}</div><div class="kpi-l">غياب</div></div>
            <div class="kpi"><div class="kpi-v" style="color:#d97706">${totalLate}</div><div class="kpi-l">تأخر</div></div>
            <div class="kpi"><div class="kpi-v" style="color:#7c3aed">${behSnap.size}</div><div class="kpi-l">سلوك</div></div>
            <div class="kpi"><div class="kpi-v" style="color:#0891b2">${gateSnap.size}</div><div class="kpi-l">استئذان</div></div>
            <div class="kpi"><div class="kpi-v" style="color:#16a34a">${clinicSnap.size}</div><div class="kpi-l">عيادة</div></div>
            <div class="kpi"><div class="kpi-v" style="color:#dc2626">${warnSnap.size}</div><div class="kpi-l">إنذارات</div></div>
        </div>
        <h3>الغياب والتأخر</h3>
        <table><thead><tr><th>التاريخ</th><th>الحالة</th><th>الحصة</th></tr></thead><tbody>
        ${attSnap.docs.sort((a,b)=>(b.data().date||'').localeCompare(a.data().date||'')).map(d=>{var r=d.data();return `<tr><td>${r.date||'—'}</td><td>${r.status==='absent'?'غائب':'متأخر'}</td><td>${r.period||'—'}</td></tr>`;}).join('')||'<tr><td colspan="3" style="text-align:center;color:green">لا يوجد غياب</td></tr>'}
        </tbody></table>
        <h3>السلوك</h3>
        <table><thead><tr><th>التاريخ</th><th>النوع</th><th>الإجراء</th></tr></thead><tbody>
        ${behSnap.docs.map(d=>{var r=d.data();return `<tr><td>${r.date||'—'}</td><td>${r.type||'—'}</td><td>${r.action||'—'}</td></tr>`;}).join('')||'<tr><td colspan="3" style="text-align:center;color:green">لا توجد حوادث</td></tr>'}
        </tbody></table>
        <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:10px">
            <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:100px">المرشد الطلابي<br>______________</div>
            <div style="text-align:center;font-size:9px;color:#aaa">المنظومة الرقمية</div>
            <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:100px">مدير المدرسة<br>______________</div>
        </div>
        <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;

        var b = new Blob([html], {type: 'text/html;charset=utf-8'});
        window.open(URL.createObjectURL(b), '_blank');
    } catch(e) { if (window.showToast) window.showToast('❌ ' + e.message, 'error'); }
};
