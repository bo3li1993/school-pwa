import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, updateDoc, doc, query, where, addDoc, serverTimestamp, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initStudentDistributionModule() {
    var container = document.getElementById('tab-distribution');
    if (!container) return;
    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .sd-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-bottom:14px}
        .sd-title{font-size:14px;font-weight:900;color:#0b2545;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .sd-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:10px;padding:4px;margin-bottom:16px}
        .sd-tab{flex:1;padding:8px;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s}
        .sd-tab.active{background:#fff;color:#0b2545;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .sd-panel{display:none}.sd-panel.active{display:block}
        .class-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:14px}
        .class-box{border:2px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:all .2s}
        .class-box:hover{border-color:#1a78c2;background:#eaf4fd}
        .class-box.selected{border-color:#1a78c2;background:#eaf4fd}
        .class-box.heavy{border-color:#dc2626;background:#fef2f2}
        .class-box.light{border-color:#16a34a;background:#f0fdf4}
        .class-num{font-size:24px;font-weight:900;color:#0b2545}
        .class-name{font-size:13px;font-weight:700;color:#374151}
        .class-count{font-size:11px;color:#6b7280;margin-top:2px}
        .inp{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;transition:border .15s;margin-bottom:10px}
        .inp:focus{border-color:#1a78c2}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
        .btn-primary{background:#0b2545;color:#fff}
        .btn-success{background:#16a34a;color:#fff}
        .btn-danger{background:#dc2626;color:#fff}
        .btn-gold{background:#d4920a;color:#fff}
        .btn-outline{background:transparent;border:1.5px solid #1a78c2;color:#1a78c2}
        .btn-sm{padding:6px 12px;font-size:12px}
        .student-row{display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .student-row:hover{background:#f8fafc}
        .student-cb{width:16px;height:16px;cursor:pointer}
        .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .badge-blue{background:#dbeafe;color:#1d4ed8}
        .badge-green{background:#dcfce7;color:#15803d}
        .tbl{width:100%;border-collapse:collapse;font-size:13px}
        .tbl th{background:#0b2545;color:#fff;padding:10px 12px;text-align:right;font-weight:700}
        .tbl td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
        .tbl tr:hover td{background:#f8fafc}
        .bar-wrap{height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;margin-top:4px}
        .bar-fill{height:100%;border-radius:4px;transition:width .5s}
        .search-wrap{position:relative;margin-bottom:10px}
        .search-wrap input{padding-right:36px}
        .search-icon{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6b7280}
    </style>

    <div class="sd-tabs">
        <button class="sd-tab active" onclick="sdTab('sd-overview',this)">📊 نظرة عامة</button>
        <button class="sd-tab" onclick="sdTab('sd-transfer',this)">🔄 نقل طالب</button>
        <button class="sd-tab" onclick="sdTab('sd-bulk',this)">👥 نقل جماعي</button>
        <button class="sd-tab" onclick="sdTab('sd-auto',this)">🤖 توزيع تلقائي</button>
        <button class="sd-tab" onclick="sdTab('sd-log',this);sdLoadLog()">📋 سجل التغييرات</button>
    </div>

    <!-- نظرة عامة -->
    <div class="sd-panel active" id="sd-overview">
        <div class="sd-card">
            <div class="sd-title">📊 توزيع الطلاب على الفصول</div>
            <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
                <div style="background:#f1f5f9;border-radius:8px;padding:12px 18px;text-align:center;flex:1;min-width:100px">
                    <div style="font-size:28px;font-weight:900;color:#0b2545" id="sd-total-students">-</div>
                    <div style="font-size:11px;color:#6b7280;font-weight:700">إجمالي الطلاب</div>
                </div>
                <div style="background:#f1f5f9;border-radius:8px;padding:12px 18px;text-align:center;flex:1;min-width:100px">
                    <div style="font-size:28px;font-weight:900;color:#0b2545" id="sd-total-classes">-</div>
                    <div style="font-size:11px;color:#6b7280;font-weight:700">عدد الفصول</div>
                </div>
                <div style="background:#f1f5f9;border-radius:8px;padding:12px 18px;text-align:center;flex:1;min-width:100px">
                    <div style="font-size:28px;font-weight:900;color:#0b2545" id="sd-avg">-</div>
                    <div style="font-size:11px;color:#6b7280;font-weight:700">متوسط الفصل</div>
                </div>
                <div style="background:#fee2e2;border-radius:8px;padding:12px 18px;text-align:center;flex:1;min-width:100px">
                    <div style="font-size:28px;font-weight:900;color:#dc2626" id="sd-max">-</div>
                    <div style="font-size:11px;color:#dc2626;font-weight:700">أكبر فصل</div>
                </div>
                <div style="background:#dcfce7;border-radius:8px;padding:12px 18px;text-align:center;flex:1;min-width:100px">
                    <div style="font-size:28px;font-weight:900;color:#16a34a" id="sd-min">-</div>
                    <div style="font-size:11px;color:#16a34a;font-weight:700">أصغر فصل</div>
                </div>
            </div>
            <div class="class-grid" id="sd-class-grid">
                <div style="text-align:center;padding:20px;color:#6b7280;grid-column:1/-1">⏳ جاري التحميل...</div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn btn-gold btn-sm" onclick="sdExportExcel()"><i class="bi bi-file-earmark-excel"></i> تصدير Excel</button>
                <button class="btn btn-outline btn-sm" onclick="sdRefresh()"><i class="bi bi-arrow-clockwise"></i> تحديث</button>
            </div>
        </div>

        <!-- جدول تفصيلي -->
        <div class="sd-card">
            <div class="sd-title">📋 تفاصيل الفصول</div>
            <div style="overflow-x:auto">
                <table class="tbl">
                    <thead><tr><th>#</th><th>الفصل</th><th>عدد الطلاب</th><th>التوزيع</th><th>الحالة</th></tr></thead>
                    <tbody id="sd-detail-tbody"><tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa">⏳</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- نقل طالب -->
    <div class="sd-panel" id="sd-transfer">
        <div class="sd-card">
            <div class="sd-title">🔄 نقل طالب من فصل لآخر</div>
            <div class="search-wrap">
                <input class="inp" id="sd-search-student" placeholder="ابحث باسم الطالب..." oninput="sdSearchStudent(this.value)" style="margin-bottom:0">
                <span class="search-icon">🔍</span>
            </div>
            <div id="sd-search-results" style="max-height:200px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;display:none"></div>

            <div id="sd-selected-student" style="display:none;background:#eaf4fd;border:1.5px solid #1a78c2;border-radius:8px;padding:12px;margin-bottom:12px">
                <div style="font-weight:900;font-size:14px" id="sd-sel-name"></div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px">الفصل الحالي: <span id="sd-sel-class" style="font-weight:700;color:#0b2545"></span></div>
            </div>

            <div id="sd-transfer-form" style="display:none">
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">الفصل الجديد</label>
                <select class="inp" id="sd-new-class">
                    <option value="">-- اختر الفصل --</option>
                </select>
                <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">سبب النقل (اختياري)</label>
                <input class="inp" id="sd-transfer-reason" placeholder="مثال: طلب ولي الأمر، تعديل توزيع...">
                <button class="btn btn-success" style="width:100%" onclick="sdTransferStudent()">✅ تأكيد النقل</button>
            </div>
        </div>
    </div>

    <!-- نقل جماعي -->
    <div class="sd-panel" id="sd-bulk">
        <div class="sd-card">
            <div class="sd-title">👥 نقل جماعي للطلاب</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">من الفصل</label>
                    <select class="inp" id="sd-bulk-from" onchange="sdLoadBulkStudents()" style="margin-bottom:0">
                        <option value="">-- اختر --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">إلى الفصل</label>
                    <select class="inp" id="sd-bulk-to" style="margin-bottom:0">
                        <option value="">-- اختر --</option>
                    </select>
                </div>
            </div>
            <div id="sd-bulk-students" style="max-height:300px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:12px">
                <div style="text-align:center;color:#6b7280;padding:20px">اختر الفصل المصدر أولاً</div>
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-outline btn-sm" onclick="sdSelectAll()">تحديد الكل</button>
                <button class="btn btn-outline btn-sm" onclick="sdDeselectAll()">إلغاء الكل</button>
                <button class="btn btn-success" style="flex:1" onclick="sdBulkTransfer()">✅ نقل المحددين</button>
            </div>
        </div>
    </div>

    <!-- توزيع تلقائي -->
    <div class="sd-panel" id="sd-auto">
        <div class="sd-card">
            <div class="sd-title">🤖 التوزيع التلقائي المقترح</div>
            <p style="font-size:13px;color:#6b7280;margin-bottom:14px">يحلل النظام أعداد الطلاب في كل فصل ويقترح نقلات لتوازن الأعداد تلقائياً.</p>
            <button class="btn btn-primary" onclick="sdAutoSuggest()">🔍 تحليل واقتراح التوزيع</button>
            <div id="sd-auto-result" style="margin-top:14px"></div>
        </div>
    </div>

    <!-- سجل التغييرات -->
    <div class="sd-panel" id="sd-log">
        <div class="sd-card">
            <div class="sd-title">📋 سجل نقل الطلاب</div>
            <div style="overflow-x:auto">
                <table class="tbl">
                    <thead><tr><th>التاريخ</th><th>الطالب</th><th>من</th><th>إلى</th><th>السبب</th><th>بواسطة</th></tr></thead>
                    <tbody id="sd-log-tbody"><tr><td colspan="6" style="text-align:center;padding:20px;color:#aaa">⏳ جاري التحميل...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Modal تأكيد -->
    <div id="sd-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center">
        <div style="background:#fff;border-radius:14px;padding:24px;width:90%;max-width:400px">
            <div style="font-size:16px;font-weight:900;color:#0b2545;margin-bottom:12px" id="sd-modal-title"></div>
            <div style="font-size:13px;color:#6b7280;margin-bottom:16px" id="sd-modal-body"></div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-success" style="flex:1" id="sd-modal-ok">تأكيد</button>
                <button class="btn" style="background:#f1f5f9;color:#374151;flex:1" onclick="document.getElementById('sd-modal').style.display='none'">إلغاء</button>
            </div>
        </div>
    </div>
    `;

    // تحميل البيانات
    await sdRefresh();
    sdPopulateClassSelects();
}

// === بيانات مشتركة ===
var _sdStudents = [];
var _sdClasses = {};
var _sdSelectedStudent = null;
var _sdSchoolId = null;

async function sdRefresh() {
    _sdSchoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',_sdSchoolId)));
        _sdStudents = snap.docs.map(d=>({id:d.id,...d.data()}));
        
        // تجميع الفصول
        _sdClasses = {};
        _sdStudents.forEach(s => {
            var c = s.classId || 'غير محدد';
            if(!_sdClasses[c]) _sdClasses[c] = [];
            _sdClasses[c].push(s);
        });

        sdRenderOverview();
    } catch(e) {
        console.error('sdRefresh error:', e);
    }
}

function sdRenderOverview() {
    var classes = Object.entries(_sdClasses).sort((a,b)=>a[0].localeCompare(b[0],'ar'));
    var counts = classes.map(([,s])=>s.length);
    var total = _sdStudents.length;
    var avg = classes.length ? Math.round(total/classes.length) : 0;
    var max = counts.length ? Math.max(...counts) : 0;
    var min = counts.length ? Math.min(...counts) : 0;

    var el = id => document.getElementById(id);
    if(el('sd-total-students')) el('sd-total-students').textContent = total;
    if(el('sd-total-classes')) el('sd-total-classes').textContent = classes.length;
    if(el('sd-avg')) el('sd-avg').textContent = avg;
    if(el('sd-max')) el('sd-max').textContent = max;
    if(el('sd-min')) el('sd-min').textContent = min;

    // بطاقات الفصول
    var grid = el('sd-class-grid');
    if(grid) {
        grid.innerHTML = classes.map(([name, students])=>{
            var count = students.length;
            var pct = max > 0 ? Math.round(count/max*100) : 0;
            var cls = count >= max*0.9 ? 'heavy' : count <= min*1.1 ? 'light' : '';
            var color = cls==='heavy'?'#dc2626':cls==='light'?'#16a34a':'#1a78c2';
            return `<div class="class-box ${cls}" onclick="sdShowClassStudents('${name}')">
                <div class="class-num" style="color:${color}">${count}</div>
                <div class="class-name">الفصل ${name}</div>
                <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
            </div>`;
        }).join('') || '<div style="text-align:center;padding:20px;color:#6b7280;grid-column:1/-1">لا يوجد طلاب</div>';
    }

    // جدول تفصيلي
    var tbody = el('sd-detail-tbody');
    if(tbody) {
        tbody.innerHTML = classes.map(([name,students],i)=>{
            var count = students.length;
            var pct = max>0?Math.round(count/max*100):0;
            var color = count>=max*0.9?'#dc2626':count<=min*1.1?'#16a34a':'#1a78c2';
            var status = count>=max*0.9?'<span class="badge" style="background:#fee2e2;color:#dc2626">مكتظ</span>':
                         count<=min*1.1?'<span class="badge" style="background:#dcfce7;color:#16a34a">متاح</span>':
                         '<span class="badge badge-blue">طبيعي</span>';
            return `<tr>
                <td style="color:#6b7280">${i+1}</td>
                <td style="font-weight:900">${name}</td>
                <td style="font-weight:700;color:${color}">${count} طالب</td>
                <td style="width:150px">
                    <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
                    <span style="font-size:10px;color:#6b7280">${pct}% من الأكبر</span>
                </td>
                <td>${status}</td>
            </tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa">لا يوجد بيانات</td></tr>';
    }
}

function sdPopulateClassSelects() {
    var classes = Object.keys(_sdClasses).sort((a,b)=>a.localeCompare(b,'ar'));
    var opts = '<option value="">-- اختر الفصل --</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join('');
    ['sd-new-class','sd-bulk-from','sd-bulk-to'].forEach(id=>{
        var el = document.getElementById(id);
        if(el) el.innerHTML = opts;
    });
}

// === بحث الطلاب ===
window.sdSearchStudent = function(q) {
    var res = document.getElementById('sd-search-results');
    if(!q || q.length < 2) { res.style.display='none'; return; }
    var matches = _sdStudents.filter(s=>s.name&&s.name.includes(q)).slice(0,10);
    if(!matches.length) { res.style.display='none'; return; }
    res.style.display='block';
    res.innerHTML = matches.map(s=>`
        <div class="student-row" style="cursor:pointer" onclick="sdSelectStudent('${s.id}')">
            <span style="font-weight:700">${s.name}</span>
            <span class="badge badge-blue" style="margin-right:auto">${s.classId||'غير محدد'}</span>
        </div>`).join('');
};

window.sdSelectStudent = function(id) {
    _sdSelectedStudent = _sdStudents.find(s=>s.id===id);
    if(!_sdSelectedStudent) return;
    document.getElementById('sd-search-results').style.display='none';
    document.getElementById('sd-search-student').value = _sdSelectedStudent.name;
    document.getElementById('sd-sel-name').textContent = _sdSelectedStudent.name;
    document.getElementById('sd-sel-class').textContent = _sdSelectedStudent.classId || 'غير محدد';
    document.getElementById('sd-selected-student').style.display='block';
    document.getElementById('sd-transfer-form').style.display='block';
};

window.sdTransferStudent = async function() {
    if(!_sdSelectedStudent) return;
    var newClass = document.getElementById('sd-new-class').value;
    var reason = document.getElementById('sd-transfer-reason').value.trim();
    if(!newClass) { if(window.showToast) window.showToast('اختر الفصل الجديد','error'); return; }
    if(newClass === _sdSelectedStudent.classId) { if(window.showToast) window.showToast('الفصل نفسه!','error'); return; }

    var modal = document.getElementById('sd-modal');
    document.getElementById('sd-modal-title').textContent = 'تأكيد نقل الطالب';
    document.getElementById('sd-modal-body').textContent = `نقل "${_sdSelectedStudent.name}" من ${_sdSelectedStudent.classId} إلى ${newClass}`;
    modal.style.display='flex';
    document.getElementById('sd-modal-ok').onclick = async function() {
        modal.style.display='none';
        try {
            var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
            var oldClass = _sdSelectedStudent.classId;
            await updateDoc(doc(db,'students',_sdSelectedStudent.id), {classId: newClass});
            await addDoc(collection(db,'student_transfers'), {
                schoolId: _sdSchoolId,
                studentId: _sdSelectedStudent.id,
                studentName: _sdSelectedStudent.name,
                fromClass: oldClass,
                toClass: newClass,
                reason: reason || '',
                transferredBy: me.name || 'مجهول',
                createdAt: serverTimestamp()
            });
            if(window.showToast) window.showToast('✅ تم نقل الطالب بنجاح','success');
            _sdSelectedStudent.classId = newClass;
            document.getElementById('sd-sel-class').textContent = newClass;
            document.getElementById('sd-transfer-reason').value='';
            await sdRefresh();
            sdPopulateClassSelects();
        } catch(e) { if(window.showToast) window.showToast('❌ '+e.message,'error'); }
    };
};

// === نقل جماعي ===
window.sdLoadBulkStudents = function() {
    var fromClass = document.getElementById('sd-bulk-from').value;
    var container = document.getElementById('sd-bulk-students');
    if(!fromClass) { container.innerHTML='<div style="text-align:center;color:#6b7280;padding:20px">اختر الفصل المصدر</div>'; return; }
    var students = _sdClasses[fromClass] || [];
    container.innerHTML = students.map(s=>`
        <div class="student-row">
            <input type="checkbox" class="student-cb bulk-cb" value="${s.id}" data-name="${s.name}">
            <span style="font-weight:700;flex:1">${s.name}</span>
            <span style="font-size:11px;color:#6b7280">${s.studentId||''}</span>
        </div>`).join('') || '<div style="text-align:center;color:#6b7280;padding:20px">لا يوجد طلاب في هذا الفصل</div>';
};

window.sdSelectAll = function() { document.querySelectorAll('.bulk-cb').forEach(cb=>cb.checked=true); };
window.sdDeselectAll = function() { document.querySelectorAll('.bulk-cb').forEach(cb=>cb.checked=false); };

window.sdBulkTransfer = async function() {
    var fromClass = document.getElementById('sd-bulk-from').value;
    var toClass = document.getElementById('sd-bulk-to').value;
    var selected = [...document.querySelectorAll('.bulk-cb:checked')];
    if(!fromClass||!toClass) { if(window.showToast) window.showToast('اختر الفصلين','error'); return; }
    if(fromClass===toClass) { if(window.showToast) window.showToast('الفصل نفسه!','error'); return; }
    if(!selected.length) { if(window.showToast) window.showToast('اختر طلاباً للنقل','error'); return; }

    var modal = document.getElementById('sd-modal');
    document.getElementById('sd-modal-title').textContent = 'تأكيد النقل الجماعي';
    document.getElementById('sd-modal-body').textContent = `نقل ${selected.length} طالب من ${fromClass} إلى ${toClass}`;
    modal.style.display='flex';
    document.getElementById('sd-modal-ok').onclick = async function() {
        modal.style.display='none';
        var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
        var success = 0;
        for(var cb of selected) {
            try {
                var sId = cb.value;
                var sName = cb.dataset.name;
                await updateDoc(doc(db,'students',sId), {classId: toClass});
                await addDoc(collection(db,'student_transfers'), {
                    schoolId: _sdSchoolId, studentId: sId, studentName: sName,
                    fromClass, toClass, reason: 'نقل جماعي',
                    transferredBy: me.name||'مجهول', createdAt: serverTimestamp()
                });
                success++;
            } catch(e) {}
        }
        if(window.showToast) window.showToast(`✅ تم نقل ${success} طالب بنجاح`,'success');
        await sdRefresh();
        sdPopulateClassSelects();
        sdLoadBulkStudents();
    };
};

// === توزيع تلقائي ===
window.sdAutoSuggest = function() {
    var classes = Object.entries(_sdClasses).filter(([k])=>k!=='غير محدد').sort((a,b)=>a[0].localeCompare(b[0],'ar'));
    var counts = classes.map(([,s])=>s.length);
    var avg = counts.reduce((a,b)=>a+b,0) / counts.length;
    var suggestions = [];

    classes.forEach(([fromClass,students])=>{
        if(students.length > avg*1.15) {
            var excess = Math.floor(students.length - avg);
            var targets = classes.filter(([c,s])=>c!==fromClass && s.length < avg*0.9);
            targets.forEach(([toClass])=>{
                if(excess > 0) {
                    suggestions.push({from:fromClass, to:toClass, count:Math.min(excess,2)});
                    excess -= 2;
                }
            });
        }
    });

    var el = document.getElementById('sd-auto-result');
    if(!suggestions.length) {
        el.innerHTML = '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;color:#15803d;font-weight:700">✅ التوزيع متوازن — لا توجد اقتراحات</div>';
        return;
    }

    el.innerHTML = `
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px;margin-bottom:10px;font-size:13px;font-weight:700;color:#92400e">
            ⚠️ يقترح النظام ${suggestions.length} نقل لتوازن الفصول (متوسط ${Math.round(avg)} طالب/فصل)
        </div>
        <div style="overflow-x:auto">
        <table class="tbl">
            <thead><tr><th>من</th><th>إلى</th><th>عدد الطلاب المقترح</th><th>إجراء</th></tr></thead>
            <tbody>${suggestions.map((s,i)=>`
                <tr>
                    <td><b>${s.from}</b> (${(_sdClasses[s.from]||[]).length})</td>
                    <td><b>${s.to}</b> (${(_sdClasses[s.to]||[]).length})</td>
                    <td>${s.count} طالب</td>
                    <td><button class="btn btn-success btn-sm" onclick="sdApplyAutoSuggest('${s.from}','${s.to}',${s.count})">تطبيق</button></td>
                </tr>`).join('')}
            </tbody>
        </table></div>`;
};

window.sdApplyAutoSuggest = async function(fromClass, toClass, count) {
    var students = (_sdClasses[fromClass]||[]).slice(0, count);
    if(!students.length) return;
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
    for(var s of students) {
        try {
            await updateDoc(doc(db,'students',s.id), {classId: toClass});
            await addDoc(collection(db,'student_transfers'), {
                schoolId: _sdSchoolId, studentId: s.id, studentName: s.name,
                fromClass, toClass, reason: 'توزيع تلقائي',
                transferredBy: me.name||'مجهول', createdAt: serverTimestamp()
            });
        } catch(e) {}
    }
    if(window.showToast) window.showToast(`✅ تم تطبيق الاقتراح`,'success');
    await sdRefresh();
    sdPopulateClassSelects();
    sdAutoSuggest();
};

// === سجل التغييرات ===
window.sdLoadLog = async function() {
    var tbody = document.getElementById('sd-log-tbody');
    if(!tbody) return;
    try {
        var snap = await getDocs(query(collection(db,'student_transfers'), where('schoolId','==',_sdSchoolId), orderBy('createdAt','desc'), limit(50)));
        if(snap.empty) { tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#aaa">لا يوجد سجل بعد</td></tr>'; return; }
        tbody.innerHTML = snap.docs.map(d=>{
            var r=d.data();
            var date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('ar-KW') : '-';
            return `<tr>
                <td style="font-size:11px;color:#6b7280">${date}</td>
                <td style="font-weight:700">${r.studentName||'-'}</td>
                <td><span class="badge" style="background:#fee2e2;color:#dc2626">${r.fromClass||'-'}</span></td>
                <td><span class="badge badge-green">${r.toClass||'-'}</span></td>
                <td style="font-size:12px;color:#6b7280">${r.reason||'-'}</td>
                <td style="font-size:12px">${r.transferredBy||'-'}</td>
            </tr>`;
        }).join('');
    } catch(e) { tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#dc2626">خطأ في التحميل</td></tr>'; }
};

// === تصدير Excel ===
window.sdExportExcel = function() {
    var classes = Object.entries(_sdClasses).sort((a,b)=>a[0].localeCompare(b[0],'ar'));
    var rows = [['الفصل','اسم الطالب','رقم الطالب']];
    classes.forEach(([cls,students])=>{
        students.forEach(s=>rows.push([cls, s.name||'', s.studentId||'']));
    });
    var csv = rows.map(r=>r.join(',')).join('\n');
    var bom = '\uFEFF';
    var blob = new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'توزيع_الطلاب.csv';
    a.click();
};

window.sdShowClassStudents = function(cls) {
    var students = _sdClasses[cls]||[];
    if(window.showToast) window.showToast(`${cls}: ${students.length} طالب`,'info');
};

// === Tabs ===
window.sdTab = function(id, btn) {
    document.querySelectorAll('.sd-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.sd-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    btn.classList.add('active');
};
