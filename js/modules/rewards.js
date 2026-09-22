import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp, updateDoc, doc, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══ Cache ══
let _studentsCache = null;
let _schoolCache = null;

async function getCachedStudents(schoolId) {
    if(_studentsCache && _schoolCache===schoolId) return _studentsCache;
    var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
    _studentsCache = snap; _schoolCache = schoolId;
    return snap;
}

// ══ مستويات النقاط ══
const LEVELS = [
    { min:0,   max:49,  name:'مبتدئ',    icon:'🌱', color:'#6b7280' },
    { min:50,  max:149, name:'متميز',    icon:'⭐', color:'#f59e0b' },
    { min:150, max:299, name:'متفوق',    icon:'🌟', color:'#0891b2' },
    { min:300, max:499, name:'نجم',      icon:'🏆', color:'#7c3aed' },
    { min:500, max:999, name:'أسطورة',   icon:'👑', color:'#d4920a' },
    { min:1000,max:9999,name:'بطل المدرسة',icon:'🦁',color:'#dc2626' },
];

function getLevel(points) {
    return LEVELS.find(l=>points>=l.min && points<=l.max) || LEVELS[0];
}

const REWARD_TYPES = [
    { val:5,   label:'🪙 +5 نقاط',   color:'#6b7280', type:'add' },
    { val:10,  label:'⭐ +10 نقاط',  color:'#f59e0b', type:'add' },
    { val:20,  label:'🌟 +20 نقطة',  color:'#0891b2', type:'add' },
    { val:50,  label:'🏆 +50 نقطة',  color:'#7c3aed', type:'add' },
    { val:100, label:'👑 +100 نقطة', color:'#d4920a', type:'add' },
    { val:-5,  label:'⚠️ -5 نقاط',   color:'#dc2626', type:'sub' },
    { val:-10, label:'🔴 -10 نقاط',  color:'#dc2626', type:'sub' },
];

const QUICK_REASONS = [
    'المشاركة الفعالة بالحصة','الواجب المنزلي المتميز','حسن الخلق والسلوك',
    'المساعدة في نشاط مدرسي','التفوق الدراسي','الحضور المنتظم طوال الأسبوع',
    'الفوز في مسابقة','مساعدة زملائه','التحسن الملحوظ','مخالفة سلوكية',
];

export async function initRewardsModule() {
    var container = document.getElementById('tab-rewards');
    if(!container) return;

    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <style>
        .rw-tabs{display:flex;gap:4px;margin-bottom:18px;background:#f1f5f9;border-radius:10px;padding:4px}
        .rw-tab{flex:1;padding:9px;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s}
        .rw-tab.active{background:#fff;color:#0b2545;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .rw-panel{display:none}.rw-panel.active{display:block}
        .rw-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px}
        .rw-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .level-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:900;color:#fff}
        .student-card{background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all .2s}
        .student-card:hover{border-color:#1a78c2;background:#eaf4fd}
        .progress-bar{height:8px;border-radius:4px;background:#f1f5f9;overflow:hidden;margin-top:6px}
        .progress-fill{height:100%;border-radius:4px;transition:width .8s}
        .rank-medal{font-size:20px}
        .quick-reason{display:inline-block;padding:5px 12px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;margin:3px;transition:all .15s;color:#374151}
        .quick-reason:hover{border-color:#1a78c2;color:#1a78c2;background:#eaf4fd}
        .quick-reason.selected{border-color:#0b2545;background:#0b2545;color:#fff}
        .inp{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;transition:border .15s;margin-bottom:10px}
        .inp:focus{border-color:#1a78c2}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
        .btn-green{background:#16a34a;color:#fff;width:100%;justify-content:center}
        .btn-primary{background:#0b2545;color:#fff}
        .btn-outline{background:transparent;border:1.5px solid #1a78c2;color:#1a78c2}
        .btn-sm{padding:5px 10px;font-size:12px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .tbl-wrap{overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb}
        table{width:100%;border-collapse:collapse;font-size:13px}
        thead th{background:#0b2545;color:#fff;padding:10px 12px;text-align:right;font-weight:700}
        tbody tr{border-bottom:1px solid #e5e7eb}
        tbody tr:hover{background:#f8fafc}
        tbody td{padding:10px 12px;vertical-align:middle}
        .points-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .points-type-btn{border:2px solid #e5e7eb;border-radius:10px;padding:10px;text-align:center;cursor:pointer;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;background:#fff;transition:all .15s}
        .points-type-btn:hover{border-color:#1a78c2}
        .points-type-btn.selected{border-color:#0b2545;background:#0b2545;color:#fff}
    </style>

    <!-- Tabs -->
    <div class="rw-tabs">
        <button class="rw-tab active" onclick="rwTab('rw-grant',this)"><i class="bi bi-plus-circle-fill"></i> منح النقاط</button>
        <button class="rw-tab" onclick="rwTab('rw-leaderboard',this);rwLoadLeaderboard()"><i class="bi bi-trophy-fill"></i> المتصدرون</button>
        <button class="rw-tab" onclick="rwTab('rw-student',this)"><i class="bi bi-person-fill"></i> محفظة طالب</button>
        <button class="rw-tab" onclick="rwTab('rw-history',this);rwLoadHistory()"><i class="bi bi-clock-history"></i> السجل</button>
    </div>

    <!-- ===== منح النقاط ===== -->
    <div class="rw-panel active" id="rw-grant">
        <div class="rw-card">
            <div class="rw-title"><i class="bi bi-coin" style="color:#d4920a"></i> منح / خصم نقاط</div>

            <div class="form-row" style="margin-bottom:10px">
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">الصف</label>
                    <select class="inp" id="rw-class-sel" onchange="rwLoadClassStudents()" style="margin-bottom:0">
                        <option value="">اختر الصف...</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">الطالب</label>
                    <select class="inp" id="rw-student-sel" disabled style="margin-bottom:0">
                        <option value="">اختر الطالب...</option>
                    </select>
                </div>
            </div>

            <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:8px">نوع النقاط</label>
            <div class="points-type-grid" id="points-type-grid">
                ${REWARD_TYPES.map((t,i)=>`
                    <div class="points-type-btn ${i===1?'selected':''}" onclick="rwSelectType(this,'${t.val}')" data-val="${t.val}" style="${i===1?'border-color:#0b2545;background:#0b2545;color:#fff':''}">
                        ${t.label}
                    </div>`).join('')}
            </div>
            <input type="hidden" id="rw-points-val" value="10">

            <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">سبب المكافأة</label>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px" id="quick-reasons">
                ${QUICK_REASONS.map(r=>`<span class="quick-reason" onclick="rwSelectReason(this,'${r}')">${r}</span>`).join('')}
            </div>
            <input type="text" class="inp" id="rw-reason" placeholder="أو اكتب سبباً مخصصاً...">

            <button class="btn btn-green" onclick="rwGrant()"><i class="bi bi-plus-circle-fill"></i> إيداع في محفظة الطالب</button>
        </div>

        <!-- منح جماعي -->
        <div class="rw-card">
            <div class="rw-title"><i class="bi bi-people-fill" style="color:#7c3aed"></i> منح جماعي لفصل كامل</div>
            <div class="form-row" style="margin-bottom:10px">
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">الصف</label>
                    <select class="inp" id="rw-bulk-class" style="margin-bottom:0">
                        <option value="">اختر الصف...</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:700;color:#6b7280;display:block;margin-bottom:6px">النقاط</label>
                    <select class="inp" id="rw-bulk-points" style="margin-bottom:0">
                        <option value="5">+5 نقاط</option>
                        <option value="10" selected>+10 نقاط</option>
                        <option value="20">+20 نقطة</option>
                    </select>
                </div>
            </div>
            <input type="text" class="inp" id="rw-bulk-reason" placeholder="سبب المكافأة الجماعية...">
            <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="rwBulkGrant()"><i class="bi bi-people-fill"></i> منح للفصل كاملاً</button>
        </div>
    </div>

    <!-- ===== المتصدرون ===== -->
    <div class="rw-panel" id="rw-leaderboard">
        <div class="rw-card">
            <div class="rw-title"><i class="bi bi-trophy-fill" style="color:#d4920a"></i> لوحة المتصدرين</div>
            <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
                <select class="inp" id="lb-class-filter" onchange="rwLoadLeaderboard()" style="width:auto;margin-bottom:0;flex:1">
                    <option value="">كل الصفوف</option>
                </select>
                <button class="btn btn-outline btn-sm" onclick="rwPrintLeaderboard()"><i class="bi bi-printer"></i> طباعة</button>
            </div>
            <div id="leaderboard-content"><div style="text-align:center;padding:30px;color:#6b7280">⏳ جاري التحميل...</div></div>
        </div>
    </div>

    <!-- ===== محفظة طالب ===== -->
    <div class="rw-panel" id="rw-student">
        <div class="rw-card">
            <div class="rw-title"><i class="bi bi-person-fill" style="color:#1a78c2"></i> محفظة طالب</div>
            <div style="display:flex;gap:8px;margin-bottom:14px">
                <input type="text" class="inp" id="wallet-search" placeholder="ابحث باسم الطالب..." oninput="rwSearchWallet()" style="margin-bottom:0;flex:1">
            </div>
            <div id="wallet-search-results"></div>
            <div id="wallet-content" style="display:none">
                <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#0b2545,#1a4a8a);border-radius:14px;color:#fff;margin-bottom:16px">
                    <div style="font-size:13px;opacity:.8;margin-bottom:4px">رصيد النقاط</div>
                    <div style="font-size:48px;font-weight:900" id="wallet-points">0</div>
                    <div id="wallet-level" style="margin-top:8px"></div>
                    <div id="wallet-progress" style="margin-top:10px"></div>
                </div>
                <div id="wallet-history"></div>
            </div>
        </div>
    </div>

    <!-- ===== السجل ===== -->
    <div class="rw-panel" id="rw-history">
        <div class="rw-card">
            <div class="rw-title"><i class="bi bi-clock-history" style="color:#6b7280"></i> سجل جميع العمليات</div>
            <div class="tbl-wrap">
                <table>
                    <thead><tr><th>الطالب</th><th>الصف</th><th>النقاط</th><th>السبب</th><th>التاريخ</th><th>بواسطة</th></tr></thead>
                    <tbody id="history-body"><tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280">⏳ جاري التحميل...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    // تحميل الصفوف
    await rwInitClasses(schoolId);
    rwLoadLeaderboard();
}

// ══ Tab ══
window.rwTab = function(id, btn) {
    document.querySelectorAll('.rw-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.rw-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    btn.classList.add('active');
};

// ══ تحميل الصفوف ══
async function rwInitClasses(schoolId) {
    var snap = await getCachedStudents(schoolId);
    var classes = new Set();
    snap.forEach(d=>{ if(d.data().classId) classes.add(d.data().classId.trim()); });
    var sorted = Array.from(classes).sort();
    ['rw-class-sel','rw-bulk-class','lb-class-filter'].forEach(selId=>{
        var sel = document.getElementById(selId);
        if(!sel) return;
        var first = sel.options[0];
        sel.innerHTML = '';
        if(first) sel.appendChild(first);
        sorted.forEach(c=>{ var o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
    });
}

window.rwLoadClassStudents = async function() {
    var cls = document.getElementById('rw-class-sel')?.value;
    var sel = document.getElementById('rw-student-sel');
    if(!cls||!sel){ if(sel){sel.innerHTML='<option>اختر الطالب...</option>'; sel.disabled=true;} return; }
    var schoolId = getActiveSchoolId();
    sel.innerHTML='<option>⏳ جاري التحميل...</option>'; sel.disabled=true;
    var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId), where('classId','==',cls)));
    var names = snap.docs.map(d=>d.data().name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar'));
    sel.innerHTML = '<option value="">اختر الطالب...</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('');
    sel.disabled = false;
};

// ══ اختيار نوع النقاط ══
window.rwSelectType = function(el, val) {
    document.querySelectorAll('.points-type-btn').forEach(b=>{ b.classList.remove('selected'); b.style.borderColor='#e5e7eb'; b.style.background='#fff'; b.style.color='#374151'; });
    el.classList.add('selected'); el.style.borderColor='#0b2545'; el.style.background='#0b2545'; el.style.color='#fff';
    document.getElementById('rw-points-val').value = val;
};

// ══ اختيار سبب سريع ══
window.rwSelectReason = function(el, reason) {
    document.querySelectorAll('.quick-reason').forEach(r=>r.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('rw-reason').value = reason;
};

// ══ منح نقاط ══
window.rwGrant = async function() {
    var studentName = document.getElementById('rw-student-sel')?.value;
    var classId = document.getElementById('rw-class-sel')?.value;
    var points = parseInt(document.getElementById('rw-points-val')?.value||'10');
    var reason = document.getElementById('rw-reason')?.value.trim();
    if(!studentName){ rwToast('اختر الطالب أولاً','error'); return; }
    if(!reason){ rwToast('أدخل سبب المكافأة','error'); return; }
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
    try {
        await addDoc(collection(db,'rewards'),{
            schoolId:getActiveSchoolId(), studentName, classId, points, reason,
            grantedBy: me.name||'—', grantedByRole: me.role||'—',
            date: getTodayISO(), createdAt:serverTimestamp()
        });
        rwToast(`تم ${points>0?'إيداع':'خصم'} ${Math.abs(points)} نقطة لـ ${studentName}`,'success');
        document.getElementById('rw-reason').value='';
        document.querySelectorAll('.quick-reason').forEach(r=>r.classList.remove('selected'));
        rwLoadLeaderboard();
    } catch(e){ rwToast('خطأ: '+e.message,'error'); }
};

// ══ منح جماعي ══
window.rwBulkGrant = async function() {
    var cls = document.getElementById('rw-bulk-class')?.value;
    var points = parseInt(document.getElementById('rw-bulk-points')?.value||'10');
    var reason = document.getElementById('rw-bulk-reason')?.value.trim();
    if(!cls){ rwToast('اختر الصف','error'); return; }
    if(!reason){ rwToast('أدخل السبب','error'); return; }
    if(!confirm(`منح ${points} نقاط لجميع طلاب ${cls}؟`)) return;
    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId), where('classId','==',cls)));
    var students = snap.docs.map(d=>d.data().name).filter(Boolean);
    for(var name of students) {
        await addDoc(collection(db,'rewards'),{
            schoolId, studentName:name, classId:cls, points, reason,
            grantedBy:me.name||'—', bulk:true, date:getTodayISO(), createdAt:serverTimestamp()
        });
    }
    rwToast(`تم منح ${points} نقطة لـ ${students.length} طالب في ${cls}`,'success');
    document.getElementById('rw-bulk-reason').value='';
    rwLoadLeaderboard();
};

// ══ لوحة المتصدرين ══
window.rwLoadLeaderboard = async function() {
    var el = document.getElementById('leaderboard-content');
    if(!el) return;
    var schoolId = getActiveSchoolId();
    var clsFilter = document.getElementById('lb-class-filter')?.value;
    try {
        var snap = await getDocs(query(collection(db,'rewards'), where('schoolId','==',schoolId)));
        var leaderboard = {};
        snap.forEach(d=>{
            var r=d.data();
            if(clsFilter && r.classId!==clsFilter) return;
            var k=r.studentName+'|'+(r.classId||'');
            if(!leaderboard[k]) leaderboard[k]={name:r.studentName,classId:r.classId||'—',total:0,count:0};
            leaderboard[k].total += parseInt(r.points||0);
            leaderboard[k].count++;
        });
        var sorted = Object.values(leaderboard).sort((a,b)=>b.total-a.total);
        if(!sorted.length){ el.innerHTML='<div style="text-align:center;padding:30px;color:#6b7280">لا توجد نقاط مسجلة</div>'; return; }

        // Top 3
        var top3 = sorted.slice(0,3);
        var topHtml = `<div style="display:flex;justify-content:center;align-items:flex-end;gap:12px;margin-bottom:20px;padding:16px">`;
        var order = top3.length>=3 ? [1,0,2] : [0,1,2];
        order.forEach(i=>{
            if(!top3[i]) return;
            var s=top3[i]; var lvl=getLevel(s.total);
            var heights=['80px','100px','60px'];
            var medals=['🥇','🥈','🥉'];
            topHtml+=`<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <div style="font-size:${i===0?'20':'16'}px">${lvl.icon}</div>
                <div style="font-size:${i===0?'13':'11'}px;font-weight:900;color:#0b2545;text-align:center;max-width:80px">${s.name}</div>
                <div style="font-size:10px;color:#6b7280">${s.classId}</div>
                <div style="width:${i===0?'70':'55'}px;height:${heights[i]};background:${lvl.color};border-radius:8px 8px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:8px">
                    <span style="font-size:18px">${medals[i]}</span>
                </div>
                <div style="font-weight:900;color:${lvl.color};font-size:${i===0?'18':'14'}px">${s.total}</div>
            </div>`;
        });
        topHtml += '</div>';

        // باقي القائمة
        var listHtml = sorted.map((s,i)=>{
            var lvl=getLevel(s.total);
            var nextLvl=LEVELS[LEVELS.indexOf(lvl)+1];
            var pct=nextLvl?Math.round((s.total-lvl.min)/(nextLvl.min-lvl.min)*100):100;
            return `<div class="student-card" onclick="rwShowWallet('${s.name}')">
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:32px;text-align:center;font-size:${i<3?'20':'14'}px;font-weight:900">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
                    <div style="flex:1">
                        <div style="font-weight:900;font-size:14px">${s.name}</div>
                        <div style="font-size:11px;color:#6b7280">${s.classId} — ${s.count} عملية</div>
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${lvl.color}"></div></div>
                    </div>
                    <div style="text-align:center">
                        <div class="level-badge" style="background:${lvl.color}">${lvl.icon} ${lvl.name}</div>
                        <div style="font-size:18px;font-weight:900;color:${lvl.color};margin-top:4px">${s.total}</div>
                    </div>
                </div>
            </div>`;
        }).join('');

        el.innerHTML = topHtml + listHtml;
    } catch(e){ el.innerHTML='<div style="color:#dc2626;padding:20px">خطأ في التحميل</div>'; }
};

// ══ بحث محفظة ══
window.rwSearchWallet = function() {
    var q = document.getElementById('wallet-search')?.value.trim().toLowerCase();
    var res = document.getElementById('wallet-search-results');
    if(!q||q.length<2){ res.innerHTML=''; return; }
    var snap = _studentsCache;
    if(!snap){ res.innerHTML=''; return; }
    var matches = snap.docs.filter(d=>(d.data().name||'').toLowerCase().includes(q)).slice(0,5);
    res.innerHTML = matches.map(d=>`
        <div onclick="rwShowWallet('${d.data().name}')" style="padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;margin-bottom:6px;font-weight:700;font-size:14px" onmouseover="this.style.background='#eaf4fd'" onmouseout="this.style.background=''">
            ${d.data().name} — <span style="color:#6b7280;font-size:12px">${d.data().classId||''}</span>
        </div>`).join('');
};

window.rwShowWallet = async function(name) {
    // انتقال لتبويب المحفظة
    document.querySelectorAll('.rw-tab').forEach((t,i)=>{ t.classList.remove('active'); if(i===2) t.classList.add('active'); });
    document.querySelectorAll('.rw-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById('rw-student').classList.add('active');

    var schoolId = getActiveSchoolId();
    var snap = await getDocs(query(collection(db,'rewards'), where('schoolId','==',schoolId), where('studentName','==',name)));
    var records = snap.docs.map(d=>d.data()).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    var total = records.reduce((s,r)=>s+parseInt(r.points||0),0);
    var lvl = getLevel(total);
    var nextLvl = LEVELS[LEVELS.indexOf(lvl)+1];
    var pct = nextLvl?Math.round((total-lvl.min)/(nextLvl.min-lvl.min)*100):100;

    document.getElementById('wallet-content').style.display='block';
    document.getElementById('wallet-search-results').innerHTML='';
    document.getElementById('wallet-search').value=name;
    document.getElementById('wallet-points').textContent=total;
    document.getElementById('wallet-level').innerHTML=`<span class="level-badge" style="background:rgba(255,255,255,.2)">${lvl.icon} ${lvl.name}</span>`;
    document.getElementById('wallet-progress').innerHTML=nextLvl?`
        <div style="background:rgba(255,255,255,.2);border-radius:4px;height:6px;overflow:hidden;margin:0 20px">
            <div style="width:${pct}%;height:100%;background:#fff;border-radius:4px;transition:width .8s"></div>
        </div>
        <div style="font-size:10px;opacity:.7;margin-top:4px">${total}/${nextLvl.min} للمستوى التالي</div>`:'<div style="font-size:12px;opacity:.8">المستوى الأعلى 🎉</div>';

    document.getElementById('wallet-history').innerHTML = records.length
        ? `<div style="font-size:14px;font-weight:900;color:#0b2545;margin-bottom:10px">سجل العمليات</div>`+
          records.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f2f5">
            <div style="width:36px;height:36px;border-radius:50%;background:${r.points>0?'#dcfce7':'#fee2e2'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${r.points>0?'⬆️':'⬇️'}</div>
            <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${r.reason||'—'}</div>
                <div style="font-size:11px;color:#6b7280">${r.date||''} — بواسطة: ${r.grantedBy||'—'}</div>
            </div>
            <div style="font-weight:900;font-size:16px;color:${r.points>0?'#16a34a':'#dc2626'}">${r.points>0?'+':''}${r.points}</div>
          </div>`).join('')
        : '<div style="text-align:center;padding:20px;color:#6b7280">لا توجد نقاط مسجلة</div>';
};

// ══ سجل العمليات ══
window.rwLoadHistory = async function() {
    var tbody = document.getElementById('history-body');
    if(!tbody) return;
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,'rewards'), where('schoolId','==',schoolId), orderBy('createdAt','desc'), limit(50)));
        if(snap.empty){ tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280">لا توجد عمليات</td></tr>'; return; }
        tbody.innerHTML = snap.docs.map(d=>{
            var r=d.data();
            return `<tr>
                <td><strong>${r.studentName||'—'}</strong></td>
                <td>${r.classId||'—'}</td>
                <td><span style="color:${r.points>0?'#16a34a':'#dc2626'};font-weight:900">${r.points>0?'+':''}${r.points}</span></td>
                <td>${r.reason||'—'}</td>
                <td>${r.date||'—'}</td>
                <td style="font-size:11px;color:#6b7280">${r.grantedBy||'—'}</td>
            </tr>`;
        }).join('');
    } catch(e){ tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:20px">خطأ في التحميل</td></tr>'; }
};

// ══ طباعة المتصدرين ══
window.rwPrintLeaderboard = function() {
    var content = document.getElementById('leaderboard-content')?.innerHTML;
    var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:12px}.student-card{border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:6px}.progress-bar{display:none}@page{size:A4;margin:10mm}</style>
    </head><body>
    <div style="border-bottom:3px solid #0b2545;margin-bottom:14px;padding-bottom:10px;display:flex;justify-content:space-between">
        <div style="font-size:11px">دولة الكويت<br>وزارة التربية</div>
        <div style="text-align:center;font-size:16px;font-weight:900;color:#0b2545">لوحة متصدري بنك التميز</div>
        <div style="font-size:11px;text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
    </div>
    ${content}
    <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
    var b=new Blob([html],{type:'text/html;charset=utf-8'});
    window.open(URL.createObjectURL(b),'_blank');
};

// ══ Toast ══
function rwToast(msg,type='info'){
    var t=document.createElement('div');
    t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${type==='error'?'#dc2626':type==='success'?'#16a34a':'#0b2545'};color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999;font-family:Cairo,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)`;
    t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}
