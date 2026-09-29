// global_search.js - يُضاف في admin.html
// بحث عالمي Ctrl+K

export function initGlobalSearch(db, schoolId) {

const style = document.createElement('style');
style.textContent = `
#gs-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:flex-start;justify-content:center;padding-top:80px}
#gs-overlay.show{display:flex}
#gs-box{background:#fff;border-radius:14px;width:94%;max-width:620px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden}
#gs-inp-wrap{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e5e7eb}
#gs-inp{flex:1;border:none;outline:none;font-family:Cairo,sans-serif;font-size:16px;font-weight:700;color:#0b2545;background:transparent}
#gs-inp::placeholder{color:#9ca3af;font-weight:600}
#gs-close{background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;padding:4px}
#gs-results{max-height:420px;overflow-y:auto}
.gs-section{padding:8px 16px 4px;font-size:11px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px}
.gs-item{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;transition:background .15s}
.gs-item:hover,.gs-item.active{background:#eaf4fd}
.gs-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.gs-name{font-weight:700;font-size:14px;color:#0b2545}
.gs-sub{font-size:11px;color:#6b7280;margin-top:1px}
.gs-badge{margin-right:auto;background:#f1f5f9;color:#374151;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
#gs-empty{text-align:center;padding:40px;color:#9ca3af;font-weight:700;font-size:14px}
#gs-hint{padding:10px 16px;border-top:1px solid #f1f5f9;font-size:11px;color:#9ca3af;display:flex;gap:16px}
#gs-hint span{display:flex;align-items:center;gap:4px}
kbd{background:#f1f5f9;border:1px solid #e5e7eb;border-radius:4px;padding:1px 5px;font-size:10px;font-family:monospace}
`;
document.head.appendChild(style);

const html = `
<div id="gs-overlay">
  <div id="gs-box">
    <div id="gs-inp-wrap">
      <span style="font-size:18px;color:#9ca3af">🔍</span>
      <input id="gs-inp" placeholder="ابحث عن طالب، موظف، سجل..." autocomplete="off">
      <button id="gs-close" onclick="closeGS()">✕</button>
    </div>
    <div id="gs-results">
      <div id="gs-empty" style="display:none">لا توجد نتائج</div>
    </div>
    <div id="gs-hint">
      <span><kbd>↑↓</kbd> للتنقل</span>
      <span><kbd>Enter</kbd> للفتح</span>
      <span><kbd>Esc</kbd> للإغلاق</span>
    </div>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', html);

// cache البيانات
let _students = [];
let _users = [];
let _loaded = false;

async function loadData() {
  if(_loaded) return;
  try {
    const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const [studSnap, usersSnap] = await Promise.all([
      getDocs(query(collection(db,'students'), where('schoolId','==',schoolId))),
      getDocs(query(collection(db,'users'), where('schoolId','==',schoolId)))
    ]);
    _students = studSnap.docs.map(d=>({id:d.id,...d.data(),_type:'student'}));
    _users = usersSnap.docs.map(d=>({id:d.id,...d.data(),_type:'user'}));
    _loaded = true;
  } catch(e) { console.log('GS load error:', e.message); }
}

// فتح وإغلاق
window.openGS = function() {
  document.getElementById('gs-overlay').classList.add('show');
  document.getElementById('gs-inp').focus();
  document.getElementById('gs-inp').value = '';
  document.getElementById('gs-results').innerHTML = '<div id="gs-empty" style="display:none">لا توجد نتائج</div>';
  loadData();
};

window.closeGS = function() {
  document.getElementById('gs-overlay').classList.remove('show');
};

// بحث
let _activeIdx = -1;

document.getElementById('gs-inp').addEventListener('input', function() {
  const q = this.value.trim();
  if(q.length < 2) {
    document.getElementById('gs-results').innerHTML = '<div id="gs-empty" style="display:none">لا توجد نتائج</div>';
    return;
  }
  search(q);
});

function search(q) {
  const lower = q.toLowerCase();
  _activeIdx = -1;

  const matchStudents = _students.filter(s=>
    (s.name||'').includes(q) ||
    (s.studentId||'').includes(q) ||
    (s.classId||'').includes(q)
  ).slice(0,6);

  const matchUsers = _users.filter(u=>
    (u.name||'').toLowerCase().includes(lower) ||
    (u.role||'').includes(q) ||
    (u.department||'').includes(q)
  ).slice(0,4);

  // روابط سريعة للتبويبات
  const tabLinks = [
    {tab:'tab-attendance', label:'تسجيل الغياب', icon:'📋', color:'#16a34a'},
    {tab:'tab-behavior', label:'السلوك', icon:'🛡️', color:'#7c3aed'},
    {tab:'tab-students-manage', label:'إدارة الطلاب', icon:'👥', color:'#1a78c2'},
    {tab:'tab-analytics', label:'التحليلات', icon:'📊', color:'#d4920a'},
    {tab:'tab-meetings', label:'محاضر الاجتماع', icon:'📝', color:'#0891b2'},
    {tab:'tab-rewards', label:'الحوافز', icon:'⭐', color:'#f59e0b'},
    {tab:'tab-distribution', label:'توزيع الطلاب', icon:'🔀', color:'#dc2626'},
  ].filter(t=>(t.label||'').includes(q) || (t.tab||'').includes(q)).slice(0,3);

  let html = '';

  if(matchStudents.length) {
    html += '<div class="gs-section">👨‍🎓 الطلاب</div>';
    html += matchStudents.map((s,i)=>`
      <div class="gs-item" onclick="gsGoStudent('${s.id}')" data-idx="${i}">
        <div class="gs-icon" style="background:#eaf4fd">👤</div>
        <div style="flex:1">
          <div class="gs-name">${s.name||'-'}</div>
          <div class="gs-sub">الفصل ${s.classId||'-'} · ${s.studentId||''}</div>
        </div>
        <span class="gs-badge">طالب</span>
      </div>`).join('');
  }

  if(matchUsers.length) {
    html += '<div class="gs-section">👨‍🏫 الموظفون</div>';
    html += matchUsers.map((u,i)=>`
      <div class="gs-item" onclick="gsGoUser('${u.id}')" data-idx="${matchStudents.length+i}">
        <div class="gs-icon" style="background:#f0fdf4">👨‍💼</div>
        <div style="flex:1">
          <div class="gs-name">${u.name||'-'}</div>
          <div class="gs-sub">${u.role||''} · ${u.department||''}</div>
        </div>
        <span class="gs-badge">${u.role||'موظف'}</span>
      </div>`).join('');
  }

  if(tabLinks.length) {
    html += '<div class="gs-section">⚡ صفحات</div>';
    html += tabLinks.map((t,i)=>`
      <div class="gs-item" onclick="window.switchTab('${t.tab}');closeGS()" data-idx="${matchStudents.length+matchUsers.length+i}">
        <div class="gs-icon" style="background:#f8fafc;font-size:18px">${t.icon}</div>
        <div style="flex:1">
          <div class="gs-name">${t.label}</div>
          <div class="gs-sub">اذهب للصفحة</div>
        </div>
        <span class="gs-badge" style="background:#e0f2fe;color:#0369a1">←</span>
      </div>`).join('');
  }

  const results = document.getElementById('gs-results');
  if(!html) {
    results.innerHTML = '<div id="gs-empty" style="padding:40px;text-align:center;color:#9ca3af;font-weight:700">لا توجد نتائج لـ "'+q+'"</div>';
  } else {
    results.innerHTML = html;
  }
}

// تنقل بالكيبورد
document.getElementById('gs-inp').addEventListener('keydown', function(e) {
  const items = document.querySelectorAll('.gs-item');
  if(e.key==='ArrowDown'){ e.preventDefault(); _activeIdx=Math.min(_activeIdx+1,items.length-1); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); _activeIdx=Math.max(_activeIdx-1,0); }
  else if(e.key==='Enter' && _activeIdx>=0){ items[_activeIdx]?.click(); return; }
  else if(e.key==='Escape'){ closeGS(); return; }
  items.forEach((el,i)=>el.classList.toggle('active',i===_activeIdx));
  if(items[_activeIdx]) items[_activeIdx].scrollIntoView({block:'nearest'});
});

// الضغط على overlay
document.getElementById('gs-overlay').addEventListener('click', function(e) {
  if(e.target===this) closeGS();
});

// اختصار Ctrl+K
document.addEventListener('keydown', function(e) {
  if((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); openGS(); }
  if(e.key==='Escape') closeGS();
});

// انتقال للطالب
window.gsGoStudent = function(id) {
  closeGS();
  window.switchTab('tab-student');
  setTimeout(()=>{
    var inp = document.getElementById('student-search-input') || document.querySelector('#tab-student input');
    if(inp) { inp.value = _students.find(s=>s.id===id)?.name||''; inp.dispatchEvent(new Event('input')); }
  }, 400);
};

window.gsGoUser = function(id) {
  closeGS();
  window.switchTab('tab-users');
};

}
