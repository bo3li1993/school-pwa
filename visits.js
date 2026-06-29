import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ===== معايير التقييم لكل قسم (15-18 بند) =====
const DEPT_CRITERIA = {
    'اللغة العربية': [
        'وضوح الأهداف التعليمية في بداية الحصة','تمكن المعلم من المادة العلمية','تنويع طرائق التدريس',
        'استخدام الوسائل التعليمية المناسبة','إدارة الوقت داخل الحصة','مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب','ربط الدرس بالواقع والحياة','سلامة اللغة العربية المنطوقة',
        'تدريب الطلاب على المهارات اللغوية','التنويع في الأسئلة الصفية','معالجة الفروق الفردية',
        'تنظيم السبورة والعرض','الانضباط الصفي العام','استخدام التقنية في الحصة',
        'ربط الدرس بالدروس السابقة','تحفيز الطلاب على القراءة','إغلاق الحصة وتلخيص الأهداف'
    ],
    'الرياضيات': [
        'وضوح الأهداف التعليمية','التمكن من المحتوى الرياضي','التدرج المنطقي في عرض الدرس',
        'استخدام الوسائل والنماذج العملية','حل التمارين بأساليب متنوعة','مشاركة الطلاب في حل المسائل',
        'التقويم المستمر والتغذية الراجعة','ربط الرياضيات بالحياة العملية','إدارة الوقت الصفي',
        'معالجة الفروق الفردية بين الطلاب','تنظيم عرض الحل على السبورة','الدقة في المصطلحات الرياضية',
        'تدريب الطلاب على التفكير المنطقي','استخدام التقنية والآلة الحاسبة','الانضباط الصفي',
        'تنويع الأسئلة الصفية','مراجعة الواجب المنزلي','تلخيص وإغلاق الحصة'
    ],
    'العلوم': [
        'وضوح الأهداف العلمية','التمكن من المحتوى العلمي','استخدام التجارب العملية',
        'تطبيق معايير السلامة في المختبر','ربط العلم بالتقنية والحياة','تحفيز التفكير العلمي والاستنتاج',
        'استخدام الوسائل والنماذج العلمية','التقويم المستمر للطلاب','إدارة الوقت داخل الحصة',
        'مشاركة الطلاب في الأنشطة العلمية','الدقة في المصطلحات العلمية','معالجة الفروق الفردية',
        'تنظيم السبورة والعرض','الانضباط الصفي','استخدام التقنية والوسائط',
        'تنمية مهارة الاستقصاء العلمي','ربط الدرس بالمنهج العام'
    ],
    'التربية الإسلامية': [
        'وضوح الأهداف التربوية والعلمية','التمكن من المادة الشرعية','حسن التلاوة والتجويد إن وجد',
        'ربط الدرس بالقيم والسلوك العملي','استخدام أسلوب القصة والموعظة','تنويع طرائق التدريس',
        'إدارة الوقت داخل الحصة','مشاركة الطلاب الفاعلة','التقويم المستمر للطلاب',
        'الدقة في توثيق الأدلة الشرعية','معالجة الفروق الفردية','الانضباط الصفي العام',
        'استخدام الوسائل التعليمية','تنمية القيم الأخلاقية لدى الطلاب','ربط الدرس بالواقع المعاصر',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'الاجتماعيات': [
        'وضوح الأهداف التعليمية','التمكن من المحتوى الجغرافي والتاريخي','استخدام الخرائط والوسائل',
        'ربط الدرس بالواقع المحلي والعالمي','تنويع طرائق التدريس','مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب','إدارة الوقت داخل الحصة','معالجة الفروق الفردية',
        'تنظيم السبورة والعرض','الانضباط الصفي العام','استخدام التقنية في الحصة',
        'تنمية حب الوطن والانتماء','تدريب الطلاب على التحليل والاستنتاج','إغلاق الحصة وتلخيص الأهداف'
    ],
    'اللغة الإنجليزية': [
        'Clear lesson objectives — وضوح الأهداف','Subject mastery — التمكن من المادة',
        'Pronunciation accuracy — سلامة النطق','Variety of teaching methods — تنويع الطرائق',
        'Use of teaching aids — استخدام الوسائل','Student participation — مشاركة الطلاب',
        'Continuous assessment — التقويم المستمر','Time management — إدارة الوقت',
        'Differentiated instruction — معالجة الفروق الفردية','Board organization — تنظيم السبورة',
        'Classroom management — الانضباط الصفي','Use of technology — استخدام التقنية',
        'Vocabulary building — بناء المفردات','Speaking skills practice — تدريب مهارة التحدث',
        'Lesson closure — إغلاق الحصة'
    ],
    'الحاسوب': [
        'وضوح الأهداف التعليمية','التمكن من المحتوى التقني','تطبيق الجانب العملي والتطبيقي',
        'متابعة سلامة استخدام الأجهزة','تنويع طرائق التدريس','مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب','إدارة الوقت داخل الحصة','معالجة الفروق الفردية',
        'تنظيم المختبر والأجهزة','الانضباط الصفي العام','ربط الدرس بالتطبيقات الحديثة',
        'تنمية مهارات حل المشكلات','الأمن السيبراني والاستخدام الآمن','إغلاق الحصة وتلخيص الأهداف'
    ],
    'الكهرباء': [
        'وضوح الأهداف الفنية','التمكن من المحتوى النظري والعملي','تطبيق معايير السلامة المهنية',
        'استخدام الأدوات والمعدات بشكل صحيح','تنويع طرائق التدريس','مشاركة الطلاب في التطبيق العملي',
        'التقويم المستمر للطلاب','إدارة الوقت داخل الورشة','معالجة الفروق الفردية',
        'تنظيم الورشة والمعدات','الانضباط داخل الورشة','ربط النظري بالتطبيق العملي',
        'تنمية المهارات الفنية المهنية','إغلاق الحصة وتلخيص الأهداف'
    ],
    'الديكور': [
        'وضوح الأهداف الفنية','التمكن من المهارات الفنية','تطبيق معايير السلامة في الورشة',
        'استخدام الأدوات بشكل صحيح','تنويع طرائق التدريس','مشاركة الطلاب في التطبيق العملي',
        'التقويم المستمر للأعمال الفنية','إدارة الوقت داخل الورشة','تنظيم الورشة والمواد',
        'الانضباط داخل الورشة','تنمية الحس الجمالي والإبداعي','ربط الدرس بسوق العمل',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'التربية الفنية': [
        'وضوح الأهداف الفنية','التمكن من المهارات الفنية والتقنيات','تنويع الخامات والأدوات',
        'تشجيع الإبداع والابتكار','مشاركة الطلاب الفاعلة','التقويم المستمر للأعمال الفنية',
        'إدارة الوقت داخل الحصة','تنظيم الفصل والأدوات','الانضباط الصفي العام',
        'تنمية الحس الجمالي','عرض ومناقشة الأعمال الفنية','ربط الفن بالتراث والهوية',
        'إغلاق الحصة وتلخيص الأهداف'
    ],
    'التربية الرياضية': [
        'وضوح الأهداف التدريبية','التمكن من المهارات الحركية','تطبيق الإحماء والتهيئة البدنية',
        'تطبيق معايير السلامة الرياضية','تنويع الأنشطة والتمارين','مشاركة جميع الطلاب',
        'التقويم المستمر للأداء الحركي','إدارة الوقت داخل الحصة','تنظيم الملعب والأدوات',
        'الانضباط والروح الرياضية','تنمية العمل الجماعي والروح التنافسية الإيجابية',
        'الاهتمام بالحالات الصحية الخاصة','إغلاق الحصة وتهدئة بدنية'
    ],
    'عام': [
        'وضوح الأهداف التعليمية','التمكن من المادة العلمية','تنويع طرائق التدريس',
        'استخدام الوسائل التعليمية المناسبة','إدارة الوقت داخل الحصة','مشاركة الطلاب الفاعلة',
        'التقويم المستمر للطلاب','معالجة الفروق الفردية','تنظيم الفصل والعرض',
        'الانضباط الصفي العام','استخدام التقنية في الحصة','إغلاق الحصة وتلخيص الأهداف'
    ]
};

const RATING_OPTIONS = ['ممتاز','جيد جداً','جيد','مقبول','ضعيف'];

export async function initVisitsModule() {
    const container = document.getElementById('tab-visits');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="border-top:4px solid var(--sky); background:#fff; padding:22px; border-radius:14px; border:1px solid var(--line);">
            <h2 style="color:var(--navy); font-size:16px; font-weight:900;">
                <i class="bi bi-journal-check" style="color:var(--sky);"></i> توثيق ورصد الزيارات الصفية الفنية
            </h2>
            <p style="font-size:12px; color:var(--mid); margin:6px 0 18px; font-weight:600;">
                اختر القسم لعرض بنود التقييم الخاصة به — التقييم يُحفظ تلقائياً سحابياً
            </p>

            <form id="tech-visit-form" onsubmit="window.handleRegisterTechVisitLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:14px;">
                    <div>
                        <label class="v-label">اسم المعلم المزار</label>
                        <select id="visit-teacher-name" class="v-input" required>
                            <option value="">⏳ جاري تحميل دليل المعلمين...</option>
                        </select>
                    </div>
                    <div>
                        <label class="v-label">القسم / المادة الدراسية</label>
                        <select id="visit-subject" class="v-input" onchange="window.renderVisitCriteria(this.value)" required>
                            <option value="">-- اختر القسم --</option>
                            ${Object.keys(DEPT_CRITERIA).map(d => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="v-label">اسم الموجه الفني / الزائر</label>
                        <input type="text" id="visit-visitor-name" class="v-input" value="${(JSON.parse(localStorage.getItem('hs_user')||'{}').name)||''}" readonly style="background:var(--off); color:var(--mid); font-weight:700;">
                    </div>
                </div>

                <div id="visit-criteria-area"></div>

                <div style="margin-top:14px;">
                    <label class="v-label">توصيات الزيارة وأبرز الملاحظات العامة</label>
                    <textarea id="visit-notes" class="v-input" rows="3" placeholder="اكتب التوجيه الفني والتوصيات..." required></textarea>
                </div>

                <button type="submit" class="v-submit">
                    <i class="bi bi-cloud-plus-fill"></i> توثيق الزيارة سحابياً
                </button>
            </form>
        </div>

        <div class="card" style="border-top:4px solid var(--navy); background:#fff; padding:22px; border-radius:14px; border:1px solid var(--line); margin-top:18px;">
            <h2 style="color:var(--navy); font-size:16px; font-weight:900;">
                <i class="bi bi-archive-fill"></i> أرشيف الزيارات الفنية
            </h2>
            <div style="overflow-x:auto; margin-top:12px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:var(--off);">
                            <th class="v-th">المعلم المزار</th>
                            <th class="v-th">القسم</th>
                            <th class="v-th">الموجه</th>
                            <th class="v-th">التقييم العام</th>
                            <th class="v-th">التاريخ</th>
                            <th class="v-th">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody id="tech-visits-tbody"></tbody>
                </table>
            </div>
        </div>

        <style>
            .v-label{font-weight:700;font-size:12.5px;color:var(--text);display:block;margin-bottom:5px}
            .v-input{width:100%;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;text-align:right;outline:none}
            .v-input:focus{border-color:var(--sky)}
            .v-submit{width:100%;background:var(--navy);color:#fff;font-weight:800;margin-top:16px;border:none;padding:12px;border-radius:9px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:14px}
            .v-submit:hover{background:#134074}
            .v-th{padding:10px 12px;text-align:right;font-weight:800;font-size:11.5px;color:var(--mid);border-bottom:1px solid var(--line)}
            .crit-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);gap:10px}
            .crit-label{font-size:12.5px;font-weight:600;color:var(--text);flex:1}
            .crit-select{padding:6px 10px;border:1.5px solid var(--line);border-radius:7px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;min-width:110px}
        </style>
    `;

    loadTechVisitsLive();
    loadTeacherDirectoryForVisits();
}

async function loadTeacherDirectoryForVisits() {
    const sel = document.getElementById('visit-teacher-name');
    if (!sel) return;
    try {
        const schoolId = getActiveSchoolId();
        const q = query(collection(db,'users'), where('schoolId','==',schoolId), where('role','==','teacher'));
        const snap = await getDocs(q);
        const names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = names.length
            ? '<option value="">-- اختر المعلم --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('')
            : '<option value="">⚠️ لا يوجد معلمين مسجّلين</option>';
    } catch(e) { sel.innerHTML = '<option value="">❌ خطأ بالتحميل</option>'; }
}

// ===== رسم بنود التقييم حسب القسم المختار =====
window.renderVisitCriteria = function(dept) {
    const area = document.getElementById('visit-criteria-area');
    if (!dept || !DEPT_CRITERIA[dept]) { area.innerHTML = ''; return; }

    const items = DEPT_CRITERIA[dept];
    area.innerHTML = `
        <div style="background:var(--off); border-radius:10px; padding:14px 16px; margin-top:6px;">
            <div style="font-weight:800; font-size:13px; color:var(--navy); margin-bottom:10px;">
                📋 بنود تقييم ${dept} (${items.length} بند)
            </div>
            ${items.map((item, i) => `
                <div class="crit-row">
                    <span class="crit-label">${i+1}. ${item}</span>
                    <select class="crit-select visit-criterion" data-item="${item}">
                        ${RATING_OPTIONS.map(r => `<option value="${r}" ${r==='جيد جداً'?'selected':''}>${r}</option>`).join('')}
                    </select>
                </div>
            `).join('')}
        </div>`;
};

window.handleRegisterTechVisitLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId();
    const dept = document.getElementById('visit-subject').value;

    // جمع تقييمات البنود
    const criteriaEls = document.querySelectorAll('.visit-criterion');
    const criteriaResults = [];
    criteriaEls.forEach(el => {
        criteriaResults.push({ item: el.getAttribute('data-item'), rating: el.value });
    });

    // حساب التقييم العام (الأكثر تكراراً)
    const ratingCounts = {};
    criteriaResults.forEach(c => ratingCounts[c.rating] = (ratingCounts[c.rating]||0)+1);
    const overallRating = Object.entries(ratingCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';

    const btn = e.target.querySelector('.v-submit');
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';

    try {
        await addDoc(collection(db, 'technical_visits'), {
            schoolId: schoolId,
            teacherName: document.getElementById('visit-teacher-name').value.trim(),
            subject: dept,
            visitorName: document.getElementById('visit-visitor-name').value.trim(),
            notes: document.getElementById('visit-notes').value.trim(),
            criteria: criteriaResults,
            overallRating: overallRating,
            date: getTodayISO(),
            createdAt: serverTimestamp()
        });
        alert('✅ تم توثيق الزيارة وحفظ التقييم بنجاح.');
        e.target.reset();
        document.getElementById('visit-criteria-area').innerHTML = '';
    } catch(err) {
        alert('❌ خطأ: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-plus-fill"></i> توثيق الزيارة سحابياً';
    }
};

async function loadTechVisitsLive() {
    const tbody = document.getElementById('tech-visits-tbody');
    const schoolId = getActiveSchoolId();
    const q = query(collection(db, 'technical_visits'), where('schoolId', '==', schoolId));

    onSnapshot(q, (snap) => {
        let html = '';
        const docs = [];
        snap.forEach(d => docs.push({id:d.id, ...d.data()}));
        docs.sort((a,b) => (b.date||'').localeCompare(a.date||''));

        docs.forEach(data => {
            const ratingColor = {
                'ممتاز':'#059669','جيد جداً':'#1a78c2','جيد':'#d4920a','مقبول':'#f59e0b','ضعيف':'#dc2626'
            }[data.overallRating] || '#6b7280';

            html += `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 12px; font-weight:700;">${data.teacherName||'-'}</td>
                <td style="padding:10px 12px;">${data.subject||'-'}</td>
                <td style="padding:10px 12px;">${data.visitorName||'-'}</td>
                <td style="padding:10px 12px;"><span style="color:${ratingColor}; font-weight:800;">${data.overallRating||'-'}</span></td>
                <td style="padding:10px 12px; color:var(--mid);">${data.date||'-'}</td>
                <td style="padding:10px 12px;">
                    <button onclick='window.showVisitDetails(${JSON.stringify(data).replace(/'/g,"&apos;")})'
                        style="background:transparent; border:1px solid var(--line); border-radius:6px; padding:4px 12px; font-size:11px; font-weight:700; cursor:pointer; color:var(--sky);">
                        عرض التفاصيل
                    </button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--mid);">لا توجد زيارات مسجلة.</td></tr>';
    });
}

window.showVisitDetails = function(data) {
    let msg = `📋 تفاصيل زيارة: ${data.teacherName}\n`;
    msg += `القسم: ${data.subject} | الموجه: ${data.visitorName}\n`;
    msg += `التاريخ: ${data.date}\n\n`;
    if (data.criteria && data.criteria.length) {
        msg += `البنود (${data.criteria.length}):\n`;
        data.criteria.forEach((c,i) => { msg += `${i+1}. ${c.item}: ${c.rating}\n`; });
    }
    msg += `\nالملاحظات: ${data.notes||'-'}`;
    alert(msg);
};
