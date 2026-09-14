import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══ البنود الحرفية من النماذج الرسمية ══
var VISIT_CRITERIA = {
    "عربي": [
        "نظافة – الفصل / مختبر لغوي / العروض الضوئية",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "إعداد خطط تقويم للطلاب الضعاف",
        "إعداد خطط اثرائية للطلاب الفائقين",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية",
        "الجملة الإملائية العلاجية",
        "التقويم (إعداد الفقرة وتحقيقها)"
    ],
    "انجليزي": [
        "نظافة – الفصل / مختبر لغوي / العروض الضوئية",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "إعداد خطط تقويم للطلاب الضعاف",
        "إعداد خطط اثرائية للطلاب الفائقين",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية",
        "إستخدام اللغة الإنجليزية فى الحوار داخل الفصل"
    ],
    "رياضيات": [
        "نظافة – الفصل / قاعة العروض الضوئية",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "إعداد خطط تقويم للطلاب الضعاف",
        "إعداد خطط اثرائية للطلاب الفائقين",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية"
    ],
    "علوم": [
        "نظافة – الفصل / مختبر العلوم",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "إعداد خطط تقويم للطلاب الضعاف",
        "إعداد خطط اثرائية للطلاب الفائقين",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية",
        "الإجابة على التقويم مع الطلاب خلال الحصة"
    ],
    "اجتماعيات": [
        "نظافة – الفصل / قاعة العروض الضوئية",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "إعداد خطط تقويم للطلاب الضعاف",
        "إعداد خطط اثرائية للطلاب الفائقين",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية"
    ],
    "تربية_اسلامية": [
        "نظافة – الفصل / المسجد / العروض الضوئية",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف في المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "إعداد خطط تقويم للطلاب الضعاف",
        "إعداد خطط إثرائية للطلاب الفائقين",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية",
        "الدقة في قراءة الآيات والأحاديث"
    ],
    "حاسوب": [
        "نظافة - الفصل - مختبر الحاسوب",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "تنفيذ التطبيق العلمي بسلاسة أمام الطلاب",
        "متابعة الطلاب أثناء التطبيق العملي",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية"
    ],
    "كهرباء": [
        "نظافة الورشة - ترتيب الأدوات والخامات",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "تنفيذ التطبيق العلمي بسلاسة أمام الطلاب",
        "متابعة الطلاب أثناء التطبيق العملي",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية"
    ],
    "ديكور": [
        "نظافة الورشة - ترتيب الأدوات والخامات",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "تنفيذ التطبيق العلمي بسلاسة أمام الطلاب",
        "متابعة الطلاب أثناء التطبيق العملي",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "متابعة الأعمال التحريرية"
    ],
    "فنية": [
        "نظافة – المرسم - ترتيب الأدوات والخامات",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة - الخط",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "تجهيز المرسم بالوسائل والخامات",
        "التمكين من التعامل مع الخامات",
        "متابعة أعمال الطلاب وإنتاجهم",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية"
    ],
    "تربية_بدنية": [
        "نظافة – الملاعب الخارجية / الصالة الرياضية",
        "التزام الطلاب بالزي الرياضي",
        "إعداد الدرس حسب البرنامج الزمني والتحضير الذهني",
        "تسلسل الأداء حسب خطة التحضير",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "تمرينات الإحماء وتناسبها مع المهارة",
        "العلاقة مع الطلاب وأسلوب التعامل",
        "تناسب الإعداد الخاص مع المهارة المقررة",
        "التدرج فى شرح المهارة",
        "نشاط المجموعات فى تطبيق المهارة",
        "تنفيذ اللعبة الصغيرة وأثرها على الطلاب",
        "تأدية تمرين الختام والتهدئة",
        "استخدام النداءات الصحيحة والسلامة",
        "التصرف فى المواقف المختلفة الطارئة",
        "تنظيم استخدام زمن الحصة الدراسية",
        "المظهر العام للمعلم وشخصيته",
        "الأدوات الرياضية المستخدمة وكفايتها"
    ],
    "موسيقى": [
        "نظافة – قاعة الموسيقى / قاعة العروض الضوئية",
        "ترتيب الطلاب – تنظيم القاعة (طاولات – مقاعد)",
        "تنسيق السبورة",
        "إعداد الدرس / التحضير الذهني",
        "عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات",
        "استجابة الطلاب خلال المناقشة والشرح",
        "العلاقة مع الطلاب خلال المناقشة والشرح",
        "التصرف فى المواقف المختلفة الطارئة",
        "السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية",
        "التمكين من المادة العلمية",
        "الأهتمام بمواهب المتعلمين وتنميتها",
        "التمكين من استخدام الآلات الموسيقية",
        "المظهر العام للمعلم وشخصيته",
        "التقنيات التربوية والوسائل المستخدمة",
        "تنظيم استخدام زمن الحصة الدراسية"
    ]
};

var RATINGS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];
var RATING_SCORES = { 'ممتاز': 5, 'جيد جداً': 4, 'جيد': 3, 'مقبول': 2, 'ضعيف': 1 };
var RATING_COLORS = { 'ممتاز': '#16a34a', 'جيد جداً': '#2563eb', 'جيد': '#0891b2', 'مقبول': '#d97706', 'ضعيف': '#dc2626' };


// ══ بنود زيارة الفصل الافتراضية ══
var DEFAULT_CLASSROOM_CRITERIA = [
    "نظافة الفصل وترتيبه",
    "انضباط الطلاب وهدوئهم",
    "تفاعل الطلاب مع الدرس",
    "وجود المعلم ومباشرته للحصة",
    "توفر الوسائل التعليمية",
    "تنسيق السبورة وظهورها",
    "التزام الطلاب بالزي المدرسي",
    "سلوك الطلاب وأخلاقياتهم",
    "استغلال زمن الحصة",
    "مستوى التفاعل والمشاركة"
];
var classroomCriteriaCache = null;

var pcData = { visits: [], tasks: [], meetings: [], students: [], users: [] };
var currentVisitRatings = {};

export async function initPerformanceCommitteeModule() {
    var container = document.getElementById('tab-performance-committee');
    if (!container) return;

    container.innerHTML = `
    <style>
    .pc-wrap{font-family:'Cairo',sans-serif;direction:rtl;}
    .pc-hdr{background:linear-gradient(135deg,#0b2545,#1a78c2);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
    .pc-hdr h2{font-size:16px;font-weight:900;margin:0;}
    .pc-hdr p{font-size:11px;color:rgba(255,255,255,.7);margin:3px 0 0;}
    .pc-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none;}
    .pc-tabs::-webkit-scrollbar{display:none;}
    .pc-tab{flex-shrink:0;padding:8px 14px;border:2px solid var(--line);border-radius:10px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:#fff;color:var(--mid);transition:all .2s;}
    .pc-tab.active{border-color:var(--navy);background:var(--navy);color:#fff;}
    .pc-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px;}
    .pc-kpi{background:#fff;border-radius:12px;padding:14px;border:1px solid var(--line);text-align:center;}
    .pc-kpi-num{font-size:22px;font-weight:900;display:block;color:var(--navy);margin-bottom:3px;}
    .pc-kpi-label{font-size:11px;font-weight:700;color:var(--mid);}
    .pc-card{background:#fff;border-radius:12px;border:1px solid var(--line);margin-bottom:14px;overflow:hidden;}
    .pc-card-header{padding:12px 16px;background:var(--off);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
    .pc-card-title{font-weight:900;font-size:13px;color:var(--navy);display:flex;align-items:center;gap:8px;}
    .pc-card-body{padding:14px;}
    .pc-btn{background:var(--sky);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;}
    .pc-btn.sm{padding:5px 9px;font-size:11px;}
    .pc-btn.red{background:#dc2626;}
    .pc-btn.green{background:#16a34a;}
    .pc-tbl{width:100%;border-collapse:collapse;font-size:12px;}
    .pc-tbl th{padding:8px 10px;background:var(--navy);color:#fff;text-align:right;font-weight:700;}
    .pc-tbl td{padding:8px 10px;border-bottom:1px solid #f0f0f0;}
    .pc-tbl tr:last-child td{border-bottom:none;}
    .pc-badge{padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;}
    .pc-badge.done{background:#f0fdf4;color:#16a34a;}
    .pc-badge.prg{background:#eff6ff;color:#1a78c2;}
    .pc-badge.late{background:#fef2f2;color:#dc2626;}
    .pc-fld{margin-bottom:11px;}
    .pc-lbl{font-size:12px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px;}
    .pc-inp,.pc-sel{width:100%;padding:10px 13px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700;outline:none;background:var(--off);box-sizing:border-box;}
    .pc-inp:focus,.pc-sel:focus{border-color:var(--sky);background:#fff;}
    .pc-ta{width:100%;padding:10px 13px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700;outline:none;background:var(--off);min-height:65px;resize:vertical;box-sizing:border-box;}
    .pc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:11px;margin-bottom:12px;}
    .pc-submit{width:100%;padding:12px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:900;cursor:pointer;}
    .pc-hidden{display:none;}
    .pc-empty{text-align:center;padding:25px;color:var(--mid);font-size:13px;font-weight:700;}
    .vt{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;}
    .vt th{background:var(--navy);color:#fff;padding:7px 9px;text-align:right;font-size:11px;}
    .vt td{padding:7px 9px;border-bottom:1px solid #eee;vertical-align:middle;}
    .vt tr:last-child td{border-bottom:none;}
    .rd{display:flex;gap:3px;justify-content:center;}
    .rd input{display:none;}
    .rd-dot{width:30px;height:30px;border-radius:50%;border:2px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#aaa;cursor:pointer;background:#f9f9f9;transition:all .15s;}
    .rd input:checked+.rd-dot{border-color:var(--sky);background:var(--sky);color:#fff;}
    .pc-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:16px;}
    .pc-modal.show{display:flex;}
    .pc-mbox{background:#fff;border-radius:16px;padding:22px;max-width:720px;width:100%;max-height:90vh;overflow-y:auto;direction:rtl;}
    .pc-mhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
    .pc-mtitle{font-size:15px;font-weight:900;color:var(--navy);margin:0;}
    </style>

    <div class="pc-wrap">
    <div class="pc-hdr">
        <div>
            <h2><i class="bi bi-clipboard2-data-fill"></i> لوحة متابعة الأداء المدرسي</h2>
            <p>لجنة متابعة الأداء — ${new Date().toLocaleDateString('ar-KW',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <button class="pc-btn" onclick="window.pcExportReport()"><i class="bi bi-printer-fill"></i> تصدير</button>
    </div>

    <div class="pc-tabs">
        <button class="pc-tab active" onclick="window.pcSwitchTab('overview',this)"><i class="bi bi-speedometer2"></i> نظرة عامة</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('visits',this)"><i class="bi bi-person-check-fill"></i> تقييم أداء المعلمين</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('classroom',this)"><i class="bi bi-door-open-fill"></i> زيارة الفصل</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('tasks',this)"><i class="bi bi-list-check"></i> القرارات</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('meetings',this)"><i class="bi bi-people-fill"></i> الاجتماعات</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('students',this)"><i class="bi bi-person-lines-fill"></i> متابعة الطلاب</button>
    </div>

    <!-- نظرة عامة -->
    <div id="pc-tab-overview">
        <div class="pc-kpi-grid">
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">👁️</span><span class="pc-kpi-num" id="kpi-v">-</span><span class="pc-kpi-label">زيارة صفية</span></div>
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">✅</span><span class="pc-kpi-num" id="kpi-d">-</span><span class="pc-kpi-label">قرار منجز</span></div>
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">⏳</span><span class="pc-kpi-num" id="kpi-p">-</span><span class="pc-kpi-label">قيد التنفيذ</span></div>
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">📋</span><span class="pc-kpi-num" id="kpi-m">-</span><span class="pc-kpi-label">اجتماع</span></div>
        </div>
        <div class="pc-card"><div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-list-check"></i> آخر القرارات</span></div><div class="pc-card-body" style="overflow-x:auto;"><div id="pc-ov-tasks"><div class="pc-empty">⏳</div></div></div></div>
        <div class="pc-card"><div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-eye-fill"></i> آخر الزيارات</span></div><div class="pc-card-body" style="overflow-x:auto;"><div id="pc-ov-visits"><div class="pc-empty">⏳</div></div></div></div>
    </div>

    <!-- زيارة الفصل -->
    <div id="pc-tab-classroom" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-door-open-fill"></i> سجل زيارات الفصول</span>
                <div style="display:flex;gap:8px;">
                    <button class="pc-btn" style="background:#059669;" onclick="window.pcOpenCriteriaSettings()"><i class="bi bi-gear-fill"></i> ضبط البنود</button>
                    <button class="pc-btn" onclick="window.pcOpenClassroomModal()"><i class="bi bi-plus-circle-fill"></i> زيارة جديدة</button>
                </div>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-classroom-list"><div class="pc-empty">⏳</div></div></div>
        </div>
    </div>

    <!-- الزيارات -->
    <div id="pc-tab-visits" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-clipboard2-check-fill"></i> سجل الزيارات الصفية</span>
                <button class="pc-btn" onclick="window.pcOpenVisitModal()"><i class="bi bi-plus-circle-fill"></i> زيارة جديدة</button>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-visits-list"><div class="pc-empty">⏳</div></div></div>
        </div>
    </div>

    <!-- القرارات -->
    <div id="pc-tab-tasks" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> إضافة قرار / تكليف</span></div>
            <div class="pc-card-body">
                <div class="pc-grid">
                    <div class="pc-fld"><label class="pc-lbl">عنوان القرار *</label><input type="text" id="pc-task-title" class="pc-inp" placeholder="عنوان القرار"></div>
                    <div class="pc-fld"><label class="pc-lbl">المسؤول</label><select id="pc-task-owner" class="pc-sel"><option value="">-- اختر --</option></select></div>
                    <div class="pc-fld"><label class="pc-lbl">تاريخ الاستحقاق *</label><input type="date" id="pc-task-due" class="pc-inp"></div>
                    <div class="pc-fld"><label class="pc-lbl">الأولوية</label><select id="pc-task-priority" class="pc-sel"><option value="عالية">🔴 عالية</option><option value="متوسطة" selected>🟡 متوسطة</option><option value="منخفضة">🟢 منخفضة</option></select></div>
                </div>
                <div class="pc-fld"><label class="pc-lbl">التفاصيل</label><textarea id="pc-task-notes" class="pc-ta" placeholder="تفاصيل..."></textarea></div>
                <button class="pc-submit" onclick="window.pcSaveTask()"><i class="bi bi-check-circle-fill"></i> حفظ القرار</button>
            </div>
        </div>
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-table"></i> سجل القرارات</span>
                <select id="pc-task-filter" onchange="window.pcFilterTasks()" class="pc-sel" style="padding:6px 10px;font-size:12px;width:auto;">
                    <option value="">الكل</option><option value="قيد التنفيذ">قيد التنفيذ</option><option value="منجز">منجز</option><option value="متأخر">متأخر</option>
                </select>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-tasks-list"><div class="pc-empty">⏳</div></div></div>
        </div>
    </div>

    <!-- الاجتماعات -->
    <div id="pc-tab-meetings" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> تسجيل اجتماع</span></div>
            <div class="pc-card-body">
                <div class="pc-grid">
                    <div class="pc-fld"><label class="pc-lbl">رقم الاجتماع</label><input type="number" id="pc-m-num" class="pc-inp" placeholder="1"></div>
                    <div class="pc-fld"><label class="pc-lbl">التاريخ *</label><input type="date" id="pc-m-date" class="pc-inp" value="${getTodayISO()}"></div>
                    <div class="pc-fld"><label class="pc-lbl">النوع</label><select id="pc-m-type" class="pc-sel"><option value="دوري">دوري</option><option value="طارئ">طارئ</option><option value="تقييمي">تقييمي</option></select></div>
                </div>
                <div class="pc-fld"><label class="pc-lbl">جدول الأعمال *</label><textarea id="pc-m-agenda" class="pc-ta" placeholder="جدول الأعمال..."></textarea></div>
                <div class="pc-fld"><label class="pc-lbl">القرارات الصادرة</label><textarea id="pc-m-decisions" class="pc-ta" placeholder="القرارات..."></textarea></div>
                <button class="pc-submit" onclick="window.pcSaveMeeting()"><i class="bi bi-check-circle-fill"></i> حفظ المحضر</button>
            </div>
        </div>
        <div class="pc-card"><div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-journal-text"></i> سجل المحاضر</span></div><div class="pc-card-body" style="overflow-x:auto;"><div id="pc-meetings-list"><div class="pc-empty">⏳</div></div></div></div>
    </div>

    <!-- متابعة الطلاب -->
    <div id="pc-tab-students" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-people-fill"></i> قائمة الطلاب بحاجة متابعة</span>
                <button class="pc-btn" onclick="document.getElementById('pc-stu-modal').classList.add('show')"><i class="bi bi-plus-circle-fill"></i> إضافة</button>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-students-list"><div class="pc-empty">⏳</div></div></div>
        </div>
    </div>
    </div>

    <!-- Modal نموذج الزيارة الرسمي -->
    <div id="pc-visit-modal" class="pc-modal">
        <div class="pc-mbox">
            <div class="pc-mhdr">
                <h3 class="pc-mtitle"><i class="bi bi-clipboard2-check-fill"></i> نموذج زيارة صفية رسمي</h3>
                <button onclick="document.getElementById('pc-visit-modal').classList.remove('show')" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="background:var(--off);border-radius:10px;padding:14px;margin-bottom:14px;">
                <div class="pc-grid">
                    <div class="pc-fld"><label class="pc-lbl">اسم المعلم *</label><select id="pv-teacher" class="pc-sel"><option value="">-- اختر --</option></select></div>
                    <div class="pc-fld"><label class="pc-lbl">المادة *</label>
                        <select id="pv-subject" class="pc-sel" onchange="window.pcLoadCriteria(this.value)">
                            <option value="">-- اختر المادة --</option>
                            <option value="عربي">اللغة العربية</option>
                            <option value="انجليزي">اللغة الإنجليزية</option>
                            <option value="رياضيات">الرياضيات</option>
                            <option value="علوم">العلوم</option>
                            <option value="اجتماعيات">الاجتماعيات</option>
                            <option value="تربية_اسلامية">التربية الإسلامية</option>
                            <option value="حاسوب">الحاسوب</option>
                            <option value="تربية_بدنية">التربية البدنية</option>
                            <option value="فنية">التربية الفنية</option>
                            <option value="موسيقى">التربية الموسيقية</option>
                            <option value="ديكور">الديكور</option>
                            <option value="كهرباء">الكهرباء والإلكترونيات</option>
                        </select>
                    </div>
                    <div class="pc-fld"><label class="pc-lbl">موضوع الدرس *</label><input type="text" id="pv-topic" class="pc-inp" placeholder="موضوع الدرس"></div>
                    <div class="pc-fld"><label class="pc-lbl">الصف</label><input type="text" id="pv-class" class="pc-inp" placeholder="6/1"></div>
                    <div class="pc-fld"><label class="pc-lbl">الحصة</label><select id="pv-period" class="pc-sel">${[1,2,3,4,5,6,7].map(p=>`<option value="${p}">الحصة ${p}</option>`).join('')}</select></div>
                    <div class="pc-fld"><label class="pc-lbl">التاريخ</label><input type="date" id="pv-date" class="pc-inp" value="${getTodayISO()}"></div>
                </div>
            </div>
            <div id="pv-criteria-wrap" style="display:none;">
                <h4 style="font-weight:900;color:var(--navy);margin-bottom:10px;font-size:13px;"><i class="bi bi-table"></i> عناصر التقييم والمتابعة</h4>
                <div style="overflow-x:auto;">
                    <table class="vt">
                        <thead><tr><th style="width:35px;">#</th><th>عناصر التقييم والمتابعة</th><th style="text-align:center;width:55px;">ممتاز</th><th style="text-align:center;width:55px;">جيد جداً</th><th style="text-align:center;width:55px;">جيد</th><th style="text-align:center;width:55px;">مقبول</th><th style="text-align:center;width:55px;">ضعيف</th></tr></thead>
                        <tbody id="pv-tbody"></tbody>
                    </table>
                </div>
                <div class="pc-grid" style="margin-top:12px;">
                    <div class="pc-fld"><label class="pc-lbl">نقاط القوة</label><textarea id="pv-str" class="pc-ta" placeholder="نقاط القوة..."></textarea></div>
                    <div class="pc-fld"><label class="pc-lbl">التوصيات والتغذية الراجعة</label><textarea id="pv-rec" class="pc-ta" placeholder="التوصيات..."></textarea></div>
                </div>
                <div style="background:var(--ice);border-radius:10px;padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:900;font-size:13px;color:var(--navy);">التقييم الكلي:</span>
                    <span id="pv-total" style="font-size:20px;font-weight:900;color:var(--sky);">-</span>
                </div>
                <button class="pc-submit" onclick="window.pcSaveVisit()"><i class="bi bi-check-circle-fill"></i> حفظ نموذج الزيارة</button>
            </div>
            <div id="pv-no-subject" style="text-align:center;padding:25px;color:var(--mid);font-weight:700;"><i class="bi bi-arrow-up-circle" style="font-size:28px;display:block;margin-bottom:8px;"></i>اختر المادة لعرض معايير التقييم</div>
        </div>
    </div>

    <!-- Modal إضافة طالب -->
    <div id="pc-stu-modal" class="pc-modal">
        <div class="pc-mbox" style="max-width:460px;">
            <div class="pc-mhdr"><h3 class="pc-mtitle">إضافة طالب للمتابعة</h3><button onclick="document.getElementById('pc-stu-modal').classList.remove('show')" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button></div>
            <div class="pc-grid">
                <div class="pc-fld"><label class="pc-lbl">اسم الطالب *</label><input type="text" id="pc-stu-name" class="pc-inp" placeholder="الاسم"></div>
                <div class="pc-fld"><label class="pc-lbl">الصف</label><input type="text" id="pc-stu-class" class="pc-inp" placeholder="6/1"></div>
                <div class="pc-fld"><label class="pc-lbl">نوع الخطة</label><select id="pc-stu-plan" class="pc-sel"><option value="علاجية">علاجية</option><option value="إثرائية">إثرائية</option><option value="متابعة سلوكية">متابعة سلوكية</option></select></div>
                <div class="pc-fld"><label class="pc-lbl">المعلم المسؤول</label><select id="pc-stu-teacher" class="pc-sel"><option value="">-- اختر --</option></select></div>
            </div>
            <div class="pc-fld"><label class="pc-lbl">ملاحظات</label><textarea id="pc-stu-notes" class="pc-ta" placeholder="ملاحظات..."></textarea></div>
            <button class="pc-submit" onclick="window.pcSaveStudent()"><i class="bi bi-check-circle-fill"></i> حفظ</button>
        </div>
    </div>`;

    await pcLoadAll();
}

async function pcLoadAll() {
    var schoolId = getActiveSchoolId();
    try {
        var usSnap = await getDocs(query(collection(db,'users'), where('schoolId','==',schoolId)));
        pcData.users = usSnap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>['teacher','department_head','admin','assistant_manager','wing_supervisor'].includes(u.role));
        var opts = pcData.users.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
        ['pv-teacher','pc-task-owner','pc-stu-teacher'].forEach(id=>{var el=document.getElementById(id);if(el)el.innerHTML+=opts;});

        var [vs,ts,ms,ss] = await Promise.all([
            getDocs(query(collection(db,'pc_visits'),where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'pc_tasks'),where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'pc_meetings'),where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'pc_student_followup'),where('schoolId','==',schoolId))),
        ]);
        pcData.visits = vs.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
        pcData.tasks  = ts.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
        pcData.meetings = ms.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
        pcData.students = ss.docs.map(d=>({id:d.id,...d.data()}));
        var today = getTodayISO();
        pcData.tasks = pcData.tasks.map(t=>t.status!=='منجز'&&t.dueDate&&t.dueDate<today?{...t,status:'متأخر'}:t);
        pcRenderAll(); pcLoadClassroomVisits();
    } catch(e) { window.showToast?.('❌ '+e.message,'error'); }
}

function pcRenderAll() { pcRenderOverview(); pcRenderVisits(); pcRenderTasks(); pcRenderMeetings(); pcRenderStudents(); }

window.pcSwitchTab = function(tab, btn) {
    document.querySelectorAll('.pc-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['overview','visits','classroom','tasks','meetings','students'].forEach(t=>{
        var el=document.getElementById('pc-tab-'+t);
        if(el)el.classList.toggle('pc-hidden',t!==tab);
    });
};

function pcRenderOverview() {
    var done = pcData.tasks.filter(t=>t.status==='منجز').length;
    document.getElementById('kpi-v').textContent = pcData.visits.length;
    document.getElementById('kpi-d').textContent = done;
    document.getElementById('kpi-p').textContent = pcData.tasks.length-done;
    document.getElementById('kpi-m').textContent = pcData.meetings.length;
    var t5=pcData.tasks.slice(0,5);
    document.getElementById('pc-ov-tasks').innerHTML=t5.length?`<table class="pc-tbl"><thead><tr><th>القرار</th><th>المسؤول</th><th>الاستحقاق</th><th>الحالة</th></tr></thead><tbody>${t5.map(t=>`<tr><td style="font-weight:700;">${t.title||'-'}</td><td>${t.owner||'-'}</td><td>${t.dueDate||'-'}</td><td><span class="pc-badge ${t.status==='منجز'?'done':t.status==='متأخر'?'late':'prg'}">${t.status||'قيد التنفيذ'}</span></td></tr>`).join('')}</tbody></table>`:'<div class="pc-empty">لا توجد قرارات</div>';
    var v5=pcData.visits.slice(0,5);
    document.getElementById('pc-ov-visits').innerHTML=v5.length?`<table class="pc-tbl"><thead><tr><th>المعلم</th><th>المادة</th><th>الصف</th><th>التاريخ</th><th>النسبة</th></tr></thead><tbody>${v5.map(v=>`<tr><td style="font-weight:700;">${v.teacher||'-'}</td><td>${v.subjectLabel||v.subject||'-'}</td><td>${v.classId||'-'}</td><td>${v.date||'-'}</td><td><span class="pc-badge done">${v.percentage||0}%</span></td></tr>`).join('')}</tbody></table>`:'<div class="pc-empty">لا توجد زيارات</div>';
}

window.pcOpenVisitModal = function() {
    currentVisitRatings={};
    document.getElementById('pv-subject').value='';
    document.getElementById('pv-criteria-wrap').style.display='none';
    document.getElementById('pv-no-subject').style.display='block';
    document.getElementById('pc-visit-modal').classList.add('show');
};

window.pcLoadCriteria = function(subject) {
    if (!subject||!VISIT_CRITERIA[subject]) {
        document.getElementById('pv-criteria-wrap').style.display='none';
        document.getElementById('pv-no-subject').style.display='block';
        return;
    }
    currentVisitRatings={};
    var criteria=VISIT_CRITERIA[subject];
    document.getElementById('pv-tbody').innerHTML=criteria.map((item,idx)=>`<tr>
        <td style="color:#aaa;font-weight:700;font-size:11px;">${idx+1}</td>
        <td style="font-weight:700;font-size:12px;">${item}</td>
        ${RATINGS.map(r=>`<td style="text-align:center;"><label class="rd"><input type="radio" name="r_${idx}" value="${r}" onchange="window.pcSetRating(${idx},'${r}')"><div class="rd-dot">${r.slice(0,1)}</div></label></td>`).join('')}
    </tr>`).join('');
    document.getElementById('pv-criteria-wrap').style.display='block';
    document.getElementById('pv-no-subject').style.display='none';
    pcUpdateScore();
};

window.pcSetRating = function(idx,r) { currentVisitRatings[idx]=r; pcUpdateScore(); };

function pcUpdateScore() {
    var subj=document.getElementById('pv-subject').value;
    if (!subj||!VISIT_CRITERIA[subj]) return;
    var max=VISIT_CRITERIA[subj].length*5;
    var total=Object.values(currentVisitRatings).reduce((s,r)=>s+(RATING_SCORES[r]||0),0);
    var pct=Math.round((total/max)*100);
    var el=document.getElementById('pv-total');
    el.textContent=total+' / '+max+' ('+pct+'%)';
    el.style.color=pct>=80?'#16a34a':pct>=60?'#d97706':'#dc2626';
}

window.pcSaveVisit = async function() {
    var teacher=document.getElementById('pv-teacher').value;
    var subject=document.getElementById('pv-subject').value;
    var subjEl=document.getElementById('pv-subject');
    var subjectLabel=subjEl.options[subjEl.selectedIndex]?.text||subject;
    var topic=document.getElementById('pv-topic').value.trim();
    var classId=document.getElementById('pv-class').value.trim();
    var period=document.getElementById('pv-period').value;
    var date=document.getElementById('pv-date').value;
    var strengths=document.getElementById('pv-str').value.trim();
    var recommendations=document.getElementById('pv-rec').value.trim();
    var me=JSON.parse(localStorage.getItem('hs_user')||'{}');
    if (!teacher||!subject||!topic) { window.showToast?.('أكمل الحقول المطلوبة','warning'); return; }
    var criteria=VISIT_CRITERIA[subject]||[];
    var maxScore=criteria.length*5;
    var totalScore=Object.values(currentVisitRatings).reduce((s,r)=>s+(RATING_SCORES[r]||0),0);
    var ratingsArr=criteria.map((item,idx)=>({item,rating:currentVisitRatings[idx]||'-',score:RATING_SCORES[currentVisitRatings[idx]]||0}));
    try {
        await addDoc(collection(db,'pc_visits'),{schoolId:getActiveSchoolId(),teacher,subject,subjectLabel,topic,classId,period:parseInt(period),date,strengths,recommendations,ratings:ratingsArr,totalScore,maxScore,percentage:Math.round((totalScore/maxScore)*100),visitedBy:me.name||me.userId,createdAt:serverTimestamp()});
        window.showToast?.('✅ تم حفظ نموذج الزيارة');
        document.getElementById('pc-visit-modal').classList.remove('show');
        currentVisitRatings={};
        await pcLoadAll();
    } catch(e) { window.showToast?.('❌ '+e.message,'error'); }
};

function pcRenderVisits() {
    var el=document.getElementById('pc-visits-list');
    if (!el) return;
    if (!pcData.visits.length) { el.innerHTML='<div class="pc-empty">لا توجد زيارات. اضغط "زيارة جديدة".</div>'; return; }
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>المعلم</th><th>المادة</th><th>الموضوع</th><th>الصف</th><th>التاريخ</th><th>التقييم</th><th>النسبة</th><th>إجراء</th></tr></thead><tbody>${pcData.visits.map(v=>{
        var c=v.percentage>=80?'#16a34a':v.percentage>=60?'#d97706':'#dc2626';
        return `<tr><td style="font-weight:700;">${v.teacher||'-'}</td><td>${v.subjectLabel||v.subject||'-'}</td><td style="font-size:11px;color:#666;">${v.topic||'-'}</td><td>${v.classId||'-'}</td><td>${v.date||'-'}</td><td style="font-weight:700;color:${c};">${v.totalScore||0}/${v.maxScore||0}</td><td><span class="pc-badge" style="background:${c}22;color:${c};">${v.percentage||0}%</span></td><td style="display:flex;gap:4px;"><button onclick="window.pcPrintVisit('${v.id}')" class="pc-btn sm">طباعة</button><button onclick="window.pcDelVisit('${v.id}')" class="pc-btn sm red">🗑</button></td></tr>`;
    }).join('')}</tbody></table>`;
}

window.pcPrintVisit = function(id) {
    var v=pcData.visits.find(x=>x.id===id);
    if (!v) return;
    var rows=(v.ratings||[]).map((r,i)=>`<tr><td style="padding:6px 10px;color:#666;text-align:center;">${i+1}</td><td style="padding:6px 10px;font-weight:600;">${r.item}</td>${RATINGS.map(rt=>`<td style="padding:6px 10px;text-align:center;">${r.rating===rt?'✓':''}</td>`).join('')}<td style="padding:6px 10px;text-align:center;font-weight:700;">${r.score||0}</td></tr>`).join('');
    var w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>نموذج زيارة صفية</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl;font-size:13px;}
    .header{text-align:center;margin-bottom:16px;border-bottom:2px solid #0b2545;padding-bottom:10px;}
    .header h2{color:#0b2545;font-size:15px;margin:0 0 4px;}
    .info-table{width:100%;border-collapse:collapse;margin-bottom:14px;}
    .info-table td{border:1px solid #ddd;padding:7px 10px;font-size:12px;}
    .info-table td:first-child{font-weight:700;background:#f8fafc;width:30%;}
    table{width:100%;border-collapse:collapse;}
    th{background:#0b2545;color:#fff;padding:7px;text-align:right;font-size:11px;}
    td{border:1px solid #ddd;padding:6px;}
    .total-row{background:#e0f2fe;font-weight:700;}
    .sign{margin-top:20px;display:flex;justify-content:space-between;font-size:12px;color:#666;}
    </style></head><body>
    <div class="header">
        <h2>وزارة التربية — الإدارة العامة لمنطقة العاصمة التعليمية</h2>
        <div>مدرسة سالم الحسينان المتوسطة — بنين</div>
        <div style="font-weight:700;margin-top:4px;">نموذج زيارة صفية — ${v.subjectLabel||v.subject}</div>
    </div>
    <table class="info-table">
        <tr><td>اسم المعلم</td><td>${v.teacher}</td><td>العام الدراسي</td><td>2025 / 2026</td></tr>
        <tr><td>موضوع الدرس</td><td>${v.topic||'-'}</td><td>الفصل الدراسي</td><td></td></tr>
        <tr><td>الصف</td><td>${v.classId||'-'}</td><td>الحصة</td><td>${v.period||'-'}</td></tr>
        <tr><td>اليوم</td><td></td><td>الموافق</td><td>${v.date||'-'}</td></tr>
    </table>
    <table>
        <thead><tr><th style="width:35px;">#</th><th>عناصر التقييم والمتابعة</th><th style="text-align:center;width:55px;">ممتاز</th><th style="text-align:center;width:60px;">جيد جداً</th><th style="text-align:center;width:55px;">جيد</th><th style="text-align:center;width:55px;">مقبول</th><th style="text-align:center;width:55px;">ضعيف</th><th style="text-align:center;width:50px;">الدرجة</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row"><td colspan="7" style="padding:7px;text-align:center;">التقييم الكلي</td><td style="padding:7px;text-align:center;font-size:14px;">${v.totalScore}/${v.maxScore} (${v.percentage}%)</td></tr></tfoot>
    </table>
    ${v.strengths?`<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px;"><b>نقاط القوة:</b> ${v.strengths}</div>`:''}
    ${v.recommendations?`<div style="margin-top:8px;padding:10px;background:#f8fafc;border-radius:6px;"><b>التوصيات:</b> ${v.recommendations}</div>`:''}
    <div class="sign"><span>الزائر: ${v.visitedBy||'-'}</span><span>توقيع المعلم: _______________</span><span>توقيع الزائر: _______________</span></div>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),600);
};

window.pcDelVisit = async function(id) {
    if(!confirm('حذف الزيارة؟')) return;
    try { await deleteDoc(doc(db,'pc_visits',id)); window.showToast?.('✅ تم'); await pcLoadAll(); }
    catch(e) { window.showToast?.('❌ '+e.message,'error'); }
};

function pcRenderTasks(filter) {
    var el=document.getElementById('pc-tasks-list');
    if(!el) return;
    var tasks=filter?pcData.tasks.filter(t=>t.status===filter):pcData.tasks;
    if(!tasks.length){el.innerHTML='<div class="pc-empty">لا توجد قرارات</div>';return;}
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>القرار</th><th>المسؤول</th><th>الأولوية</th><th>الاستحقاق</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${tasks.map(t=>`<tr><td style="font-weight:700;">${t.title||'-'}</td><td>${t.owner||'-'}</td><td>${t.priority||'-'}</td><td style="${t.status==='متأخر'?'color:#dc2626;font-weight:700;':''}">${t.dueDate||'-'}</td><td><span class="pc-badge ${t.status==='منجز'?'done':t.status==='متأخر'?'late':'prg'}">${t.status||'قيد التنفيذ'}</span></td><td style="display:flex;gap:4px;">${t.status!=='منجز'?`<button onclick="window.pcMarkDone('${t.id}')" class="pc-btn sm green">✅</button>`:''}<button onclick="window.pcDelTask('${t.id}')" class="pc-btn sm red">🗑</button></td></tr>`).join('')}</tbody></table>`;
}
window.pcFilterTasks=function(){pcRenderTasks(document.getElementById('pc-task-filter').value);};
window.pcSaveTask=async function(){
    var title=document.getElementById('pc-task-title').value.trim();
    var owner=document.getElementById('pc-task-owner').value;
    var dueDate=document.getElementById('pc-task-due').value;
    var priority=document.getElementById('pc-task-priority').value;
    var notes=document.getElementById('pc-task-notes').value.trim();
    var me=JSON.parse(localStorage.getItem('hs_user')||'{}');
    if(!title||!dueDate){window.showToast?.('أكمل الحقول','warning');return;}
    try{await addDoc(collection(db,'pc_tasks'),{schoolId:getActiveSchoolId(),title,owner,dueDate,priority,notes,status:'قيد التنفيذ',createdBy:me.name||me.userId,createdAt:serverTimestamp()});window.showToast?.('✅ تم');['pc-task-title','pc-task-due','pc-task-notes'].forEach(id=>{var el=document.getElementById(id);if(el)el.value='';});await pcLoadAll();}
    catch(e){window.showToast?.('❌ '+e.message,'error');}
};
window.pcMarkDone=async function(id){try{await updateDoc(doc(db,'pc_tasks',id),{status:'منجز',completedAt:serverTimestamp()});window.showToast?.('✅ تم');await pcLoadAll();}catch(e){window.showToast?.('❌ '+e.message,'error');}};
window.pcDelTask=async function(id){if(!confirm('حذف القرار؟'))return;try{await deleteDoc(doc(db,'pc_tasks',id));window.showToast?.('✅ تم');await pcLoadAll();}catch(e){window.showToast?.('❌ '+e.message,'error');}};

function pcRenderMeetings(){
    var el=document.getElementById('pc-meetings-list');
    if(!el)return;
    if(!pcData.meetings.length){el.innerHTML='<div class="pc-empty">لا توجد محاضر</div>';return;}
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th>جدول الأعمال</th><th>إجراء</th></tr></thead><tbody>${pcData.meetings.map((m,i)=>`<tr><td style="font-weight:700;">${m.meetingNum||i+1}</td><td>${m.date||'-'}</td><td><span class="pc-badge prg">${m.type||'دوري'}</span></td><td style="font-size:11px;color:#666;">${(m.agenda||'').slice(0,60)}...</td><td><button onclick="window.pcDelMeeting('${m.id}')" class="pc-btn sm red">🗑</button></td></tr>`).join('')}</tbody></table>`;
}
window.pcSaveMeeting=async function(){
    var num=document.getElementById('pc-m-num').value;
    var date=document.getElementById('pc-m-date').value;
    var type=document.getElementById('pc-m-type').value;
    var agenda=document.getElementById('pc-m-agenda').value.trim();
    var decisions=document.getElementById('pc-m-decisions').value.trim();
    var me=JSON.parse(localStorage.getItem('hs_user')||'{}');
    if(!date||!agenda){window.showToast?.('أكمل الحقول','warning');return;}
    try{await addDoc(collection(db,'pc_meetings'),{schoolId:getActiveSchoolId(),meetingNum:parseInt(num)||1,date,type,agenda,decisions,recordedBy:me.name||me.userId,createdAt:serverTimestamp()});window.showToast?.('✅ تم');['pc-m-num','pc-m-agenda','pc-m-decisions'].forEach(id=>{var el=document.getElementById(id);if(el)el.value='';});await pcLoadAll();}
    catch(e){window.showToast?.('❌ '+e.message,'error');}
};
window.pcDelMeeting=async function(id){if(!confirm('حذف المحضر؟'))return;try{await deleteDoc(doc(db,'pc_meetings',id));window.showToast?.('✅ تم');await pcLoadAll();}catch(e){window.showToast?.('❌ '+e.message,'error');}};

function pcRenderStudents(){
    var el=document.getElementById('pc-students-list');
    if(!el)return;
    if(!pcData.students.length){el.innerHTML='<div class="pc-empty">لا يوجد طلاب في المتابعة</div>';return;}
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>نوع الخطة</th><th>المعلم</th><th>إجراء</th></tr></thead><tbody>${pcData.students.map((s,i)=>`<tr><td style="color:#aaa;">${i+1}</td><td style="font-weight:700;">${s.name||'-'}</td><td>${s.classId||'-'}</td><td><span class="pc-badge ${s.planType==='إثرائية'?'done':'prg'}">${s.planType||'-'}</span></td><td>${s.teacher||'-'}</td><td><button onclick="window.pcDelStudent('${s.id}')" class="pc-btn sm red">🗑</button></td></tr>`).join('')}</tbody></table>`;
}
window.pcSaveStudent=async function(){
    var name=document.getElementById('pc-stu-name').value.trim();
    if(!name){window.showToast?.('أدخل الاسم','warning');return;}
    var classId=document.getElementById('pc-stu-class').value.trim();
    var planType=document.getElementById('pc-stu-plan').value;
    var teacher=document.getElementById('pc-stu-teacher').value;
    var notes=document.getElementById('pc-stu-notes').value.trim();
    try{await addDoc(collection(db,'pc_student_followup'),{schoolId:getActiveSchoolId(),name,classId,planType,teacher,notes,createdAt:serverTimestamp()});window.showToast?.('✅ تم');document.getElementById('pc-stu-modal').classList.remove('show');await pcLoadAll();}
    catch(e){window.showToast?.('❌ '+e.message,'error');}
};
window.pcDelStudent=async function(id){if(!confirm('إزالة الطالب؟'))return;try{await deleteDoc(doc(db,'pc_student_followup',id));window.showToast?.('✅ تم');await pcLoadAll();}catch(e){window.showToast?.('❌ '+e.message,'error');}};

window.pcExportReport=function(){
    var today=new Date().toLocaleDateString('ar-KW');
    var done=pcData.tasks.filter(t=>t.status==='منجز').length;
    var w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير لجنة الأداء</title><style>body{font-family:Arial;padding:20px;direction:rtl;}h1{color:#0b2545;border-bottom:2px solid #0b2545;padding-bottom:8px;}h2{color:#1a78c2;}table{width:100%;border-collapse:collapse;}th{background:#0b2545;color:#fff;padding:7px;}td{border:1px solid #ddd;padding:7px;}</style></head><body>
    <h1>تقرير لجنة متابعة الأداء المدرسي — ${today}</h1>
    <h2>الإحصاءات</h2><table><tr><th>البند</th><th>العدد</th></tr><tr><td>الزيارات الصفية</td><td>${pcData.visits.length}</td></tr><tr><td>القرارات المنجزة</td><td>${done}</td></tr><tr><td>قيد التنفيذ</td><td>${pcData.tasks.length-done}</td></tr><tr><td>الاجتماعات</td><td>${pcData.meetings.length}</td></tr><tr><td>الطلاب تحت المتابعة</td><td>${pcData.students.length}</td></tr></table>
    <h2>الزيارات الصفية</h2><table><tr><th>المعلم</th><th>المادة</th><th>الصف</th><th>التاريخ</th><th>التقييم</th><th>النسبة</th></tr>${pcData.visits.map(v=>`<tr><td>${v.teacher}</td><td>${v.subjectLabel||v.subject||'-'}</td><td>${v.classId||'-'}</td><td>${v.date||'-'}</td><td>${v.totalScore}/${v.maxScore}</td><td>${v.percentage}%</td></tr>`).join('')}</table>
    <h2>القرارات</h2><table><tr><th>القرار</th><th>المسؤول</th><th>الاستحقاق</th><th>الحالة</th></tr>${pcData.tasks.map(t=>`<tr><td>${t.title}</td><td>${t.owner||'-'}</td><td>${t.dueDate||'-'}</td><td>${t.status||'-'}</td></tr>`).join('')}</table>
    </body></html>`);
    w.document.close();setTimeout(()=>w.print(),500);
};


// ══ Modal زيارة الفصل + ضبط البنود ══
var classroomRatings = {};

window.pcOpenClassroomModal = async function() {
    classroomRatings = {};
    var criteria = await pcGetClassroomCriteria();
    document.getElementById("pcr-date").value = getTodayISO();
    
    // تعبئة المعلمين
    var teacherSel = document.getElementById("pcr-teacher");
    teacherSel.innerHTML = "<option value=''>-- اختر --</option>" + 
        pcData.users.map(u => "<option value='" + u.name + "'>" + u.name + "</option>").join("");
    
    // بناء جدول البنود
    document.getElementById("pcr-tbody").innerHTML = criteria.map((item, idx) =>
        "<tr><td style='color:#aaa;font-size:11px;font-weight:700;'>" + (idx+1) + "</td>" +
        "<td style='font-weight:700;font-size:12px;'>" + item + "</td>" +
        ["ممتاز","جيد جداً","جيد","مقبول","ضعيف"].map(r =>
            "<td style='text-align:center;'><label class='rd'><input type='radio' name='cr_" + idx + "' value='" + r + "' onchange='window.pcrSetRating(" + idx + ",\"" + r + "\")''><div class='rd-dot'>" + r.slice(0,1) + "</div></label></td>"
        ).join("") + "</tr>"
    ).join("");
    
    document.getElementById("pc-classroom-modal").classList.add("show");
    pcrUpdateScore(criteria.length);
};

window.pcrSetRating = function(idx, r) {
    classroomRatings[idx] = r;
    pcGetClassroomCriteria().then(c => pcrUpdateScore(c.length));
};

function pcrUpdateScore(max) {
    var scores = {"ممتاز":5,"جيد جداً":4,"جيد":3,"مقبول":2,"ضعيف":1};
    var total = Object.values(classroomRatings).reduce((s,r) => s+(scores[r]||0), 0);
    var maxScore = max * 5;
    var pct = maxScore > 0 ? Math.round((total/maxScore)*100) : 0;
    var el = document.getElementById("pcr-total");
    if (el) { el.textContent = total + " / " + maxScore + " (" + pct + "%)"; el.style.color = pct>=80?"#16a34a":pct>=60?"#d97706":"#dc2626"; }
}

async function pcGetClassroomCriteria() {
    if (classroomCriteriaCache) return classroomCriteriaCache;
    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(collection(db,"pc_classroom_criteria"), where("schoolId","==",schoolId)));
        if (!snap.empty) {
            classroomCriteriaCache = snap.docs[0].data().items || DEFAULT_CLASSROOM_CRITERIA;
        } else {
            classroomCriteriaCache = DEFAULT_CLASSROOM_CRITERIA;
        }
    } catch(e) { classroomCriteriaCache = DEFAULT_CLASSROOM_CRITERIA; }
    return classroomCriteriaCache;
}

window.pcSaveClassroomVisit = async function() {
    var classId = document.getElementById("pcr-class").value.trim();
    var teacher = document.getElementById("pcr-teacher").value;
    var subject = document.getElementById("pcr-subject").value.trim();
    var period = document.getElementById("pcr-period").value;
    var date = document.getElementById("pcr-date").value;
    var notes = document.getElementById("pcr-notes").value.trim();
    var me = JSON.parse(localStorage.getItem("hs_user")||"{}");
    if (!classId) { window.showToast?.("أدخل الصف","warning"); return; }
    var criteria = await pcGetClassroomCriteria();
    var scores = {"ممتاز":5,"جيد جداً":4,"جيد":3,"مقبول":2,"ضعيف":1};
    var maxScore = criteria.length * 5;
    var totalScore = Object.values(classroomRatings).reduce((s,r) => s+(scores[r]||0), 0);
    var ratingsArr = criteria.map((item,idx) => ({item, rating:classroomRatings[idx]||"-", score:scores[classroomRatings[idx]]||0}));
    try {
        await addDoc(collection(db,"pc_classroom_visits"), {
            schoolId:getActiveSchoolId(), classId, teacher, subject,
            period:parseInt(period), date, notes, ratings:ratingsArr,
            totalScore, maxScore, percentage:Math.round((totalScore/maxScore)*100),
            visitedBy:me.name||me.userId, createdAt:serverTimestamp()
        });
        window.showToast?.("✅ تم حفظ الزيارة");
        document.getElementById("pc-classroom-modal").classList.remove("show");
        classroomRatings = {};
        await pcLoadClassroomVisits();
    } catch(e) { window.showToast?.("❌ "+e.message,"error"); }
};

async function pcLoadClassroomVisits() {
    var el = document.getElementById("pc-classroom-list");
    if (!el) return;
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,"pc_classroom_visits"), where("schoolId","==",schoolId)));
        var visits = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
        if (!visits.length) { el.innerHTML = "<div class='pc-empty'>لا توجد زيارات فصول</div>"; return; }
        el.innerHTML = "<table class='pc-tbl'><thead><tr><th>الصف</th><th>المعلم</th><th>المادة</th><th>التاريخ</th><th>التقييم</th><th>النسبة</th><th>إجراء</th></tr></thead><tbody>" +
            visits.map(v => {
                var c = v.percentage>=80?"#16a34a":v.percentage>=60?"#d97706":"#dc2626";
                return "<tr><td style='font-weight:700;'>" + (v.classId||"-") + "</td><td>" + (v.teacher||"-") + "</td><td>" + (v.subject||"-") + "</td><td>" + (v.date||"-") + "</td><td style='font-weight:700;color:" + c + ";'>" + (v.totalScore||0) + "/" + (v.maxScore||0) + "</td><td><span class='pc-badge' style='background:" + c + "22;color:" + c + ";'>" + (v.percentage||0) + "%</span></td><td><button onclick='window.pcDelClassroomVisit(\"" + v.id + "\")' class='pc-btn sm red'>🗑</button></td></tr>";
            }).join("") + "</tbody></table>";
    } catch(e) { el.innerHTML = "<div class='pc-empty' style='color:red;'>❌ " + e.message + "</div>"; }
}

window.pcDelClassroomVisit = async function(id) {
    if (!confirm("حذف الزيارة؟")) return;
    try { await deleteDoc(doc(db,"pc_classroom_visits",id)); window.showToast?.("✅ تم"); await pcLoadClassroomVisits(); }
    catch(e) { window.showToast?.("❌ "+e.message,"error"); }
};

// ══ ضبط البنود ══
window.pcOpenCriteriaSettings = async function() {
    var criteria = await pcGetClassroomCriteria();
    renderCriteriaList(criteria);
    document.getElementById("pc-criteria-modal").classList.add("show");
};

function renderCriteriaList(criteria) {
    document.getElementById("pcr-criteria-list").innerHTML = criteria.map((item, idx) =>
        "<div style='display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:var(--off);border-radius:8px;'>" +
        "<span style='font-size:11px;color:#aaa;font-weight:700;min-width:20px;'>" + (idx+1) + "</span>" +
        "<span style='flex:1;font-size:13px;font-weight:700;'>" + item + "</span>" +
        "<button onclick='window.pcRemoveCriterion(" + idx + ")' style='background:#fef2f2;color:#dc2626;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;'>حذف</button>" +
        "</div>"
    ).join("");
}

window.pcRemoveCriterion = async function(idx) {
    var criteria = await pcGetClassroomCriteria();
    criteria.splice(idx, 1);
    classroomCriteriaCache = criteria;
    renderCriteriaList(criteria);
};

window.pcAddCriterion = async function() {
    var input = document.getElementById("pcr-new-item");
    var text = input.value.trim();
    if (!text) return;
    var criteria = await pcGetClassroomCriteria();
    criteria.push(text);
    classroomCriteriaCache = criteria;
    renderCriteriaList(criteria);
    input.value = "";
};

window.pcSaveCriteria = async function() {
    var schoolId = getActiveSchoolId();
    var criteria = classroomCriteriaCache || DEFAULT_CLASSROOM_CRITERIA;
    try {
        var snap = await getDocs(query(collection(db,"pc_classroom_criteria"), where("schoolId","==",schoolId)));
        if (!snap.empty) {
            await updateDoc(doc(db,"pc_classroom_criteria",snap.docs[0].id), {items:criteria});
        } else {
            await addDoc(collection(db,"pc_classroom_criteria"), {schoolId, items:criteria});
        }
        window.showToast?.("✅ تم حفظ البنود");
        document.getElementById("pc-criteria-modal").classList.remove("show");
    } catch(e) { window.showToast?.("❌ "+e.message,"error"); }
};
