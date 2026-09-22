import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════════════
// موديل الأخصائي الاجتماعي — المنظومة الرقمية
// استبيان ديناميكي + حالات + متابعة + تقارير
// ══════════════════════════════════════════════════════

const DEFAULT_QUESTIONS = [
  { id: 'q1', type: 'select', text: 'الوضع الأسري', options: ['الأسرة مكتملة','الأب متوفى','الأم متوفاة','الوالدان مطلقان','الطالب في كفالة'], required: true },
  { id: 'q2', type: 'select', text: 'المستوى المعيشي للأسرة', options: ['ميسور','متوسط','محدود','صعب'], required: true },
  { id: 'q3', type: 'yesno', text: 'هل الطالب يعيش مع والديه؟', required: true },
  { id: 'q4', type: 'select', text: 'ترتيب الطالب بين إخوته', options: ['الأول','الأوسط','الأخير','وحيد'], required: false },
  { id: 'q5', type: 'rating', text: 'علاقة الطالب بأقرانه في المدرسة', required: true },
  { id: 'q6', type: 'rating', text: 'التحصيل الدراسي للطالب', required: true },
  { id: 'q7', type: 'yesno', text: 'هل يوجد دعم أسري للطالب في الدراسة؟', required: true },
  { id: 'q8', type: 'yesno', text: 'هل الطالب يعاني من مشاكل سلوكية متكررة؟', required: false },
  { id: 'q9', type: 'yesno', text: 'هل سبق إحالة الطالب للأخصائي من قبل؟', required: false },
  { id: 'q10', type: 'select', text: 'سبب الإحالة الحالية', options: ['غياب متكرر','مشكلة سلوكية','مشكلة أسرية','ضعف دراسي','عنف','أخرى'], required: true },
  { id: 'q11', type: 'select', text: 'الأولوية', options: ['عاجلة','عالية','متوسطة','منخفضة'], required: true },
  { id: 'q12', type: 'text', text: 'ملاحظات الأخصائي الأولية', required: false },
];

let schoolId = '';
let allStudents = [];
let surveyQuestions = [];
let currentCaseId = null;
let allCases = [];

export async function initSocialModule() {
  var container = document.getElementById('tab-social');
  if (!container) {
    // إذا ما في tab-social، ابحث في social.html أو أضفه
    container = document.getElementById('tab-social-worker');
  }
  if (!container) return;

  schoolId = getActiveSchoolId();

  container.innerHTML = `
  <style>
    .sw-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px}
    .sw-title{font-size:15px;font-weight:900;color:#0b2545;margin-bottom:14px;display:flex;align-items:center;gap:8px;border-bottom:2px solid #f8f9fc;padding-bottom:10px}
    .sw-tabs{display:flex;gap:4px;margin-bottom:20px;background:#f1f5f9;border-radius:10px;padding:4px}
    .sw-tab{flex:1;padding:10px;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;background:transparent;color:#6b7280;transition:all .2s}
    .sw-tab.active{background:#fff;color:#0b2545;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .sw-panel{display:none}.sw-panel.active{display:block}
    .q-card{background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:10px}
    .q-card:hover{border-color:#1a78c2;background:#eaf4fd}
    .q-text{flex:1;font-weight:700;font-size:14px;color:#111827}
    .q-type{font-size:11px;color:#6b7280;background:#e5e7eb;padding:3px 10px;border-radius:20px;font-weight:700}
    .q-required{color:#dc2626;font-size:12px;font-weight:900}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .15s}
    .btn-primary{background:#0b2545;color:#fff}.btn-primary:hover{background:#1a3a6b}
    .btn-success{background:#16a34a;color:#fff}.btn-success:hover{background:#15803d}
    .btn-danger{background:#dc2626;color:#fff}.btn-danger:hover{background:#b91c1c}
    .btn-outline{background:transparent;border:1.5px solid #1a78c2;color:#1a78c2}.btn-outline:hover{background:#eaf4fd}
    .btn-gold{background:#d4920a;color:#fff}.btn-gold:hover{background:#b47c08}
    .btn-sm{padding:5px 10px;font-size:12px}
    .form-group{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
    .form-group label{font-size:13px;font-weight:700;color:#6b7280}
    .form-group input,.form-group select,.form-group textarea{border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;transition:border .15s}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#1a78c2}
    .form-group textarea{resize:vertical;min-height:70px}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .rating-stars{display:flex;gap:6px;direction:ltr}
    .rating-stars input{display:none}
    .rating-stars label{font-size:24px;cursor:pointer;color:#d1d5db;transition:color .15s}
    .rating-stars input:checked ~ label,.rating-stars label:hover,.rating-stars label:hover ~ label{color:#f59e0b}
    .case-card{background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all .2s}
    .case-card:hover{border-color:#1a78c2;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .case-card.selected{border-color:#0b2545;background:#eaf4fd}
    .priority-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .p-urgent{background:#fee2e2;color:#dc2626}
    .p-high{background:#ffedd5;color:#ea580c}
    .p-medium{background:#fef9c3;color:#92400e}
    .p-low{background:#dcfce7;color:#16a34a}
    .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;align-items:center;justify-content:center}
    .modal-overlay.show{display:flex}
    .modal{background:#fff;border-radius:14px;padding:24px;width:90%;max-width:560px;max-height:90vh;overflow-y:auto;position:relative}
    .modal-close{position:absolute;top:14px;left:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280}
    .tbl-wrap{overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead th{background:#0b2545;color:#fff;padding:10px 12px;text-align:right;font-weight:700}
    tbody tr{border-bottom:1px solid #e5e7eb}
    tbody tr:hover{background:#f8fafc}
    tbody td{padding:10px 12px;vertical-align:middle}
    .search-box{display:flex;gap:8px;margin-bottom:14px}
    .search-box input{flex:1;border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 14px;font-family:Cairo,sans-serif;font-size:14px;outline:none}
    .search-box input:focus{border-color:#1a78c2}
  </style>

  <!-- التبويبات -->
  <div class="sw-tabs">
    <button class="sw-tab active" onclick="swTab('sw-cases')"><i class="bi bi-folder-fill"></i> الحالات</button>
    <button class="sw-tab" onclick="swTab('sw-survey')"><i class="bi bi-clipboard-check-fill"></i> الاستبيان</button>
    <button class="sw-tab" onclick="swTab('sw-followup')"><i class="bi bi-calendar-check-fill"></i> المتابعة</button>
    <button class="sw-tab" onclick="swTab('sw-reports')"><i class="bi bi-bar-chart-fill"></i> التقارير</button>
    <button class="sw-tab" onclick="swTab('sw-settings')"><i class="bi bi-gear-fill"></i> إعدادات الاستبيان</button>
  </div>

  <!-- ===== الحالات ===== -->
  <div class="sw-panel active" id="sw-cases">
    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-plus-circle-fill" style="color:#16a34a"></i> فتح حالة جديدة</div>
      <div class="form-row">
        <div class="form-group">
          <label>بحث عن الطالب</label>
          <input type="text" id="case-student-search" placeholder="اكتب اسم الطالب..." oninput="swSearchStudent()">
        </div>
        <div class="form-group">
          <label>الطالب المختار</label>
          <input type="text" id="case-student-name" readonly style="background:#f8fafc">
          <input type="hidden" id="case-student-id">
        </div>
      </div>
      <div id="case-search-results" style="margin-bottom:8px"></div>
      <div class="form-row">
        <div class="form-group">
          <label>نوع الحالة</label>
          <select id="case-type">
            <option>غياب متكرر</option>
            <option>مشكلة سلوكية</option>
            <option>مشكلة أسرية</option>
            <option>ضعف دراسي</option>
            <option>عنف</option>
            <option>أخرى</option>
          </select>
        </div>
        <div class="form-group">
          <label>الأولوية</label>
          <select id="case-priority">
            <option value="عاجلة">🔴 عاجلة</option>
            <option value="عالية">🟠 عالية</option>
            <option value="متوسطة" selected>🟡 متوسطة</option>
            <option value="منخفضة">🟢 منخفضة</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>ملاحظات أولية</label>
        <textarea id="case-notes" placeholder="وصف مختصر للحالة..."></textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-success" onclick="swOpenCase()"><i class="bi bi-folder-plus"></i> فتح الحالة</button>
        <button class="btn btn-primary" onclick="swOpenCaseWithSurvey()"><i class="bi bi-clipboard-plus"></i> فتح وتعبئة الاستبيان</button>
      </div>
    </div>

    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-folder2-open" style="color:#1a78c2"></i> الحالات المسجلة</div>
      <div class="search-box">
        <input type="text" id="cases-search" placeholder="🔍 بحث في الحالات..." oninput="swFilterCases()">
        <select id="cases-filter-priority" onchange="swFilterCases()" style="border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-family:Cairo,sans-serif;font-size:13px;outline:none">
          <option value="">كل الأولويات</option>
          <option value="عاجلة">عاجلة</option>
          <option value="عالية">عالية</option>
          <option value="متوسطة">متوسطة</option>
          <option value="منخفضة">منخفضة</option>
        </select>
        <select id="cases-filter-status" onchange="swFilterCases()" style="border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-family:Cairo,sans-serif;font-size:13px;outline:none">
          <option value="">كل الحالات</option>
          <option value="open">مفتوحة</option>
          <option value="closed">مغلقة</option>
        </select>
      </div>
      <div id="cases-list"><div style="text-align:center;padding:30px;color:#6b7280">⏳ جاري التحميل...</div></div>
    </div>
  </div>

  <!-- ===== الاستبيان ===== -->
  <div class="sw-panel" id="sw-survey">
    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-clipboard-check-fill" style="color:#7c3aed"></i> تعبئة الاستبيان</div>
      <div class="form-group">
        <label>اختر الحالة</label>
        <select id="survey-case-sel" onchange="swLoadCaseSurvey()">
          <option value="">اختر حالة...</option>
        </select>
      </div>
      <div id="survey-form-container" style="display:none">
        <div id="survey-questions-form"></div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-success" onclick="swSaveSurvey()"><i class="bi bi-save"></i> حفظ الاستبيان</button>
          <button class="btn btn-gold" onclick="swPrintSurvey()"><i class="bi bi-printer"></i> طباعة</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== المتابعة ===== -->
  <div class="sw-panel" id="sw-followup">
    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-calendar-plus-fill" style="color:#0891b2"></i> تسجيل جلسة متابعة</div>
      <div class="form-row">
        <div class="form-group">
          <label>الحالة</label>
          <select id="fu-case-sel">
            <option value="">اختر حالة...</option>
          </select>
        </div>
        <div class="form-group">
          <label>تاريخ الجلسة</label>
          <input type="date" id="fu-date">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>نوع الجلسة</label>
          <select id="fu-type">
            <option>جلسة فردية مع الطالب</option>
            <option>جلسة مع ولي الأمر</option>
            <option>زيارة منزلية</option>
            <option>اجتماع مع الإدارة</option>
            <option>جلسة جماعية</option>
          </select>
        </div>
        <div class="form-group">
          <label>مدة الجلسة (دقيقة)</label>
          <input type="number" id="fu-duration" value="30" min="5" max="120">
        </div>
      </div>
      <div class="form-group">
        <label>ملاحظات الجلسة</label>
        <textarea id="fu-notes" placeholder="ما تم مناقشته وملاحظات الأخصائي..."></textarea>
      </div>
      <div class="form-group">
        <label>خطوات المتابعة القادمة</label>
        <textarea id="fu-next" placeholder="الإجراءات المطلوبة في الجلسة القادمة..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>تاريخ الجلسة القادمة</label>
          <input type="date" id="fu-next-date">
        </div>
        <div class="form-group">
          <label>تحديث حالة الملف</label>
          <select id="fu-case-status">
            <option value="open">مفتوحة</option>
            <option value="progressing">قيد المتابعة</option>
            <option value="closed">مغلقة</option>
          </select>
        </div>
      </div>
      <button class="btn btn-success" onclick="swSaveFollowup()"><i class="bi bi-save"></i> حفظ الجلسة</button>
    </div>

    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-clock-history" style="color:#6b7280"></i> سجل الجلسات</div>
      <div class="form-group">
        <label>عرض جلسات حالة</label>
        <select id="fu-view-case" onchange="swLoadFollowups()">
          <option value="">اختر حالة...</option>
        </select>
      </div>
      <div id="followups-list"></div>
    </div>
  </div>

  <!-- ===== التقارير ===== -->
  <div class="sw-panel" id="sw-reports">
    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-bar-chart-fill" style="color:#d4920a"></i> إحصائيات عامة</div>
      <div id="sw-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">
        <div style="text-align:center;padding:20px;color:#6b7280">⏳ جاري التحميل...</div>
      </div>
    </div>
    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-table" style="color:#0b2545"></i> جميع الحالات</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="swPrintReport()"><i class="bi bi-printer"></i> طباعة التقرير</button>
        <button class="btn btn-outline btn-sm" onclick="swExportExcel()"><i class="bi bi-file-excel"></i> Excel</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>النوع</th><th>الأولوية</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
          <tbody id="report-cases-body"><tr><td colspan="8" style="text-align:center;padding:20px;color:#6b7280">⏳ جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ===== إعدادات الاستبيان ===== -->
  <div class="sw-panel" id="sw-settings">
    <div class="sw-card">
      <div class="sw-title"><i class="bi bi-gear-fill" style="color:#6b7280"></i> إدارة أسئلة الاستبيان</div>
      <p style="font-size:13px;color:#6b7280;margin-bottom:14px">يمكنك إضافة وتعديل وحذف أسئلة الاستبيان. التغييرات تُطبق فوراً على الحالات الجديدة.</p>
      <button class="btn btn-success" onclick="swShowAddQuestion()" style="margin-bottom:16px"><i class="bi bi-plus-circle"></i> إضافة سؤال جديد</button>
      <div id="questions-list"></div>
    </div>
  </div>

  <!-- Modal: تعديل سؤال -->
  <div class="modal-overlay" id="modal-question">
    <div class="modal">
      <button class="modal-close" onclick="swCloseModal('modal-question')">✕</button>
      <div style="font-size:16px;font-weight:900;color:#0b2545;margin-bottom:16px"><i class="bi bi-patch-question-fill" style="color:#7c3aed"></i> إضافة / تعديل سؤال</div>
      <input type="hidden" id="q-edit-id">
      <div class="form-group">
        <label>نص السؤال</label>
        <input type="text" id="q-text" placeholder="اكتب السؤال هنا...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>نوع السؤال</label>
          <select id="q-type" onchange="swShowOptionsField()">
            <option value="text">نص حر</option>
            <option value="yesno">نعم / لا</option>
            <option value="select">اختيار واحد</option>
            <option value="rating">تقييم 1-5</option>
          </select>
        </div>
        <div class="form-group">
          <label>إلزامي؟</label>
          <select id="q-required">
            <option value="true">نعم</option>
            <option value="false">لا</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="q-options-wrap" style="display:none">
        <label>الخيارات (سطر لكل خيار)</label>
        <textarea id="q-options" rows="4" placeholder="خيار 1&#10;خيار 2&#10;خيار 3"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-success" onclick="swSaveQuestion()"><i class="bi bi-save"></i> حفظ</button>
        <button class="btn btn-outline" onclick="swCloseModal('modal-question')">إلغاء</button>
      </div>
    </div>
  </div>

  <!-- Modal: تفاصيل الحالة -->
  <div class="modal-overlay" id="modal-case">
    <div class="modal" style="max-width:600px">
      <button class="modal-close" onclick="swCloseModal('modal-case')">✕</button>
      <div id="modal-case-content"></div>
    </div>
  </div>
  `;

  // تحميل البيانات
  await Promise.all([
    swLoadStudents(),
    swLoadQuestions(),
    swLoadCases(),
  ]);

  // تعيين التاريخ الافتراضي
  var today = new Date().toISOString().split('T')[0];
  if(document.getElementById('fu-date')) document.getElementById('fu-date').value = today;
}

// ══ Tab Switch ══
window.swTab = function(id) {
  document.querySelectorAll('.sw-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.sw-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  event.currentTarget.classList.add('active');
  if(id==='sw-reports') swLoadReports();
  if(id==='sw-settings') swRenderQuestions();
};

// ══ Modal ══
window.swCloseModal = function(id){ document.getElementById(id)?.classList.remove('show'); };

// ══ تحميل الطلاب ══
async function swLoadStudents() {
  try {
    var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
    allStudents = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch(e){}
}

// ══ بحث الطلاب ══
window.swSearchStudent = function() {
  var q = document.getElementById('case-student-search')?.value.trim().toLowerCase();
  var res = document.getElementById('case-search-results');
  if(!q || q.length<2){ res.innerHTML=''; return; }
  var matches = allStudents.filter(s=>(s.name||'').toLowerCase().includes(q)).slice(0,5);
  if(!matches.length){ res.innerHTML='<p style="color:#6b7280;font-size:13px">لا نتائج</p>'; return; }
  res.innerHTML = matches.map(s=>`
    <div onclick="swSelectStudent('${s.id}','${s.name}','${s.classId||''}')"
      style="padding:9px 14px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;margin-bottom:6px;font-size:14px;font-weight:700"
      onmouseover="this.style.background='#eaf4fd'" onmouseout="this.style.background=''">
      ${s.name} — <span style="color:#6b7280">${s.classId||''}</span>
    </div>`).join('');
};

window.swSelectStudent = function(id, name, cls) {
  window._swStudentId = id;
  window._swStudentClass = cls;
  document.getElementById('case-student-name').value = name;
  document.getElementById('case-search-results').innerHTML = '';
  document.getElementById('case-student-search').value = '';
};

// ══ تحميل الأسئلة ══
async function swLoadQuestions() {
  try {
    var snap = await getDocs(query(collection(db,`schools/${schoolId}/survey_questions`), orderBy('order')));
    if(snap.empty) {
      // أسئلة افتراضية
      surveyQuestions = DEFAULT_QUESTIONS.map((q,i)=>({...q, order:i}));
      // حفظ الأسئلة الافتراضية
      for(var q of surveyQuestions) {
        await addDoc(collection(db,`schools/${schoolId}/survey_questions`), q);
      }
    } else {
      surveyQuestions = snap.docs.map(d=>({id:d.id,...d.data()}));
    }
  } catch(e){ surveyQuestions = DEFAULT_QUESTIONS; }
}

// ══ عرض الأسئلة في الإعدادات ══
window.swRenderQuestions = function() {
  var list = document.getElementById('questions-list');
  if(!list) return;
  if(!surveyQuestions.length){ list.innerHTML='<p style="color:#6b7280">لا توجد أسئلة</p>'; return; }
  var typeLabel = {text:'نص حر',yesno:'نعم/لا',select:'اختيار',rating:'تقييم'};
  list.innerHTML = surveyQuestions.map((q,i)=>`
    <div class="q-card">
      <span style="font-size:18px;color:#6b7280;font-weight:900">${i+1}</span>
      <div style="flex:1">
        <div class="q-text">${q.text}</div>
        <div style="display:flex;gap:6px;margin-top:4px">
          <span class="q-type">${typeLabel[q.type]||q.type}</span>
          ${q.required?'<span class="q-required">* إلزامي</span>':''}
          ${q.options?'<span style="font-size:11px;color:#6b7280">('+q.options.length+' خيارات)</span>':''}
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="swEditQuestion('${q.id||i}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-danger btn-sm" onclick="swDeleteQuestion('${q.id||i}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>`).join('');
};

// ══ إضافة سؤال ══
window.swShowAddQuestion = function() {
  document.getElementById('q-edit-id').value = '';
  document.getElementById('q-text').value = '';
  document.getElementById('q-type').value = 'text';
  document.getElementById('q-required').value = 'true';
  document.getElementById('q-options').value = '';
  document.getElementById('q-options-wrap').style.display='none';
  document.getElementById('modal-question').classList.add('show');
};

window.swShowOptionsField = function() {
  var type = document.getElementById('q-type').value;
  document.getElementById('q-options-wrap').style.display = type==='select'?'block':'none';
};

window.swEditQuestion = function(qid) {
  var q = surveyQuestions.find(x=>(x.id||'')===qid) || surveyQuestions[parseInt(qid)];
  if(!q) return;
  document.getElementById('q-edit-id').value = q.id||qid;
  document.getElementById('q-text').value = q.text;
  document.getElementById('q-type').value = q.type;
  document.getElementById('q-required').value = q.required?'true':'false';
  document.getElementById('q-options').value = (q.options||[]).join('\n');
  document.getElementById('q-options-wrap').style.display = q.type==='select'?'block':'none';
  document.getElementById('modal-question').classList.add('show');
};

window.swSaveQuestion = async function() {
  var text = document.getElementById('q-text').value.trim();
  var type = document.getElementById('q-type').value;
  var required = document.getElementById('q-required').value==='true';
  var optionsRaw = document.getElementById('q-options').value.trim();
  var editId = document.getElementById('q-edit-id').value;
  if(!text){ swToast('أدخل نص السؤال','error'); return; }
  var qData = { text, type, required, order: surveyQuestions.length };
  if(type==='select') qData.options = optionsRaw.split('\n').map(o=>o.trim()).filter(Boolean);
  try {
    if(editId) {
      // تعديل
      var existing = surveyQuestions.find(x=>x.id===editId);
      if(existing?.id && existing.id.length > 5) {
        await updateDoc(doc(db,`schools/${schoolId}/survey_questions`,existing.id), qData);
        Object.assign(existing, qData);
      }
    } else {
      // إضافة
      var ref = await addDoc(collection(db,`schools/${schoolId}/survey_questions`), qData);
      surveyQuestions.push({id:ref.id,...qData});
    }
    swCloseModal('modal-question');
    swRenderQuestions();
    swToast('تم الحفظ','success');
  } catch(e){ swToast('خطأ: '+e.message,'error'); }
};

window.swDeleteQuestion = async function(qid) {
  if(!confirm('حذف هذا السؤال؟')) return;
  try {
    var q = surveyQuestions.find(x=>(x.id||'')===qid);
    if(q?.id && q.id.length > 5) await deleteDoc(doc(db,`schools/${schoolId}/survey_questions`,q.id));
    surveyQuestions = surveyQuestions.filter(x=>(x.id||'')!==qid);
    swRenderQuestions();
    swToast('تم الحذف','success');
  } catch(e){ swToast('خطأ','error'); }
};

// ══ فتح حالة ══
window.swOpenCase = async function(andSurvey=false) {
  var studentId = window._swStudentId;
  var studentName = document.getElementById('case-student-name')?.value.trim();
  if(!studentName){ swToast('اختر الطالب أولاً','error'); return; }
  var type = document.getElementById('case-type')?.value;
  var priority = document.getElementById('case-priority')?.value;
  var notes = document.getElementById('case-notes')?.value.trim();
  try {
    var ref = await addDoc(collection(db,`schools/${schoolId}/social_cases`),{
      studentId: studentId||'',
      studentName,
      studentClass: window._swStudentClass||'',
      type, priority, notes,
      status:'open',
      createdAt:serverTimestamp(),
      surveyAnswers:{},
      followups:[]
    });
    swToast('تم فتح الحالة','success');
    await swLoadCases();
    document.getElementById('case-student-name').value='';
    document.getElementById('case-notes').value='';
    window._swStudentId = null;
    if(andSurvey) {
      swTab('sw-survey');
      document.getElementById('survey-case-sel').value = ref.id;
      await swLoadCaseSurvey();
    }
  } catch(e){ swToast('خطأ: '+e.message,'error'); }
};

window.swOpenCaseWithSurvey = function(){ window.swOpenCase(true); };

// ══ تحميل الحالات ══
async function swLoadCases() {
  try {
    var snap = await getDocs(query(collection(db,`schools/${schoolId}/social_cases`), orderBy('createdAt','desc')));
    allCases = snap.docs.map(d=>({id:d.id,...d.data()}));
    swRenderCases(allCases);
    swPopulateCaseSelects();
  } catch(e){}
}

function swPopulateCaseSelects() {
  var selects = ['survey-case-sel','fu-case-sel','fu-view-case'];
  selects.forEach(selId=>{
    var sel = document.getElementById(selId);
    if(!sel) return;
    var first = sel.options[0];
    sel.innerHTML='';
    if(first) sel.appendChild(first);
    allCases.filter(c=>c.status!=='closed').forEach(c=>{
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${c.studentName} — ${c.type}`;
      sel.appendChild(o);
    });
  });
}

function swRenderCases(list) {
  var el = document.getElementById('cases-list');
  if(!el) return;
  if(!list.length){ el.innerHTML='<p style="text-align:center;padding:30px;color:#6b7280">لا توجد حالات مسجلة</p>'; return; }
  var priorityClass = {'عاجلة':'p-urgent','عالية':'p-high','متوسطة':'p-medium','منخفضة':'p-low'};
  var statusLabel = {'open':'🟢 مفتوحة','progressing':'🔵 قيد المتابعة','closed':'⚫ مغلقة'};
  el.innerHTML = list.map(c=>`
    <div class="case-card" onclick="swViewCase('${c.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:15px;font-weight:900;color:#0b2545">${c.studentName}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${c.studentClass||''} — ${c.type}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span class="priority-badge ${priorityClass[c.priority]||'p-medium'}">${c.priority||'متوسطة'}</span>
          <span style="font-size:12px;font-weight:700;color:#6b7280">${statusLabel[c.status]||'مفتوحة'}</span>
          <span style="font-size:11px;color:#9ca3af">${c.createdAt?.toDate?c.createdAt.toDate().toLocaleDateString('ar-KW'):''}</span>
        </div>
      </div>
      ${c.notes?`<div style="font-size:12px;color:#6b7280;margin-top:8px;border-top:1px solid #f1f5f9;padding-top:6px">${c.notes}</div>`:''}
    </div>`).join('');
}

window.swFilterCases = function() {
  var q = document.getElementById('cases-search')?.value.toLowerCase();
  var priority = document.getElementById('cases-filter-priority')?.value;
  var status = document.getElementById('cases-filter-status')?.value;
  var list = allCases;
  if(q) list = list.filter(c=>(c.studentName||'').toLowerCase().includes(q)||(c.type||'').includes(q));
  if(priority) list = list.filter(c=>c.priority===priority);
  if(status) list = list.filter(c=>c.status===status);
  swRenderCases(list);
};

// ══ عرض تفاصيل الحالة ══
window.swViewCase = async function(id) {
  var c = allCases.find(x=>x.id===id);
  if(!c) return;
  var priorityClass = {'عاجلة':'p-urgent','عالية':'p-high','متوسطة':'p-medium','منخفضة':'p-low'};
  var statusLabel = {'open':'مفتوحة','progressing':'قيد المتابعة','closed':'مغلقة'};
  var answers = c.surveyAnswers||{};
  var answersHtml = Object.keys(answers).length
    ? `<div style="margin-top:12px"><strong>إجابات الاستبيان:</strong><div style="margin-top:8px;display:grid;gap:6px">`+
      surveyQuestions.map(q=>`<div style="background:#f8fafc;border-radius:6px;padding:8px"><span style="font-weight:700;font-size:12px;color:#6b7280">${q.text}</span><div style="font-weight:700;color:#0b2545">${answers[q.id||q.text]||'—'}</div></div>`).join('')+
      `</div></div>` : '';
  document.getElementById('modal-case-content').innerHTML = `
    <div style="font-size:17px;font-weight:900;color:#0b2545;margin-bottom:14px">${c.studentName}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div><label style="font-size:11px;color:#6b7280">الصف</label><div style="font-weight:700">${c.studentClass||'—'}</div></div>
      <div><label style="font-size:11px;color:#6b7280">نوع الحالة</label><div style="font-weight:700">${c.type||'—'}</div></div>
      <div><label style="font-size:11px;color:#6b7280">الأولوية</label><span class="priority-badge ${priorityClass[c.priority]||'p-medium'}">${c.priority||'—'}</span></div>
      <div><label style="font-size:11px;color:#6b7280">الحالة</label><div style="font-weight:700">${statusLabel[c.status]||'مفتوحة'}</div></div>
    </div>
    ${c.notes?`<div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px">${c.notes}</div>`:''}
    ${answersHtml}
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="swCloseModal('modal-case');swTab('sw-survey');document.getElementById('survey-case-sel').value='${id}';swLoadCaseSurvey()">
        <i class="bi bi-clipboard-check"></i> تعبئة الاستبيان
      </button>
      <button class="btn btn-outline btn-sm" onclick="swCloseModal('modal-case');swTab('sw-followup');document.getElementById('fu-case-sel').value='${id}'">
        <i class="bi bi-calendar-plus"></i> إضافة جلسة
      </button>
      <button class="btn btn-danger btn-sm" onclick="swCloseCase('${id}')">
        <i class="bi bi-x-circle"></i> إغلاق الحالة
      </button>
    </div>`;
  document.getElementById('modal-case').classList.add('show');
};

window.swCloseCase = async function(id) {
  if(!confirm('إغلاق هذه الحالة؟')) return;
  try {
    await updateDoc(doc(db,`schools/${schoolId}/social_cases`,id),{status:'closed'});
    swCloseModal('modal-case');
    await swLoadCases();
    swToast('تم إغلاق الحالة','success');
  } catch(e){ swToast('خطأ','error'); }
};

// ══ الاستبيان ══
window.swLoadCaseSurvey = async function() {
  var caseId = document.getElementById('survey-case-sel')?.value;
  var container = document.getElementById('survey-form-container');
  var form = document.getElementById('survey-questions-form');
  if(!caseId||!container||!form){ container.style.display='none'; return; }

  var c = allCases.find(x=>x.id===caseId);
  var answers = c?.surveyAnswers||{};
  container.style.display='block';
  currentCaseId = caseId;

  form.innerHTML = `
    <div style="background:#eaf4fd;border-radius:8px;padding:12px;margin-bottom:16px">
      <strong>${c?.studentName||''}</strong> — ${c?.type||''} — <span class="priority-badge p-${c?.priority==='عاجلة'?'urgent':c?.priority==='عالية'?'high':c?.priority==='متوسطة'?'medium':'low'}">${c?.priority||''}</span>
    </div>
    ${surveyQuestions.map((q,i)=>{
      var qId = q.id||`q${i}`;
      var val = answers[qId]||'';
      if(q.type==='yesno') return `
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="font-weight:700;margin-bottom:10px">${i+1}. ${q.text} ${q.required?'<span style="color:#dc2626">*</span>':''}</div>
          <div style="display:flex;gap:10px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700"><input type="radio" name="${qId}" value="نعم" ${val==='نعم'?'checked':''}> نعم</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700"><input type="radio" name="${qId}" value="لا" ${val==='لا'?'checked':''}> لا</label>
          </div>
        </div>`;
      if(q.type==='select') return `
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="font-weight:700;margin-bottom:8px">${i+1}. ${q.text} ${q.required?'<span style="color:#dc2626">*</span>':''}</div>
          <select name="${qId}" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none">
            <option value="">اختر...</option>
            ${(q.options||[]).map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>`;
      if(q.type==='rating') return `
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="font-weight:700;margin-bottom:8px">${i+1}. ${q.text} ${q.required?'<span style="color:#dc2626">*</span>':''}</div>
          <div style="display:flex;gap:8px;flex-direction:row-reverse;justify-content:flex-end">
            ${[5,4,3,2,1].map(n=>`
              <label style="cursor:pointer;font-size:28px;color:${val==n?'#f59e0b':'#d1d5db'}" onclick="this.style.color='#f59e0b';this.parentElement.querySelectorAll('label').forEach(l=>l!=this&&(l.style.color='#d1d5db'));this.parentElement.querySelector('input').value='${n}'">★</label>
            `).join('')}
            <input type="hidden" name="${qId}" value="${val}">
          </div>
        </div>`;
      return `
        <div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="font-weight:700;margin-bottom:8px">${i+1}. ${q.text} ${q.required?'<span style="color:#dc2626">*</span>':''}</div>
          <textarea name="${qId}" rows="2" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none;resize:vertical" placeholder="أدخل الإجابة...">${val}</textarea>
        </div>`;
    }).join('')}`;
};

window.swSaveSurvey = async function() {
  if(!currentCaseId){ swToast('اختر حالة أولاً','error'); return; }
  var form = document.getElementById('survey-questions-form');
  var answers = {};
  surveyQuestions.forEach((q,i)=>{
    var qId = q.id||`q${i}`;
    if(q.type==='yesno') {
      var checked = form.querySelector(`input[name="${qId}"]:checked`);
      answers[qId] = checked?.value||'';
    } else {
      var el = form.querySelector(`[name="${qId}"]`);
      answers[qId] = el?.value||'';
    }
  });
  try {
    await updateDoc(doc(db,`schools/${schoolId}/social_cases`,currentCaseId),{surveyAnswers:answers, surveyDate:serverTimestamp()});
    var c = allCases.find(x=>x.id===currentCaseId);
    if(c) c.surveyAnswers = answers;
    swToast('تم حفظ الاستبيان','success');
  } catch(e){ swToast('خطأ: '+e.message,'error'); }
};

window.swPrintSurvey = function() {
  if(!currentCaseId){ swToast('اختر حالة','error'); return; }
  var c = allCases.find(x=>x.id===currentCaseId);
  if(!c) return;
  var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
  var answers = c.surveyAnswers||{};
  var rows = surveyQuestions.map((q,i)=>{
    var qId = q.id||`q${i}`;
    return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">${q.text}</td><td style="padding:8px;border:1px solid #ddd">${answers[qId]||'—'}</td></tr>`;
  }).join('');
  var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
  <style>body{font-family:Cairo,sans-serif;direction:rtl;padding:20px;font-size:12px}
  @page{size:A4;margin:15mm}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:10px;text-align:right}</style></head><body>
  <div style="border-bottom:3px double #0b2545;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between">
    <div>دولة الكويت<br>وزارة التربية</div>
    <div style="text-align:center;font-size:16px;font-weight:900;color:#0b2545">استبيان الأخصائي الاجتماعي<br><span style="font-size:13px">${c.studentName}</span></div>
    <div style="text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
  </div>
  <table style="margin-bottom:16px">
    <tr><th>الطالب</th><td style="padding:8px;border:1px solid #ddd">${c.studentName}</td><th>الصف</th><td style="padding:8px;border:1px solid #ddd">${c.studentClass||'—'}</td></tr>
    <tr><th>نوع الحالة</th><td style="padding:8px;border:1px solid #ddd">${c.type}</td><th>الأولوية</th><td style="padding:8px;border:1px solid #ddd">${c.priority}</td></tr>
  </table>
  <table><thead><tr><th>السؤال</th><th>الإجابة</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:11px">
    <div style="text-align:center">توقيع الأخصائي<br><br>______________</div>
    <div style="text-align:center">المنظومة الرقمية</div>
    <div style="text-align:center">توقيع المدير<br><br>______________</div>
  </div>
  <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
  var b = new Blob([html],{type:'text/html;charset=utf-8'});
  window.open(URL.createObjectURL(b),'_blank');
};

// ══ المتابعة ══
window.swSaveFollowup = async function() {
  var caseId = document.getElementById('fu-case-sel')?.value;
  var date = document.getElementById('fu-date')?.value;
  var type = document.getElementById('fu-type')?.value;
  var duration = document.getElementById('fu-duration')?.value;
  var notes = document.getElementById('fu-notes')?.value.trim();
  var nextSteps = document.getElementById('fu-next')?.value.trim();
  var nextDate = document.getElementById('fu-next-date')?.value;
  var status = document.getElementById('fu-case-status')?.value;
  if(!caseId||!date){ swToast('اختر الحالة والتاريخ','error'); return; }
  try {
    await addDoc(collection(db,`schools/${schoolId}/social_cases/${caseId}/followups`),{
      date, type, duration:parseInt(duration)||30, notes, nextSteps, nextDate,
      createdAt:serverTimestamp()
    });
    await updateDoc(doc(db,`schools/${schoolId}/social_cases`,caseId),{status, lastFollowup:date});
    var c = allCases.find(x=>x.id===caseId);
    if(c) c.status = status;
    swToast('تم حفظ الجلسة','success');
    document.getElementById('fu-notes').value='';
    document.getElementById('fu-next').value='';
  } catch(e){ swToast('خطأ: '+e.message,'error'); }
};

window.swLoadFollowups = async function() {
  var caseId = document.getElementById('fu-view-case')?.value;
  var el = document.getElementById('followups-list');
  if(!caseId||!el){ if(el) el.innerHTML=''; return; }
  try {
    var snap = await getDocs(query(collection(db,`schools/${schoolId}/social_cases/${caseId}/followups`), orderBy('createdAt','desc')));
    if(snap.empty){ el.innerHTML='<p style="color:#6b7280;text-align:center;padding:20px">لا توجد جلسات مسجلة</p>'; return; }
    el.innerHTML = snap.docs.map(d=>{
      var r=d.data();
      return `<div style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <strong>${r.type}</strong>
          <span style="font-size:12px;color:#6b7280">${r.date} — ${r.duration} دقيقة</span>
        </div>
        ${r.notes?`<p style="font-size:13px;margin-bottom:6px">${r.notes}</p>`:''}
        ${r.nextSteps?`<div style="background:#eaf4fd;border-radius:6px;padding:8px;font-size:12px"><strong>الخطوة القادمة:</strong> ${r.nextSteps}</div>`:''}
        ${r.nextDate?`<div style="font-size:11px;color:#6b7280;margin-top:6px">📅 موعد الجلسة القادمة: ${r.nextDate}</div>`:''}
      </div>`;
    }).join('');
  } catch(e){ el.innerHTML='<p style="color:#dc2626">خطأ في التحميل</p>'; }
};

// ══ التقارير ══
async function swLoadReports() {
  var tbody = document.getElementById('report-cases-body');
  var stats = document.getElementById('sw-stats');
  if(!allCases.length) await swLoadCases();
  var open = allCases.filter(c=>c.status==='open').length;
  var progressing = allCases.filter(c=>c.status==='progressing').length;
  var closed = allCases.filter(c=>c.status==='closed').length;
  var urgent = allCases.filter(c=>c.priority==='عاجلة').length;
  if(stats) stats.innerHTML = `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#0b2545">${allCases.length}</div><div style="font-size:11px;color:#6b7280">إجمالي الحالات</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#16a34a">${open}</div><div style="font-size:11px;color:#6b7280">مفتوحة</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#1a78c2">${progressing}</div><div style="font-size:11px;color:#6b7280">قيد المتابعة</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#6b7280">${closed}</div><div style="font-size:11px;color:#6b7280">مغلقة</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#dc2626">${urgent}</div><div style="font-size:11px;color:#6b7280">عاجلة</div></div>`;
  var priorityClass = {'عاجلة':'p-urgent','عالية':'p-high','متوسطة':'p-medium','منخفضة':'p-low'};
  var statusLabel = {'open':'مفتوحة','progressing':'متابعة','closed':'مغلقة'};
  if(tbody) tbody.innerHTML = allCases.map((c,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><strong>${c.studentName}</strong></td>
      <td>${c.studentClass||'—'}</td>
      <td>${c.type}</td>
      <td><span class="priority-badge ${priorityClass[c.priority]||'p-medium'}">${c.priority}</span></td>
      <td>${statusLabel[c.status]||'مفتوحة'}</td>
      <td>${c.createdAt?.toDate?c.createdAt.toDate().toLocaleDateString('ar-KW'):'—'}</td>
      <td><button class="btn btn-outline btn-sm" onclick="swViewCase('${c.id}')"><i class="bi bi-eye"></i></button></td>
    </tr>`).join('');
}

window.swPrintReport = function() {
  var user = JSON.parse(localStorage.getItem('hs_user')||'{}');
  var rows = allCases.map((c,i)=>`<tr><td>${i+1}</td><td>${c.studentName}</td><td>${c.studentClass||'—'}</td><td>${c.type}</td><td>${c.priority}</td><td>${c.status==='open'?'مفتوحة':c.status==='progressing'?'متابعة':'مغلقة'}</td><td>${c.createdAt?.toDate?c.createdAt.toDate().toLocaleDateString('ar-KW'):'—'}</td></tr>`).join('');
  var html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:Cairo,sans-serif;direction:rtl;padding:16px;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#0b2545;color:#fff;padding:8px;text-align:right}td{padding:7px;border:1px solid #ddd}@page{size:A4;margin:10mm}</style></head><body>
  <div style="border-bottom:3px solid #0b2545;margin-bottom:14px;padding-bottom:10px;display:flex;justify-content:space-between">
    <div style="font-size:11px">دولة الكويت<br>وزارة التربية</div>
    <div style="text-align:center;font-size:16px;font-weight:900;color:#0b2545">تقرير الحالات الاجتماعية</div>
    <div style="font-size:11px;text-align:left">${user.schoolName||''}<br>${new Date().toLocaleDateString('ar-KW')}</div>
  </div>
  <table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>النوع</th><th>الأولوية</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:20px;display:flex;justify-content:space-between;font-size:10px"><div>توقيع الأخصائي: ______________</div><div>المنظومة الرقمية</div><div>توقيع المدير: ______________</div></div>
  <script>setTimeout(()=>window.print(),500)<\/script></body></html>`;
  var b = new Blob([html],{type:'text/html;charset=utf-8'});
  window.open(URL.createObjectURL(b),'_blank');
};

window.swExportExcel = function() {
  if(!window.XLSX){ swToast('مكتبة Excel غير محملة','error'); return; }
  var data = [['#','الطالب','الصف','نوع الحالة','الأولوية','الحالة','التاريخ']];
  allCases.forEach((c,i)=>data.push([i+1,c.studentName,c.studentClass||'',c.type,c.priority,c.status,c.createdAt?.toDate?c.createdAt.toDate().toLocaleDateString('ar-KW'):'']));
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb,'الحالات',ws);
  XLSX.writeFile(wb,'social_cases.xlsx');
};

// ══ Toast ══
function swToast(msg,type='info'){
  var t=document.createElement('div');
  t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${type==='error'?'#dc2626':type==='success'?'#16a34a':'#0b2545'};color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999;font-family:Cairo,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)`;
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}
