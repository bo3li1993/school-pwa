import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

var ALL_CLASSES = ['6/1','6/2','6/3','6/4','7/1','7/2','7/3','7/4','8/1','8/2','8/3','8/4','9/1','9/2','9/3','9/4'];

export async function initStudentModule() {
    var container = document.getElementById('tab-student');
    if (!container) return;
    var opts = '';
    for (var i = 0; i < ALL_CLASSES.length; i++) {
        opts += '<option value="' + ALL_CLASSES[i] + '">' + ALL_CLASSES[i] + '</option>';
    }
    var html = '';
    html += '<div class="card">';
    html += '<h2><i class="bi bi-person-badge"></i> ملف الطالب</h2>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">الفصل</label>';
    html += '<select id="st-class" onchange="window.loadClassStudents(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif">';
    html += '<option value="">اختر الفصل</option>' + opts + '</select></div>';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">الطالب</label>';
    html += '<select id="st-student" disabled onchange="window.showStudentProfile(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif">';
    html += '<option value="">اختر الفصل أولاً</option></select></div>';
    html += '</div></div><div id="st-results"></div>';
    container.innerHTML = html;
}

window.loadClassStudents = async function(classId) {
    var sel = document.getElementById('st-student');
    if (!sel) return;
    sel.disabled = true;
    sel.innerHTML = '<option>جاري التحميل</option>';
    if (!classId) {
        sel.innerHTML = '<option>اختر الفصل أولاً</option>';
        return;
    }
    try {
        var snap = await getDocs(query(
            collection(db, 'students'),
            where('schoolId', '==', getActiveSchoolId()),
            where('classId', '==', classId)
        ));
        var names = [];
        snap.forEach(function(d) {
            var n = d.data().name;
            if (n) names.push(n);
        });
        names.sort(function(a, b) { return a.localeCompare(b, 'ar'); });
        var opts = '<option value="">اختر الطالب</option>';
        for (var i = 0; i < names.length; i++) {
            opts += '<option value="' + names[i] + '">' + names[i] + '</option>';
        }
        sel.innerHTML = opts;
        sel.disabled = false;
    } catch (e) {
        sel.innerHTML = '<option>خطأ في التحميل</option>';
    }
};

window.showStudentProfile = async function(name) {
    var results = document.getElementById('st-results');
    if (!results || !name) return;
    results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">جاري التحميل...</div>';

    var schoolId = getActiveSchoolId();
    try {
        var attSnap = await getDocs(query(
            collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('studentName', '==', name)
        ));

        var absent = 0;
        var late = 0;
        var records = [];
        attSnap.forEach(function(d) {
            var r = d.data();
            records.push(r);
            if (r.status === 'absent') absent++;
            if (r.status === 'late') late++;
        });

        records.sort(function(a, b) {
            var da = a.date || '';
            var db2 = b.date || '';
            return db2.localeCompare(da);
        });

        var rows = '';
        for (var i = 0; i < records.length; i++) {
            var r = records[i];
            var color = r.status === 'absent' ? '#dc2626' : '#d97706';
            var label = r.status === 'absent' ? 'غائب' : 'متأخر';
            rows += '<tr>';
            rows += '<td style="padding:8px">' + (r.date || '') + '</td>';
            rows += '<td style="padding:8px;color:' + color + ';font-weight:800">' + label + '</td>';
            rows += '<td style="padding:8px">' + (r.period || '-') + '</td>';
            rows += '<td style="padding:8px;font-size:11px;color:#aaa">' + (r.recordedBy || '-') + '</td>';
            rows += '</tr>';
        }

        var html = '';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">';
        html += '<div class="card" style="text-align:center"><div style="font-size:28px;font-weight:900;color:#dc2626">' + absent + '</div><div style="font-size:11px;color:#aaa">غياب</div></div>';
        html += '<div class="card" style="text-align:center"><div style="font-size:28px;font-weight:900;color:#d97706">' + late + '</div><div style="font-size:11px;color:#aaa">تأخر</div></div>';
        html += '</div>';
        html += '<div class="card"><h3 style="margin-bottom:10px">كشف الغياب</h3>';
        if (rows) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            html += '<tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">التاريخ</th><th style="padding:8px">الحالة</th><th style="padding:8px">الحصة</th><th style="padding:8px">سجلها</th></tr>';
            html += rows;
            html += '</table>';
        } else {
            html += '<div style="text-align:center;padding:20px;color:#aaa">لا يوجد غياب مسجل</div>';
        }
        html += '</div>';

        results.innerHTML = html;
    } catch (e) {
        results.innerHTML = '<div style="color:#dc2626;padding:20px">خطأ: ' + e.message + '</div>';
    }
};