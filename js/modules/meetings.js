import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp, limit }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initMeetingsModule() {
    var container = document.getElementById('tab-meetings');
    if(!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .mt-tabs{display:flex;gap:4px;margin-bottom:18px;background:#f1f5f9;border-radius:10px;padding:4px}
        .mt-tab{flex:1;padding:9px;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s}
        .mt-tab.active{background:#fff;color:#0b2545;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .mt-panel{display:none}.mt-panel.active{display:block}
        .mt-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .mt-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .inp{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;transition:border .15s;margin-bottom:10px}
        .inp:focus{border-color:#1a78c2}
        textarea.inp{resize:vertical;min-height:80px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
        .btn-primary{background:#0b2545;color:#fff;width:100%;justify-content:center}
        .btn-success{background:#16a34a;color:#fff}
        .btn-danger{background:#dc2626;color:#fff}
        .btn-outline{background:transparent;border:1.5px solid #1a78c2;color:#1a78c2}
        .btn-gold{background:#d4920a;color:#fff}
        .btn-sm{padding:6px 12px;font-size:12px}
        .meeting-card{background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .2s}
        .meeting-card:hover{border-color:#1a78c2;background:#eaf4fd}
        .meeting-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .b-planned{background:#dbeafe;color:#1d4ed8}
        .b-ongoing{background:#dcfce7;color:#15803d}
        .b-done{background:#f1f5f9;color:#6b7280}
        .attendee-tag{display:inline-flex;align-items:center;gap:4px;background:#eaf4fd;border:1px solid #bae6fd;color:#0369a1;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;margin:3px}
        .attendee-tag button{background:none;border:none;cursor:pointer;color:#0369a1;font-size:14px;padding:0;margin-right:2px}
        .agenda-item{background:#fff;border:1.5px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px}
        .agenda-num{width:28px;height:28px;border-radius:50%;background:#0b2545;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0}
        .decision-item{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;margin-bottom:6px;font-size:13px;font-weight:700;color:#15803d;display:flex;align-items:center;gap:8px}
        .tbl-wrap{overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb}
        table{width:100%;border-collapse:collapse;font-size:13px}
        thead th{background:#0b2545;color:#fff;padding:10px 12px;text-align:right;font-weight:700}
        tbody tr{border-bottom:1px solid #e5e7eb}
        tbody tr:hover{background:#f8fafc}
        tbody td{padding:10px 12px;vertical-align:middle}
        .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center}
        .modal-overlay.show{display:flex}
        .modal{background:#fff;border-radius:14px;padding:24px;width:95%;max-width:700px;max-height:92vh;overflow-y:auto;position:relative}
        .modal-close{position:absolute;top:14px;left:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280}
    </style>

    <!-- Tabs -->
    <div class="mt-tabs">
        <button class="mt-tab active" onclick="mtTab('mt-new',this)"><i class="bi bi-plus-circle-fill"></i> اجتماع جديد</button>
        <button class="mt-tab" onclick="mtTab('mt-list',this);mtLoadMeetings()"><i class="bi bi-list-ul"></i> الاجتماعات</button>
        <button class="mt-tab" onclick="mtTab('mt-templates',this)"><i class="bi bi-file-earmark-text"></i> القوالب</button>
    </div>

    <!-- ===== اجتماع جديد ===== -->
    <div class="mt-panel active" id="mt-new">
        <div class="mt-card">
            <div class="mt-title"><i class="bi bi-calendar-plus-fill" style="color:#1a78c2"></i> إنشاء محضر اجتماع جديد</div>

            <div class="form-row">
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">نوع الاجتماع</label>
                    <select class="inp" id="mt-type" style="margin-bottom:0">
                        <option>مجلس الآباء والمعلمين</option>
                        <option>اجتماع إداري</option>
                        <option>اجتماع هيئة التدريس</option>
                        <option>لجنة الأداء</option>
                        <option>اجتماع طارئ</option>
                        <option>اجتماع تخطيطي</option>
                        <option>أخرى</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">التاريخ</label>
                    <input type="date" class="inp" id="mt-date" style="margin-bottom:0">
                </div>
            </div>

            <div class="form-row" style="margin-top:10px">
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">وقت البداية</label>
                    <input type="time" class="inp" id="mt-time-start" style="margin-bottom:0">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">وقت الانتهاء</label>
                    <input type="time" class="inp" id="mt-time-end" style="margin-bottom:0">
                </div>
            </div>

            <div style="margin-top:10px">
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">مكان الاجتماع</label>
                <input type="text" class="inp" id="mt-location" placeholder="مثال: قاعة الاجتماعات — الطابق الثاني">
            </div>

            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">رئيس الاجتماع</label>
                <input type="text" class="inp" id="mt-chair" placeholder="اسم رئيس الاجتماع">
            </div>

            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">المقرر / كاتب المحضر</label>
                <input type="text" class="inp" id="mt-secretary" placeholder="اسم المقرر">
            </div>
        </div>

        <!-- الحضور -->
        <div class="mt-card">
            <div class="mt-title"><i class="bi bi-people-fill" style="color:#7c3aed"></i> قائمة الحضور</div>
            <div style="display:flex;gap:8px;margin-bottom:10px">
                <input type="text" class="inp" id="mt-attendee-inp" placeholder="اسم الحاضر..." style="margin-bottom:0;flex:1">
                <select class="inp" id="mt-attendee-role" style="margin-bottom:0;width:auto">
                    <option>مدير المدرسة</option>
                    <option>معلم</option>
                    <option>ولي أمر</option>
                    <option>إداري</option>
                    <option>أخصائي اجتماعي</option>
                    <option>ضيف</option>
                </select>
                <button class="btn btn-success btn-sm" onclick="mtAddAttendee()"><i class="bi bi-plus"></i> إضافة</button>
            </div>
            <div id="mt-attendees-list"></div>

            <!-- غائبون -->
            <div style="margin-top:10px">
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">المعتذرون عن الحضور</label>
                <textarea class="inp" id="mt-absent" placeholder="أسماء المعتذرين..." rows="2"></textarea>
            </div>
        </div>

        <!-- جدول الأعمال -->
        <div class="mt-card">
            <div class="mt-title"><i class="bi bi-list-check" style="color:#d4920a"></i> جدول الأعمال</div>
            <div style="display:flex;gap:8px;margin-bottom:10px">
                <input type="text" class="inp" id="mt-agenda-inp" placeholder="أضف بند جديد..." style="margin-bottom:0;flex:1">
                <button class="btn btn-gold btn-sm" onclick="mtAddAgenda()"><i class="bi bi-plus"></i> إضافة</button>
            </div>
            <div id="mt-agenda-list"></div>
        </div>

        <!-- مناقشات وقرارات -->
        <div class="mt-card">
            <div class="mt-title"><i class="bi bi-chat-square-text-fill" style="color:#0891b2"></i> المناقشات والقرارات</div>
            <textarea class="inp" id="mt-discussion" placeholder="ملخص المناقشات التي دارت خلال الاجتماع..." rows="4"></textarea>

            <div style="margin-top:10px">
                <label style="font-size:13px;font-weight:900;color:#0b2545;display:block;margin-bottom:8px">القرارات المتخذة</label>
                <div style="display:flex;gap:8px;margin-bottom:8px">
                    <input type="text" class="inp" id="mt-decision-inp" placeholder="أضف قراراً..." style="margin-bottom:0;flex:1">
                    <button class="btn btn-success btn-sm" onclick="mtAddDecision()"><i class="bi bi-plus"></i></button>
                </div>
                <div id="mt-decisions-list"></div>
            </div>

            <div style="margin-top:12px">
                <label style="font-size:13px;font-weight:900;color:#0b2545;display:block;margin-bottom:8px">التوصيات</label>
                <textarea class="inp" id="mt-recommendations" placeholder="التوصيات الختامية للاجتماع..." rows="3"></textarea>
            </div>

            <div style="margin-top:12px">
                <label style="font-size:13px;font-weight:900;color:#0b2545;display:block;margin-bottom:6px">موعد الاجتماع القادم</label>
                <input type="date" class="inp" id="mt-next-date">
            </div>
        </div>

        <div style="display:flex;gap:10px">
            <button class="btn btn-primary" style="flex:2" onclick="mtSave()"><i class="bi bi-save-fill"></i> حفظ المحضر</button>
            <button class="btn btn-gold" style="flex:1" onclick="mtSaveAndPrint()"><i class="bi bi-printer-fill"></i> حفظ وطباعة</button>
        </div>
    </div>

    <!-- ===== قائمة الاجتماعات ===== -->
    <div class="mt-panel" id="mt-list">
        <div class="mt-card">
            <div class="mt-title"><i class="bi bi-list-ul" style="color:#6b7280"></i> الاجتماعات المسجلة</div>
            <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
                <select class="inp" id="mt-filter-type" onchange="mtLoadMeetings()" style="width:auto;margin-bottom:0;flex:1">
                    <option value="">كل الأنواع</option>
                    <option>مجلس الآباء والمعلمين</option>
                    <option>اجتماع إداري</option>
                    <option>اجتماع هيئة التدريس</option>
                    <option>لجنة الأداء</option>
                </select>
                <button class="btn btn-outline btn-sm" onclick="mtLoadMeetings()"><i class="bi bi-arrow-clockwise"></i></button>
            </div>
            <div id="meetings-list"><div style="text-align:center;padding:30px;color:#6b7280">⏳ جاري التحميل...</div></div>
        </div>
    </div>

    <!-- ===== القوالب ===== -->
    <div class="mt-panel" id="mt-templates">
        <div class="mt-card">
            <div class="mt-title"><i class="bi bi-file-earmark-text" style="color:#7c3aed"></i> قوالب جاهزة</div>
            <p style="font-size:13px;color:#6b7280;margin-bottom:14px">اختر قالباً لتعبئة النموذج تلقائياً</p>
            <div id="templates-list">
                ${[
                    {name:'مجلس الآباء والمعلمين',icon:'👨‍👩‍👧',agenda:['استعراض نتائج الطلاب','مناقشة الغياب والتأخر','الأنشطة المدرسية','مقترحات أولياء الأمور','متفرقات']},
                    {name:'اجتماع هيئة التدريس',icon:'👩‍🏫',agenda:['متابعة المناهج','مستوى الطلاب الأكاديمي','الطلاب ذوو الاحتياجات الخاصة','الأنشطة والفعاليات','ملاحظات إدارية']},
                    {name:'لجنة الأداء',icon:'📊',agenda:['مراجعة مؤشرات الأداء','نتائج الزيارات الصفية','خطة التطوير المهني','متابعة الأهداف السابقة','توصيات اللجنة']},
                    {name:'اجتماع طارئ',icon:'🚨',agenda:['عرض الموضوع الطارئ','مناقشة الحلول المقترحة','اتخاذ القرار','توزيع المهام','متابعة التنفيذ']},
                ].map(t=>`
                    <div class="meeting-card" onclick="mtUseTemplate(${JSON.stringify(t).replace(/'/g,'&apos;')})">
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="font-size:28px">${t.icon}</span>
                            <div>
                                <div style="font-weight:900;font-size:14px">${t.name}</div>
                                <div style="font-size:12px;color:#6b7280;margin-top:2px">${t.agenda.length} بنود جاهزة</div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>
    </div>

    <!-- Modal: عرض المحضر -->
    <div class="modal-overlay" id="modal-meeting">
        <div class="modal">
            <button class="modal-close" onclick="document.getElementById('modal-meeting').classList.remove('show')">✕</button>
            <div id="modal-meeting-content"></div>
        </div>
    </div>
    `;

    // تهيئة
    document.getElementById('mt-date').value = getTodayISO();
    window._mtAttendees = [];
    window._mtAgenda = [];
    window._mtDecisions = [];
    mtLoadMeetings();
}

// ══ Tab ══
window.mtTab = function(id, btn) {
    document.querySelectorAll('.mt-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.mt-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    btn.classList.add('active');
};

// ══ الحضور ══
window.mtAddAttendee = function() {
    var name = document.getElementById('mt-attendee-inp')?.value.trim();
    var role = document.getElementById('mt-attendee-role')?.value;
    if(!name) return;
    window._mtAttendees = window._mtAttendees || [];
    window._mtAttendees.push({name, role});
    document.getElementById('mt-attendee-inp').value='';
    mtRenderAttendees();
};

function mtRenderAttendees() {
    var el = document.getElementById('mt-attendees-list');
    if(!el) return;
    el.innerHTML = (window._mtAttendees||[]).map((a,i)=>`
        <span class="attendee-tag">
            <button onclick="mtRemoveAttendee(${i})">✕</button>
            ${a.name} <span style="opacity:.7">(${a.role})</span>
        </span>`).join('') || '<span style="color:#6b7280;font-size:13px">لم يُضف حضور بعد</span>';
}

window.mtRemoveAttendee = function(i) {
    window._mtAttendees.splice(i,1);
    mtRenderAttendees();
};

// ══ جدول الأعمال ══
window.mtAddAgenda = function() {
    var text = document.getElementById('mt-agenda-inp')?.value.trim();
    if(!text) return;
    window._mtAgenda = window._mtAgenda || [];
    window._mtAgenda.push(text);
    document.getElementById('mt-agenda-inp').value='';
    mtRenderAgenda();
};

function mtRenderAgenda() {
    var el = document.getElementById('mt-agenda-list');
    if(!el) return;
    el.innerHTML = (window._mtAgenda||[]).map((a,i)=>`
        <div class="agenda-item">
            <div class="agenda-num">${i+1}</div>
            <div style="flex:1;font-weight:700;font-size:13px">${a}</div>
            <button onclick="mtRemoveAgenda(${i})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:16px">✕</button>
        </div>`).join('') || '<p style="color:#6b7280;font-size:13px">لم تُضف بنود بعد</p>';
}

window.mtRemoveAgenda = function(i) {
    window._mtAgenda.splice(i,1);
    mtRenderAgenda();
};

// ══ القرارات ══
window.mtAddDecision = function() {
    var text = document.getElementById('mt-decision-inp')?.value.trim();
    if(!text) return;
    window._mtDecisions = window._mtDecisions || [];
    window._mtDecisions.push(text);
    document.getElementById('mt-decision-inp').value='';
    mtRenderDecisions();
};

function mtRenderDecisions() {
    var el = document.getElementById('mt-decisions-list');
    if(!el) return;
    el.innerHTML = (window._mtDecisions||[]).map((d,i)=>`
        <div class="decision-item">
            <i class="bi bi-check-circle-fill"></i>
            <span style="flex:1">${d}</span>
            <button onclick="mtRemoveDecision(${i})" style="background:none;border:none;color:#dc2626;cursor:pointer">✕</button>
        </div>`).join('') || '<p style="color:#6b7280;font-size:13px">لم تُضف قرارات بعد</p>';
}

window.mtRemoveDecision = function(i) {
    window._mtDecisions.splice(i,1);
    mtRenderDecisions();
};

// ══ القوالب ══
window.mtUseTemplate = function(t) {
    document.getElementById('mt-type').value = t.name;
    window._mtAgenda = [...t.agenda];
    mtRenderAgenda();
    mtTab('mt-new', document.querySelector('.mt-tab'));
    if(window.showToast) window.showToast('تم تحميل القالب ✅');
};

// ══ حفظ المحضر ══
window.mtSave = async function(andPrint=false) {
    var type = document.getElementById('mt-type')?.value;
    var date = document.getElementById('mt-date')?.value;
    var timeStart = document.getElementById('mt-time-start')?.value;
    var timeEnd = document.getElementById('mt-time-end')?.value;
    var location = document.getElementById('mt-location')?.value.trim();
    var chair = document.getElementById('mt-chair')?.value.trim();
    var secretary = document.getElementById('mt-secretary')?.value.trim();
    var discussion = document.getElementById('mt-discussion')?.value.trim();
    var recommendations = document.getElementById('mt-recommendations')?.value.trim();
    var nextDate = document.getElementById('mt-next-date')?.value;
    var absentees = document.getElementById('mt-absent')?.value.trim();

    if(!date||!type){ mtToast('أدخل نوع الاجتماع والتاريخ','error'); return null; }

    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');

    var data = {
        schoolId, type, date, timeStart, timeEnd, location, chair, secretary,
        attendees: window._mtAttendees||[],
        absentees, agenda: window._mtAgenda||[],
        discussion, decisions: window._mtDecisions||[],
        recommendations, nextDate,
        status:'done',
        createdBy: me.name||'—',
        createdAt: serverTimestamp()
    };

    try {
        var ref = await addDoc(collection(db,`schools/${schoolId}/meetings`), data);
        mtToast('تم حفظ المحضر بنجاح','success');
        // إعادة تعيين النموذج
        window._mtAttendees=[];
        window._mtAgenda=[];
        window._mtDecisions=[];
        mtRenderAttendees();
        mtRenderAgenda();
        mtRenderDecisions();
        ['mt-location','mt-chair','mt-secretary','mt-discussion','mt-recommendations','mt-absent'].forEach(id=>{ var el=document.getElementById(id); if(el) el.value=''; });
        document.getElementById('mt-date').value = getTodayISO();
        if(andPrint) mtPrint({...data, id:ref.id});
        return ref.id;
    } catch(e){ mtToast('خطأ: '+e.message,'error'); return null; }
};

window.mtSaveAndPrint = async function() {
    var id = await window.mtSave(true);
};

// ══ طباعة المحضر ══
window.mtPrint = function(data) {
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var attendeesHtml = (data.attendees||[]).map((a,i)=>
        `<tr><td style="padding:6px 8px;border:1px solid #ddd">${i+1}</td><td style="padding:6px 8px;border:1px solid #ddd">${a.name}</td><td style="padding:6px 8px;border:1px solid #ddd">${a.role}</td><td style="padding:6px 8px;border:1px solid #ddd"></td></tr>`
    ).join('');
    var agendaHtml = (data.agenda||[]).map((a,i)=>
        `<div style="display:flex;gap:10px;margin-bottom:6px"><span style="width:24px;height:24px;border-radius:50%;background:#0b2545;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0">${i+1}</span><span style="font-weight:700">${a}</span></div>`
    ).join('');
    var decisionsHtml = (data.decisions||[]).map((d,i)=>
        `<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px;background:#f0fdf4;border-radius:6px"><span style="color:#16a34a;font-weight:900">${i+1}.</span><span>${d}</span></div>`
    ).join('');

    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body{font-family:Cairo,sans-serif;direction:rtl;padding:20px;font-size:12px;color:#111}
        h2{font-size:18px;font-weight:900;color:#0b2545;text-align:center;margin:10px 0}
        h3{font-size:14px;font-weight:900;color:#0b2545;margin:16px 0 8px;border-bottom:2px solid #0b2545;padding-bottom:4px}
        table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
        .info-box{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px}
        .info-lbl{font-size:10px;color:#6b7280;font-weight:700}
        .info-val{font-size:13px;font-weight:900;color:#0b2545;margin-top:2px}
        .sign-area{display:flex;justify-content:space-between;margin-top:30px;gap:20px}
        .sign-box{flex:1;text-align:center;border-top:1.5px solid #333;padding-top:8px;font-size:11px}
        @page{size:A4;margin:12mm}
        @media print{body{margin:0}}
    </style></head><body>

    <!-- رأس المحضر -->
    <div style="border-bottom:3px double #0b2545;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:11px;line-height:1.7">دولة الكويت<br>وزارة التربية<br>منطقة الفروانية التعليمية</div>
        <div style="text-align:center">
            <div style="font-size:11px;font-weight:900;color:#0b2545">بسم الله الرحمن الرحيم</div>
            <h2>محضر اجتماع</h2>
            <div style="font-size:14px;font-weight:900;color:#1a78c2">${data.type}</div>
        </div>
        <div style="font-size:11px;line-height:1.7;text-align:left">${user.schoolName||''}<br>المنظومة الرقمية<br>${data.date}</div>
    </div>

    <!-- معلومات أساسية -->
    <div class="info-grid">
        <div class="info-box"><div class="info-lbl">التاريخ</div><div class="info-val">${data.date}</div></div>
        <div class="info-box"><div class="info-lbl">المكان</div><div class="info-val">${data.location||'—'}</div></div>
        <div class="info-box"><div class="info-lbl">من الساعة</div><div class="info-val">${data.timeStart||'—'} إلى ${data.timeEnd||'—'}</div></div>
        <div class="info-box"><div class="info-lbl">رئيس الاجتماع</div><div class="info-val">${data.chair||'—'}</div></div>
        <div class="info-box"><div class="info-lbl">المقرر</div><div class="info-val">${data.secretary||'—'}</div></div>
        <div class="info-box"><div class="info-lbl">موعد الاجتماع القادم</div><div class="info-val">${data.nextDate||'—'}</div></div>
    </div>

    <!-- الحضور -->
    <h3>أولاً: الحضور والغياب</h3>
    <table style="margin-bottom:10px">
        <thead><tr><th style="width:40px">#</th><th>الاسم</th><th>الصفة</th><th style="width:80px">التوقيع</th></tr></thead>
        <tbody>${attendeesHtml||'<tr><td colspan="4" style="text-align:center;padding:10px;color:#aaa">لم يُسجل حضور</td></tr>'}</tbody>
    </table>
    ${data.absentees?`<div style="background:#fff7ed;border-radius:6px;padding:8px;font-size:12px;margin-bottom:10px"><strong>المعتذرون:</strong> ${data.absentees}</div>`:''}

    <!-- جدول الأعمال -->
    <h3>ثانياً: جدول الأعمال</h3>
    <div style="margin-bottom:14px">${agendaHtml||'<p style="color:#aaa">لم تُضف بنود</p>'}</div>

    <!-- المناقشات -->
    ${data.discussion?`<h3>ثالثاً: المناقشات</h3><div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:13px;line-height:1.8;margin-bottom:14px">${data.discussion}</div>`:''}

    <!-- القرارات -->
    ${data.decisions?.length?`<h3>رابعاً: القرارات المتخذة</h3><div style="margin-bottom:14px">${decisionsHtml}</div>`:''}

    <!-- التوصيات -->
    ${data.recommendations?`<h3>خامساً: التوصيات</h3><div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;font-size:13px;line-height:1.8;margin-bottom:14px">${data.recommendations}</div>`:''}

    <!-- التوقيعات -->
    <div class="sign-area">
        <div class="sign-box">رئيس الاجتماع<br><br>${data.chair||'______________'}</div>
        <div class="sign-box">المقرر<br><br>${data.secretary||'______________'}</div>
        <div class="sign-box">مدير المدرسة<br><br>______________</div>
    </div>

    <script>setTimeout(()=>window.print(),600)<\/script>
    </body></html>`;

    var b = new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

// ══ تحميل الاجتماعات ══
window.mtLoadMeetings = async function() {
    var el = document.getElementById('meetings-list');
    if(!el) return;
    var schoolId = getActiveSchoolId();
    var typeFilter = document.getElementById('mt-filter-type')?.value;
    try {
        var q = query(collection(db,`schools/${schoolId}/meetings`), orderBy('createdAt','desc'), limit(30));
        var snap = await getDocs(q);
        if(snap.empty){ el.innerHTML='<div style="text-align:center;padding:30px;color:#6b7280">لا توجد اجتماعات مسجلة</div>'; return; }
        var meetings = snap.docs.map(d=>({id:d.id,...d.data()}));
        if(typeFilter) meetings = meetings.filter(m=>m.type===typeFilter);
        el.innerHTML = meetings.map(m=>`
            <div class="meeting-card" onclick="mtViewMeeting('${m.id}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
                    <div>
                        <div style="font-size:15px;font-weight:900;color:#0b2545">${m.type}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:2px">
                            📅 ${m.date} ${m.timeStart?`⏰ ${m.timeStart}`:''}
                            ${m.location?`📍 ${m.location}`:''}
                        </div>
                        <div style="font-size:12px;color:#6b7280;margin-top:2px">
                            ${m.attendees?.length?`👥 ${m.attendees.length} حاضر`:''}
                            ${m.decisions?.length?`✅ ${m.decisions.length} قرار`:''}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <span class="meeting-badge b-done">منجز</span>
                        <button class="btn btn-gold btn-sm" onclick="event.stopPropagation();mtViewAndPrint('${m.id}')"><i class="bi bi-printer"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();mtDelete('${m.id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e){ el.innerHTML='<div style="color:#dc2626;padding:20px">خطأ في التحميل</div>'; }
};

window.mtViewMeeting = async function(id) {
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,`schools/${schoolId}/meetings`), where('__name__','==',id)));
        if(snap.empty) return;
        var data = {id:snap.docs[0].id,...snap.docs[0].data()};
        document.getElementById('modal-meeting-content').innerHTML = `
            <div style="font-size:18px;font-weight:900;color:#0b2545;margin-bottom:4px">${data.type}</div>
            <div style="font-size:13px;color:#6b7280;margin-bottom:16px">📅 ${data.date} ${data.timeStart?`⏰ ${data.timeStart} - ${data.timeEnd}`:''}</div>
            ${data.location?`<div style="margin-bottom:10px"><strong>المكان:</strong> ${data.location}</div>`:''}
            ${data.chair?`<div style="margin-bottom:10px"><strong>رئيس الاجتماع:</strong> ${data.chair}</div>`:''}
            ${data.attendees?.length?`<div style="margin-bottom:10px"><strong>الحضور (${data.attendees.length}):</strong> ${data.attendees.map(a=>`<span class="attendee-tag">${a.name}</span>`).join('')}</div>`:''}
            ${data.decisions?.length?`<div style="margin-bottom:10px"><strong>القرارات:</strong>${data.decisions.map(d=>`<div class="decision-item"><i class="bi bi-check-circle-fill"></i>${d}</div>`).join('')}</div>`:''}
            ${data.recommendations?`<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-bottom:10px"><strong>التوصيات:</strong><br>${data.recommendations}</div>`:''}
            <div style="display:flex;gap:8px;margin-top:16px">
                <button class="btn btn-gold" onclick="mtPrint(${JSON.stringify(data).replace(/'/g,'&apos;')})"><i class="bi bi-printer"></i> طباعة المحضر</button>
                <button class="btn btn-outline" onclick="document.getElementById('modal-meeting').classList.remove('show')">إغلاق</button>
            </div>`;
        document.getElementById('modal-meeting').classList.add('show');
    } catch(e){ mtToast('خطأ في التحميل','error'); }
};

window.mtViewAndPrint = async function(id) {
    var schoolId = getActiveSchoolId();
    var snap = await getDocs(query(collection(db,`schools/${schoolId}/meetings`), where('__name__','==',id)));
    if(!snap.empty) mtPrint({id:snap.docs[0].id,...snap.docs[0].data()});
};

window.mtDelete = async function(id) {
    if(!confirm('حذف هذا المحضر؟')) return;
    var schoolId = getActiveSchoolId();
    try {
        await deleteDoc(doc(db,`schools/${schoolId}/meetings`,id));
        mtToast('تم الحذف','success');
        mtLoadMeetings();
    } catch(e){ mtToast('خطأ','error'); }
};

// ══ Toast ══
function mtToast(msg,type='info'){
    var t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${type==='error'?'#dc2626':type==='success'?'#16a34a':'#0b2545'};color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999;font-family:Cairo,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)`;
    t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}

// Close modal on overlay click
document.addEventListener('click',function(e){
    if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});
