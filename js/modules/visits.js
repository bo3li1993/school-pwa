import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot, doc, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ═══════════════════════════════════════════════════════════════
// بنود التقييم لكل مادة — مطابقة للنماذج الرسمية لوزارة التربية
// متوسطة سالم الحسينان — الكويت
// ═══════════════════════════════════════════════════════════════
const DEPT_CRITERIA = {
    'اللغة العربية': [
        'نظافة ـ الفصل / مختبر لغوي / العروض الضونية',
        'ترتيب الطلاب ـ تنظيم القاعة (طاولات ـ مقاعد)',
        'تنسيق السبورة ـ الخط',
        'إعداد الدرس / التحضير الذهني',
        'عرض المفاهيم والمعلومات بطريقة تراعي جميع المستويات',
        'استجابة الطلاب خلال المناقشة والشرح',
        'العلاقة مع الطلاب وأسلوب التعامل',
        'التصرف في المواقف المختلفة الطارنة',
        'السلامة اللغوية / الطلاقة الشفهية / القراءة الجهرية',
        'التمكين من المادة العلمية',
        'إعداد خطط تقويم للطلاب الضعاف',
        'إعداد خطط اثرائية للطلاب الفائقين',
        'المظهر العام للمعلم وشخصيته',
        'التقنيات التربوية والوسائل المستخدمة',
        'تنظيم استخدام زمن الحصة الدراسية',
        'متابعة الأعمال التحريرية',
        'الجملة الإملائية العلاجية',
        'التقويم ( إعداد الفقرة وتحقيقها للأهداف السلوكية )'
    ],
    'الرياضيات': [
        'نظافة الفصل وترتيب الطلاب',
        'تنسيق السبورة وجمالية العرض',
        'إعداد الدرس والتحضير الجيد',
        'التمكن من المحتوى الرياضي',
        'التدرج المنطقي في عرض الدرس',
        'استخدام الوسائل والنماذج العملية',
        'حل التمارين بأساليب متنوعة',
        'مشاركة الطلاب في حل المسائل',
        'التقويم المستمر والتغذية الراجعة',
        'ربط الرياضيات بالحياة العملية',
        'إدارة الوقت الصفي',
        'معالجة الفروق الفردية بين الطلاب',
        'الدقة في المصطلحات الرياضية',
        'تدريب الطلاب على التفكير المنطقي',
        'إعداد خطط علاجية للضعاف وإثرائية للفائقين',
        'استخدام التقنية والآلة الحاسبة',
        'الانضباط الصفي',
        'تلخيص وإغلاق الحصة'
    ],
    'العلوم': [
        'نظافة الفصل / المختبر وترتيب الطلاب',
        'تنسيق السبورة وعرض الدرس',
        'إعداد الدرس والتحضير الجيد',
        'التمكن من المحتوى العلمي',
        'استخدام التجارب العملية',
        'تطبيق معايير السلامة في المختبر',
        'ربط العلم بالتقنية والحياة',
        'تحفيز التفكير العلمي والاستنتاج',
        'استخدام الوسائل والنماذج العلمية',
        'التقويم المستمر للطلاب',
        'إدارة الوقت داخل الحصة',
        'مشاركة الطلاب في الأنشطة العلمية',
        'الدقة في المصطلحات العلمية',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'استخدام التقنية والوسائط',
        'تنمية مهارة الاستقصاء العلمي',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'التربية الإسلامية': [
        'نظافة الفصل وترتيب الطلاب',
        'تنسيق السبورة والعرض',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف التربوية والعلمية',
        'التمكن من المادة الشرعية',
        'حسن التلاوة والتجويد إن وجد',
        'ربط الدرس بالقيم والسلوك العملي',
        'استخدام أسلوب القصة والموعظة',
        'تنويع طرائق التدريس',
        'إدارة الوقت داخل الحصة',
        'مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب',
        'الدقة في توثيق الأدلة الشرعية',
        'معالجة الفروق الفردية',
        'استخدام الوسائل التعليمية',
        'تنمية القيم الأخلاقية لدى الطلاب',
        'المظهر العام للمعلم وشخصيته',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'الاجتماعيات': [
        'نظافة الفصل وترتيب الطلاب',
        'تنسيق السبورة والعرض',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف التعليمية',
        'التمكن من المحتوى الجغرافي والتاريخي',
        'استخدام الخرائط والوسائل',
        'ربط الدرس بالواقع المحلي والعالمي',
        'تنويع طرائق التدريس',
        'مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب',
        'إدارة الوقت داخل الحصة',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'تنمية حب الوطن والانتماء',
        'تدريب الطلاب على التحليل والاستنتاج',
        'استخدام التقنية في الحصة',
        'المظهر العام للمعلم وشخصيته',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'اللغة الإنجليزية': [
        'نظافة الفصل وترتيب الطلاب — Classroom cleanliness & student arrangement',
        'تنسيق السبورة — Board organization',
        'إعداد الدرس والتحضير — Lesson preparation',
        'وضوح الأهداف التعليمية — Clear lesson objectives',
        'التمكن من المادة — Subject mastery',
        'سلامة النطق والطلاقة الشفهية — Pronunciation accuracy & fluency',
        'تنويع طرائق التدريس — Variety of teaching methods',
        'استخدام الوسائل التعليمية — Use of teaching aids',
        'مشاركة الطلاب الفاعلة — Student participation',
        'التقويم المستمر — Continuous assessment',
        'إدارة الوقت — Time management',
        'معالجة الفروق الفردية — Differentiated instruction',
        'إعداد خطط علاجية وإثرائية — Remedial & enrichment plans',
        'تنمية المهارات اللغوية الأربع — Developing four language skills',
        'الانضباط الصفي — Classroom management',
        'استخدام التقنية — Use of technology',
        'المظهر العام — Teacher appearance & personality',
        'إغلاق الحصة — Lesson closure'
    ],
    'الحاسوب': [
        'نظافة المختبر وترتيب الأجهزة',
        'تنسيق السبورة والعرض',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف التعليمية',
        'التمكن من المحتوى التقني',
        'تطبيق الجانب العملي والتطبيقي',
        'متابعة سلامة استخدام الأجهزة',
        'تنويع طرائق التدريس',
        'مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب',
        'إدارة الوقت داخل الحصة',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'ربط الدرس بالتطبيقات الحديثة',
        'تنمية مهارات حل المشكلات',
        'الأمن السيبراني والاستخدام الآمن',
        'المظهر العام للمعلم وشخصيته',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'الكهرباء': [
        'نظافة الورشة وترتيبها',
        'توفير أدوات السلامة المهنية',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف الفنية',
        'التمكن من المحتوى النظري والعملي',
        'تطبيق معايير السلامة المهنية',
        'استخدام الأدوات والمعدات بشكل صحيح',
        'تنويع طرائق التدريس',
        'مشاركة الطلاب في التطبيق العملي',
        'التقويم المستمر للطلاب',
        'إدارة الوقت داخل الورشة',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'تنظيم الورشة والمعدات',
        'الانضباط داخل الورشة',
        'ربط النظري بالتطبيق العملي',
        'المظهر العام للمعلم وشخصيته',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'الديكور': [
        'نظافة الورشة وترتيبها',
        'توفير أدوات السلامة',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف الفنية',
        'التمكن من المهارات الفنية',
        'تطبيق معايير السلامة في الورشة',
        'استخدام الأدوات بشكل صحيح',
        'تنويع طرائق التدريس',
        'مشاركة الطلاب في التطبيق العملي',
        'التقويم المستمر للأعمال الفنية',
        'إدارة الوقت داخل الورشة',
        'تنظيم الورشة والمواد',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'الانضباط داخل الورشة',
        'تنمية الحس الجمالي والإبداعي',
        'المظهر العام للمعلم وشخصيته',
        'ربط الدرس بسوق العمل'
    ],
    'التربية الفنية': [
        'نظافة الفصل وترتيبه',
        'توفير الأدوات والمستلزمات الفنية',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف الفنية',
        'التمكن من المهارات الفنية والتقنيات',
        'تنويع الخامات والأدوات',
        'تشجيع الإبداع والابتكار',
        'مشاركة الطلاب الفاعلة',
        'التقويم المستمر للأعمال الفنية',
        'إدارة الوقت داخل الحصة',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'تنمية الحس الجمالي',
        'عرض ومناقشة الأعمال الفنية',
        'الانضباط الصفي العام',
        'ربط الفن بالتراث والهوية',
        'المظهر العام للمعلم وشخصيته',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'التربية الرياضية': [
        'نظافة الملعب / الصالة وترتيبها',
        'توفير أدوات السلامة الرياضية',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف التدريبية',
        'التمكن من المهارات الحركية',
        'تطبيق الإحماء والتهيئة البدنية',
        'تطبيق معايير السلامة الرياضية',
        'تنويع الأنشطة والتمارين',
        'مشاركة جميع الطلاب',
        'التقويم المستمر للأداء الحركي',
        'إدارة الوقت داخل الحصة',
        'تنظيم الملعب والأدوات',
        'معالجة الفروق الفردية',
        'الانضباط والروح الرياضية',
        'تنمية العمل الجماعي والروح التنافسية الإيجابية',
        'الاهتمام بالحالات الصحية الخاصة',
        'المظهر العام للمعلم وشخصيته',
        'إغلاق الحصة وتهدئة بدنية'
    ],
    'عام': [
        'نظافة الفصل وترتيب الطلاب',
        'تنسيق السبورة والعرض',
        'إعداد الدرس والتحضير الجيد',
        'وضوح الأهداف التعليمية',
        'التمكن من المادة العلمية',
        'تنويع طرائق التدريس',
        'استخدام الوسائل التعليمية المناسبة',
        'إدارة الوقت داخل الحصة',
        'مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب',
        'معالجة الفروق الفردية',
        'إعداد خطط علاجية وإثرائية',
        'المظهر العام للمعلم وشخصيته',
        'الانضباط الصفي العام',
        'استخدام التقنية في الحصة',
        'إغلاق الحصة وتلخيص الأهداف'
    ]
};

const RATINGS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];
const RATING_COLORS = {
    'ممتاز':   '#059669',
    'جيد جداً':'#1a78c2',
    'جيد':     '#d4920a',
    'مقبول':   '#f59e0b',
    'ضعيف':    '#dc2626'
};

export async function initVisitsModule() {
    const container = document.getElementById('tab-visits');
    if (!container) return;

    container.innerHTML = `
    <style>
        .v-label{font-weight:700;font-size:12.5px;color:var(--text);display:block;margin-bottom:5px}
        .v-input{width:100%;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;
            font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;text-align:right;
            outline:none;transition:border-color .2s;background:#fff}
        .v-input:focus{border-color:var(--sky)}
        .v-submit{width:100%;background:var(--navy);color:#fff;font-weight:800;margin-top:16px;
            border:none;padding:12px;border-radius:9px;cursor:pointer;
            font-family:'Cairo',sans-serif;font-size:14px;display:flex;align-items:center;
            justify-content:center;gap:8px}
        .v-submit:hover{background:#134074}
        .crit-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
        .crit-table th{background:#0b2545;color:#fff;padding:9px 12px;text-align:center;font-weight:800;font-size:12px}
        .crit-table th:first-child{text-align:right;width:50px}
        .crit-table th:nth-child(2){text-align:right}
        .crit-table td{padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:middle}
        .crit-table td:nth-child(2){text-align:right;font-weight:600;font-size:12.5px}
        .crit-table tr:nth-child(even) td{background:#f8f9fc}
        .crit-table tr:hover td{background:#eaf4fd}
        .rating-radio{display:none}
        .rating-label{display:inline-block;width:28px;height:28px;border:2px solid #e5e7eb;
            border-radius:50%;cursor:pointer;transition:all .2s;font-size:10px;
            line-height:26px;text-align:center;font-weight:800}
        .rating-radio:checked + .rating-label{color:#fff;border-color:transparent}
        .r-mmtaz:checked + .rating-label{background:#059669}
        .r-jayyid-jiddan:checked + .rating-label{background:#1a78c2}
        .r-jayyid:checked + .rating-label{background:#d4920a}
        .r-maqbool:checked + .rating-label{background:#f59e0b}
        .r-daif:checked + .rating-label{background:#dc2626}
        .v-th-sm{padding:6px 4px;font-size:11px}
        .archive-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:800;color:#fff}
        .v-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
        .v-card-title{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:16px;
            display:flex;align-items:center;gap:8px;border-bottom:2px solid #f0f4f8;padding-bottom:10px}
    </style>

    <!-- ═══ نموذج الزيارة ═══ -->
    <div class="v-card" style="border-top:4px solid var(--sky)">
        <div class="v-card-title">
            <i class="bi bi-journal-check" style="color:var(--sky)"></i>
            توثيق الزيارة الصفية الفنية — وزارة التربية
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">
            <div>
                <label class="v-label">اسم المعلم المزار</label>
                <select id="visit-teacher-name" class="v-input" required>
                    <option value="">⏳ جاري تحميل المعلمين...</option>
                </select>
            </div>
            <div>
                <label class="v-label">موضوع الدرس</label>
                <input type="text" id="visit-lesson-topic" class="v-input" placeholder="موضوع الدرس..." required>
            </div>
            <div>
                <label class="v-label">المادة / القسم</label>
                <select id="visit-subject" class="v-input" required onchange="window.renderVisitCriteria(this.value)">
                    <option value="">-- اختر المادة --</option>
                    ${Object.keys(DEPT_CRITERIA).map(d=>`<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="v-label">الصف</label>
                <input type="text" id="visit-class" class="v-input" placeholder="مثال: 7/2">
            </div>
            <div>
                <label class="v-label">الحصة</label>
                <select id="visit-period" class="v-input">
                    <option value="الأولى">الأولى</option>
                    <option value="الثانية">الثانية</option>
                    <option value="الثالثة">الثالثة</option>
                    <option value="الرابعة">الرابعة</option>
                    <option value="الخامسة">الخامسة</option>
                    <option value="السادسة">السادسة</option>
                    <option value="السابعة">السابعة</option>
                </select>
            </div>
            <div>
                <label class="v-label">اسم الموجه / الزائر</label>
                <input type="text" id="visit-visitor-name" class="v-input"
                    value="${(JSON.parse(localStorage.getItem('hs_user')||'{}').name)||''}" readonly
                    style="background:var(--off);color:var(--mid);font-weight:700">
            </div>
            <div>
                <label class="v-label">الفصل الدراسي</label>
                <input type="text" id="visit-semester" class="v-input" placeholder="مثال: الأول 2025/2026">
            </div>
            <div>
                <label class="v-label">التاريخ</label>
                <input type="date" id="visit-date" class="v-input" value="${getTodayISO()}">
            </div>
        </div>

        <!-- جدول البنود -->
        <div id="visit-criteria-area"></div>

        <!-- ملاحظات -->
        <div style="margin-top:14px">
            <label class="v-label">ملاحظات الزيارة وأبرز التوصيات</label>
            <textarea id="visit-notes" class="v-input" rows="3"
                placeholder="اكتب التوجيه الفني والتوصيات..."></textarea>
        </div>

        <button class="v-submit" onclick="window.handleRegisterTechVisitLive()">
            <i class="bi bi-cloud-plus-fill"></i> توثيق الزيارة سحابياً
        </button>
    </div>

    <!-- ═══ الأرشيف ═══ -->
    <div class="v-card" style="border-top:4px solid var(--navy)">
        <div class="v-card-title">
            <i class="bi bi-archive-fill"></i>
            أرشيف الزيارات الفنية
            <div style="margin-right:auto;display:flex;gap:8px">
                <button onclick="window.printVisitsPDF()"
                    style="background:var(--red);color:#fff;border:none;padding:7px 14px;border-radius:8px;
                    font-family:'Cairo',sans-serif;font-weight:700;font-size:12px;cursor:pointer;
                    display:flex;align-items:center;gap:6px">
                    <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
                </button>
            </div>
        </div>

        <!-- فلتر -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <select id="archive-filter-subject" class="v-input" style="max-width:180px"
                onchange="window.filterVisitsArchive()">
                <option value="">كل المواد</option>
                ${Object.keys(DEPT_CRITERIA).map(d=>`<option value="${d}">${d}</option>`).join('')}
            </select>
            <input type="text" id="archive-search" class="v-input" style="max-width:200px"
                placeholder="🔍 ابحث باسم المعلم..."
                oninput="window.filterVisitsArchive()">
        </div>

        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:var(--off)">
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">المعلم المزار</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">المادة</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">الصف</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">الموجه</th>
                        <th style="padding:10px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">التقييم العام</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">التاريخ</th>
                        <th style="padding:10px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="tech-visits-tbody">
                    <tr><td colspan="7" style="text-align:center;padding:30px;color:var(--mid)">⏳ جاري التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    loadTechVisitsLive();
    loadTeacherDirectoryForVisits();
}

// ══ تحميل المعلمين ══
async function loadTeacherDirectoryForVisits() {
    const sel = document.getElementById('visit-teacher-name');
    if(!sel) return;
    try {
        const schoolId = getActiveSchoolId();
        const snap = await getDocs(query(collection(db,'users'),
            where('schoolId','==',schoolId), where('role','==','teacher')));
        const names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = names.length
            ? '<option value="">-- اختر المعلم --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('')
            : '<option value="">⚠️ لا يوجد معلمون مسجلون</option>';
    } catch(e) { sel.innerHTML = '<option value="">❌ خطأ</option>'; }
}

// ══ رسم جدول البنود ══
window.renderVisitCriteria = function(subject) {
    const area = document.getElementById('visit-criteria-area');
    if(!subject || !DEPT_CRITERIA[subject]) { area.innerHTML = ''; return; }
    const items = DEPT_CRITERIA[subject];

    area.innerHTML = `
    <div style="background:var(--off);border-radius:10px;padding:14px;border:1px solid var(--line)">
        <div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:10px">
            📋 عناصر التقييم والمتابعة — ${subject} (${items.length} بند)
        </div>
        <div style="overflow-x:auto">
        <table class="crit-table">
            <thead>
                <tr>
                    <th class="v-th-sm" style="text-align:center;width:40px">م</th>
                    <th style="text-align:right">عناصر التقييـم والمتابعة</th>
                    <th class="v-th-sm" style="color:#059669">ممتاز</th>
                    <th class="v-th-sm" style="color:#1a78c2">جيد جداً</th>
                    <th class="v-th-sm" style="color:#d4920a">جيد</th>
                    <th class="v-th-sm" style="color:#f59e0b">مقبول</th>
                    <th class="v-th-sm" style="color:#dc2626">ضعيف</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, i) => `
                <tr>
                    <td style="text-align:center;font-weight:800;color:var(--mid)">${i+1}</td>
                    <td style="text-align:right;font-weight:600;font-size:12.5px">${item}</td>
                    ${['ممتاز','جيد جداً','جيد','مقبول','ضعيف'].map((r,ri) => {
                        const cls = ['r-mmtaz','r-jayyid-jiddan','r-jayyid','r-maqbool','r-daif'][ri];
                        return `<td>
                            <input type="radio" class="rating-radio ${cls}" name="crit_${i}" id="crit_${i}_${ri}" value="${r}" data-item="${item}" ${r==='جيد جداً'?'checked':''}>
                            <label class="rating-label" for="crit_${i}_${ri}">✓</label>
                        </td>`;
                    }).join('')}
                </tr>`).join('')}
            </tbody>
        </table>
        </div>
    </div>`;
};

// ══ حفظ الزيارة ══
window.handleRegisterTechVisitLive = async function() {
    const teacherName   = document.getElementById('visit-teacher-name').value.trim();
    const lessonTopic   = document.getElementById('visit-lesson-topic').value.trim();
    const subject       = document.getElementById('visit-subject').value;
    const classRoom     = document.getElementById('visit-class').value.trim();
    const period        = document.getElementById('visit-period').value;
    const visitorName   = document.getElementById('visit-visitor-name').value.trim();
    const semester      = document.getElementById('visit-semester').value.trim();
    const visitDate     = document.getElementById('visit-date').value || getTodayISO();
    const notes         = document.getElementById('visit-notes').value.trim();

    if(!teacherName || !subject) {
        window.showToast('⚠️ اختر المعلم والمادة', 'warning'); return;
    }

    // جمع التقييمات
    const criteriaResults = [];
    const radios = document.querySelectorAll('.rating-radio:checked');
    radios.forEach(r => {
        criteriaResults.push({ item: r.getAttribute('data-item'), rating: r.value });
    });

    if(criteriaResults.length === 0) {
        window.showToast('⚠️ اختر المادة أولاً لتظهر البنود', 'warning'); return;
    }

    // حساب التقييم العام (الأكثر تكراراً)
    const counts = {};
    criteriaResults.forEach(c => counts[c.rating] = (counts[c.rating]||0)+1);
    const overallRating = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

    // حساب نسبة الممتاز
    const excellentCount = counts['ممتاز']||0;
    const goodCount = (counts['جيد جداً']||0) + (counts['جيد']||0);
    const weakCount = (counts['مقبول']||0) + (counts['ضعيف']||0);

    const btn = document.querySelector('.v-submit');
    if(btn) { btn.disabled=true; btn.innerHTML='⏳ جاري الحفظ...'; }

    try {
        await addDoc(collection(db, 'technical_visits'), {
            schoolId:      getActiveSchoolId(),
            teacherName,
            lessonTopic,
            subject,
            classRoom,
            period,
            visitorName,
            semester,
            notes,
            criteria:      criteriaResults,
            overallRating,
            excellentCount,
            goodCount,
            weakCount,
            date:          visitDate,
            createdAt:     serverTimestamp()
        });

        window.showToast('✅ تم توثيق الزيارة بنجاح');

        // تفريغ النموذج
        ['visit-teacher-name','visit-subject','visit-class','visit-notes','visit-lesson-topic','visit-semester'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = el.tagName==='SELECT' ? '' : '';
        });
        document.getElementById('visit-date').value = getTodayISO();
        document.getElementById('visit-criteria-area').innerHTML = '';

        // عرض نافذة الطباعة
        if(confirm('هل تريد طباعة نموذج الزيارة الرسمي؟')) {
            window.printOfficialVisitForm({
                teacherName, lessonTopic, subject, classRoom, period,
                visitorName, semester, notes, visitDate, criteriaResults, overallRating
            });
        }

    } catch(err) {
        window.showToast('❌ خطأ: ' + err.message, 'error');
    } finally {
        if(btn) { btn.disabled=false; btn.innerHTML='<i class="bi bi-cloud-plus-fill"></i> توثيق الزيارة سحابياً'; }
    }
};

// ══ طباعة النموذج الرسمي ══
window.printOfficialVisitForm = function(data) {
    const { teacherName, lessonTopic, subject, classRoom, period,
            visitorName, semester, notes, visitDate, criteriaResults } = data;

    const today = new Date(visitDate + 'T00:00:00').toLocaleDateString('ar-KW', {
        year:'numeric', month:'long', day:'numeric'
    });

    const tableRows = criteriaResults.map((c, i) => `
        <tr>
            <td style="text-align:center;font-weight:700;border:1px solid #999">${i+1}</td>
            <td style="text-align:right;padding:6px 10px;border:1px solid #999;font-size:12px">${c.item}</td>
            ${['ممتاز','جيد جداً','جيد','مقبول','ضعيف'].map(r =>
                `<td style="text-align:center;border:1px solid #999;font-size:14px">
                    ${c.rating===r?'<span style="font-size:18px;color:#0b2545">✓</span>':''}
                </td>`
            ).join('')}
        </tr>`).join('');

    const schoolUser = JSON.parse(localStorage.getItem('hs_user')||'{}');
    const schoolName = schoolUser.schoolName || 'مدرسة سالم الحسينان المتوسطة — بنين';

    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>نموذج زيارة فنية — ${teacherName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Cairo',sans-serif; direction:rtl; padding:20px; color:#000; font-size:13px; }
  .header { text-align:center; margin-bottom:16px; }
  .header h1 { font-size:15px; font-weight:900; margin-bottom:4px; }
  .header p  { font-size:12px; color:#333; }
  .title-box {
    border:2px solid #000; padding:10px 24px; display:inline-block;
    font-size:18px; font-weight:900; margin:12px auto; border-radius:4px;
  }
  .logos { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .logos img { height:70px; }
  .info-table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:12.5px; }
  .info-table td { border:1px solid #999; padding:6px 10px; }
  .info-table .lbl { background:#dce6f0; font-weight:800; width:100px; }
  .info-table .val { min-width:120px; }
  .crit-table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:12px; }
  .crit-table th { background:#0b2545; color:#fff; padding:7px 8px; text-align:center; font-size:11.5px; }
  .crit-table th:nth-child(2) { text-align:right; }
  .crit-table td { border:1px solid #999; padding:5px 8px; text-align:center; }
  .crit-table td:nth-child(2) { text-align:right; }
  .crit-table tr:nth-child(even) td { background:#f8f8f8; }
  .notes-box { border:1px solid #999; padding:10px; min-height:60px; margin-bottom:14px; border-radius:4px; font-size:12.5px; }
  .notes-label { font-weight:800; margin-bottom:6px; font-size:13px; }
  .sig-table { width:100%; border-collapse:collapse; }
  .sig-table th { background:#dce6f0; padding:8px; border:1px solid #999; font-weight:800; text-align:center; font-size:12px; }
  .sig-table td { border:1px solid #999; padding:24px 10px; text-align:center; font-size:12px; }
  @media print {
    body { padding:10px; }
    @page { margin:1cm; }
  }
</style>
</head>
<body>
<div class="logos">
  <div style="text-align:center;font-size:11px;font-weight:700;color:#555">
    <div style="font-size:24px">🌿</div>
    مدرسة سالم الحسينان
  </div>
  <div style="text-align:center">
    <div style="font-size:14px;font-weight:900">وزارة التربية</div>
    <div style="font-size:12px;color:#555">الإدارة العامة لمنطقة العاصمة التعليمية</div>
    <div style="font-size:12px;font-weight:700">${schoolName}</div>
  </div>
  <div style="text-align:center;font-size:11px;font-weight:700;color:#555">
    <div style="font-size:24px">🏛️</div>
    وزارة التربية
  </div>
</div>

<div style="text-align:center;margin-bottom:14px">
  <span class="title-box">زيارة معلم ${subject}</span>
</div>

<table class="info-table">
  <tr>
    <td class="lbl">اسم المعلم</td><td class="val">${teacherName}</td>
    <td class="lbl">معاد اظبيه</td><td class="val"></td>
  </tr>
  <tr>
    <td class="lbl">موضوع الدرس</td><td class="val">${lessonTopic||'—'}</td>
    <td class="lbl">العام الدراسي</td><td class="val">${semester||'—'}</td>
  </tr>
  <tr>
    <td class="lbl">الصف</td><td class="val">${classRoom||'—'}</td>
    <td class="lbl">الحصة</td><td class="val">${period||'—'}</td>
  </tr>
  <tr>
    <td class="lbl">اليوم</td><td class="val">${today}</td>
    <td class="lbl">الموافق</td><td class="val"></td>
  </tr>
</table>

<table class="crit-table">
  <thead>
    <tr>
      <th style="width:40px">م</th>
      <th style="text-align:right">عناصر التقييـم والمتابعة</th>
      <th style="background:#059669">ممتاز</th>
      <th style="background:#1a78c2">جيد جداً</th>
      <th style="background:#d4920a">جيد</th>
      <th style="background:#f59e0b">مقبول</th>
      <th style="background:#dc2626">ضعيف</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<div class="notes-label">ملاحظات :</div>
<div class="notes-box">${notes||''}</div>

<table class="sig-table">
  <thead>
    <tr>
      <th>مدير المدرسة</th>
      <th>رئيس القسم</th>
      <th>الوظيفة</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td></td>
      <td>${visitorName||''}</td>
      <td style="text-align:right;font-weight:700">الاسم</td>
    </tr>
    <tr>
      <td style="height:40px"></td>
      <td style="height:40px"></td>
      <td style="text-align:right;font-weight:700">التوقيع<br>بالعلم</td>
    </tr>
  </tbody>
</table>
</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 800);
};

// ══ أرشيف الزيارات ══
let allVisitsDocs = [];

function loadTechVisitsLive() {
    const tbody = document.getElementById('tech-visits-tbody');
    const schoolId = getActiveSchoolId();
    const q = query(collection(db,'technical_visits'), where('schoolId','==',schoolId));

    onSnapshot(q, snap => {
        allVisitsDocs = [];
        snap.forEach(d => allVisitsDocs.push({ id:d.id, ...d.data() }));
        allVisitsDocs.sort((a,b) => (b.date||'').localeCompare(a.date||''));
        window.filterVisitsArchive();
    });
}

window.filterVisitsArchive = function() {
    const tbody   = document.getElementById('tech-visits-tbody');
    const subject = document.getElementById('archive-filter-subject')?.value || '';
    const search  = (document.getElementById('archive-search')?.value || '').toLowerCase();

    let filtered = allVisitsDocs.filter(d => {
        const matchSubject = !subject || d.subject === subject;
        const matchSearch  = !search  || (d.teacherName||'').toLowerCase().includes(search);
        return matchSubject && matchSearch;
    });

    if(!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--mid)">لا توجد زيارات مسجلة</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(data => {
        const color = RATING_COLORS[data.overallRating] || '#6b7280';
        return `<tr style="border-bottom:1px solid var(--line)">
            <td style="padding:10px 12px;font-weight:700">${data.teacherName||'—'}</td>
            <td style="padding:10px 12px">${data.subject||'—'}</td>
            <td style="padding:10px 12px">${data.classRoom||'—'}</td>
            <td style="padding:10px 12px">${data.visitorName||'—'}</td>
            <td style="padding:10px 12px;text-align:center">
                <span class="archive-badge" style="background:${color}">${data.overallRating||'—'}</span>
            </td>
            <td style="padding:10px 12px;color:var(--mid)">${data.date||'—'}</td>
            <td style="padding:10px 12px;text-align:center">
                <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
                    <button onclick='window.showVisitDetails(${JSON.stringify(data).replace(/'/g,"&apos;")})'
                        style="background:var(--sky);color:#fff;border:none;border-radius:6px;
                        padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">
                        عرض
                    </button>
                    <button onclick='window.printOfficialVisitForm(${JSON.stringify({
                        teacherName: data.teacherName,
                        lessonTopic: data.lessonTopic||"",
                        subject: data.subject,
                        classRoom: data.classRoom||"",
                        period: data.period||"",
                        visitorName: data.visitorName||"",
                        semester: data.semester||"",
                        notes: data.notes||"",
                        visitDate: data.date||"",
                        criteriaResults: data.criteria||[]
                    }).replace(/'/g,"&apos;")})'
                        style="background:var(--red);color:#fff;border:none;border-radius:6px;
                        padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">
                        🖨️ طباعة
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

// ══ تفاصيل الزيارة ══
window.showVisitDetails = function(data) {
    const existing = document.getElementById('visit-detail-modal');
    if(existing) existing.remove();

    const criteriaHTML = (data.criteria||[]).map((c,i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
            padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px">
            <span style="font-weight:600;color:#374151">${i+1}. ${c.item}</span>
            <span style="font-weight:800;color:${RATING_COLORS[c.rating]||'#6b7280'};
                padding:2px 10px;border-radius:8px;background:${RATING_COLORS[c.rating]||'#6b7280'}22">
                ${c.rating}
            </span>
        </div>`).join('');

    const modal = document.createElement('div');
    modal.id = 'visit-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:580px;width:100%;
        max-height:85vh;overflow-y:auto;direction:rtl;font-family:'Cairo',sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:15px;font-weight:900;color:#0b2545;margin:0">
                📋 تفاصيل الزيارة الفنية
            </h3>
            <button onclick="document.getElementById('visit-detail-modal').remove()"
                style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button>
        </div>
        <div style="background:#f8f9fc;border-radius:10px;padding:14px;margin-bottom:14px;font-size:13px;line-height:2">
            <div>👤 <b>المعلم:</b> ${data.teacherName||'—'}</div>
            <div>📚 <b>المادة:</b> ${data.subject||'—'} | <b>الصف:</b> ${data.classRoom||'—'} | <b>الحصة:</b> ${data.period||'—'}</div>
            <div>📝 <b>موضوع الدرس:</b> ${data.lessonTopic||'—'}</div>
            <div>🧑‍💼 <b>الموجه:</b> ${data.visitorName||'—'}</div>
            <div>📅 <b>التاريخ:</b> ${data.date||'—'}</div>
            <div>⭐ <b>التقييم العام:</b>
                <span style="color:${RATING_COLORS[data.overallRating]||'#6b7280'};font-weight:800">
                    ${data.overallRating||'—'}
                </span>
                | ✅ ممتاز: ${data.excellentCount||0} | 🟡 جيد: ${data.goodCount||0} | 🔴 يحتاج تطوير: ${data.weakCount||0}
            </div>
        </div>
        <div style="margin-bottom:14px">
            <div style="font-weight:800;font-size:13px;color:#0b2545;margin-bottom:8px">
                📊 بنود التقييم (${(data.criteria||[]).length})
            </div>
            ${criteriaHTML}
        </div>
        ${data.notes?`<div style="background:#eaf4fd;border-radius:8px;padding:12px;font-size:13px;color:#0b2545">
            <b>💬 ملاحظات الموجه:</b><br>${data.notes}</div>`:''}
        <div style="display:flex;gap:8px;margin-top:16px">
            <button onclick='window.printOfficialVisitForm(${JSON.stringify({
                teacherName: data.teacherName||"",
                lessonTopic: data.lessonTopic||"",
                subject: data.subject||"",
                classRoom: data.classRoom||"",
                period: data.period||"",
                visitorName: data.visitorName||"",
                semester: data.semester||"",
                notes: data.notes||"",
                visitDate: data.date||"",
                criteriaResults: data.criteria||[]
            }).replace(/'/g,"&apos;")})'
                style="flex:1;padding:11px;background:var(--red);color:#fff;border:none;
                border-radius:8px;font-family:'Cairo',sans-serif;font-weight:700;cursor:pointer">
                🖨️ طباعة النموذج الرسمي
            </button>
            <button onclick="document.getElementById('visit-detail-modal').remove()"
                style="flex:1;padding:11px;background:#f0f4f8;color:var(--mid);border:none;
                border-radius:8px;font-family:'Cairo',sans-serif;font-weight:700;cursor:pointer">
                إغلاق
            </button>
        </div>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
};

// ══ تصدير PDF الأرشيف ══
window.printVisitsPDF = async function() {
    if(!allVisitsDocs.length) {
        window.showToast('⚠️ لا توجد بيانات للتصدير','warning'); return;
    }
    const contentHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
            <tr style="background:#0b2545;color:#fff">
                <th style="padding:8px">المعلم</th>
                <th style="padding:8px">المادة</th>
                <th style="padding:8px">الصف</th>
                <th style="padding:8px">الموجه</th>
                <th style="padding:8px">التقييم</th>
                <th style="padding:8px">التاريخ</th>
            </tr>
        </thead>
        <tbody>
            ${allVisitsDocs.map(d=>`<tr>
                <td style="padding:7px;border-bottom:1px solid #eee;font-weight:700">${d.teacherName||'—'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee">${d.subject||'—'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee">${d.classRoom||'—'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee">${d.visitorName||'—'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee;font-weight:800;color:${RATING_COLORS[d.overallRating]||'#000'}">${d.overallRating||'—'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee;color:#666">${d.date||'—'}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
    if(window.ManzoumaReport?.exportPDF) {
        await window.ManzoumaReport.exportPDF(contentHTML,'سجل_الزيارات_الفنية','سجل الزيارات الفنية الصفية','متوسطة سالم الحسينان');
    }
};
