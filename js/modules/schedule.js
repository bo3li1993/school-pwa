import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, setDoc, getDoc, doc, query, where, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
const PERIODS = [
    {num:1, start:'07:30', end:'08:10'},
    {num:2, start:'08:10', end:'08:50'},
    {num:3, start:'08:50', end:'09:30'},
    {num:4, start:'09:45', end:'10:25'},
    {num:5, start:'10:25', end:'11:05'},
    {num:6, start:'11:05', end:'11:45'},
    {num:7, start:'11:55', end:'12:35'},
];

export async function initScheduleModule() {
    var container = document.getElementById('tab-schedule');
    if(!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .sc-tabs{display:flex;gap:4px;margin-bottom:18px;background:#f1f5f9;border-radius:10px;padding:4px}
        .sc-tab{flex:1;padding:9px;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s}
        .sc-tab.active{background:#fff;color:#0b2545;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .sc-panel{display:none}.sc-panel.active{display:block}
        .sc-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .sc-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px;justify-content:space-between}
        .inp{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;font-family:Cairo,sans-serif;font-size:13px;outline:none;transition:border .15s;margin-bottom:8px}
        .inp:focus{border-color:#1a78c2}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
        .btn-primary{background:#0b2545;color:#fff}
        .btn-gold{background:#d4920a;color:#fff}
        .btn-green{background:#16a34a;color:#fff}
        .btn-red{background:#dc2626;color:#fff}
        .btn-outline{background:transparent;border:1.5px solid #1a78c2;color:#1a78c2}
        .btn-sm{padding:5px 10px;font-size:11px}

        /* الجدول */
        .schedule-table{width:100%;border-collapse:collapse;font-size:12px}
        .schedule-table th{background:#0b2545;color:#fff;padding:10px 8px;text-align:center;font-weight:700;white-space:nowrap}
        .schedule-table td{border:1px solid #e5e7eb;padding:4px;vertical-align:top;min-width:80px}
        .schedule-table tr:hover td{background:#fafafa}
        .period-header{background:#f1f5f9;text-align:center;font-weight:900;color:#0b2545;font-size:11px}
        .period-time{font-size:9px;color:#6b7280;font-weight:600;display:block}

        /* خلية الحصة */
        .cell{min-height:52px;border-radius:6px;padding:5px 6px;cursor:pointer;transition:all .15s;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
        .cell:hover{filter:brightness(.95)}
        .cell.empty{background:#f8fafc;border:1.5px dashed #e5e7eb}
        .cell.empty:hover{border-color:#1a78c2;background:#eaf4fd}
        .cell.filled{border:none}
        .cell-subject{font-size:11px;font-weight:900;line-height:1.3}
        .cell-teacher{font-size:9px;opacity:.8;margin-top:2px}
        .cell-add{font-size:18px;color:#cbd5e1}

        /* تعارض */
        .conflict-badge{background:#fee2e2;color:#dc2626;border-radius:6px;padding:8px 12px;font-size:12px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}
        .no-conflict{background:#f0fdf4;color:#16a34a;border-radius:6px;padding:8px 12px;font-size:12px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}

        /* modal */
        .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center}
        .modal-overlay.show{display:flex}
        .modal{background:#fff;border-radius:14px;padding:24px;width:92%;max-width:400px;position:relative}
        .modal-close{position:absolute;top:14px;left:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280}
        .modal-title{font-size:16px;font-weight:900;color:#0b2545;margin-bottom:16px}

        /* تنبيه */
        .notif-bar{background:linear-gradient(135deg,#0b2545,#1a4a8a);color:#fff;border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px}
        .notif-bar i{font-size:20px;color:#fbbf24}

        /* أيام */
        .day-btns{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
        .day-btn{padding:7px 14px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;color:#6b7280}
        .day-btn.active{background:#0b2545;color:#fff;border-color:#0b2545}
        .today-marker{background:#1a78c2;color:#fff;border-color:#1a78c2}
    </style>

    <div class="sc-tabs">
        <button class="sc-tab active" onclick="scTab('sc-class',this)"><i class="bi bi-grid-3x3"></i> جدول الفصل</button>
        <button class="sc-tab" onclick="scTab('sc-teacher',this)"><i class="bi bi-person-badge"></i> جدول المعلم</button>
        <button class="sc-tab" onclick="scTab('sc-conflicts',this);scCheckConflicts()"><i class="bi bi-exclamation-triangle"></i> التعارضات</button>
        <button class="sc-tab" onclick="scTab('sc-notif',this)"><i class="bi bi-bell-fill"></i> التنبيهات</button>
    </div>

    <!-- ===== جدول الفصل ===== -->
    <div class="sc-panel active" id="sc-class">
        <div class="sc-card">
            <div class="sc-title">
                <span><i class="bi bi-grid-3x3" style="color:#1a78c2"></i> جدول الفصل</span>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-gold btn-sm" onclick="scPrintClass()"><i class="bi bi-printer"></i> طباعة</button>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
                <select class="inp" id="sc-class-sel" onchange="scLoadClassSchedule()" style="margin-bottom:0;flex:1">
                    <option value="">اختر الفصل...</option>
                </select>
            </div>
            <div id="sc-class-grid" style="overflow-x:auto">
                <div style="text-align:center;padding:40px;color:#6b7280;font-size:13px">اختر فصلاً لعرض جدوله</div>
            </div>
        </div>
    </div>

    <!-- ===== جدول المعلم ===== -->
    <div class="sc-panel" id="sc-teacher">
        <div class="sc-card">
            <div class="sc-title">
                <span><i class="bi bi-person-badge" style="color:#7c3aed"></i> جدول المعلم</span>
                <button class="btn btn-gold btn-sm" onclick="scPrintTeacher()"><i class="bi bi-printer"></i> طباعة</button>
            </div>
            <select class="inp" id="sc-teacher-sel" onchange="scLoadTeacherSchedule()">
                <option value="">اختر المعلم...</option>
            </select>
            <div id="sc-teacher-grid">
                <div style="text-align:center;padding:40px;color:#6b7280;font-size:13px">اختر معلماً لعرض جدوله</div>
            </div>
        </div>
    </div>

    <!-- ===== التعارضات ===== -->
    <div class="sc-panel" id="sc-conflicts">
        <div class="sc-card">
            <div class="sc-title"><span><i class="bi bi-exclamation-triangle-fill" style="color:#dc2626"></i> كشف التعارضات</span>
                <button class="btn btn-outline btn-sm" onclick="scCheckConflicts()"><i class="bi bi-arrow-clockwise"></i> فحص</button>
            </div>
            <div id="sc-conflicts-list"><div style="text-align:center;padding:30px;color:#6b7280">⏳ جاري الفحص...</div></div>
        </div>
    </div>

    <!-- ===== التنبيهات ===== -->
    <div class="sc-panel" id="sc-notif">
        <div class="sc-card">
            <div class="sc-title"><span><i class="bi bi-bell-fill" style="color:#d4920a"></i> تنبيه الحصة القادمة</span></div>
            <div class="notif-bar"><i class="bi bi-info-circle-fill"></i>
                <div>
                    <div style="font-weight:900;font-size:13px">تنبيه تلقائي قبل 5 دقائق</div>
                    <div style="font-size:11px;opacity:.8">يشتغل طالما الصفحة مفتوحة</div>
                </div>
            </div>
            <div style="margin-bottom:14px">
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:8px">اختر فصلك أو معلمك للتنبيه</label>
                <select class="inp" id="notif-class-sel">
                    <option value="">اختر الفصل...</option>
                </select>
            </div>
            <button class="btn btn-green" style="width:100%;justify-content:center" onclick="scStartNotif()">
                <i class="bi bi-bell-fill"></i> تفعيل التنبيهات
            </button>
            <div id="notif-status" style="margin-top:10px;text-align:center;font-size:13px;font-weight:700;color:#6b7280"></div>
            <div id="next-period-card" style="display:none;margin-top:14px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:12px;color:#6b7280;margin-bottom:4px">الحصة القادمة</div>
                <div id="next-period-info" style="font-size:16px;font-weight:900;color:#0b2545"></div>
                <div id="next-period-time" style="font-size:12px;color:#16a34a;font-weight:700;margin-top:4px"></div>
            </div>
        </div>
    </div>

    <!-- Modal: تعديل حصة -->
    <div class="modal-overlay" id="modal-cell">
        <div class="modal">
            <button class="modal-close" onclick="document.getElementById('modal-cell').classList.remove('show')">✕</button>
            <div class="modal-title" id="modal-cell-title">تعديل الحصة</div>
            <input type="hidden" id="cell-class">
            <input type="hidden" id="cell-day">
            <input type="hidden" id="cell-period">
            <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">المادة</label>
            <input type="text" class="inp" id="cell-subject" placeholder="مثال: رياضيات، علوم، لغة عربية...">
            <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">المعلم</label>
            <input type="text" class="inp" id="cell-teacher" placeholder="اسم المعلم..." list="teachers-datalist">
            <datalist id="teachers-datalist"></datalist>
            <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">لون الخلية</label>
            <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap" id="color-picker">
                ${['#dbeafe','#dcfce7','#fef9c3','#fce7f3','#f3e8ff','#ffedd5','#f1f5f9'].map(c=>
                    `<div onclick="scSelectColor('${c}')" data-color="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:all .15s"></div>`
                ).join('')}
            </div>
            <input type="hidden" id="cell-color" value="#dbeafe">
            <div style="display:flex;gap:8px">
                <button class="btn btn-primary" style="flex:1;justify-content:center" onclick="scSaveCell()"><i class="bi bi-check-lg"></i> حفظ</button>
                <button class="btn btn-red btn-sm" onclick="scClearCell()"><i class="bi bi-trash"></i></button>
            </div>
        </div>
    </div>
    `;

    await scInit();
    scStartNotifLoop();
}

// ══ تهيئة ══
async function scInit() {
    var schoolId = getActiveSchoolId();
    // تحميل الفصول
    try {
        var studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        var classes = [...new Set(studSnap.docs.map(d=>d.data().classId).filter(Boolean))].sort();
        window._scClasses = classes;
        ['sc-class-sel','notif-class-sel'].forEach(selId=>{
            var sel = document.getElementById(selId);
            if(!sel) return;
            classes.forEach(c=>{ var o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
        });
    } catch(e){}

    // تحميل المعلمين
    try {
        var teachSnap = await getDocs(query(collection(db,'users'), where('schoolId','==',schoolId), where('role','==','teacher')));
        var teachers = teachSnap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
        window._scTeachers = teachers;
        var sel = document.getElementById('sc-teacher-sel');
        teachers.forEach(t=>{ var o=document.createElement('option'); o.value=t; o.textContent=t; sel?.appendChild(o); });
        var dl = document.getElementById('teachers-datalist');
        teachers.forEach(t=>{ var o=document.createElement('option'); o.value=t; dl?.appendChild(o); });
    } catch(e){}

    // تحميل الجدول المحفوظ
    try {
        var schSnap = await getDoc(doc(db,`schools/${schoolId}/schedule/main`));
        window._scData = schSnap.exists() ? schSnap.data() : {};
    } catch(e){ window._scData = {}; }
}

// ══ Tab ══
window.scTab = function(id, btn) {
    document.querySelectorAll('.sc-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.sc-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    btn.classList.add('active');
};

// ══ عرض جدول الفصل ══
window.scLoadClassSchedule = function() {
    var cls = document.getElementById('sc-class-sel')?.value;
    var el = document.getElementById('sc-class-grid');
    if(!cls||!el){ if(el) el.innerHTML='<div style="text-align:center;padding:40px;color:#6b7280">اختر فصلاً</div>'; return; }
    el.innerHTML = '<div style="overflow-x:auto">'+buildTable(cls)+'</div>';
};

function buildTable(cls) {
    var data = window._scData || {};
    var today = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'][new Date().getDay()-0] || '';
    // تعديل: الأحد=0 في الكويت
    var todayIdx = new Date().getDay(); // 0=أحد... لكن JS 0=الأحد
    var kwDay = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][todayIdx];

    var html = `<table class="schedule-table">
        <thead><tr>
            <th style="width:70px">الحصة</th>
            ${DAYS.map(d=>`<th style="${d===kwDay?'background:#1a78c2':''}">${d}${d===kwDay?'<br><span style="font-size:9px;opacity:.7">اليوم</span>':''}</th>`).join('')}
        </tr></thead><tbody>`;

    PERIODS.forEach(p=>{
        html += `<tr>
            <td class="period-header">
                <div>${p.num}</div>
                <span class="period-time">${p.start}</span>
                <span class="period-time">${p.end}</span>
            </td>`;
        DAYS.forEach(d=>{
            var key = `${cls}__${d}__${p.num}`;
            var cell = data[key] || {};
            if(cell.subject) {
                var bg = cell.color || '#dbeafe';
                var textColor = '#0b2545';
                html += `<td onclick="scOpenCell('${cls}','${d}',${p.num})">
                    <div class="cell filled" style="background:${bg}">
                        <div class="cell-subject" style="color:${textColor}">${cell.subject}</div>
                        ${cell.teacher?`<div class="cell-teacher" style="color:${textColor}">${cell.teacher}</div>`:''}
                    </div>
                </td>`;
            } else {
                html += `<td onclick="scOpenCell('${cls}','${d}',${p.num})">
                    <div class="cell empty"><span class="cell-add">+</span></div>
                </td>`;
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// ══ فتح modal الخلية ══
window.scOpenCell = function(cls, day, period) {
    var data = window._scData || {};
    var key = `${cls}__${day}__${period}`;
    var cell = data[key] || {};
    var p = PERIODS.find(x=>x.num===period);

    document.getElementById('modal-cell-title').textContent = `${cls} — ${day} — الحصة ${period} (${p?.start}-${p?.end})`;
    document.getElementById('cell-class').value = cls;
    document.getElementById('cell-day').value = day;
    document.getElementById('cell-period').value = period;
    document.getElementById('cell-subject').value = cell.subject || '';
    document.getElementById('cell-teacher').value = cell.teacher || '';
    document.getElementById('cell-color').value = cell.color || '#dbeafe';

    // تحديد اللون
    document.querySelectorAll('#color-picker div').forEach(d=>{
        d.style.border = d.dataset.color===(cell.color||'#dbeafe') ? '2px solid #0b2545' : '2px solid transparent';
    });

    document.getElementById('modal-cell').classList.add('show');
    setTimeout(()=>document.getElementById('cell-subject').focus(), 100);
};

window.scSelectColor = function(color) {
    document.getElementById('cell-color').value = color;
    document.querySelectorAll('#color-picker div').forEach(d=>{
        d.style.border = d.dataset.color===color ? '2px solid #0b2545' : '2px solid transparent';
    });
};

// ══ حفظ الخلية ══
window.scSaveCell = async function() {
    var cls = document.getElementById('cell-class').value;
    var day = document.getElementById('cell-day').value;
    var period = parseInt(document.getElementById('cell-period').value);
    var subject = document.getElementById('cell-subject').value.trim();
    var teacher = document.getElementById('cell-teacher').value.trim();
    var color = document.getElementById('cell-color').value;

    if(!subject) { scToast('أدخل اسم المادة','error'); return; }

    var key = `${cls}__${day}__${period}`;
    window._scData = window._scData || {};
    window._scData[key] = { subject, teacher, color };

    await scSaveToFirestore();
    document.getElementById('modal-cell').classList.remove('show');
    scLoadClassSchedule();
    scToast('تم الحفظ ✅','success');
};

// ══ حذف الخلية ══
window.scClearCell = async function() {
    var cls = document.getElementById('cell-class').value;
    var day = document.getElementById('cell-day').value;
    var period = parseInt(document.getElementById('cell-period').value);
    var key = `${cls}__${day}__${period}`;
    delete window._scData[key];
    await scSaveToFirestore();
    document.getElementById('modal-cell').classList.remove('show');
    scLoadClassSchedule();
    scToast('تم الحذف','success');
};

// ══ حفظ لـ Firestore ══
async function scSaveToFirestore() {
    var schoolId = getActiveSchoolId();
    try {
        await setDoc(doc(db,`schools/${schoolId}/schedule/main`), window._scData);
    } catch(e){ scToast('خطأ في الحفظ','error'); }
}

// ══ جدول المعلم ══
window.scLoadTeacherSchedule = function() {
    var teacher = document.getElementById('sc-teacher-sel')?.value;
    var el = document.getElementById('sc-teacher-grid');
    if(!teacher||!el){ if(el) el.innerHTML='<div style="text-align:center;padding:40px;color:#6b7280">اختر معلماً</div>'; return; }

    var data = window._scData || {};
    // ابحث عن كل حصص هذا المعلم
    var teacherCells = {};
    Object.entries(data).forEach(([key, cell])=>{
        if(cell.teacher===teacher){
            var [cls, day, period] = key.split('__');
            if(!teacherCells[day]) teacherCells[day] = {};
            teacherCells[day][parseInt(period)] = { ...cell, class: cls };
        }
    });

    var totalPeriods = Object.values(teacherCells).reduce((s,d)=>s+Object.keys(d).length,0);

    var html = `<div style="background:#eaf4fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;font-weight:700;color:#1a78c2">
        إجمالي حصص ${teacher}: ${totalPeriods} حصة أسبوعياً
    </div>
    <div style="overflow-x:auto"><table class="schedule-table">
        <thead><tr>
            <th>الحصة</th>
            ${DAYS.map(d=>`<th>${d}</th>`).join('')}
        </tr></thead><tbody>`;

    PERIODS.forEach(p=>{
        html += `<tr><td class="period-header"><div>${p.num}</div><span class="period-time">${p.start}-${p.end}</span></td>`;
        DAYS.forEach(d=>{
            var cell = teacherCells[d]?.[p.num];
            html += cell
                ? `<td><div class="cell filled" style="background:${cell.color||'#dbeafe'}">
                    <div class="cell-subject">${cell.subject}</div>
                    <div class="cell-teacher">${cell.class}</div>
                   </div></td>`
                : `<td><div class="cell empty" style="opacity:.4">—</div></td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
};

// ══ كشف التعارضات ══
window.scCheckConflicts = function() {
    var el = document.getElementById('sc-conflicts-list');
    if(!el) return;
    var data = window._scData || {};
    var conflicts = [];

    // فحص: نفس المعلم في نفس اليوم ونفس الحصة في فصلين مختلفين
    var byTeacherDayPeriod = {};
    Object.entries(data).forEach(([key, cell])=>{
        if(!cell.teacher) return;
        var [cls, day, period] = key.split('__');
        var tKey = `${cell.teacher}__${day}__${period}`;
        if(!byTeacherDayPeriod[tKey]) byTeacherDayPeriod[tKey] = [];
        byTeacherDayPeriod[tKey].push(cls);
    });

    Object.entries(byTeacherDayPeriod).forEach(([tKey, classes])=>{
        if(classes.length>1){
            var [teacher, day, period] = tKey.split('__');
            conflicts.push({ teacher, day, period, classes });
        }
    });

    if(!conflicts.length){
        el.innerHTML = '<div class="no-conflict"><i class="bi bi-check-circle-fill"></i> لا توجد تعارضات — الجدول سليم ✅</div>';
        return;
    }

    el.innerHTML = `<div style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:10px">⚠️ وُجد ${conflicts.length} تعارض</div>`+
    conflicts.map(c=>`
        <div class="conflict-badge">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <div>
                <div>${c.teacher} — ${c.day} — الحصة ${c.period}</div>
                <div style="font-size:10px;opacity:.8">مكرر في: ${c.classes.join(' و ')}</div>
            </div>
        </div>`).join('');
};

// ══ تنبيه الحصة القادمة ══
var _notifInterval = null;
var _notifActive = false;

window.scStartNotif = async function() {
    var cls = document.getElementById('notif-class-sel')?.value;
    if(!cls){ scToast('اختر الفصل أولاً','error'); return; }

    if(_notifActive){ clearInterval(_notifInterval); _notifActive=false; document.getElementById('notif-status').textContent=''; document.getElementById('next-period-card').style.display='none'; scToast('تم إيقاف التنبيهات'); return; }

    // طلب إذن الإشعارات
    if('Notification' in window && Notification.permission==='default') {
        await Notification.requestPermission();
    }

    _notifActive = true;
    document.getElementById('notif-status').innerHTML = `<span style="color:#16a34a">🔔 التنبيهات مفعلة للفصل ${cls}</span>`;
    document.querySelector('#sc-notif .btn-green').innerHTML = '<i class="bi bi-bell-slash-fill"></i> إيقاف التنبيهات';
    document.querySelector('#sc-notif .btn-green').style.background = '#dc2626';

    function checkPeriod() {
        var now = new Date();
        var h = now.getHours(), m = now.getMinutes();
        var nowMins = h*60+m;
        var data = window._scData || {};
        var todayIdx = now.getDay();
        var kwDays = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
        var today = kwDays[todayIdx];

        if(!DAYS.includes(today)){ document.getElementById('next-period-card').style.display='none'; return; }

        // إيجاد الحصة القادمة
        var next = null;
        PERIODS.forEach(p=>{
            var [sh,sm] = p.start.split(':').map(Number);
            var startMins = sh*60+sm;
            var diff = startMins - nowMins;
            if(diff>0 && diff<=60 && !next) {
                var key = `${cls}__${today}__${p.num}`;
                var cell = data[key];
                next = { period:p, cell, diff };
            }
        });

        if(next) {
            var card = document.getElementById('next-period-card');
            var info = document.getElementById('next-period-info');
            var time = document.getElementById('next-period-time');
            card.style.display = 'block';
            info.textContent = next.cell?.subject ? `${next.cell.subject} — ${next.cell.teacher||''}` : `حصة ${next.period.num} (فارغة)`;
            time.textContent = `تبدأ ${next.period.start} — بعد ${next.diff} دقيقة`;

            // إشعار عند 5 دقائق
            if(next.diff<=5 && next.diff>4 && Notification.permission==='granted' && next.cell?.subject) {
                new Notification(`🔔 حصة قادمة — ${cls}`, {
                    body: `${next.cell.subject} تبدأ الساعة ${next.period.start}`,
                    icon: './logo.png'
                });
            }
        } else {
            document.getElementById('next-period-card').style.display='none';
        }
    }

    checkPeriod();
    _notifInterval = setInterval(checkPeriod, 60000);
};

function scStartNotifLoop() {
    // تشغيل تلقائي في الخلفية
}

// ══ طباعة جدول الفصل ══
window.scPrintClass = function() {
    var cls = document.getElementById('sc-class-sel')?.value;
    if(!cls){ scToast('اختر الفصل أولاً','error'); return; }
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var table = buildTable(cls);
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:11px}
    table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:center}
    td{border:1px solid #ddd;padding:4px;text-align:center;min-height:40px;vertical-align:middle}
    .cell{min-height:36px;border-radius:4px;padding:4px;display:flex;flex-direction:column;justify-content:center;align-items:center}
    .cell-subject{font-size:10px;font-weight:900}.cell-teacher{font-size:8px;opacity:.8}
    .period-header{background:#f1f5f9;font-weight:900}
    @page{size:A4 landscape;margin:8mm}</style></head><body>
    <div style="border-bottom:3px solid #0b2545;margin-bottom:12px;padding-bottom:8px;display:flex;justify-content:space-between">
        <div style="font-size:10px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center;font-size:14px;font-weight:900;color:#0b2545">الجدول الدراسي<br><span style="font-size:12px">الفصل: ${cls}</span></div>
        <div style="font-size:10px;text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
    </div>
    ${table}
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b=new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

// ══ طباعة جدول المعلم ══
window.scPrintTeacher = function() {
    var teacher = document.getElementById('sc-teacher-sel')?.value;
    if(!teacher){ scToast('اختر المعلم أولاً','error'); return; }
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var content = document.getElementById('sc-teacher-grid')?.innerHTML||'';
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:11px}
    table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:center}
    td{border:1px solid #ddd;padding:4px;text-align:center;vertical-align:middle}
    .cell{min-height:36px;border-radius:4px;padding:4px;display:flex;flex-direction:column;justify-content:center;align-items:center}
    .cell-subject{font-size:10px;font-weight:900}.cell-teacher{font-size:8px;opacity:.8}
    .period-header{background:#f1f5f9;font-weight:900}
    @page{size:A4 landscape;margin:8mm}</style></head><body>
    <div style="border-bottom:3px solid #0b2545;margin-bottom:12px;padding-bottom:8px;display:flex;justify-content:space-between">
        <div style="font-size:10px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center;font-size:14px;font-weight:900;color:#0b2545">جدول المعلم<br><span style="font-size:12px">${teacher}</span></div>
        <div style="font-size:10px;text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
    </div>
    ${content}
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b=new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

// ══ Toast ══
function scToast(msg,type='info'){
    var t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${type==='error'?'#dc2626':type==='success'?'#16a34a':'#0b2545'};color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999;font-family:Cairo,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)`;
    t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}

document.addEventListener('click',e=>{
    if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});
