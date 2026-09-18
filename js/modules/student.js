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
    html += '<h2><i class="bi bi-person-badge"></i> Ù…Ù„Ù Ø§Ù„Ø·Ø§Ù„Ø¨</h2>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Ø§Ù„ÙØµÙ„</label>';
    html += '<select id="st-class" onchange="window.loadClassStudents(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif">';
    html += '<option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„</option>' + opts + '</select></div>';
    html += '<div><label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Ø§Ù„Ø·Ø§Ù„Ø¨</label>';
    html += '<select id="st-student" disabled onchange="window.showStudentProfile(this.value)" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo,sans-serif">';
    html += '<option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø£ÙˆÙ„Ø§Ù‹</option></select></div>';
    html += '</div></div><div id="st-results"></div>';
    container.innerHTML = html;
}

window.loadClassStudents = async function(classId) {
    var sel = document.getElementById('st-student');
    if (!sel) return;
    sel.disabled = true;
    sel.innerHTML = '<option>Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„</option>';
    if (!classId) {
        sel.innerHTML = '<option>Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø£ÙˆÙ„Ø§Ù‹</option>';
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
        var opts = '<option value="">Ø§Ø®ØªØ± Ø§Ù„Ø·Ø§Ù„Ø¨</option>';
        for (var i = 0; i < names.length; i++) {
            opts += '<option value="' + names[i] + '">' + names[i] + '</option>';
        }
        sel.innerHTML = opts;
        sel.disabled = false;
    } catch (e) {
        sel.innerHTML = '<option>Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„</option>';
    }
};

window.showStudentProfile = async function(name) {
    var results = document.getElementById('st-results');
    if (!results || !name) return;
    results.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>';

    var schoolId = getActiveSchoolId();
    try {
        var allResults = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('studentName', '==', name))),
            getDocs(query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('studentName', '==', name))),
            getDocs(query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('studentName', '==', name))),
            getDocs(query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('studentName', '==', name)))
        ]);

        var attSnap = allResults[0];
        var gateSnap = allResults[1];
        var clinicSnap = allResults[2];
        var behSnap = allResults[3];

        // ===== Ø§Ù„ØºÙŠØ§Ø¨ ÙˆØ§Ù„ØªØ£Ø®Ø± =====
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

        var attRows = '';
        for (var i = 0; i < records.length; i++) {
            var r = records[i];
            var color = r.status === 'absent' ? '#dc2626' : '#d97706';
            var label = r.status === 'absent' ? 'ØºØ§Ø¦Ø¨' : 'Ù…ØªØ£Ø®Ø±';
            attRows += '<tr>';
            attRows += '<td style="padding:8px">' + (r.date || '') + '</td>';
            attRows += '<td style="padding:8px;color:' + color + ';font-weight:800">' + label + '</td>';
            attRows += '<td style="padding:8px">' + (r.period || '-') + '</td>';
            attRows += '<td style="padding:8px;font-size:11px;color:#aaa">' + (r.recordedBy || '-') + '</td>';
            attRows += '</tr>';
        }

        // ===== Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† (Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø±Ø§Øª + Ø§Ù„ØªÙØ§ØµÙŠÙ„) =====
        var gateCount = gateSnap.size;
        var gateRecords = [];
        gateSnap.forEach(function(d) { gateRecords.push(d.data()); });
        gateRecords.sort(function(a, b) {
            var ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
            var tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
        });
        var gateRows = '';
        for (var g = 0; g < gateRecords.length; g++) {
            var gr = gateRecords[g];
            var gDate = gr.createdAt && gr.createdAt.toDate ? gr.createdAt.toDate().toLocaleDateString('ar-KW') : '-';
            gateRows += '<tr>';
            gateRows += '<td style="padding:8px">' + gDate + '</td>';
            gateRows += '<td style="padding:8px">' + (gr.reason || '-') + '</td>';
            gateRows += '<td style="padding:8px">' + (gr.relative || '-') + '</td>';
            gateRows += '</tr>';
        }

        // ===== Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© (Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø±Ø§Øª + Ø§Ù„ØªÙØ§ØµÙŠÙ„) =====
        var clinicCount = clinicSnap.size;
        var clinicRecords = [];
        clinicSnap.forEach(function(d) { clinicRecords.push(d.data()); });
        clinicRecords.sort(function(a, b) {
            var ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
            var tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
        });
        var clinicRows = '';
        for (var c = 0; c < clinicRecords.length; c++) {
            var cr = clinicRecords[c];
            var cDate = cr.createdAt && cr.createdAt.toDate ? cr.createdAt.toDate().toLocaleDateString('ar-KW') : '-';
            clinicRows += '<tr>';
            clinicRows += '<td style="padding:8px">' + cDate + '</td>';
            clinicRows += '<td style="padding:8px">' + (cr.complaint || '-') + '</td>';
            clinicRows += '<td style="padding:8px">' + (cr.treatment || '-') + '</td>';
            clinicRows += '</tr>';
        }

        // ===== Ø§Ù„ØªØ¹Ù‡Ø¯Ø§Øª ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© =====
        var behCount = behSnap.size;
        var pledgeCount = 0;
        var behRecords = [];
        behSnap.forEach(function(d) {
            var b = d.data();
            behRecords.push(b);
            if (b.action === 'ØªØ¹Ù‡Ø¯ Ø®Ø·ÙŠ Ø±Ø³Ù…ÙŠ') pledgeCount++;
        });
        behRecords.sort(function(a, b) {
            var da = a.date || '';
            var db2 = b.date || '';
            return db2.localeCompare(da);
        });
        var behRows = '';
        for (var k = 0; k < behRecords.length; k++) {
            var br = behRecords[k];
            var isPledge = br.action === 'ØªØ¹Ù‡Ø¯ Ø®Ø·ÙŠ Ø±Ø³Ù…ÙŠ';
            var badgeColor = isPledge ? '#dc2626' : '#7c3aed';
            behRows += '<tr>';
            behRows += '<td style="padding:8px">' + (br.date || '') + '</td>';
            behRows += '<td style="padding:8px;color:' + badgeColor + ';font-weight:800;font-size:11px">' + (br.action || '-') + '</td>';
            behRows += '<td style="padding:8px;font-size:12px">' + (br.notes || '-') + '</td>';
            behRows += '<td style="padding:8px;font-size:11px;color:#aaa">' + (br.followUpStatus || '-') + '</td>';
            behRows += '</tr>';
        }

        // ===== Ø¨Ù†Ø§Ø¡ Ø§Ù„ØµÙØ­Ø© =====
        var html = '';
        html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">';
        html += '<div class="card" style="text-align:center"><div style="font-size:26px;font-weight:900;color:#dc2626">' + absent + '</div><div style="font-size:11px;color:#aaa">ØºÙŠØ§Ø¨</div></div>';
        html += '<div class="card" style="text-align:center"><div style="font-size:26px;font-weight:900;color:#d97706">' + late + '</div><div style="font-size:11px;color:#aaa">ØªØ£Ø®Ø±</div></div>';
        html += '<div class="card" style="text-align:center"><div style="font-size:26px;font-weight:900;color:#0891b2">' + gateCount + '</div><div style="font-size:11px;color:#aaa">Ø§Ø³ØªØ¦Ø°Ø§Ù†</div></div>';
        html += '<div class="card" style="text-align:center"><div style="font-size:26px;font-weight:900;color:#16a34a">' + clinicCount + '</div><div style="font-size:11px;color:#aaa">Ø²ÙŠØ§Ø±Ø© Ø¹ÙŠØ§Ø¯Ø©</div></div>';
        html += '</div>';

        if (behCount > 0) {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">';
            html += '<div class="card" style="text-align:center"><div style="font-size:26px;font-weight:900;color:#7c3aed">' + behCount + '</div><div style="font-size:11px;color:#aaa">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©</div></div>';
            html += '<div class="card" style="text-align:center"><div style="font-size:26px;font-weight:900;color:#dc2626">' + pledgeCount + '</div><div style="font-size:11px;color:#aaa">ØªØ¹Ù‡Ø¯ Ø®Ø·ÙŠ Ø±Ø³Ù…ÙŠ</div></div>';
            html += '</div>';
        }

        // ÙƒØ´Ù Ø§Ù„ØºÙŠØ§Ø¨
        html += '<div class="card"><h3 style="margin-bottom:10px">ÙƒØ´Ù Ø§Ù„ØºÙŠØ§Ø¨</h3>';
        if (attRows) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            html += '<tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:8px">Ø§Ù„Ø­Ø§Ù„Ø©</th><th style="padding:8px">Ø§Ù„Ø­ØµØ©</th><th style="padding:8px">Ø³Ø¬Ù„Ù‡Ø§</th></tr>';
            html += attRows;
            html += '</table>';
        } else {
            html += '<div style="text-align:center;padding:20px;color:#aaa">Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØºÙŠØ§Ø¨ Ù…Ø³Ø¬Ù„</div>';
        }
        html += '</div>';

        // Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù†
        html += '<div class="card"><h3 style="margin-bottom:10px">Ø³Ø¬Ù„ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† (' + gateCount + ' Ù…Ø±Ø©)</h3>';
        if (gateRows) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            html += '<tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:8px">Ø§Ù„Ø³Ø¨Ø¨</th><th style="padding:8px">Ø§Ø³ØªÙ„Ù…Ù‡</th></tr>';
            html += gateRows;
            html += '</table>';
        } else {
            html += '<div style="text-align:center;padding:20px;color:#aaa">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø§Ø³ØªØ¦Ø°Ø§Ù† Ù…Ø³Ø¬Ù„</div>';
        }
        html += '</div>';

        // Ø§Ù„Ø¹ÙŠØ§Ø¯Ø©
        html += '<div class="card"><h3 style="margin-bottom:10px">Ø³Ø¬Ù„ Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© (' + clinicCount + ' Ù…Ø±Ø©)</h3>';
        if (clinicRows) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            html += '<tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:8px">Ø§Ù„Ø´ÙƒÙˆÙ‰</th><th style="padding:8px">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th></tr>';
            html += clinicRows;
            html += '</table>';
        } else {
            html += '<div style="text-align:center;padding:20px;color:#aaa">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª Ø¹ÙŠØ§Ø¯Ø© Ù…Ø³Ø¬Ù„Ø©</div>';
        }
        html += '</div>';

        // Ø§Ù„ØªØ¹Ù‡Ø¯Ø§Øª ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©
        html += '<div class="card"><h3 style="margin-bottom:10px">Ø§Ù„ØªØ¹Ù‡Ø¯Ø§Øª ÙˆØ§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ©</h3>';
        if (behRows) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
            html += '<tr style="background:#f0f4f8"><th style="padding:8px;text-align:right">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:8px">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th><th style="padding:8px">Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª</th><th style="padding:8px">Ø§Ù„Ø­Ø§Ù„Ø©</th></tr>';
            html += behRows;
            html += '</table>';
        } else {
            html += '<div style="text-align:center;padding:20px;color:#aaa">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„ Ø³Ù„ÙˆÙƒÙŠ</div>';
        }
        html += '</div>';

        results.innerHTML = html;
    } catch (e) {
        results.innerHTML = '<div style="color:#dc2626;padding:20px">Ø®Ø·Ø£: ' + e.message + '</div>';
    }
};