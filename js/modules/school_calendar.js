import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initCalendarModule() {
    var container = document.getElementById('tab-calendar');
    if(!container) return;
    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    var now = new Date();
    window._calYear = now.getFullYear();
    window._calMonth = now.getMonth();
    window._calEvents = [];

    container.innerHTML = `
    <style>
        .cal-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .cal-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        .cal-nav-btn{background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .2s}
        .cal-nav-btn:hover{background:#e2e8f0}
        .cal-month-name{font-size:17px;font-weight:900;color:#0b2545}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
        .cal-day-name{text-align:center;font-size:11px;font-weight:900;color:#6b7280;padding:6px 0}
        .cal-day{border-radius:8px;padding:4px;min-height:64px;border:1px solid #f1f5f9;cursor:pointer;transition:all .15s;position:relative}
        .cal-day:hover{border-color:#1a78c2;background:#eaf4fd}
        .cal-day.today{background:#eaf4fd;border-color:#1a78c2}
        .cal-day.today .cal-day-num{background:#0b2545;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center}
        .cal-day.other-month{opacity:.3}
        .cal-day.holiday{background:#fef2f2;border-color:#fca5a5}
        .cal-day-num{font-size:12px;font-weight:700;color:#374151;margin-bottom:2px}
        .cal-event-dot{font-size:9px;border-radius:4px;padding:1px 4px;margin-top:2px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
        .event-holiday{background:#fee2e2;color:#dc2626}
        .event-exam{background:#fef9c3;color:#92400e}
        .event-activity{background:#dcfce7;color:#15803d}
        .event-meeting{background:#dbeafe;color:#1d4ed8}
        .event-other{background:#f3e8ff;color:#7c3aed}
        .event-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;margin-bottom:6px;font-size:13px}
        .inp{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;transition:border .15s;margin-bottom:10px}
        .inp:focus{border-color:#1a78c2}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;border:none}
        .btn-primary{background:#0b2545;color:#fff;width:100%;justify-content:center}
        .btn-danger{background:#dc2626;color:#fff}
        .btn-sm{padding:5px 10px;font-size:12px}
        .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center}
        .modal-overlay.show{display:flex}
        .modal{background:#fff;border-radius:14px;padding:24px;width:90%;max-width:480px;position:relative}
        .modal-close{position:absolute;top:14px;left:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280}
    </style>

    <div class="cal-card">
        <div class="cal-title"><i class="bi bi-calendar3" style="color:#1a78c2"></i> تقويم المدرسة</div>

        <div class="cal-nav">
            <button class="cal-nav-btn" onclick="calPrev()">›</button>
            <div class="cal-month-name" id="cal-month-label"></div>
            <button class="cal-nav-btn" onclick="calNext()">‹</button>
        </div>

        <div class="cal-grid" id="cal-grid">
            <div class="cal-day-name">أحد</div>
            <div class="cal-day-name">اثنين</div>
            <div class="cal-day-name">ثلاثاء</div>
            <div class="cal-day-name">أربعاء</div>
            <div class="cal-day-name">خميس</div>
            <div class="cal-day-name">جمعة</div>
            <div class="cal-day-name">سبت</div>
        </div>
    </div>

    <!-- إضافة حدث -->
    <div class="cal-card">
        <div class="cal-title"><i class="bi bi-plus-circle-fill" style="color:#16a34a"></i> إضافة حدث</div>
        <div class="form-row">
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">التاريخ</label>
                <input type="date" class="inp" id="cal-event-date" style="margin-bottom:0">
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">نوع الحدث</label>
                <select class="inp" id="cal-event-type" style="margin-bottom:0">
                    <option value="holiday">🔴 إجازة رسمية</option>
                    <option value="exam">🟡 اختبار</option>
                    <option value="activity">🟢 نشاط مدرسي</option>
                    <option value="meeting">🔵 اجتماع</option>
                    <option value="other">🟣 أخرى</option>
                </select>
            </div>
        </div>
        <input type="text" class="inp" id="cal-event-title" placeholder="عنوان الحدث...">
        <textarea class="inp" id="cal-event-desc" placeholder="تفاصيل إضافية (اختياري)..." rows="2"></textarea>
        <button class="btn btn-primary" onclick="calAddEvent()"><i class="bi bi-plus-circle"></i> إضافة للتقويم</button>
    </div>

    <!-- قائمة الأحداث -->
    <div class="cal-card">
        <div class="cal-title"><i class="bi bi-list-ul" style="color:#d4920a"></i> أحداث الشهر الحالي</div>
        <div id="cal-events-list"><div style="text-align:center;padding:20px;color:#6b7280">⏳ جاري التحميل...</div></div>
    </div>

    <!-- Modal: أحداث اليوم -->
    <div class="modal-overlay" id="modal-cal-day">
        <div class="modal">
            <button class="modal-close" onclick="document.getElementById('modal-cal-day').classList.remove('show')">✕</button>
            <div id="modal-cal-day-content"></div>
        </div>
    </div>
    `;

    document.getElementById('cal-event-date').value = today;
    await calLoadEvents();
    calRender();
}

async function calLoadEvents() {
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,`schools/${schoolId}/calendar_events`), orderBy('date')));
        window._calEvents = snap.docs.map(d=>({id:d.id,...d.data()}));
    } catch(e){ window._calEvents = []; }
}

function calRender() {
    var year = window._calYear;
    var month = window._calMonth;
    var months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    document.getElementById('cal-month-label').textContent = months[month] + ' ' + year;

    var grid = document.getElementById('cal-grid');
    // احتفظ بأسماء الأيام
    var dayNames = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    dayNames.forEach(d=>grid.appendChild(d));

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month+1, 0).getDate();
    var daysInPrev = new Date(year, month, 0).getDate();
    var today = getTodayISO();

    // أيام الشهر السابق
    for(var i=firstDay-1; i>=0; i--) {
        var d = document.createElement('div');
        d.className='cal-day other-month';
        d.innerHTML=`<div class="cal-day-num">${daysInPrev-i}</div>`;
        grid.appendChild(d);
    }

    // أيام الشهر الحالي
    for(var day=1; day<=daysInMonth; day++) {
        var dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        var events = (window._calEvents||[]).filter(e=>e.date===dateStr);
        var isToday = dateStr===today;
        var isHoliday = events.some(e=>e.type==='holiday');
        var isWeekend = new Date(dateStr).getDay()===5||new Date(dateStr).getDay()===6;

        var d = document.createElement('div');
        d.className=`cal-day${isToday?' today':''}${isHoliday?' holiday':''}${isWeekend?' other-month':''}`;
        d.onclick=()=>calShowDay(dateStr);
        d.innerHTML=`<div class="cal-day-num">${isToday?`<div style="background:#0b2545;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px">${day}</div>`:day}</div>`+
            events.slice(0,2).map(e=>`<span class="cal-event-dot event-${e.type}">${e.title}</span>`).join('')+
            (events.length>2?`<span style="font-size:9px;color:#6b7280">+${events.length-2}</span>`:'');
        grid.appendChild(d);
    }

    // أيام الشهر التالي
    var remaining = 42 - (firstDay + daysInMonth);
    for(var i=1; i<=remaining; i++) {
        var d = document.createElement('div');
        d.className='cal-day other-month';
        d.innerHTML=`<div class="cal-day-num">${i}</div>`;
        grid.appendChild(d);
    }

    calRenderEventsList();
}

function calRenderEventsList() {
    var el = document.getElementById('cal-events-list');
    if(!el) return;
    var year = window._calYear;
    var month = window._calMonth;
    var monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
    var events = (window._calEvents||[]).filter(e=>e.date?.startsWith(monthStr)).sort((a,b)=>a.date.localeCompare(b.date));

    if(!events.length){ el.innerHTML='<div style="text-align:center;padding:20px;color:#6b7280">لا توجد أحداث هذا الشهر</div>'; return; }

    var typeIcon = {holiday:'🔴',exam:'🟡',activity:'🟢',meeting:'🔵',other:'🟣'};
    var typeBg = {holiday:'#fef2f2',exam:'#fefce8',activity:'#f0fdf4',meeting:'#eff6ff',other:'#faf5ff'};
    el.innerHTML = events.map(e=>`
        <div class="event-item" style="background:${typeBg[e.type]||'#f8fafc'}">
            <span style="font-size:18px">${typeIcon[e.type]||'📅'}</span>
            <div style="flex:1">
                <div style="font-weight:900;font-size:13px">${e.title}</div>
                <div style="font-size:11px;color:#6b7280">${e.date}${e.desc?` — ${e.desc}`:''}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="calDeleteEvent('${e.id}')"><i class="bi bi-trash"></i></button>
        </div>`).join('');
}

window.calShowDay = function(dateStr) {
    var events = (window._calEvents||[]).filter(e=>e.date===dateStr);
    var typeIcon = {holiday:'🔴',exam:'🟡',activity:'🟢',meeting:'🔵',other:'🟣'};
    var typeBg = {holiday:'#fef2f2',exam:'#fefce8',activity:'#f0fdf4',meeting:'#eff6ff',other:'#faf5ff'};
    document.getElementById('modal-cal-day-content').innerHTML = `
        <div style="font-size:16px;font-weight:900;color:#0b2545;margin-bottom:14px">📅 ${dateStr}</div>
        ${events.length
            ? events.map(e=>`<div class="event-item" style="background:${typeBg[e.type]||'#f8fafc'}"><span style="font-size:18px">${typeIcon[e.type]||'📅'}</span><div><div style="font-weight:900">${e.title}</div>${e.desc?`<div style="font-size:12px;color:#6b7280">${e.desc}</div>`:''}</div></div>`).join('')
            : '<div style="text-align:center;padding:20px;color:#6b7280">لا توجد أحداث هذا اليوم</div>'}
        <button class="btn btn-primary" style="margin-top:12px" onclick="document.getElementById('cal-event-date').value='${dateStr}';document.getElementById('modal-cal-day').classList.remove('show')">
            <i class="bi bi-plus"></i> إضافة حدث لهذا اليوم
        </button>`;
    document.getElementById('modal-cal-day').classList.add('show');
};

window.calPrev = function() { window._calMonth--; if(window._calMonth<0){window._calMonth=11;window._calYear--;} calRender(); };
window.calNext = function() { window._calMonth++; if(window._calMonth>11){window._calMonth=0;window._calYear++;} calRender(); };

window.calAddEvent = async function() {
    var date = document.getElementById('cal-event-date')?.value;
    var type = document.getElementById('cal-event-type')?.value;
    var title = document.getElementById('cal-event-title')?.value.trim();
    var desc = document.getElementById('cal-event-desc')?.value.trim();
    if(!date||!title){ calToast('أدخل التاريخ والعنوان','error'); return; }
    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
    try {
        var ref = await addDoc(collection(db,`schools/${schoolId}/calendar_events`),{
            date,type,title,desc,schoolId,
            createdBy:me.name||'—', createdAt:serverTimestamp()
        });
        window._calEvents.push({id:ref.id,date,type,title,desc});
        window._calEvents.sort((a,b)=>a.date.localeCompare(b.date));
        calRender();
        document.getElementById('cal-event-title').value='';
        document.getElementById('cal-event-desc').value='';
        calToast('تم إضافة الحدث','success');
    } catch(e){ calToast('خطأ: '+e.message,'error'); }
};

window.calDeleteEvent = async function(id) {
    if(!confirm('حذف هذا الحدث؟')) return;
    var schoolId = getActiveSchoolId();
    try {
        await deleteDoc(doc(db,`schools/${schoolId}/calendar_events`,id));
        window._calEvents = window._calEvents.filter(e=>e.id!==id);
        calRender();
        calToast('تم الحذف','success');
    } catch(e){ calToast('خطأ','error'); }
};

function calToast(msg,type='info'){
    var t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${type==='error'?'#dc2626':type==='success'?'#16a34a':'#0b2545'};color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999;font-family:Cairo,sans-serif`;
    t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}
