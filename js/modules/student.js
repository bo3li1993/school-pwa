import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let localStudentsMap = {};

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--hover-color);"></i> محرك الاستعلام الموحد عن ملف الطالب الشامل</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            🔍 حدد الصف الدراسي ثم اختر اسم الطالب، أو اكتب جزءاً من اسمه في محرك البحث الذكي للاطلاع على كافة سجلاته الإدارية.
        </p>

        <!-- 💡 تحسين بوعلي: محرك البحث الجزئي الذكي واقتراح الأسماء التلقائية (Instant Suggestions) -->
        <div style="margin-bottom: 15px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <label style="font-weight:900; font-size:12px; color:var(--primary-color); display:block; margin-bottom:6px;"><i class="bi bi-lightning-charge"></i> بحث سريع ومباشر بجزء من الاسم:</label>
            <input type="text" id="student-partial-search-input" oninput="window.triggerPartialStudentSearchLive(this.value)" placeholder="اكتب اسم الطالب أو عائلته هنا (مثال: محمد)..." style="width:100%; padding:12px; border:2px solid #cbd5e1; border-radius:8px; outline:none; font-weight:700;">
            <div id="student-search-suggestions-container" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
        </div>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">الصف الدراسي:</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)" style="width:100%; padding:10px;">
                    <option value="">-- جاري سحب الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">اسم الطالب:</label>
                <select id="prof-student-select" disabled style="width:100%; padding:10px;">
                    <option value="">-- بانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <div style="display:flex; gap:10px;">
            <button onclick="window.triggerStudentProfileFetch()" style="flex:1; background:var(--primary-color); font-weight:900; padding:14px; border-radius:8px; border:none; color:#fff; cursor:pointer;"><i class="bi bi-search"></i> جلب السجل التاريخي الكامل</button>
            <button onclick="window.resetStudentDashboardLiveView()" id="btn-student-reset" style="background:#7f8c8d; border-radius:8px; border:none; color:#fff; padding:0 20px; display:none;"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
    </div>
    <div id="student-profile-display-area"></div>`;

    // تحميل الفصول للمدرسة الحالية فقط
    const classSelect = document.getElementById('prof-class-select');
    const schoolId = getActiveSchoolId();
    
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    
    let classesSet = new Set();
    snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
    
    // التوافقية للمدرسة القديمة
    if (classesSet.size === 0 && schoolId === 'hosainan') {
        const fallbackSnap = await getDocs(collection(db, 'students'));
        fallbackSnap.forEach(doc => { if(!doc.data().schoolId && doc.data().classId) classesSet.add(doc.data().classId.trim()); });
    }
    
    let htmlClasses = '<option value="">-- الرجاء اختيار الصف --</option>';
    Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
    classSelect.innerHTML = htmlClasses;
    
    // شحن خريطة الطلاب العامة مسبقاً لدعم البحث الجزئي الفوري السريع بدون استهلاك الكوتة السحابية
    preloadAllSchoolStudentsMap();
}

// دالة شحن ذاكرة الكاش للبحث الفوري المباشر بوعلي
async function preloadAllSchoolStudentsMap() {
    const schoolId = getActiveSchoolId();
    localStudentsMap = {};
    try {
        let snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(collection(db, 'students'));
        }
        snap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                const cleanName = data.name.trim();
                localStudentsMap[cleanName] = { id: doc.id, ...data };
            }
        });
    } catch(e) { console.error("خطأ تشغيل رادار الطلاب المسبق:", e); }
}

// 🎯 دالة تشغيل البحث الجزئي وعرض المقترحات الذكية (10 كحد أقصى)
window.triggerPartialStudentSearchLive = function(searchInput) {
    const container = document.getElementById('student-search-suggestions-container');
    if (!container) return;

    if (!searchInput || searchInput.trim().length < 2) {
        container.innerHTML = '';
        return;
    }

    const cleanInput = searchInput.trim();
    const suggestions = [];

    // جرد الأسماء المتطابقة جزئياً من الكاش المحلي الموفر للبيانات
    Object.keys(localStudentsMap).forEach(name => {
        if (name.includes(cleanInput)) {
            suggestions.push(name);
        }
    });

    // طباعة وفلترة المقترحات في الواجهة بوعلي
    if (suggestions.length > 0 && suggestions.length <= 10) {
        container.innerHTML = suggestions.map(s => `
            <button onclick="window.searchByNameDirectLive('${s}')" style="width:auto; background:var(--hover-color); color:#fff; padding:6px 14px; margin:3px; border:none; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                👤 ${s} (صف ${localStudentsMap[s].classId || '-'})
            </button>
        `).join('');
    } else if (suggestions.length > 10) {
        container.innerHTML = `<span style="font-size:11px; color:#e74c3c; font-weight:bold; padding:4px;"><i class="bi bi-info-circle"></i> يوجد أكثر من 10 نتائج متطابقة، يرجى كتابة الاسم بشكل أدق...</span>`;
    } else {
        container.innerHTML = `<span style="font-size:11px; color:#7f8c8d; font-weight:bold; padding:4px;"><i class="bi bi-x-circle"></i> لم يتم العثور على أي طالب متطابق</span>`;
    }
};

// دالة الاختيار المباشر والسريع للطالب من قائمة المقترحات لتوفير الوقت
window.searchByNameDirectLive = function(studentName) {
    const student = localStudentsMap[studentName];
    if (!student) return;

    // مزامنة القوائم المنسدلة تلقائياً لتعكس الاختيار الحالي
    const classSelect = document.getElementById('prof-class-select');
    const studentSelect = document.getElementById('prof-student-select');
    
    if (classSelect && student.classId) {
        classSelect.value = student.classId;
    }
    
    if (studentSelect) {
        studentSelect.innerHTML = `<option value="${studentName}">${studentName}</option>`;
        studentSelect.value = studentName;
        studentSelect.disabled = false;
    }

    // تصفير صندوق المقترحات المفتوح بعد النقر
    document.getElementById('student-search-suggestions-container').innerHTML = '';
    document.getElementById('student-partial-search-input').value = studentName;

    // جلب الملف فوراً
    document.getElementById('btn-student-reset').style.display = 'inline-block';
    window.loadStudentFullProfile(student);
};

window.handleStudentClassChange = async function(classId) {
    const studentSelect = document.getElementById('prof-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب الأسماء...</option>';
    studentSelect.disabled = true;

    const schoolId = getActiveSchoolId();

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);
        
        if (snap.empty && schoolId === 'hosainan') {
             snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId.trim())));
        }
        
        let studentsList = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.name && (!data.schoolId || data.schoolId === schoolId)) {
                const cleanName = data.name.trim();
                studentsList.push(cleanName);
                localStudentsMap[cleanName] = { id: doc.id, ...data };
            }
        });
        studentsList.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر الطالب --</option>';
        studentsList.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = studentsList.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = studentsList.length === 0;
    } catch(e) { studentSelect.innerHTML = '<option value="">❌ خطأ في الاتصال</option>'; }
};

window.triggerStudentProfileFetch = function() {
    const sName = document.getElementById('prof-student-select').value;
    if(!sName || !localStudentsMap[sName]) { alert('⚠️ يرجى اختيار الطالب!'); return; }
    document.getElementById('btn-student-reset').style.display = 'inline-block';
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

window.resetStudentDashboardLiveView = function() {
    const classSelect = document.getElementById('prof-class-select');
    const studentSelect = document.getElementById('prof-student-select');
    const displayArea = document.getElementById('student-profile-display-area');
    const searchInput = document.getElementById('student-partial-search-input');
    const suggestionsContainer = document.getElementById('student-search-suggestions-container');

    if (classSelect) classSelect.value = '';
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
    }
    if (searchInput) searchInput.value = '';
    if (suggestionsContainer) suggestionsContainer.innerHTML = '';
    if (displayArea) displayArea.innerHTML = '';
    
    document.getElementById('btn-student-reset').style.display = 'none';
};

window.loadStudentFullProfile = async function(student) {
    const displayArea = document.getElementById('student-profile-display-area');
    const schoolId = getActiveSchoolId();

    try {
        const name = student.name.trim();
        // سحب البيانات من 5 جداول مترابطة، كلها مقيدة بـ schoolId
        const [attSnap, behSnap, rewSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', name), where('schoolId', '==', schoolId)))
        ]);

        // بناء لوحة العرض الشاملة والفاخرة للطالب بوعلي ومطابقة الجداول
        let attHtml = ''; attSnap.forEach(d => { const data = d.data(); attHtml += `<tr><td>${data.date || '-'}</td><td>${data.period || '-'}</td><td><span class="badge ${data.status === 'absent' ? 'danger' : 'warning'}">${data.status === 'absent' ? 'غياب' : 'تأخير'}</span></td></tr>`; });
        let behHtml = ''; behSnap.forEach(d => { const data = d.data(); behHtml += `<tr><td>${data.dateStr || '-'}</td><td>${data.violation || '-'}</td><td>${data.action || '-'}</td></tr>`; });
        let rewHtml = ''; rewSnap.forEach(d => { const data = d.data(); rewHtml += `<tr><td>${data.dateStr || '-'}</td><td>🏆 ${data.rewardTitle || '-'}</td></tr>`; });
        let gateHtml = ''; gateSnap.forEach(d => { const data = d.data(); gateHtml += `<tr><td>${data.dateStr || '-'}</td><td>${data.timeStr || '-'}</td><td>${data.status === 'exited' ? '🚷 غادر أسوار المدرسة' : '🎫 مصرح بالخروج'}</td></tr>`; });
        let clinicHtml = ''; clinicSnap.forEach(d => { const data = d.data(); clinicHtml += `<tr><td>${data.dateStr || '-'}</td><td>🩺 ${data.complaint || '-'}</td><td>${data.procedure || '-'}</td></tr>`; });

        displayArea.innerHTML = `
        <div class="card" style="margin-top:20px; border-top:5px solid var(--hover-color); background:#fff; padding:22px; border-radius:12px; text-align:right;">
            <h2 style="color:var(--primary-color); font-weight:900;"><i class="bi bi-shield-check"></i> الملف الموحد المسترجع للطالب: [ ${name} ]</h2>
            <p style="font-weight:bold; font-size:13px; color:#555; margin-bottom:15px;">الفصل الدراسي الحالي: صف <span style="color:var(--hover-color); font-weight:900;">${student.classId || '-'}</span> | معرّف المنظومة: <code>${student.id}</code></p>
            
            <div style="display:grid; grid-template-columns:1fr; gap:15px; margin-top:15px;">
                <div style="border:1px solid #eef2f5; padding:15px; border-radius:10px;">
                    <h3 style="font-size:13px; font-weight:900; color:var(--primary-color);"><i class="bi bi-clock"></i> سجل الحضور والغياب الصفي</h3>
                    <table><thead><tr><th>التاريخ</th><th>الحصة</th><th>الحالة</th></tr></thead><tbody>${attHtml || '<tr><td colspan="3" style="text-align:center; color:#999;">سجل الحضور نظيف وسليم بالكامل ✅</td></tr>'}</tbody></table>
                </div>
                <div style="border:1px solid #eef2f5; padding:15px; border-radius:10px;">
                    <h3 style="font-size:13px; font-weight:900; color:#c0392b;"><i class="bi bi-exclamation-triangle"></i> السلوك والمخالفات التربوية</h3>
                    <table><thead><tr><th>التاريخ</th><th>المخالفة المرصودة</th><th>الإجراء المتبع من الأخصائي</th></tr></thead><tbody>${behHtml || '<tr><td colspan="3" style="text-align:center; color:#999;">لا توجد أي مخالفات سلوكية مقيدة على الطالب 👍</td></tr>'}</tbody></table>
                </div>
                <div style="border:1px solid #eef2f5; padding:15px; border-radius:10px;">
                    <h3 style="font-size:13px; font-weight:900; color:#27ae60;"><i class="bi bi-trophy"></i> لوحة الإبداع والتعزيز الإيجابي</h3>
                    <table><thead><tr><th>التاريخ</th><th>بند التميز والتكريم الممنوح</th></tr></thead><tbody>${rewHtml || '<tr><td colspan="2" style="text-align:center; color:#999;">لم يتم رصد بنود تعزيز للأسبوع الحالي.</td></tr>'}</tbody></table>
                </div>
                <div style="border:1px solid #eef2f5; padding:15px; border-radius:10px;">
                    <h3 style="font-size:13px; font-weight:900; color:var(--hover-color);"><i class="bi bi-ticket-detailed"></i> أرشيف خروج واستئذان البوابة</h3>
                    <table><thead><tr><th>التاريخ</th><th>وقت الخروج</th><th>الحالة الأمنية الحالية</th></tr></thead><tbody>${gateHtml || '<tr><td colspan="3" style="text-align:center; color:#999;">لا توجد طلبات استئذان مسجلة.</td></tr>'}</tbody></table>
                </div>
                <div style="border:1px solid #eef2f5; padding:15px; border-radius:10px;">
                    <h3 style="font-size:13px; font-weight:900; color:#2980b9;"><i class="bi bi-heart-pulse"></i> زيارات العيادة والملف الصحي اليومي</h3>
                    <table><thead><tr><th>التاريخ</th><th>الشكوى والأعراض</th><th>التوصية / إجراء الممرض</th></tr></thead><tbody>${clinicHtml || '<tr><td colspan="3" style="text-align:center; color:#999;">الطالب لم يقم بزيارة العيادة الطبية مؤخراً.</td></tr>'}</tbody></table>
                </div>
            </div>
        </div>`;
    } catch(err) { displayArea.innerHTML = `<p style="color:red; font-weight:bold;">❌ تعذر استرجاع ملف الطالب: ${err.message}</p>`; }
};

// ربط دوال الفرز والبحث المباشر لـ النافذة العالمية (Window Engine)
window.handleStudentClassChange = handleStudentClassChange;
window.triggerStudentProfileFetch = triggerStudentProfileFetch;
window.resetStudentDashboardLiveView = resetStudentDashboardLiveView;
window.searchByNameDirectLive = searchByNameDirectLive;