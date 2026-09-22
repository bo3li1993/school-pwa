import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

var ALL_CLASSES = [
    '6/1','6/2','6/3','6/4',
    '7/1','7/2','7/3','7/4',
    '8/1','8/2','8/3','8/4',
    '9/1','9/2','9/3','9/4'
];

export async function initStudentModule() {
    var container = document.getElementById('tab-student');
    if (!container) return;

    var classOptions = ALL_CLASSES.map(function(c) {
        return '<option value="' + c + '">' + c + '</option>';
    }).join('');

    container.innerHTML =
        '<div style="background:#fff;padding:24px;border-radius:14px;border:1px solid var(--line);margin-bottom:18px">' +
            '<h2 style="margin:0 0 16px;color:var(--navy);font-weight:900;font-size:16px">' +
                '<i class="bi bi-person-badge"></i> ملف الطالب' +
            '</h2>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' +
                '<div>' +
                    '<label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px">١. اختر الفصل</label>' +
                    '<select id="st-class" onchange="window.loadClassStudents(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:14px">' +
                        '<option value="">-- اختر الفصل --</option>' +
                        classOptions +
                    '</select>' +
                '</div>' +
                '<div>' +
                    '<label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px">٢. اختر الطالب</label>' +
                    '<select id="st-student" disabled onchange="window.showStudentProfile(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif;font-size:14px">' +
                        '<option value="">-- اختر الفصل أولاً --</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div id="st-results"></div>';
}

window.loadClassStudents = async function(classId) {
    var sel = document.getElementById('st-student');
    if (!sel) return;
    sel.innerHTML = '<option value="">⏳ جاري التحميل...</option>';
    sel.disabled = true;
    if (!classId) { sel.innerHTML = '<option value="">-- اختر الفصل أولاً --</option>'; return; }
    try {
        var snap = await getDocs(query(
            collection(db, 'students'),
            where('schoolId', '==', getActiveSchoolId()),
            where('classId', '==', classId)
        ));
        var students = snap.docs.map(function(d) { return d.data().name; })
            .filter(Boolean)
            .sort(function(a, b) { return a.localeCompare(b, 'ar'); });
        sel.innerHTML = '<option value="">-- اختر الطالب --</option>' +
            students.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
        sel.disabled = false;
    } catch(e) {
        sel.innerHTML = '<option value="">❌ خطأ</option>';
        if (window.showToast) window.showToast('❌ ' + e.message, 'error');
    }
};

window.showStudentProfile = async function(studentName) {
    var results = document.getElementById('st-results');
    if (!results || !studentName) return;
    results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">⏳ جاري التحميل...</div>';

    var schoolId = getActiveSchoolId();
    var classId = document.getElementById('st-class').value;

    try {
        var allData = await Promise.all([
            getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('studentName','==',studentName), where('status','in',['absent','late']))),
            getDocs(query(collection(db,'behavior'), where('schoolId','==',schoolId), where('studentName','==',studentName))),
            getDocs(query(collection(db,'gatepass'), where('schoolId','==',schoolId), where('studentName','==',studentName))),
            getDocs(query(collection(db,'clinic'), where('schoolId','==',schoolId), where('studentName','==',studentName)))
        ]);
        var snapAtt = allData[0];
        var snapBeh = allData[1];
        var snapGate = allData[2];
        var snapClinic = allData[3];

        // إحصائيات
        var totalAbs = snapAtt.docs.filter(function(d) { return d.data().status === 'absent'; }).length;
        var totalLate = snapAtt.docs.filter(function(d) { return d.data().status === 'late'; }).length;
        var totalBeh = snapBeh.size;
        var totalGate = snapGate.size;
        var totalClinic = snapClinic.size;

        // كشف الغياب
        var attRows = '';
        var attDocs = snapAtt.docs.slice().sort(function(a,b) {
            return (b.data().date||'').localeCompare(a.data().date||'');
        });
        attDocs.forEach(function(d) {
            var data = d.data();
            var color = data.status === 'absent' ? '#dc2626' : '#d97706';
            var label = data.status === 'absent' ? 'غائب' : 'متأخر';
            attRows += '<tr><td style="padding:8px;font-weight:700">' + (data.date||'') + '</td>' +
                '<td style="padding:8px;text-align:center;color:' + color + ';font-weight:800">' + label + '</td>' +
                '<td style="padding:8px;text-align:center">' + (data.period||'-') + '</td>' +
                '<td style="padding:8px;font-size:11px;color:#aaa">' + (data.recordedBy||'-') + '</td></tr>';
        });

        results.innerHTML =
            '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px">' +
                kpi('غياب', totalAbs, '#dc2626') +
                kpi('تأخر', totalLate, '#d97706') +
                kpi('سلوك', totalBeh, '#7c3aed') +
                kpi('استئذان', totalGate, '#0891b2') +
                kpi('عيادة', totalClinic, '#16a34a') +
            '</div>' +
            '<div style="background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden">' +
                '<div style="padding:14px 16px;font-weight:900;color:var(--navy);border-bottom:1px solid var(--line)">📋 كشف الغياب والتأخر</div>' +
                (attRows ?
                    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
                        '<tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">التاريخ</th><th style="padding:8px">الحالة</th><th style="padding:8px">الحصة</th><th style="padding:8px">سجّلها</th></tr>' +
                        attRows +
                    '</table>' :
                    '<div style="text-align:center;padding:20px;color:#aaa;font-weight:700">✅ لا يوجد غياب مسجّل</div>'
                ) +
            '</div>';

    } catch(e) {
        results.innerHTML = '<div style="text-align:center;padding:20px;color:#dc2626;font-weight:700">❌ ' + e.message + '</div>';
    }
};

function kpi(label, val, color) {
    return '<div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center">' +
        '<div style="font-size:22px;font-weight:900;color:' + color + '">' + val + '</div>' +
        '<div style="font-size:10px;color:#aaa;font-weight:700">' + label + '</div>' +
    '</div>';
}
