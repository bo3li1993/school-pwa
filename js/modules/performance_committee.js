import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════
// لوحة لجنة متابعة الأداء المدرسي
// ══════════════════════════════════════════════

var pcData = {
    visits: [],
    tasks: [],
    meetings: [],
    students: [],
    users: []
};

var pcActiveTab = 'overview';

export async function initPerformanceCommitteeModule() {
    var container = document.getElementById('tab-performance-committee');
    if (!container) return;

    container.innerHTML = `
    <style>
    .pc-header {
        background: linear-gradient(135deg, #0b2545 0%, #1a78c2 100%);
        border-radius: 14px;
        padding: 20px 24px;
        color: #fff;
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
    }
    .pc-header h2 { font-size: 18px; font-weight: 900; margin: 0; }
    .pc-header p  { font-size: 12px; color: rgba(255,255,255,.75); margin: 4px 0 0; }

    .pc-tabs {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
        margin-bottom: 18px;
        scrollbar-width: none;
    }
    .pc-tabs::-webkit-scrollbar { display: none; }

    .pc-tab {
        flex-shrink: 0;
        padding: 9px 18px;
        border: 2px solid var(--line);
        border-radius: 10px;
        font-family: 'Cairo',sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        background: #fff;
        color: var(--mid);
        transition: all .2s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .pc-tab.active {
        border-color: var(--navy);
        background: var(--navy);
        color: #fff;
    }

    .pc-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
    }

    .pc-kpi {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--line);
        text-align: center;
        box-shadow: 0 2px 6px rgba(0,0,0,.04);
    }

    .pc-kpi-icon {
        font-size: 28px;
        margin-bottom: 8px;
        display: block;
    }

    .pc-kpi-num {
        font-size: 26px;
        font-weight: 900;
        display: block;
        color: var(--navy);
        margin-bottom: 4px;
    }

    .pc-kpi-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--mid);
    }

    .pc-card {
        background: #fff;
        border-radius: 12px;
        border: 1px solid var(--line);
        margin-bottom: 14px;
        overflow: hidden;
    }

    .pc-card-header {
        padding: 14px 18px;
        background: var(--off);
        border-bottom: 1px solid var(--line);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
    }

    .pc-card-title {
        font-weight: 900;
        font-size: 14px;
        color: var(--navy);
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .pc-card-body { padding: 16px; }

    .pc-add-btn {
        background: var(--sky);
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-family: 'Cairo',sans-serif;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all .2s;
    }
    .pc-add-btn:hover { opacity: .9; }

    .pc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .pc-table th {
        padding: 10px 12px;
        background: var(--navy);
        color: #fff;
        text-align: right;
        font-weight: 700;
    }
    .pc-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #f0f0f0;
    }
    .pc-table tr:last-child td { border-bottom: none; }
    .pc-table tr:hover td { background: #fafbfc; }

    .pc-badge {
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
    }
    .pc-badge.done     { background: #f0fdf4; color: #16a34a; }
    .pc-badge.progress { background: #eff6ff; color: #1a78c2; }
    .pc-badge.late     { background: #fef2f2; color: #dc2626; }

    .pc-progress-bar {
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 4px;
    }
    .pc-progress-fill {
        height: 100%;
        background: var(--sky);
        border-radius: 4px;
        transition: width .5s;
    }

    .pc-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
    }

    .pc-input, .pc-select, .pc-textarea {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid var(--line);
        border-radius: 8px;
        font-family: 'Cairo',sans-serif;
        font-size: 13px;
        font-weight: 700;
        outline: none;
        background: var(--off);
        transition: border-color .2s;
        box-sizing: border-box;
    }
    .pc-input:focus, .pc-select:focus, .pc-textarea:focus {
        border-color: var(--sky);
        background: #fff;
    }
    .pc-textarea { min-height: 80px; resize: vertical; }

    .pc-label {
        font-size: 12px;
        font-weight: 800;
        color: var(--mid);
        display: block;
        margin-bottom: 5px;
    }

    .pc-submit-btn {
        background: var(--navy);
        color: #fff;
        border: none;
        padding: 11px 24px;
        border-radius: 8px;
        font-family: 'Cairo',sans-serif;
        font-size: 14px;
        font-weight: 900;
        cursor: pointer;
        transition: all .2s;
    }
    .pc-submit-btn:hover { opacity: .9; }

    .pc-empty {
        text-align: center;
        padding: 30px;
        color: var(--mid);
        font-size: 13px;
        font-weight: 700;
    }

    .pc-section-hidden { display: none; }
    </style>

    <!-- هيدر اللوحة -->
    <div class="pc-header">
        <div>
            <h2><i class="bi bi-clipboard2-data-fill"></i> لوحة متابعة الأداء المدرسي</h2>
            <p>لجنة متابعة الأداء — ${new Date().toLocaleDateString('ar-KW', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
        </div>
        <button class="pc-add-btn" onclick="window.pcExportReport()">
            <i class="bi bi-printer-fill"></i> تصدير التقرير
        </button>
    </div>

    <!-- تبويبات اللجنة -->
    <div class="pc-tabs">
        <button class="pc-tab active" onclick="window.pcSwitchTab('overview', this)">
            <i class="bi bi-speedometer2"></i> نظرة عامة
        </button>
        <button class="pc-tab" onclick="window.pcSwitchTab('visits', this)">
            <i class="bi bi-eye-fill"></i> الزيارات الصفية
        </button>
        <button class="pc-tab" onclick="window.pcSwitchTab('tasks', this)">
            <i class="bi bi-list-check"></i> التكليفات والقرارات
        </button>
        <button class="pc-tab" onclick="window.pcSwitchTab('meetings', this)">
            <i class="bi bi-people-fill"></i> محاضر الاجتماعات
        </button>
        <button class="pc-tab" onclick="window.pcSwitchTab('students', this)">
            <i class="bi bi-person-lines-fill"></i> متابعة الطلاب
        </button>
    </div>

    <!-- ===== نظرة عامة ===== -->
    <div id="pc-tab-overview">
        <div class="pc-kpi-grid" id="pc-kpis">
            <div class="pc-kpi"><span class="pc-kpi-icon">👁️</span><span class="pc-kpi-num" id="kpi-visits">-</span><span class="pc-kpi-label">زيارة صفية منجزة</span></div>
            <div class="pc-kpi"><span class="pc-kpi-icon">✅</span><span class="pc-kpi-num" id="kpi-tasks-done">-</span><span class="pc-kpi-label">قرار منجز</span></div>
            <div class="pc-kpi"><span class="pc-kpi-icon">⏳</span><span class="pc-kpi-num" id="kpi-tasks-pending">-</span><span class="pc-kpi-label">قرار قيد التنفيذ</span></div>
            <div class="pc-kpi"><span class="pc-kpi-icon">📋</span><span class="pc-kpi-num" id="kpi-meetings">-</span><span class="pc-kpi-label">اجتماع منعقد</span></div>
        </div>

        <!-- آخر القرارات -->
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-list-check"></i> آخر القرارات والتكليفات</span>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;">
                <div id="pc-recent-tasks"><div class="pc-empty">⏳ جاري التحميل...</div></div>
            </div>
        </div>

        <!-- آخر الزيارات -->
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-eye-fill"></i> آخر الزيارات الصفية</span>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;">
                <div id="pc-recent-visits"><div class="pc-empty">⏳ جاري التحميل...</div></div>
            </div>
        </div>
    </div>

    <!-- ===== الزيارات الصفية ===== -->
    <div id="pc-tab-visits" class="pc-section-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> تسجيل زيارة صفية جديدة</span>
            </div>
            <div class="pc-card-body">
                <div class="pc-form-grid">
                    <div>
                        <label class="pc-label">اسم المعلم *</label>
                        <select id="pc-visit-teacher" class="pc-select">
                            <option value="">-- اختر المعلم --</option>
                        </select>
                    </div>
                    <div>
                        <label class="pc-label">المادة *</label>
                        <input type="text" id="pc-visit-subject" class="pc-input" placeholder="الرياضيات">
                    </div>
                    <div>
                        <label class="pc-label">الصف *</label>
                        <input type="text" id="pc-visit-class" class="pc-input" placeholder="6/1">
                    </div>
                    <div>
                        <label class="pc-label">التقييم العام</label>
                        <select id="pc-visit-rating" class="pc-select">
                            <option value="ممتاز">⭐⭐⭐⭐⭐ ممتاز</option>
                            <option value="جيد جداً">⭐⭐⭐⭐ جيد جداً</option>
                            <option value="جيد" selected>⭐⭐⭐ جيد</option>
                            <option value="مقبول">⭐⭐ مقبول</option>
                            <option value="يحتاج تحسين">⭐ يحتاج تحسين</option>
                        </select>
                    </div>
                </div>
                <div class="pc-form-grid">
                    <div>
                        <label class="pc-label">نقاط القوة</label>
                        <textarea id="pc-visit-strengths" class="pc-textarea" placeholder="نقاط القوة الملاحظة..."></textarea>
                    </div>
                    <div>
                        <label class="pc-label">التوصيات والتغذية الراجعة</label>
                        <textarea id="pc-visit-recommendations" class="pc-textarea" placeholder="التوصيات..."></textarea>
                    </div>
                </div>
                <button class="pc-submit-btn" onclick="window.pcSaveVisit()">
                    <i class="bi bi-check-circle-fill"></i> حفظ الزيارة
                </button>
            </div>
        </div>

        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-table"></i> سجل الزيارات الصفية</span>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;">
                <div id="pc-visits-list"><div class="pc-empty">⏳ جاري التحميل...</div></div>
            </div>
        </div>
    </div>

    <!-- ===== التكليفات والقرارات ===== -->
    <div id="pc-tab-tasks" class="pc-section-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> إضافة قرار أو تكليف جديد</span>
            </div>
            <div class="pc-card-body">
                <div class="pc-form-grid">
                    <div>
                        <label class="pc-label">عنوان القرار / التكليف *</label>
                        <input type="text" id="pc-task-title" class="pc-input" placeholder="مثال: متابعة أداء المعلمين الجدد">
                    </div>
                    <div>
                        <label class="pc-label">المسؤول عن التنفيذ *</label>
                        <select id="pc-task-owner" class="pc-select">
                            <option value="">-- اختر المسؤول --</option>
                        </select>
                    </div>
                    <div>
                        <label class="pc-label">تاريخ الاستحقاق *</label>
                        <input type="date" id="pc-task-due" class="pc-input">
                    </div>
                    <div>
                        <label class="pc-label">الأولوية</label>
                        <select id="pc-task-priority" class="pc-select">
                            <option value="عالية">🔴 عالية</option>
                            <option value="متوسطة" selected>🟡 متوسطة</option>
                            <option value="منخفضة">🟢 منخفضة</option>
                        </select>
                    </div>
                </div>
                <div style="margin-bottom:14px;">
                    <label class="pc-label">التفاصيل والملاحظات</label>
                    <textarea id="pc-task-notes" class="pc-textarea" placeholder="تفاصيل إضافية..."></textarea>
                </div>
                <button class="pc-submit-btn" onclick="window.pcSaveTask()">
                    <i class="bi bi-check-circle-fill"></i> حفظ القرار
                </button>
            </div>
        </div>

        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-table"></i> سجل القرارات والتكليفات</span>
                <div style="display:flex; gap:6px;">
                    <select id="pc-task-filter" onchange="window.pcFilterTasks()" class="pc-select" style="padding:6px 10px; font-size:12px; width:auto;">
                        <option value="">الكل</option>
                        <option value="قيد التنفيذ">قيد التنفيذ</option>
                        <option value="منجز">منجز</option>
                        <option value="متأخر">متأخر</option>
                    </select>
                </div>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;">
                <div id="pc-tasks-list"><div class="pc-empty">⏳ جاري التحميل...</div></div>
            </div>
        </div>
    </div>

    <!-- ===== محاضر الاجتماعات ===== -->
    <div id="pc-tab-meetings" class="pc-section-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> تسجيل اجتماع جديد</span>
            </div>
            <div class="pc-card-body">
                <div class="pc-form-grid">
                    <div>
                        <label class="pc-label">رقم الاجتماع</label>
                        <input type="number" id="pc-meeting-num" class="pc-input" placeholder="1">
                    </div>
                    <div>
                        <label class="pc-label">تاريخ الاجتماع *</label>
                        <input type="date" id="pc-meeting-date" class="pc-input" value="${getTodayISO()}">
                    </div>
                    <div>
                        <label class="pc-label">نوع الاجتماع</label>
                        <select id="pc-meeting-type" class="pc-select">
                            <option value="دوري">دوري</option>
                            <option value="طارئ">طارئ</option>
                            <option value="تقييمي">تقييمي</option>
                        </select>
                    </div>
                </div>
                <div style="margin-bottom:12px;">
                    <label class="pc-label">جدول الأعمال *</label>
                    <textarea id="pc-meeting-agenda" class="pc-textarea" placeholder="جدول الأعمال..."></textarea>
                </div>
                <div style="margin-bottom:14px;">
                    <label class="pc-label">القرارات الصادرة</label>
                    <textarea id="pc-meeting-decisions" class="pc-textarea" placeholder="القرارات الصادرة عن الاجتماع..."></textarea>
                </div>
                <button class="pc-submit-btn" onclick="window.pcSaveMeeting()">
                    <i class="bi bi-check-circle-fill"></i> حفظ المحضر
                </button>
            </div>
        </div>

        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-journal-text"></i> سجل محاضر الاجتماعات</span>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;">
                <div id="pc-meetings-list"><div class="pc-empty">⏳ جاري التحميل...</div></div>
            </div>
        </div>
    </div>

    <!-- ===== متابعة الطلاب ===== -->
    <div id="pc-tab-students" class="pc-section-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-people-fill"></i> قائمة الطلاب بحاجة متابعة</span>
                <button class="pc-add-btn" onclick="window.pcShowAddStudentModal()">
                    <i class="bi bi-plus-circle-fill"></i> إضافة طالب للمتابعة
                </button>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;">
                <div id="pc-students-list"><div class="pc-empty">⏳ جاري التحميل...</div></div>
            </div>
        </div>
    </div>

    <!-- Modal إضافة طالب -->
    <div id="pc-student-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:480px; width:92%; direction:rtl; max-height:90vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-weight:900; color:var(--navy); margin:0;">إضافة طالب للمتابعة</h3>
                <button onclick="document.getElementById('pc-student-modal').style.display='none'" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div class="pc-form-grid">
                <div>
                    <label class="pc-label">اسم الطالب *</label>
                    <input type="text" id="pc-student-name" class="pc-input" placeholder="اسم الطالب">
                </div>
                <div>
                    <label class="pc-label">الصف</label>
                    <input type="text" id="pc-student-class" class="pc-input" placeholder="6/1">
                </div>
                <div>
                    <label class="pc-label">نوع الخطة</label>
                    <select id="pc-student-plan" class="pc-select">
                        <option value="علاجية">علاجية</option>
                        <option value="إثرائية">إثرائية</option>
                        <option value="متابعة سلوكية">متابعة سلوكية</option>
                    </select>
                </div>
                <div>
                    <label class="pc-label">المعلم المسؤول</label>
                    <select id="pc-student-teacher" class="pc-select">
                        <option value="">-- اختر المعلم --</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label class="pc-label">الملاحظات</label>
                <textarea id="pc-student-notes" class="pc-textarea" placeholder="ملاحظات..."></textarea>
            </div>
            <button class="pc-submit-btn" style="width:100%;" onclick="window.pcSaveStudentFollowup()">
                <i class="bi bi-check-circle-fill"></i> حفظ
            </button>
        </div>
    </div>`;

    // تحميل البيانات
    await pcLoadAll();
}

// ══════════════════════════════════════════════
// تحميل كل البيانات
// ══════════════════════════════════════════════
async function pcLoadAll() {
    var schoolId = getActiveSchoolId();
    try {
        // تحميل المستخدمين للقوائم
        var usersSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
        pcData.users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(u => ['teacher', 'department_head', 'admin', 'assistant_manager', 'wing_supervisor'].includes(u.role));

        // تعبئة قوائم المعلمين
        var teacherOptions = pcData.users.map(u => `<option value="${u.name}">${u.name} (${u.role === 'teacher' ? 'معلم' : 'إدارة'})</option>`).join('');
        ['pc-visit-teacher', 'pc-task-owner', 'pc-student-teacher'].forEach(id => {
            var el = document.getElementById(id);
            if (el) el.innerHTML += teacherOptions;
        });

        // تحميل الزيارات
        var visitsSnap = await getDocs(query(collection(db, 'pc_visits'), where('schoolId', '==', schoolId)));
        pcData.visits = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // تحميل التكليفات
        var tasksSnap = await getDocs(query(collection(db, 'pc_tasks'), where('schoolId', '==', schoolId)));
        pcData.tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // تحديث حالة المتأخرة
        var today = getTodayISO();
        pcData.tasks = pcData.tasks.map(t => {
            if (t.status !== 'منجز' && t.dueDate && t.dueDate < today) return { ...t, status: 'متأخر' };
            return t;
        });

        // تحميل الاجتماعات
        var meetingsSnap = await getDocs(query(collection(db, 'pc_meetings'), where('schoolId', '==', schoolId)));
        pcData.meetings = meetingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // تحميل متابعة الطلاب
        var studentsSnap = await getDocs(query(collection(db, 'pc_student_followup'), where('schoolId', '==', schoolId)));
        pcData.students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // رسم الواجهة
        pcRenderOverview();
        pcRenderVisits();
        pcRenderTasks();
        pcRenderMeetings();
        pcRenderStudents();

    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
}

// ══════════════════════════════════════════════
// تبديل التبويبات
// ══════════════════════════════════════════════
window.pcSwitchTab = function(tab, btn) {
    pcActiveTab = tab;
    document.querySelectorAll('.pc-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['overview', 'visits', 'tasks', 'meetings', 'students'].forEach(t => {
        var el = document.getElementById('pc-tab-' + t);
        if (el) el.classList.toggle('pc-section-hidden', t !== tab);
    });
};

// ══════════════════════════════════════════════
// النظرة العامة
// ══════════════════════════════════════════════
function pcRenderOverview() {
    var done = pcData.tasks.filter(t => t.status === 'منجز').length;
    var pending = pcData.tasks.filter(t => t.status !== 'منجز').length;

    document.getElementById('kpi-visits').textContent = pcData.visits.length;
    document.getElementById('kpi-tasks-done').textContent = done;
    document.getElementById('kpi-tasks-pending').textContent = pending;
    document.getElementById('kpi-meetings').textContent = pcData.meetings.length;

    // آخر 5 قرارات
    var recentTasksEl = document.getElementById('pc-recent-tasks');
    var recentTasks = pcData.tasks.slice(0, 5);
    if (!recentTasks.length) {
        recentTasksEl.innerHTML = '<div class="pc-empty">لا توجد قرارات</div>';
    } else {
        recentTasksEl.innerHTML = `<table class="pc-table">
            <thead><tr><th>القرار</th><th>المسؤول</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
            <tbody>${recentTasks.map(t => `
            <tr>
                <td style="font-weight:700;">${t.title || '-'}</td>
                <td>${t.owner || '-'}</td>
                <td>${t.dueDate || '-'}</td>
                <td><span class="pc-badge ${t.status === 'منجز' ? 'done' : t.status === 'متأخر' ? 'late' : 'progress'}">${t.status || 'قيد التنفيذ'}</span></td>
            </tr>`).join('')}</tbody>
        </table>`;
    }

    // آخر 5 زيارات
    var recentVisitsEl = document.getElementById('pc-recent-visits');
    var recentVisits = pcData.visits.slice(0, 5);
    if (!recentVisits.length) {
        recentVisitsEl.innerHTML = '<div class="pc-empty">لا توجد زيارات</div>';
    } else {
        recentVisitsEl.innerHTML = `<table class="pc-table">
            <thead><tr><th>المعلم</th><th>المادة</th><th>الصف</th><th>التقييم</th></tr></thead>
            <tbody>${recentVisits.map(v => `
            <tr>
                <td style="font-weight:700;">${v.teacher || '-'}</td>
                <td>${v.subject || '-'}</td>
                <td>${v.classId || '-'}</td>
                <td><span class="pc-badge ${v.rating === 'ممتاز' ? 'done' : 'progress'}">${v.rating || '-'}</span></td>
            </tr>`).join('')}</tbody>
        </table>`;
    }
}

// ══════════════════════════════════════════════
// الزيارات الصفية
// ══════════════════════════════════════════════
function pcRenderVisits() {
    var el = document.getElementById('pc-visits-list');
    if (!el) return;
    if (!pcData.visits.length) { el.innerHTML = '<div class="pc-empty">لا توجد زيارات مسجلة</div>'; return; }

    el.innerHTML = `<table class="pc-table">
        <thead><tr><th>#</th><th>المعلم</th><th>المادة</th><th>الصف</th><th>التقييم</th><th>نقاط القوة</th><th>التوصيات</th><th>إجراء</th></tr></thead>
        <tbody>${pcData.visits.map((v, i) => `
        <tr>
            <td style="color:#aaa;">${i+1}</td>
            <td style="font-weight:700;">${v.teacher || '-'}</td>
            <td>${v.subject || '-'}</td>
            <td>${v.classId || '-'}</td>
            <td><span class="pc-badge ${v.rating === 'ممتاز' ? 'done' : 'progress'}">${v.rating || '-'}</span></td>
            <td style="font-size:12px; color:#666; max-width:150px;">${v.strengths ? v.strengths.slice(0,50) + '...' : '-'}</td>
            <td style="font-size:12px; color:#666; max-width:150px;">${v.recommendations ? v.recommendations.slice(0,50) + '...' : '-'}</td>
            <td><button onclick="window.pcDeleteVisit('${v.id}')" style="background:#fef2f2;color:#dc2626;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;">حذف</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

window.pcSaveVisit = async function() {
    var teacher = document.getElementById('pc-visit-teacher').value;
    var subject = document.getElementById('pc-visit-subject').value.trim();
    var classId = document.getElementById('pc-visit-class').value.trim();
    var rating = document.getElementById('pc-visit-rating').value;
    var strengths = document.getElementById('pc-visit-strengths').value.trim();
    var recommendations = document.getElementById('pc-visit-recommendations').value.trim();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');

    if (!teacher || !subject || !classId) { window.showToast?.('أكمل الحقول المطلوبة', 'warning'); return; }

    try {
        await addDoc(collection(db, 'pc_visits'), {
            schoolId: getActiveSchoolId(),
            teacher, subject, classId, rating, strengths, recommendations,
            visitedBy: me.name || me.userId,
            date: getTodayISO(),
            createdAt: serverTimestamp()
        });
        window.showToast?.('✅ تم حفظ الزيارة');
        ['pc-visit-teacher', 'pc-visit-subject', 'pc-visit-class', 'pc-visit-strengths', 'pc-visit-recommendations'].forEach(id => {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

window.pcDeleteVisit = async function(id) {
    if (!confirm('حذف الزيارة نهائياً؟')) return;
    try {
        await deleteDoc(doc(db, 'pc_visits', id));
        window.showToast?.('✅ تم الحذف');
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

// ══════════════════════════════════════════════
// التكليفات والقرارات
// ══════════════════════════════════════════════
function pcRenderTasks(filter) {
    var el = document.getElementById('pc-tasks-list');
    if (!el) return;
    var tasks = filter ? pcData.tasks.filter(t => t.status === filter) : pcData.tasks;
    if (!tasks.length) { el.innerHTML = '<div class="pc-empty">لا توجد قرارات</div>'; return; }

    el.innerHTML = `<table class="pc-table">
        <thead><tr><th>#</th><th>القرار/التكليف</th><th>المسؤول</th><th>الأولوية</th><th>الاستحقاق</th><th>الحالة</th><th>إجراء</th></tr></thead>
        <tbody>${tasks.map((t, i) => `
        <tr>
            <td style="color:#aaa;">${i+1}</td>
            <td style="font-weight:700;">${t.title || '-'}</td>
            <td>${t.owner || '-'}</td>
            <td><span style="font-size:12px;">${t.priority || '-'}</span></td>
            <td style="font-size:12px; ${t.status === 'متأخر' ? 'color:#dc2626; font-weight:700;' : ''}">${t.dueDate || '-'}</td>
            <td><span class="pc-badge ${t.status === 'منجز' ? 'done' : t.status === 'متأخر' ? 'late' : 'progress'}">${t.status || 'قيد التنفيذ'}</span></td>
            <td style="display:flex; gap:4px;">
                ${t.status !== 'منجز' ? `<button onclick="window.pcMarkTaskDone('${t.id}')" style="background:#f0fdf4;color:#16a34a;border:none;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;">✅</button>` : ''}
                <button onclick="window.pcDeleteTask('${t.id}')" style="background:#fef2f2;color:#dc2626;border:none;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;">🗑</button>
            </td>
        </tr>`).join('')}</tbody>
    </table>`;
}

window.pcFilterTasks = function() {
    var filter = document.getElementById('pc-task-filter').value;
    pcRenderTasks(filter);
};

window.pcSaveTask = async function() {
    var title = document.getElementById('pc-task-title').value.trim();
    var owner = document.getElementById('pc-task-owner').value;
    var dueDate = document.getElementById('pc-task-due').value;
    var priority = document.getElementById('pc-task-priority').value;
    var notes = document.getElementById('pc-task-notes').value.trim();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');

    if (!title || !dueDate) { window.showToast?.('أكمل الحقول المطلوبة', 'warning'); return; }

    try {
        await addDoc(collection(db, 'pc_tasks'), {
            schoolId: getActiveSchoolId(),
            title, owner, dueDate, priority, notes,
            status: 'قيد التنفيذ',
            createdBy: me.name || me.userId,
            createdAt: serverTimestamp()
        });
        window.showToast?.('✅ تم حفظ القرار');
        ['pc-task-title', 'pc-task-due', 'pc-task-notes'].forEach(id => { var el = document.getElementById(id); if (el) el.value = ''; });
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

window.pcMarkTaskDone = async function(id) {
    try {
        await updateDoc(doc(db, 'pc_tasks', id), { status: 'منجز', completedAt: serverTimestamp() });
        window.showToast?.('✅ تم تحديد القرار كمنجز');
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

window.pcDeleteTask = async function(id) {
    if (!confirm('حذف القرار نهائياً؟')) return;
    try {
        await deleteDoc(doc(db, 'pc_tasks', id));
        window.showToast?.('✅ تم الحذف');
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

// ══════════════════════════════════════════════
// محاضر الاجتماعات
// ══════════════════════════════════════════════
function pcRenderMeetings() {
    var el = document.getElementById('pc-meetings-list');
    if (!el) return;
    if (!pcData.meetings.length) { el.innerHTML = '<div class="pc-empty">لا توجد محاضر اجتماعات</div>'; return; }

    el.innerHTML = `<table class="pc-table">
        <thead><tr><th>#</th><th>رقم الاجتماع</th><th>التاريخ</th><th>النوع</th><th>جدول الأعمال</th><th>القرارات</th><th>إجراء</th></tr></thead>
        <tbody>${pcData.meetings.map((m, i) => `
        <tr>
            <td style="color:#aaa;">${i+1}</td>
            <td style="font-weight:700; text-align:center;">${m.meetingNum || '-'}</td>
            <td>${m.date || '-'}</td>
            <td><span class="pc-badge progress">${m.type || 'دوري'}</span></td>
            <td style="font-size:12px; max-width:150px;">${m.agenda ? m.agenda.slice(0,60) + '...' : '-'}</td>
            <td style="font-size:12px; max-width:150px;">${m.decisions ? m.decisions.slice(0,60) + '...' : '-'}</td>
            <td><button onclick="window.pcDeleteMeeting('${m.id}')" style="background:#fef2f2;color:#dc2626;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;">حذف</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

window.pcSaveMeeting = async function() {
    var meetingNum = document.getElementById('pc-meeting-num').value;
    var date = document.getElementById('pc-meeting-date').value;
    var type = document.getElementById('pc-meeting-type').value;
    var agenda = document.getElementById('pc-meeting-agenda').value.trim();
    var decisions = document.getElementById('pc-meeting-decisions').value.trim();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');

    if (!date || !agenda) { window.showToast?.('أكمل الحقول المطلوبة', 'warning'); return; }

    try {
        await addDoc(collection(db, 'pc_meetings'), {
            schoolId: getActiveSchoolId(),
            meetingNum: parseInt(meetingNum) || 1,
            date, type, agenda, decisions,
            recordedBy: me.name || me.userId,
            createdAt: serverTimestamp()
        });
        window.showToast?.('✅ تم حفظ المحضر');
        ['pc-meeting-num', 'pc-meeting-agenda', 'pc-meeting-decisions'].forEach(id => { var el = document.getElementById(id); if (el) el.value = ''; });
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

window.pcDeleteMeeting = async function(id) {
    if (!confirm('حذف المحضر نهائياً؟')) return;
    try {
        await deleteDoc(doc(db, 'pc_meetings', id));
        window.showToast?.('✅ تم الحذف');
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

// ══════════════════════════════════════════════
// متابعة الطلاب
// ══════════════════════════════════════════════
function pcRenderStudents() {
    var el = document.getElementById('pc-students-list');
    if (!el) return;
    if (!pcData.students.length) { el.innerHTML = '<div class="pc-empty">لا يوجد طلاب في المتابعة</div>'; return; }

    el.innerHTML = `<table class="pc-table">
        <thead><tr><th>#</th><th>اسم الطالب</th><th>الصف</th><th>نوع الخطة</th><th>المعلم المسؤول</th><th>الملاحظات</th><th>إجراء</th></tr></thead>
        <tbody>${pcData.students.map((s, i) => `
        <tr>
            <td style="color:#aaa;">${i+1}</td>
            <td style="font-weight:700;">${s.name || '-'}</td>
            <td>${s.classId || '-'}</td>
            <td><span class="pc-badge ${s.planType === 'إثرائية' ? 'done' : 'progress'}">${s.planType || '-'}</span></td>
            <td>${s.teacher || '-'}</td>
            <td style="font-size:12px; color:#666;">${s.notes ? s.notes.slice(0,50) : '-'}</td>
            <td><button onclick="window.pcDeleteStudent('${s.id}')" style="background:#fef2f2;color:#dc2626;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;">حذف</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

window.pcShowAddStudentModal = function() {
    document.getElementById('pc-student-modal').style.display = 'flex';
};

window.pcSaveStudentFollowup = async function() {
    var name = document.getElementById('pc-student-name').value.trim();
    var classId = document.getElementById('pc-student-class').value.trim();
    var planType = document.getElementById('pc-student-plan').value;
    var teacher = document.getElementById('pc-student-teacher').value;
    var notes = document.getElementById('pc-student-notes').value.trim();

    if (!name) { window.showToast?.('أدخل اسم الطالب', 'warning'); return; }

    try {
        await addDoc(collection(db, 'pc_student_followup'), {
            schoolId: getActiveSchoolId(),
            name, classId, planType, teacher, notes,
            createdAt: serverTimestamp()
        });
        window.showToast?.('✅ تم إضافة الطالب للمتابعة');
        document.getElementById('pc-student-modal').style.display = 'none';
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

window.pcDeleteStudent = async function(id) {
    if (!confirm('إزالة الطالب من المتابعة؟')) return;
    try {
        await deleteDoc(doc(db, 'pc_student_followup', id));
        window.showToast?.('✅ تم الحذف');
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};

// ══════════════════════════════════════════════
// تصدير التقرير
// ══════════════════════════════════════════════
window.pcExportReport = function() {
    var today = new Date().toLocaleDateString('ar-KW');
    var content = `
    <html dir="rtl"><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl;}
    h1{color:#0b2545;border-bottom:3px solid #0b2545;padding-bottom:10px;}
    h2{color:#1a78c2;margin-top:20px;}
    table{width:100%;border-collapse:collapse;margin-top:10px;}
    th{background:#0b2545;color:#fff;padding:8px;}
    td{border:1px solid #ddd;padding:8px;}
    .badge{padding:3px 8px;border-radius:4px;font-size:12px;}
    </style></head><body>
    <h1>تقرير لجنة متابعة الأداء المدرسي — ${today}</h1>

    <h2>الإحصاءات العامة</h2>
    <table><tr><th>البند</th><th>العدد</th></tr>
    <tr><td>الزيارات الصفية</td><td>${pcData.visits.length}</td></tr>
    <tr><td>القرارات المنجزة</td><td>${pcData.tasks.filter(t=>t.status==='منجز').length}</td></tr>
    <tr><td>القرارات قيد التنفيذ</td><td>${pcData.tasks.filter(t=>t.status!=='منجز').length}</td></tr>
    <tr><td>الاجتماعات</td><td>${pcData.meetings.length}</td></tr>
    <tr><td>الطلاب تحت المتابعة</td><td>${pcData.students.length}</td></tr>
    </table>

    <h2>القرارات والتكليفات</h2>
    <table><tr><th>القرار</th><th>المسؤول</th><th>الاستحقاق</th><th>الحالة</th></tr>
    ${pcData.tasks.map(t=>`<tr><td>${t.title}</td><td>${t.owner||'-'}</td><td>${t.dueDate||'-'}</td><td>${t.status||'-'}</td></tr>`).join('')}
    </table>

    <h2>الزيارات الصفية</h2>
    <table><tr><th>المعلم</th><th>المادة</th><th>الصف</th><th>التقييم</th></tr>
    ${pcData.visits.map(v=>`<tr><td>${v.teacher}</td><td>${v.subject||'-'}</td><td>${v.classId||'-'}</td><td>${v.rating||'-'}</td></tr>`).join('')}
    </table>
    </body></html>`;

    var blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var w = window.open(url, '_blank');
    if (w) setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 800);
};
