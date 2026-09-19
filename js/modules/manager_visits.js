// XSS Prevention
function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot, doc, updateDoc, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

var _mgrVisitUnsub = null;
function cleanupMgrListeners() {
    if(_mgrVisitUnsub) { try { _mgrVisitUnsub(); } catch(e) {} _mgrVisitUnsub = null; }
}

var PERIODS = ['الحصة الأولى','الحصة الثانية','الحصة الثالثة','الحصة الرابعة','الحصة الخامسة','الحصة السادسة','الحصة السابعة'];
var RATINGS = ['ممتاز','جيد جداً','جيد','مقبول','ضعيف'];
var RATING_COLORS = ['#16a34a','#1a78c2','#d4920a','#f59e0b','#dc2626'];

export async function initManagerVisitsModule() {
    var container = document.getElementById('tab-manager-visits');
    if (!container) return;

    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var canEdit = user.role === 'admin' || user.role === 'assistant_manager';

    var html = '';
    html += '<div style="max-width:1100px;margin:0 auto;padding:16px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">';
    html += '<h2 style="font-size:18px;font-weight:900;color:var(--navy);margin:0"><i class="bi bi-eye-fill"></i> الزيارات التفقدية</h2>';
    html += '</div>';

    if (!canEdit) {
        html += '<div style="background:#fee2e2;border:1px solid #dc2626;border-radius:8px;padding:12px;color:#991b1b;font-size:13px;font-weight:700">⚠️ لا توجد صلاحيات لتسجيل الزيارات. فقط المدير والمساعد يمكنهما الوصول.</div>';
        container.innerHTML = html + '</div>';
        return;
    }

    html += '<div class="card" style="margin-bottom:20px">';
    html += '<h3 style="margin-bottom:15px;font-size:15px;font-weight:800">تسجيل زيارة جديدة</h3>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">المادة/القسم</label><select id="mv-subject" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px" onchange="window.loadMVTeachers()"><option value="">اختر المادة</option></select></div>';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">اسم المعلم</label><select id="mv-teacher" disabled style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px"><option value="">اختر المادة أولاً</option></select></div>';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">التاريخ</label><input type="date" id="mv-date" value="' + getTodayISO() + '" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px"></div>';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">الحصة</label><select id="mv-period" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px"><option value="">اختر الحصة</option>' + PERIODS.map(function(p,i) { return '<option value="' + (i+1) + '">' + p + '</option>'; }).join('') + '</select></div>';
    html += '</div>';

    html += '<div id="mv-criteria-container" style="margin-bottom:12px;display:none">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<label style="font-size:12px;font-weight:800">معايير التقييم</label>';
    html += '<button onclick="window.toggleEditCriteria()" style="background:#1a78c2;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700"><i class="bi bi-pencil"></i> تعديل</button>';
    html += '</div>';
    html += '<div id="mv-criteria-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px"></div>';
    html += '<div id="mv-edit-criteria-panel" style="display:none;margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid var(--line)">';
    html += '<div style="margin-bottom:12px"><input type="text" id="mv-new-criterion" placeholder="أضف معيار جديد..." style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px"></div>';
    html += '<div id="mv-criteria-list" style="max-height:200px;overflow-y:auto"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">ملاحظات</label><textarea id="mv-notes" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;resize:vertical;height:80px" placeholder="ملاحظاتك عن الحصة..."></textarea></div>';

    html += '<div style="display:flex;gap:10px;margin-top:15px">';
    html += '<button onclick="window.saveMVVisit()" style="flex:1;background:var(--sky);color:#fff;border:none;padding:12px;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:800;cursor:pointer"><i class="bi bi-check-circle"></i> حفظ الزيارة</button>';
    html += '<button onclick="window.printMVForm()" style="flex:1;background:var(--navy);color:#fff;border:none;padding:12px;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:800;cursor:pointer"><i class="bi bi-printer-fill"></i> طباعة</button>';
    html += '</div>';
    html += '</div>';

    html += '<div class="card" style="margin-top:20px">';
    html += '<h3 style="margin-bottom:15px;font-size:15px;font-weight:800">سجل الزيارات</h3>';
    html += '<div id="mv-list-container" style="max-height:400px;overflow-y:auto"></div>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    loadMVDepartments();
}

async function loadMVDepartments() {
    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(collection(db,'departments'), where('schoolId','==',schoolId)));
        var subjectSelect = document.getElementById('mv-subject');
        var subjectHtml = '<option value="">اختر المادة</option>';
        snap.forEach(function(d) {
            var dept = d.data();
            subjectHtml += '<option value="' + d.id + '" data-name="' + (dept.name||'') + '">' + (dept.name||'—') + '</option>';
        });
        subjectSelect.innerHTML = subjectHtml;
    } catch(e) {}
}

window.loadMVTeachers = async function() {
    var subjectSelect = document.getElementById('mv-subject');
    var selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
    var deptId = subjectSelect.value;
    var deptName = selectedOption.getAttribute('data-name') || '';
    
    var teacherSelect = document.getElementById('mv-teacher');
    if (!deptId) { teacherSelect.disabled = true; teacherSelect.innerHTML = '<option>اختر المادة أولاً</option>'; return; }

    teacherSelect.disabled = false;
    teacherSelect.innerHTML = '<option>⏳ جاري التحميل...</option>';

    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(collection(db,'users'), where('schoolId','==',schoolId), where('role','in',['teacher','social_worker'])));
        var teachers = [];
        snap.forEach(function(d) { var n = d.data().name; if (n) teachers.push(n); });
        teachers.sort(function(a,b) { return a.localeCompare(b,'ar'); });
        teacherSelect.innerHTML = '<option value="">اختر المعلم</option>' + teachers.map(function(t) { return '<option value="' + escHtml(t) + '">' + escHtml(t) + '</option>'; }).join('');

        window.renderMVCriteria(deptId, deptName);
        loadMVVisitsList();
    } catch(e) { teacherSelect.innerHTML = '<option>خطأ في التحميل</option>'; }
};

window.renderMVCriteria = async function(deptId, deptName) {
    var container = document.getElementById('mv-criteria-container');
    var grid = document.getElementById('mv-criteria-grid');
    if (!deptId) { container.style.display = 'none'; return; }

    try {
        var docSnap = await getDocs(query(collection(db,'departments'), where('__name__','==',deptId)));
        var criteria = [];
        docSnap.forEach(function(d) { criteria = d.data().criteria || []; });

        var html = '';
        for (var i = 0; i < criteria.length; i++) {
            var c = criteria[i];
            var criterionText = typeof c === 'string' ? c : (c.text || c.name || '');
            html += '<div style="border:1px solid var(--line);border-radius:8px;padding:10px;background:#f9fafb">';
            html += '<div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--navy)">' + (i+1) + '. ' + criterionText + '</div>';
            html += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
            for (var r = 0; r < RATINGS.length; r++) {
                var rating = RATINGS[r];
                html += '<label style="flex:1;min-width:45px;text-align:center;font-size:10px;cursor:pointer"><input type="radio" name="criterion_' + i + '" value="' + rating + '" style="cursor:pointer"> <span style="color:' + RATING_COLORS[r] + ';font-weight:700;font-size:9px">' + rating.substring(0,2) + '</span></label>';
            }
            html += '</div></div>';
        }
        grid.innerHTML = html;
        container.style.display = 'block';
        window.currentDeptId = deptId;
        window.currentCriteria = criteria;
    } catch(e) {}
};

window.toggleEditCriteria = function() {
    var panel = document.getElementById('mv-edit-criteria-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') {
        window.loadCriteriaEditList();
    }
};

window.loadCriteriaEditList = async function() {
    if (!window.currentDeptId) return;
    var listDiv = document.getElementById('mv-criteria-list');
    var html = '';
    for (var i = 0; i < window.currentCriteria.length; i++) {
        var c = window.currentCriteria[i];
        var criterionText = typeof c === 'string' ? c : (c.text || c.name || '');
        html += '<div style="display:flex;gap:8px;align-items:center;padding:8px;background:#fff;border-radius:6px;margin-bottom:8px;border:1px solid var(--line)">';
        html += '<input type="text" id="crit_' + i + '" value="' + criterionText + '" style="flex:1;padding:6px;border:1px solid var(--line);border-radius:4px;font-family:Cairo,sans-serif;font-size:12px">';
        html += '<button onclick="window.deleteCriterion(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:700">حذف</button>';
        html += '</div>';
    }
    listDiv.innerHTML = html;
};

window.deleteCriterion = function(index) {
    if (!confirm('هل تأكيد الحذف؟')) return;
    window.currentCriteria.splice(index, 1);
    window.loadCriteriaEditList();
};

window.saveMVVisit = async function() {
    var deptId = document.getElementById('mv-subject').value;
    var teacher = document.getElementById('mv-teacher').value;
    var date = document.getElementById('mv-date').value;
    var period = document.getElementById('mv-period').value;
    var notes = document.getElementById('mv-notes').value;

    if (!deptId || !teacher || !date || !period) { if (window.showToast) window.showToast('ملء جميع الحقول المطلوبة','warning'); return; }

    var scores = {};
    for (var i = 0; i < window.currentCriteria.length; i++) {
        var radioGroup = document.querySelector('input[name="criterion_' + i + '"]:checked');
        if (radioGroup) scores[i] = radioGroup.value;
    }

    var schoolId = getActiveSchoolId();
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');

    try {
        await addDoc(collection(db,'manager_visits'), {
            schoolId: schoolId,
            deptId: deptId,
            deptName: document.querySelector('#mv-subject option:checked').getAttribute('data-name'),
            teacherName: teacher,
            date: date,
            period: parseInt(period),
            notes: notes,
            scores: scores,
            visitorName: user.name,
            createdAt: serverTimestamp()
        });
        if (window.showToast) window.showToast('✓ تم حفظ الزيارة بنجاح','success');
        document.getElementById('mv-subject').value = '';
        document.getElementById('mv-teacher').value = '';
        document.getElementById('mv-notes').value = '';
        document.getElementById('mv-period').value = '';
        document.getElementById('mv-criteria-container').style.display = 'none';
        loadMVVisitsList();
    } catch(e) { if (window.showToast) window.showToast('خطأ: ' + e.message,'error'); }
};

window.printMVForm = function() {
    var deptId = document.getElementById('mv-subject').value;
    var deptName = document.querySelector('#mv-subject option:checked').getAttribute('data-name');
    var teacher = document.getElementById('mv-teacher').value;
    var date = document.getElementById('mv-date').value;
    var period = document.getElementById('mv-period').value;
    var notes = document.getElementById('mv-notes').value;

    if (!deptId || !teacher || !date || !period) { if (window.showToast) window.showToast('ملء جميع الحقول المطلوبة','warning'); return; }

    var scores = {};
    for (var i = 0; i < window.currentCriteria.length; i++) {
        var radioGroup = document.querySelector('input[name="criterion_' + i + '"]:checked');
        if (radioGroup) scores[i] = radioGroup.value;
    }

    var dateObj = new Date(date + 'T00:00:00');
    var dayName = dateObj.toLocaleDateString('ar-KW', {weekday:'long'});
    var dateFormatted = dateObj.toLocaleDateString('ar-KW', {year:'numeric',month:'long',day:'numeric'});

    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var schoolName = user.schoolName || 'مدرسة سالم الحسينان المتوسطة — بنين';
    var directorName = user.name || 'مدير المدرسة';

    var tableRows = '';
    for (var i = 0; i < window.currentCriteria.length; i++) {
        var c = window.currentCriteria[i];
        var criterionText = typeof c === 'string' ? c : (c.text || c.name || '');
        var rating = scores[i] || '—';
        tableRows += '<tr><td style="text-align:center;border:1px solid #999;padding:6px;font-weight:700">' + (i+1) + '</td>';
        tableRows += '<td style="text-align:right;border:1px solid #999;padding:6px 10px;font-size:12px">' + criterionText + '</td>';
        for (var r = 0; r < RATINGS.length; r++) {
            tableRows += '<td style="text-align:center;border:1px solid #999;padding:5px">' + (rating === RATINGS[r] ? '✓' : '') + '</td>';
        }
        tableRows += '</tr>';
    }

    var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,Arial,sans-serif;direction:rtl;padding:20px;color:#000;font-size:13px}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px}.header h1{font-size:16px;font-weight:900;margin:0}.header p{font-size:12px;margin:2px 0;color:#555}.info-table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:12px}.info-table td{border:1px solid #999;padding:6px 10px}.info-table .lbl{background:#dce6f0;font-weight:800;width:100px}.crit-table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:11.5px}.crit-table th{background:#0b2545;color:#fff;padding:7px 4px;text-align:center;border:1px solid #999}.crit-table td{border:1px solid #999;padding:5px 4px;text-align:center}.sig-section{margin-top:30px;display:flex;justify-content:space-between;font-size:11px}.sig-box{width:30%;text-align:center;border-top:1px solid #000;padding-top:20px}@media print{body{padding:10px}}</style></head><body><div class="header"><p style="font-size:10px">وزارة التربية — الإدارة العامة لمنطقة العاصمة التعليمية</p><h1>' + schoolName + '</h1><p style="font-weight:700;font-size:13px">نموذج زيارة معلم — ' + deptName + '</p></div><table class="info-table"><tr><td class="lbl">اسم المعلم</td><td>' + teacher + '</td><td class="lbl">المادة</td><td>' + deptName + '</td></tr><tr><td class="lbl">التاريخ</td><td>' + dateFormatted + '</td><td class="lbl">اليوم</td><td>' + dayName + '</td></tr><tr><td class="lbl">الحصة</td><td>' + PERIODS[parseInt(period)-1] + '</td><td class="lbl">الموافق</td><td></td></tr></table><table class="crit-table"><thead><tr><th style="width:30px">م</th><th style="text-align:right;width:40%">عناصر التقييم</th><th style="background:#16a34a">ممتاز</th><th style="background:#1a78c2">جيد جداً</th><th style="background:#d4920a">جيد</th><th style="background:#f59e0b">مقبول</th><th style="background:#dc2626">ضعيف</th></tr></thead><tbody>' + tableRows + '</tbody></table><div><strong>ملاحظات:</strong><div style="border:1px solid #999;padding:10px;margin-top:5px;min-height:60px">' + (notes||'—') + '</div></div><div class="sig-section"><div class="sig-box"><div style="margin-bottom:20px"></div><strong>رئيس القسم</strong></div><div class="sig-box"><div style="margin-bottom:20px"></div><strong>المعلم</strong><br><div style="font-size:10px">أ. ' + teacher + '</div></div><div class="sig-box"><div style="margin-bottom:20px"></div><strong>مدير المدرسة</strong><br><div style="font-size:10px">أ. ' + directorName + '</div></div></div></body></html>';

    var blob = new Blob([html], {type:'text/html;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (w) setTimeout(function() { w.print(); URL.revokeObjectURL(url); }, 800);
};

async function loadMVVisitsList() {
    var container = document.getElementById('mv-list-container');
    if (!container) return;

    cleanupMgrListeners();
    var schoolId = getActiveSchoolId();
    var q = query(collection(db,'manager_visits'), where('schoolId','==',schoolId));

    _mgrVisitUnsub = onSnapshot(q, function(snap) {
        var html = '';
        snap.forEach(function(doc) {
            var d = doc.data();
            var date = new Date(d.date + 'T00:00:00').toLocaleDateString('ar-KW', {year:'numeric',month:'short',day:'numeric'});
            html += '<div style="border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px;background:#f9fafb">';
            html += '<div style="display:flex;justify-content:space-between;align-items:start">';
            html += '<div>';
            html += '<div style="font-weight:800;color:var(--navy)">أ. ' + d.teacherName + '</div>';
            html += '<div style="font-size:12px;color:var(--mid);margin-top:4px">المادة: ' + d.deptName + ' | التاريخ: ' + date + ' | الحصة: ' + (d.period||'—') + '</div>';
            html += '<div style="font-size:11px;color:#666;margin-top:4px">الملاحظات: ' + (d.notes||'—') + '</div>';
            html += '</div>';
            html += '<button onclick="window.deleteMVVisit(\'' + doc.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:6px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700">حذف</button>';
            html += '</div></div>';
        });
        container.innerHTML = html || '<div style="text-align:center;padding:20px;color:#aaa">لا توجد زيارات مسجّلة</div>';
    });
}

window.deleteMVVisit = async function(docId) {
    if (!confirm('هل تأكيد حذف الزيارة؟')) return;
    try {
        await deleteDoc(doc(db,'manager_visits',docId));
        if (window.showToast) window.showToast('✓ تم الحذف بنجاح','success');
    } catch(e) { if (window.showToast) window.showToast('خطأ: ' + e.message,'error'); }
}
