import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp, onSnapshot, doc, updateDoc }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════════════
// موديل الإنذارات والتحذيرات الرسمية
// وزارة التربية الكويتية — متوسطة سالم الحسينان
// ══════════════════════════════════════════════════════

export async function initWarningsModule() {
    const container = document.getElementById('tab-warnings');
    if(!container) return;

    const schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .warn-card{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
        .warn-title{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--off);padding-bottom:10px}
        .warn-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}
        .warn-label{font-size:12px;font-weight:800;color:var(--text);display:block;margin-bottom:5px}
        .warn-input{width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;text-align:right;outline:none;transition:border-color .2s;background:var(--white);color:var(--text)}
        .warn-input:focus{border-color:var(--sky)}
        .warn-btn{padding:11px 22px;border-radius:10px;border:none;font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .2s}
        .warn-btn.primary{background:var(--navy);color:#fff;width:100%;justify-content:center}
        .warn-btn.primary:hover{background:#134074}
        .warn-btn.print{background:var(--red);color:#fff}
        .warn-btn.wa{background:#25d366;color:#fff}
        .level-badge{display:inline-block;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:800;color:#fff}
        .level-1{background:#6b7280} .level-2{background:#d97706} .level-3{background:#dc2626} .level-4{background:#7c3aed}
        .status-badge{padding:3px 10px;border-radius:8px;font-size:11px;font-weight:800}
        .status-open{background:#fef2f2;color:var(--red)} .status-done{background:#f0fdf4;color:var(--green)}
    </style>

    <!-- إصدار إنذار جديد -->
    <div class="warn-card" style="border-top:4px solid var(--red)">
        <div class="warn-title"><i class="bi bi-exclamation-triangle-fill" style="color:var(--red)"></i> إصدار إنذار / تحذير رسمي</div>

        <div class="warn-form-grid">
            <div>
                <label class="warn-label">الفصل</label>
                <select class="warn-input" id="warn-class" onchange="loadWarnStudents(this.value)">
                    <option value="">-- اختر الفصل --</option>
                </select>
            </div>
            <div>
                <label class="warn-label">الطالب</label>
                <select class="warn-input" id="warn-student" disabled>
                    <option value="">-- اختر الفصل أولاً --</option>
                </select>
            </div>
            <div>
                <label class="warn-label">مستوى الإنذار</label>
                <select class="warn-input" id="warn-level">
                    <option value="1">📢 المستوى الأول — تنبيه (3 غيابات)</option>
                    <option value="2">👪 المستوى الثاني — استدعاء ولي الأمر (5 غيابات)</option>
                    <option value="3">📄 المستوى الثالث — إنذار رسمي (8 غيابات)</option>
                    <option value="4">❌ المستوى الرابع — حرمان من الاختبارات (10 غيابات)</option>
                </select>
            </div>
            <div>
                <label class="warn-label">سبب الإنذار</label>
                <select class="warn-input" id="warn-reason">
                    <option value="غياب متكرر بدون عذر">غياب متكرر بدون عذر</option>
                    <option value="تأخر متكرر">تأخر متكرر</option>
                    <option value="سلوك غير لائق">سلوك غير لائق</option>
                    <option value="إهمال واجبات مدرسية">إهمال واجبات مدرسية</option>
                    <option value="أخرى">أخرى</option>
                </select>
            </div>
            <div>
                <label class="warn-label">عدد الغيابات المسجلة</label>
                <input type="number" class="warn-input" id="warn-absence-count" placeholder="مثال: 5" min="0">
            </div>
            <div>
                <label class="warn-label">تاريخ الإنذار</label>
                <input type="date" class="warn-input" id="warn-date" value="${getTodayISO()}">
            </div>
            <div style="grid-column:1/-1">
                <label class="warn-label">ملاحظات إضافية</label>
                <textarea class="warn-input" id="warn-notes" rows="2" placeholder="أي ملاحظات للإنذار..."></textarea>
            </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="warn-btn primary" style="flex:2" onclick="saveWarning()">
                <i class="bi bi-cloud-plus-fill"></i> حفظ الإنذار
            </button>
            <button class="warn-btn print" onclick="printWarningForm()">
                <i class="bi bi-printer-fill"></i> طباعة النموذج
            </button>
            <button class="warn-btn wa" onclick="sendWarningWhatsApp()">
                <i class="bi bi-whatsapp"></i> إبلاغ واتساب
            </button>
        </div>
    </div>

    <!-- سجل الإنذارات -->
    <div class="warn-card">
        <div class="warn-title">
            <i class="bi bi-journal-text"></i> سجل الإنذارات
            <div style="margin-right:auto;display:flex;gap:8px">
                <select class="warn-input" style="max-width:150px;padding:6px 10px" id="warn-filter-level" onchange="filterWarnings()">
                    <option value="">كل المستويات</option>
                    <option value="1">تنبيه</option>
                    <option value="2">استدعاء</option>
                    <option value="3">إنذار رسمي</option>
                    <option value="4">حرمان</option>
                </select>
                <button class="warn-btn print" style="padding:7px 14px;font-size:12px" onclick="printAllWarnings()">
                    <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                </button>
            </div>
        </div>
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:var(--off)">
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">الطالب</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">الفصل</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">المستوى</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">السبب</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">الغيابات</th>
                        <th style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid)">التاريخ</th>
                        <th style="padding:9px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid)">إجراء</th>
                    </tr>
                </thead>
                <tbody id="warnings-tbody">
                    <tr><td colspan="7" style="text-align:center;padding:30px;color:var(--mid)">⏳ جاري التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    loadClasses();
    loadWarningsLive(schoolId);
}

// ══ تحميل الفصول ══
async function loadClasses() {
    const sel = document.getElementById('warn-class');
    if(!sel) return;
    const schoolId = getActiveSchoolId();
    try {
        const snap = await getDocs(query(collection(db,'students'),where('schoolId','==',schoolId)));
        const classes = [...new Set(snap.docs.map(d=>d.data().classId).filter(Boolean))].sort();
        sel.innerHTML = '<option value="">-- اختر الفصل --</option>' +
            classes.map(c=>`<option value="${c}">${c}</option>`).join('');
    } catch(e) {}
}

// ══ تحميل الطلاب ══
window.loadWarnStudents = async function(classId) {
    const sel = document.getElementById('warn-student');
    if(!classId) { sel.innerHTML='<option value="">-- اختر الفصل أولاً --</option>'; sel.disabled=true; return; }
    sel.innerHTML='<option value="">⏳...</option>'; sel.disabled=true;
    try {
        const snap = await getDocs(query(collection(db,'students'),
            where('schoolId','==',getActiveSchoolId()), where('classId','==',classId)));
        const names = snap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = '<option value="">-- اختر الطالب --</option>' +
            names.map(n=>`<option value="${n}">${n}</option>`).join('');
        sel.disabled = false;

        // حساب غيابات الطالب تلقائياً
        sel.onchange = async function() {
            const name = this.value;
            if(!name) return;
            const absSnap = await getDocs(query(collection(db,'attendance'),
                where('schoolId','==',getActiveSchoolId()),
                where('classId','==',classId),
                where('status','==','absent')));
            let count = 0;
            absSnap.forEach(d => { if((d.data().studentName||d.data().name)===name) count++; });
            document.getElementById('warn-absence-count').value = count;
            // اقتراح المستوى تلقائياً
            const level = count >= 10 ? 4 : count >= 8 ? 3 : count >= 5 ? 2 : count >= 3 ? 1 : 1;
            document.getElementById('warn-level').value = level;
        };
    } catch(e) { sel.innerHTML='<option value="">❌ خطأ</option>'; }
};

// ══ حفظ الإنذار ══
window.saveWarning = async function() {
    const student = document.getElementById('warn-student').value;
    const classId = document.getElementById('warn-class').value;
    const level   = document.getElementById('warn-level').value;
    const reason  = document.getElementById('warn-reason').value;
    const count   = document.getElementById('warn-absence-count').value;
    const date    = document.getElementById('warn-date').value;
    const notes   = document.getElementById('warn-notes').value.trim();
    const user    = JSON.parse(localStorage.getItem('hs_user')||'{}');

    if(!student || !classId) { window.showToast('⚠️ اختر الفصل والطالب','warning'); return; }

    const levelNames = {1:'تنبيه',2:'استدعاء ولي الأمر',3:'إنذار رسمي',4:'حرمان من الاختبارات'};

    try {
        await addDoc(collection(db,'warnings'), {
            schoolId:      getActiveSchoolId(),
            studentName:   student,
            classId,
            level:         parseInt(level),
            levelName:     levelNames[level],
            reason,
            absenceCount:  parseInt(count)||0,
            notes,
            date,
            issuedBy:      user.name || '',
            status:        'open',
            createdAt:     serverTimestamp()
        });
        window.showToast('✅ تم حفظ الإنذار بنجاح');
        document.getElementById('warn-notes').value = '';
    } catch(e) { window.showToast('❌ '+e.message,'error'); }
};

// ══ طباعة نموذج الإنذار ══
window.printWarningForm = function() {
    const student = document.getElementById('warn-student').value;
    const classId = document.getElementById('warn-class').value;
    const level   = document.getElementById('warn-level').value;
    const reason  = document.getElementById('warn-reason').value;
    const count   = document.getElementById('warn-absence-count').value;
    const date    = document.getElementById('warn-date').value;
    const notes   = document.getElementById('warn-notes').value;

    if(!student) { window.showToast('⚠️ اختر الطالب أولاً','warning'); return; }

    const levelNames = {1:'تنبيه',2:'استدعاء ولي الأمر',3:'إنذار رسمي',4:'حرمان من الاختبارات'};
    const user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    const dateAr = new Date(date+'T00:00:00').toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});

    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>نموذج إنذار — ${student}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  body{font-family:'Cairo',sans-serif;direction:rtl;padding:30px;color:#000;font-size:13px}
  .header{text-align:center;margin-bottom:20px;border-bottom:3px double #000;padding-bottom:16px}
  .header h1{font-size:16px;font-weight:900;margin-bottom:4px}
  .header p{font-size:12px;color:#555}
  .title-box{text-align:center;margin:16px 0;font-size:18px;font-weight:900;border:2px solid #000;padding:10px;border-radius:4px}
  .info-table{width:100%;border-collapse:collapse;margin-bottom:16px}
  .info-table td{border:1px solid #999;padding:8px 12px}
  .info-table .lbl{background:#f0f0f0;font-weight:800;width:140px}
  .content-box{border:1px solid #999;padding:14px;min-height:80px;margin-bottom:16px;border-radius:4px}
  .sig-row{display:flex;justify-content:space-between;margin-top:40px}
  .sig-box{text-align:center;width:30%}
  .sig-box .line{border-top:1px solid #000;margin-top:30px;padding-top:6px;font-size:12px}
  .stamp-box{border:2px dashed #999;height:80px;width:80px;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px;border-radius:50%}
  @media print{@page{margin:1.5cm}}
</style>
</head>
<body>
<div class="header">
  <h1>وزارة التربية — الإدارة العامة لمنطقة العاصمة التعليمية</h1>
  <p>${user.schoolName||'مدرسة سالم الحسينان المتوسطة'}</p>
</div>

<div class="title-box">نموذج ${levelNames[level]}</div>

<table class="info-table">
  <tr><td class="lbl">اسم الطالب</td><td>${student}</td><td class="lbl">الفصل</td><td>${classId}</td></tr>
  <tr><td class="lbl">سبب الإنذار</td><td>${reason}</td><td class="lbl">عدد الغيابات</td><td>${count} يوم</td></tr>
  <tr><td class="lbl">التاريخ</td><td>${dateAr}</td><td class="lbl">أصدره</td><td>${user.name||''}</td></tr>
</table>

<div style="font-weight:900;margin-bottom:8px;font-size:14px">نص الإنذار:</div>
<div class="content-box">
بناءً على ما أُفيد به، وعلى ضوء سجلات الحضور والغياب، فإن الطالب / ${student} من الفصل ${classId} 
قد تجاوز الحد المسموح به من الغيابات إذ بلغت ${count} يوماً، وذلك يستوجب إجراء 
"${levelNames[level]}" وفق لوائح وزارة التربية والتعليم.
${notes ? `\n\nملاحظات: ${notes}` : ''}
</div>

<div class="sig-row">
  <div class="sig-box">
    <div class="stamp-box">ختم<br>المدرسة</div>
    <div class="line">مدير المدرسة</div>
  </div>
  <div class="sig-box">
    <div class="line">ولي الأمر (بالعلم)</div>
  </div>
  <div class="sig-box">
    <div class="line">الطالب (بالعلم)</div>
  </div>
</div>
</body>
</html>`);
    win.document.close();
    setTimeout(()=>win.print(), 600);
};

// ══ واتساب ══
window.sendWarningWhatsApp = async function() {
    const student = document.getElementById('warn-student').value;
    const classId = document.getElementById('warn-class').value;
    const level   = document.getElementById('warn-level').value;
    const count   = document.getElementById('warn-absence-count').value;
    if(!student) { window.showToast('⚠️ اختر الطالب أولاً','warning'); return; }

    const levelNames = {1:'تنبيه',2:'استدعاء ولي الأمر',3:'إنذار رسمي',4:'حرمان من الاختبارات'};
    try {
        const snap = await getDocs(query(collection(db,'students'),
            where('schoolId','==',getActiveSchoolId()),
            where('classId','==',classId),
            where('name','==',student)));
        const phone = snap.docs[0]?.data()?.parentPhone?.replace(/\D/g,'');
        if(!phone) { window.showToast('⚠️ لا يوجد رقم لولي الأمر','warning'); return; }
        const user = JSON.parse(localStorage.getItem('hs_user')||'{}');
        const today = new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
        const msg = encodeURIComponent(
            `السلام عليكم ولي أمر الطالب ${student}،\n` +
            `نُعلمكم بأن مدرسة ${user.schoolName||''} قد أصدرت بحق ابنكم:\n` +
            `📋 ${levelNames[level]}\n` +
            `السبب: غياب متكرر (${count} يوم)\n` +
            `التاريخ: ${today}\n` +
            `يرجى مراجعة إدارة المدرسة في أقرب وقت.`
        );
        window.open(`https://wa.me/965${phone}?text=${msg}`, '_blank');
    } catch(e) { window.showToast('❌ '+e.message,'error'); }
};

// ══ سجل الإنذارات لايف ══
let allWarnings = [];

function loadWarningsLive(schoolId) {
    const tbody = document.getElementById('warnings-tbody');
    const q = query(collection(db,'warnings'), where('schoolId','==',schoolId));
    onSnapshot(q, snap => {
        allWarnings = [];
        snap.forEach(d => allWarnings.push({ id:d.id, ...d.data() }));
        allWarnings.sort((a,b) => (b.date||'').localeCompare(a.date||''));
        filterWarnings();
    });
}

window.filterWarnings = function() {
    const tbody   = document.getElementById('warnings-tbody');
    const filter  = document.getElementById('warn-filter-level')?.value || '';
    const filtered = filter ? allWarnings.filter(w=>w.level==filter) : allWarnings;
    const levelColors = {1:'#6b7280',2:'#d97706',3:'#dc2626',4:'#7c3aed'};

    if(!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--mid)">لا توجد إنذارات</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(w => `
        <tr style="border-bottom:1px solid var(--line)">
            <td style="padding:9px 12px;font-weight:700">${w.studentName||'—'}</td>
            <td style="padding:9px 12px">${w.classId||'—'}</td>
            <td style="padding:9px 12px;text-align:center">
                <span class="level-badge level-${w.level||1}" style="background:${levelColors[w.level||1]}">${w.levelName||'—'}</span>
            </td>
            <td style="padding:9px 12px;font-size:12px">${w.reason||'—'}</td>
            <td style="padding:9px 12px;text-align:center;font-weight:800;color:var(--red)">${w.absenceCount||0}</td>
            <td style="padding:9px 12px;color:var(--mid);font-size:12px">${w.date||'—'}</td>
            <td style="padding:9px 12px;text-align:center">
                <span class="status-badge ${w.status==='done'?'status-done':'status-open'}">${w.status==='done'?'✅ مُعالَج':'🔴 مفتوح'}</span>
            </td>
        </tr>`).join('');
};

// ══ طباعة كل الإنذارات PDF ══
window.printAllWarnings = async function() {
    if(!allWarnings.length) { window.showToast('⚠️ لا توجد إنذارات','warning'); return; }
    const levelColors = {1:'#6b7280',2:'#d97706',3:'#dc2626',4:'#7c3aed'};
    const content = `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#0b2545;color:#fff">
            <th style="padding:8px">الطالب</th><th style="padding:8px">الفصل</th>
            <th style="padding:8px">المستوى</th><th style="padding:8px">السبب</th>
            <th style="padding:8px">الغيابات</th><th style="padding:8px">التاريخ</th>
        </tr></thead>
        <tbody>${allWarnings.map(w=>`<tr>
            <td style="padding:7px;border-bottom:1px solid #eee;font-weight:700">${w.studentName||'—'}</td>
            <td style="padding:7px;border-bottom:1px solid #eee">${w.classId||'—'}</td>
            <td style="padding:7px;border-bottom:1px solid #eee;color:${levelColors[w.level||1]};font-weight:800">${w.levelName||'—'}</td>
            <td style="padding:7px;border-bottom:1px solid #eee;font-size:11px">${w.reason||'—'}</td>
            <td style="padding:7px;border-bottom:1px solid #eee;text-align:center;font-weight:800;color:#dc2626">${w.absenceCount||0}</td>
            <td style="padding:7px;border-bottom:1px solid #eee;color:#666">${w.date||'—'}</td>
        </tr>`).join('')}</tbody>
    </table>`;
    if(window.ManzoumaReport?.exportPDF) {
        await window.ManzoumaReport.exportPDF(content,'سجل_الإنذارات_الرسمية','سجل الإنذارات والتحذيرات الرسمية','متوسطة سالم الحسينان');
    }
};
