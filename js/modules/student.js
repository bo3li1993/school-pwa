import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

var ALL_CLASSES = ['6/1','6/2','6/3','6/4','7/1','7/2','7/3','7/4','8/1','8/2','8/3','8/4','9/1','9/2','9/3','9/4'];

export async function initStudentModule() {
    var container = document.getElementById('tab-student');
    if (!container) return;
    var opts = ALL_CLASSES.map(function(c) { return '<option value="'+c+'">'+c+'</option>'; }).join('');
    container.innerHTML = '<div class="card"><h2><i class="bi bi-person-badge"></i> ��� ������</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label style="font-size:12px;font-weight:800">�����</label><select id="st-class" onchange="window.loadClassStudents(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif"><option value="">���� �����</option>'+opts+'</select></div><div><label style="font-size:12px;font-weight:800">������</label><select id="st-student" disabled onchange="window.showStudentProfile(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif"><option value="">���� ����� �����</option></select></div></div></div><div id="st-results"></div>';
}

window.loadClassStudents = async function(classId) {
    var sel = document.getElementById('st-student');
    if (!sel) return;
    sel.disabled = true;
    sel.innerHTML = '<option>? ���� �������...</option>';
    if (!classId) { sel.innerHTML = '<option>���� ����� �����</option>'; return; }
    try {
        var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',getActiveSchoolId()), where('classId','==',classId)));
        var names = snap.docs.map(function(d) { return d.data().name; }).filter(Boolean).sort(function(a,b) { return a.localeCompare(b,'ar'); });
        sel.innerHTML = '<option value="">���� ������</option>' + names.map(function(n) { return '<option value="'+n+'">'+n+'</option>'; }).join('');
        sel.disabled = false;
    } catch(e) { sel.innerHTML = '<option>? ���</option>'; }
};

window.showStudentProfile = async function(name) {
    var results = document.getElementById('st-results');
    if (!results || !name) return;
    results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">?</div>';
    var schoolId = getActiveSchoolId();
    try {
        var attSnap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('studentName','==',name)));
        var absent = attSnap.docs.filter(function(d) { return d.data().status==='absent'; }).length;
        var late = attSnap.docs.filter(function(d) { return d.data().status==='late'; }).length;
        var rows = attSnap.docs.slice().sort(function(a,b) { return (b.data().date||'').localeCompare(a.data().date||''); }).map(function(d) {
            var r = d.data();
            var color = r.status==='absent' ? '#dc2626' : '#d97706';
            var label = r.status==='absent' ? '����' : '�����';
            return '<tr><td style="padding:8px">'+r.date+'</td><td style="padding:8px;color:'+color+';font-weight:800">'+label+'</td><td style="padding:8px">'+( r.period||'-')+'</td><td style="padding:8px;font-size:11px;color:#aaa">'+(r.recordedBy||'-')+'</td></tr>';
        }).join('');
        results.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="card" style="text-align:center"><div style="font-size:28px;font-weight:900;color:#dc2626">'+absent+'</div><div style="font-size:11px;color:#aaa">����</div></div><div class="card" style="text-align:center"><div style="font-size:28px;font-weight:900;color:#d97706">'+late+'</div><div style="font-size:11px;color:#aaa">����</div></div></div><div class="card"><h3 style="margin-bottom:10px">��� ������</h3>'+(rows ? '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">�������</th><th style="padding:8px">������</th><th style="padding:8px">�����</th><th style="padding:8px">������</th></tr>'+rows+'</table>' : '<div style="text-align:center;padding:20px;color:#aaa">? �� ���� ����</div>')+'</div>';
    } catch(e) { results.innerHTML = '<div style="color:#dc2626;padding:20px">? '+e.message+'</div>'; }
};

// v2