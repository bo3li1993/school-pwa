import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initWarningsModule() {
    const container = document.getElementById('tab-warnings');
    if(!container) return;

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0">
                <i class="bi bi-exclamation-triangle-fill" style="color:#d97706"></i> الإنذارات الرسمية
            </h2>
            <button onclick="window.showNewWarning()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">
                <i class="bi bi-plus-lg"></i> إصدار إنذار
            </button>
        </div>

        <!-- إصدار إنذار جديد -->
        <div id="warn-new-form" style="display:none;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px">
            <h3 style="font-size:14px;font-weight:900;margin-bottom:14px">📋 إصدار إنذار غياب</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">الفصل</label>
                    <select id="warn-class" onchange="window.loadWarningStudents()" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                        <option value="">اختر الفصل</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">الطالب</label>
                    <select id="warn-student" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                        <option value="">اختر الطالب</option>
                    </select>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">مستوى الإنذار</label>
                    <select id="warn-level" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                        <option value="1">إنذار أول</option>
                        <option value="2">إنذار ثاني</option>
                        <option value="3">إنذار نهائي</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">عدد أيام الغياب</label>
                    <input type="number" id="warn-days" value="5" min="1" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px">
                </div>
            </div>
            <div style="margin-bottom:12px">
                <label style="font-size:11px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px">ملاحظات (اختياري)</label>
                <textarea id="warn-notes" rows="2" placeholder="أي ملاحظات إضافية..." style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;resize:none"></textarea>
            </div>
            <div style="display:flex;gap:8px">
                <button onclick="window.saveWarning()" style="flex:1;background:var(--navy);color:#fff;border:none;padding:11px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;cursor:pointer">
                    <i class="bi bi-check-circle-fill"></i> حفظ الإنذار
                </button>
                <button onclick="window.saveAndPrintWarning()" style="flex:1;background:#d97706;color:#fff;border:none;padding:11px;border-radius:8px;font-family:'Cairo',sans-serif;font-weight:800;font-size:13px;cursor:pointer">
                    <i class="bi bi-printer-fill"></i> حفظ وطباعة
                </button>
            </div>
        </div>

        <!-- قائمة الإنذارات -->
        <div id="warn-list" style="background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden">
            <div style="text-align:center;padding:40px;color:#aaa;font-weight:700">⏳ جاري التحميل...</div>
        </div>
    </div>`;

    loadWarnings();
    loadWarningClasses();
}

async function loadWarningClasses() {
    try {
        const snap = await getDocs(query(collection(db,'students'), where('schoolId','==',getActiveSchoolId())));
        const classes = [...new Set(snap.docs.map(d => d.data().classId).filter(Boolean))].sort((a,b) => {
            var pa=a.split('/'),pb=b.split('/');
            return (parseInt(pa[0])||0)-(parseInt(pb[0])||0)||(parseInt(pa[1])||0)-(parseInt(pb[1])||0);
        });
        var sel = document.getElementById('warn-class');
        if(sel) sel.innerHTML = '<option value="">اختر الفصل</option>' + classes.map(c => '<option value="'+c+'">'+c+'</option>').join('');
    } catch(e) {}
}

window.loadWarningStudents = async function() {
    var classId = document.getElementById('warn-class')?.value;
    var sel = document.getElementById('warn-student');
    if(!classId || !sel) return;
    try {
        const snap = await getDocs(query(collection(db,'students'), where('schoolId','==',getActiveSchoolId()), where('classId','==',classId)));
        var students = snap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = '<option value="">اختر الطالب</option>' + students.map(n => '<option value="'+n+'">'+n+'</option>').join('');
    } catch(e) {}
};

window.showNewWarning = function() {
    var form = document.getElementById('warn-new-form');
    if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.saveWarning = async function(andPrint) {
    var student = document.getElementById('warn-student')?.value;
    var classId = document.getElementById('warn-class')?.value;
    var level   = document.getElementById('warn-level')?.value;
    var days    = document.getElementById('warn-days')?.value;
    var notes   = document.getElementById('warn-notes')?.value?.trim();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');

    if(!student || !classId) { window.showToast?.('اختر الفصل والطالب','warning'); return; }

    try {
        var data = {
            schoolId: getActiveSchoolId(),
            studentName: student,
            classId: classId,
            level: parseInt(level),
            absentDays: parseInt(days),
            notes: notes || '',
            issuedBy: me.name || '',
            issuedAt: serverTimestamp(),
            date: getTodayISO()
        };
        await addDoc(collection(db,'warnings'), data);
        window.showToast?.('✅ تم إصدار الإنذار');
        document.getElementById('warn-new-form').style.display = 'none';
        loadWarnings();

        if(andPrint) printWarningDoc(data);
    } catch(e) { window.showToast?.('❌ '+e.message,'error'); }
};

window.saveAndPrintWarning = function() { window.saveWarning(true); };

function printWarningDoc(data) {
    var levelText = data.level===1?'الأول':data.level===2?'الثاني':'النهائي';
    var content = '<div style="text-align:center;margin:30px 0 20px"><h2 style="font-size:20px;color:#d97706">⚠️ إنذار غياب '+levelText+'</h2></div>' +
        '<table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:10px;border:1px solid #ddd;font-weight:800;width:30%">اسم الطالب</td><td style="padding:10px;border:1px solid #ddd">'+data.studentName+'</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">الفصل</td><td style="padding:10px;border:1px solid #ddd">'+data.classId+'</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">عدد أيام الغياب</td><td style="padding:10px;border:1px solid #ddd">'+data.absentDays+' يوم</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">مستوى الإنذار</td><td style="padding:10px;border:1px solid #ddd;color:#d97706;font-weight:900">'+levelText+'</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">التاريخ</td><td style="padding:10px;border:1px solid #ddd">'+data.date+'</td></tr>' +
        (data.notes ? '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">ملاحظات</td><td style="padding:10px;border:1px solid #ddd">'+data.notes+'</td></tr>' : '') +
        '</table>' +
        '<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px"><div>توقيع ولي الأمر: ______________</div><div>توقيع المدير: ______________</div></div>';

    if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'إنذار غياب '+levelText, data.studentName+' — '+data.classId);
}

async function loadWarnings() {
    var list = document.getElementById('warn-list');
    if(!list) return;
    try {
        var snap = await getDocs(query(collection(db,'warnings'), where('schoolId','==',getActiveSchoolId())));
        if(snap.empty) { list.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-weight:700">📭 لا توجد إنذارات</div>'; return; }

        var warnings = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.issuedAt?.toMillis?.()||0)-(a.issuedAt?.toMillis?.()||0));
        var levelColors = {1:'#d97706',2:'#ea580c',3:'#dc2626'};
        var levelText = {1:'أول',2:'ثاني',3:'نهائي'};

        list.innerHTML = warnings.map(w => {
            var time = w.issuedAt?.toDate?.();
            var timeStr = time ? time.toLocaleDateString('ar-KW') : w.date||'';
            return '<div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #f0f2f5;gap:12px">' +
                '<div style="width:40px;height:40px;border-radius:10px;background:'+(levelColors[w.level]||'#d97706')+'22;color:'+(levelColors[w.level]||'#d97706')+';display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px">'+w.level+'</div>' +
                '<div style="flex:1"><div style="font-weight:800;font-size:13px;color:#111">'+w.studentName+' — '+w.classId+'</div>' +
                '<div style="font-size:11px;color:var(--mid)">إنذار '+(levelText[w.level]||'')+' | '+w.absentDays+' يوم غياب | '+timeStr+'</div></div>' +
                '<button onclick="window.reprintWarning(\''+w.id+'\')" style="background:none;border:1px solid var(--line);padding:6px 10px;border-radius:6px;font-size:11px;cursor:pointer"><i class="bi bi-printer"></i></button>' +
                '</div>';
        }).join('');
    } catch(e) { list.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;font-weight:700">❌ '+e.message+'</div>'; }
}

window.reprintWarning = async function(id) {
    try {
        const snap = await getDocs(query(collection(db,'warnings'), where('__name__','==',id)));
        if(!snap.empty) {
            const data = snap.docs[0].data();
            var levelText = data.level===1?'الأول':data.level===2?'الثاني':'النهائي';
            var content = '<div style="text-align:center;margin:30px 0 20px"><h2 style="font-size:20px;color:#d97706">⚠️ إنذار غياب '+levelText+'</h2></div>' +
                '<table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:10px;border:1px solid #ddd;font-weight:800;width:30%">اسم الطالب</td><td style="padding:10px;border:1px solid #ddd">'+data.studentName+'</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">الفصل</td><td style="padding:10px;border:1px solid #ddd">'+data.classId+'</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">عدد أيام الغياب</td><td style="padding:10px;border:1px solid #ddd">'+data.absentDays+' يوم</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">مستوى الإنذار</td><td style="padding:10px;border:1px solid #ddd;color:#d97706;font-weight:900">'+levelText+'</td></tr>' +
                '<tr><td style="padding:10px;border:1px solid #ddd;font-weight:800">التاريخ</td><td style="padding:10px;border:1px solid #ddd">'+(data.date||'')+'</td></tr></table>' +
                '<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px"><div>توقيع ولي الأمر: ______________</div><div>توقيع المدير: ______________</div></div>';
            if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'إنذار غياب '+levelText, data.studentName+' — '+data.classId);
        }
    } catch(e) { if(window.showToast) window.showToast('❌ '+e.message,'error'); }
};
window._oldReprintWarning = async function(id) {
    try {
        var { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var snap = await getDoc(doc(db,'warnings',id));
        if(snap.exists()) printWarningDoc(snap.data());
    } catch(e) {}
};

window.editWarning = async function(id) {
    try {
        const snap = await getDocs(query(collection(db,'warnings'), where('__name__','==',id)));
        if(snap.empty) return;
        const data = snap.docs[0].data();
        const newDays = prompt('عدد أيام الغياب:', data.absentDays);
        if(!newDays) return;
        const newLevel = prompt('مستوى الإنذار (1=أول، 2=ثاني، 3=نهائي):', data.level);
        if(!newLevel) return;
        const newNotes = prompt('ملاحظات:', data.notes||'');
        
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        await updateDoc(doc(db,'warnings',id), {
            absentDays: parseInt(newDays),
            level: parseInt(newLevel),
            notes: newNotes || ''
        });
        window.showToast?.('✅ تم التعديل');
        loadWarnings();
    } catch(e) { window.showToast?.('❌ '+e.message,'error'); }
};