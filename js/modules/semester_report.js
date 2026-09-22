import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initSemesterReportModule() {
    var container = document.getElementById('tab-semester-report');
    if(!container) return;

    container.innerHTML = `
    <style>
        .sr-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .sr-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .inp{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;transition:border .15s;margin-bottom:10px}
        .inp:focus{border-color:#1a78c2}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
        .btn-primary{background:#0b2545;color:#fff}
        .btn-gold{background:#d4920a;color:#fff}
        .btn-success{background:#16a34a;color:#fff}
        .student-result{background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:10px}
        .kpi-mini{text-align:center;padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px}
        .kpi-mini-val{font-size:20px;font-weight:900}
        .kpi-mini-lbl{font-size:10px;color:#6b7280;font-weight:700}
        .level-bar{height:8px;border-radius:4px;background:#f1f5f9;overflow:hidden;margin-top:4px}
        .level-fill{height:100%;border-radius:4px}
        .search-box{display:flex;gap:8px;margin-bottom:14px}
        .search-box input{flex:1;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-family:Cairo,sans-serif;font-size:14px;outline:none}
        .search-box input:focus{border-color:#1a78c2}
    </style>

    <div class="sr-card">
        <div class="sr-title"><i class="bi bi-file-earmark-text-fill" style="color:#1a78c2"></i> تقرير نهاية الفصل</div>

        <div class="form-row" style="margin-bottom:10px">
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">نوع التقرير</label>
                <select class="inp" id="sr-type" style="margin-bottom:0">
                    <option value="all">كل الطلاب</option>
                    <option value="class">فصل محدد</option>
                    <option value="student">طالب محدد</option>
                    <option value="atrisk">طلاب في خطر فقط</option>
                </select>
            </div>
            <div id="sr-class-wrap">
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">الصف</label>
                <select class="inp" id="sr-class" style="margin-bottom:0">
                    <option value="">كل الصفوف</option>
                </select>
            </div>
        </div>

        <div class="form-row" style="margin-bottom:14px">
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">من تاريخ</label>
                <input type="date" class="inp" id="sr-from" style="margin-bottom:0">
            </div>
            <div>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">إلى تاريخ</label>
                <input type="date" class="inp" id="sr-to" style="margin-bottom:0">
            </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="srGenerate()"><i class="bi bi-graph-up"></i> توليد التقرير</button>
            <button class="btn btn-gold" onclick="srPrintAll()"><i class="bi bi-printer"></i> طباعة الكل</button>
            <button class="btn btn-success" onclick="srExport()"><i class="bi bi-file-excel"></i> Excel</button>
        </div>
    </div>

    <!-- نتائج -->
    <div id="sr-results" style="display:none">
        <div class="sr-card">
            <div class="sr-title"><i class="bi bi-speedometer2" style="color:#d4920a"></i> ملخص الفصل</div>
            <div id="sr-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px"></div>
        </div>
        <div class="sr-card">
            <div class="sr-title"><i class="bi bi-people-fill" style="color:#0b2545"></i> نتائج الطلاب</div>
            <div class="search-box">
                <input type="text" id="sr-search" placeholder="🔍 بحث باسم الطالب..." oninput="srFilter()">
            </div>
            <div id="sr-students-list"></div>
        </div>
    </div>
    `;

    // تعيين التواريخ الافتراضية
    var today = getTodayISO();
    var semStart = new Date(); semStart.setMonth(semStart.getMonth()-5);
    semStart.setMinutes(semStart.getMinutes()-semStart.getTimezoneOffset());
    document.getElementById('sr-from').value = semStart.toISOString().slice(0,10);
    document.getElementById('sr-to').value = today;

    // تحميل الصفوف
    var schoolId = getActiveSchoolId();
    try {
        var studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        var classes = [...new Set(studSnap.docs.map(d=>d.data().classId).filter(Boolean))].sort();
        var sel = document.getElementById('sr-class');
        classes.forEach(c=>{ var o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
    } catch(e){}
}

window.srGenerate = async function() {
    var type = document.getElementById('sr-type')?.value;
    var cls = document.getElementById('sr-class')?.value;
    var from = document.getElementById('sr-from')?.value;
    var to = document.getElementById('sr-to')?.value;
    if(!from||!to){ alert('حدد الفترة الزمنية'); return; }

    var btn = document.querySelector('#tab-semester-report .btn-primary');
    if(btn){ btn.disabled=true; btn.innerHTML='<i class="bi bi-hourglass-split"></i> جاري التوليد...'; }

    var schoolId = getActiveSchoolId();
    try {
        // جلب البيانات
        var [studSnap, attSnap, behSnap, clinicSnap, gateSnap, warnSnap] = await Promise.all([
            getDocs(query(collection(db,'students'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
            getDocs(query(collection(db,'behavior'), where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
            getDocs(query(collection(db,'clinic'), where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
            getDocs(query(collection(db,'gatepass'), where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
            getDocs(query(collection(db,'warnings'), where('schoolId','==',schoolId), where('date','>=',from), where('date','<=',to))),
        ]);

        // بناء بيانات الطلاب
        var students = {};
        studSnap.forEach(d=>{ var r=d.data(); if(cls && r.classId!==cls) return; students[r.name]={name:r.name,class:r.classId||'—',absent:0,late:0,behavior:0,clinic:0,gatepass:0,warnings:0,photo:r.photoURL||null}; });

        attSnap.forEach(d=>{ var r=d.data(); if(students[r.studentName]){ if(r.status==='absent') students[r.studentName].absent++; if(r.status==='late') students[r.studentName].late++; } });
        behSnap.forEach(d=>{ var r=d.data(); if(students[r.studentName]) students[r.studentName].behavior++; });
        clinicSnap.forEach(d=>{ var r=d.data(); if(students[r.studentName]) students[r.studentName].clinic++; });
        gateSnap.forEach(d=>{ var r=d.data(); if(students[r.studentName]) students[r.studentName].gatepass++; });
        warnSnap.forEach(d=>{ var r=d.data(); if(students[r.studentName]) students[r.studentName].warnings++; });

        var list = Object.values(students);
        if(type==='atrisk') list = list.filter(s=>s.absent>=5||s.behavior>=3||s.warnings>0);
        list.sort((a,b)=>b.absent-a.absent);

        window._srData = list;
        srRenderSummary(list);
        srRenderStudents(list);
        document.getElementById('sr-results').style.display='block';
        document.getElementById('sr-results').scrollIntoView({behavior:'smooth'});
    } catch(e){ alert('خطأ: '+e.message); }
    finally { if(btn){ btn.disabled=false; btn.innerHTML='<i class="bi bi-graph-up"></i> توليد التقرير'; } }
};

function srRenderSummary(list) {
    var total = list.length;
    var atRisk = list.filter(s=>s.absent>=5).length;
    var avgAbsent = total>0?Math.round(list.reduce((s,x)=>s+x.absent,0)/total*10)/10:0;
    var totalBeh = list.reduce((s,x)=>s+x.behavior,0);
    var perfect = list.filter(s=>s.absent===0&&s.behavior===0).length;

    document.getElementById('sr-summary').innerHTML = `
        <div class="kpi-mini"><div class="kpi-mini-val" style="color:#0b2545">${total}</div><div class="kpi-mini-lbl">إجمالي الطلاب</div></div>
        <div class="kpi-mini"><div class="kpi-mini-val" style="color:#dc2626">${atRisk}</div><div class="kpi-mini-lbl">في خطر (5+)</div></div>
        <div class="kpi-mini"><div class="kpi-mini-val" style="color:#d97706">${avgAbsent}</div><div class="kpi-mini-lbl">متوسط الغياب</div></div>
        <div class="kpi-mini"><div class="kpi-mini-val" style="color:#7c3aed">${totalBeh}</div><div class="kpi-mini-lbl">حوادث سلوكية</div></div>
        <div class="kpi-mini"><div class="kpi-mini-val" style="color:#16a34a">${perfect}</div><div class="kpi-mini-lbl">بدون غياب أو سلوك</div></div>`;
}

function srRenderStudents(list) {
    var el = document.getElementById('sr-students-list');
    if(!el) return;
    if(!list.length){ el.innerHTML='<div style="text-align:center;padding:30px;color:#6b7280">لا توجد بيانات</div>'; return; }

    el.innerHTML = list.map((s,i)=>{
        var risk = s.absent>=10?'🔴 حرمان':s.absent>=8?'🟠 إنذار':s.absent>=5?'🟡 استدعاء':s.warnings>0?'⚠️ إنذار رسمي':s.behavior>=3?'🟣 متابعة سلوكية':'✅ طبيعي';
        var riskColor = s.absent>=5||s.warnings>0?'#dc2626':s.behavior>=3?'#7c3aed':'#16a34a';
        var absPct = Math.min(s.absent/20*100,100);
        return `<div class="student-result">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:10px">
                    ${s.photo?`<img src="${s.photo}" style="width:40px;height:50px;border-radius:6px;object-fit:cover;border:2px solid #e5e7eb">`:'<div style="width:40px;height:50px;border-radius:6px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px">👤</div>'}
                    <div>
                        <div style="font-size:15px;font-weight:900;color:#0b2545">${s.name}</div>
                        <div style="font-size:12px;color:#6b7280">${s.class}</div>
                    </div>
                </div>
                <span style="color:${riskColor};font-weight:700;font-size:13px">${risk}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px">
                <div class="kpi-mini"><div class="kpi-mini-val" style="color:#dc2626;font-size:16px">${s.absent}</div><div class="kpi-mini-lbl">غياب</div></div>
                <div class="kpi-mini"><div class="kpi-mini-val" style="color:#d97706;font-size:16px">${s.late}</div><div class="kpi-mini-lbl">تأخر</div></div>
                <div class="kpi-mini"><div class="kpi-mini-val" style="color:#7c3aed;font-size:16px">${s.behavior}</div><div class="kpi-mini-lbl">سلوك</div></div>
                <div class="kpi-mini"><div class="kpi-mini-val" style="color:#0891b2;font-size:16px">${s.clinic}</div><div class="kpi-mini-lbl">عيادة</div></div>
                <div class="kpi-mini"><div class="kpi-mini-val" style="color:#ea580c;font-size:16px">${s.gatepass}</div><div class="kpi-mini-lbl">استئذان</div></div>
            </div>
            <div class="level-bar"><div class="level-fill" style="width:${absPct}%;background:${absPct>60?'#dc2626':absPct>30?'#d97706':'#16a34a'}"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px">
                <span style="font-size:11px;color:#6b7280">مستوى الغياب</span>
                <button onclick="srPrintStudent('${s.name}')" style="background:none;border:none;color:#1a78c2;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer"><i class="bi bi-printer"></i> طباعة ملفه</button>
            </div>
        </div>`;
    }).join('');
}

window.srFilter = function() {
    var q = document.getElementById('sr-search')?.value.toLowerCase();
    if(!q) { srRenderStudents(window._srData||[]); return; }
    srRenderStudents((window._srData||[]).filter(s=>(s.name||'').toLowerCase().includes(q)));
};

window.srPrintStudent = function(name) {
    var s = (window._srData||[]).find(x=>x.name===name);
    if(!s) return;
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var from = document.getElementById('sr-from')?.value;
    var to = document.getElementById('sr-to')?.value;
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:20px;font-size:12px}
    .box{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center;display:inline-block;margin:4px;min-width:80px}
    @page{size:A4;margin:12mm}</style></head><body>
    <div style="border-bottom:3px double #0b2545;margin-bottom:16px;padding-bottom:10px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:11px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center">
            <div style="font-size:16px;font-weight:900;color:#0b2545">تقرير نهاية الفصل</div>
            <div style="font-size:14px;font-weight:700">${s.name}</div>
        </div>
        <div style="font-size:11px;text-align:left">
            ${s.photo?`<img src="${s.photo}" style="width:60px;height:75px;object-fit:cover;border-radius:6px;border:2px solid #0b2545">`:user.schoolName||''}
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div class="box"><strong>الصف:</strong> ${s.class}</div>
        <div class="box"><strong>الفترة:</strong> ${from} — ${to}</div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;justify-content:center">
        <div class="box"><div style="font-size:24px;font-weight:900;color:#dc2626">${s.absent}</div><div>أيام الغياب</div></div>
        <div class="box"><div style="font-size:24px;font-weight:900;color:#d97706">${s.late}</div><div>حالات التأخر</div></div>
        <div class="box"><div style="font-size:24px;font-weight:900;color:#7c3aed">${s.behavior}</div><div>حوادث سلوكية</div></div>
        <div class="box"><div style="font-size:24px;font-weight:900;color:#0891b2">${s.clinic}</div><div>زيارات العيادة</div></div>
        <div class="box"><div style="font-size:24px;font-weight:900;color:#ea580c">${s.gatepass}</div><div>استئذانات</div></div>
    </div>
    <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:11px">
        <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:120px">توقيع المرشد<br>______________</div>
        <div style="text-align:center;font-size:10px;color:#aaa">المنظومة الرقمية</div>
        <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:120px">توقيع المدير<br>______________</div>
    </div>
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b=new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

window.srPrintAll = function() {
    var list = window._srData||[];
    if(!list.length){ alert('ولّد التقرير أولاً'); return; }
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var from = document.getElementById('sr-from')?.value;
    var to = document.getElementById('sr-to')?.value;
    var rows = list.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${s.class}</td><td style="color:#dc2626">${s.absent}</td><td style="color:#d97706">${s.late}</td><td style="color:#7c3aed">${s.behavior}</td><td style="color:#0891b2">${s.clinic}</td><td style="color:#ea580c">${s.gatepass}</td></tr>`).join('');
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right}td{padding:7px;border:1px solid #ddd}@page{size:A4;margin:10mm}</style>
    </head><body>
    <div style="border-bottom:3px solid #0b2545;margin-bottom:14px;padding-bottom:10px;display:flex;justify-content:space-between">
        <div style="font-size:11px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center;font-size:15px;font-weight:900;color:#0b2545">تقرير نهاية الفصل<br><span style="font-size:12px">${from} — ${to}</span></div>
        <div style="font-size:11px;text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
    </div>
    <table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>غياب</th><th>تأخر</th><th>سلوك</th><th>عيادة</th><th>استئذان</th></tr></thead><tbody>${rows}</tbody></table>
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b=new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

window.srExport = function() {
    if(!window.XLSX){ alert('مكتبة Excel غير محملة'); return; }
    var list = window._srData||[];
    var rows=[['الطالب','الصف','الغياب','التأخر','السلوك','العيادة','الاستئذان']];
    list.forEach(s=>rows.push([s.name,s.class,s.absent,s.late,s.behavior,s.clinic,s.gatepass]));
    var wb=XLSX.utils.book_new();
    var ws=XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,'تقرير نهاية الفصل',ws);
    XLSX.writeFile(wb,'semester_report.xlsx');
};
