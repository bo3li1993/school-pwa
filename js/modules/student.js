// 👤 موديل ملف الطالب الشامل بنظام البحث الجزئي والاقتراحات المتعددة الذكي
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    // بناء واجهة البحث النظيفة والمستقلة بالكامل
    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--hover-color);"></i> نظام الاستعلام عن ملف الطالب الشامل</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            🔍 اكتب اسم الطالب (كاملاً أو جزئياً)؛ سيقوم المحرك بفحص السجلات وضخ الاقتراحات الذكية فوراً في حال تشابه الأسماء.
        </p>
        
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="text" id="student-search-input" placeholder="اكتب اسم الطالب هنا (مثال: أحمد...)" style="margin-bottom:0; flex:1;">
            <button onclick="window.searchStudentLive()" style="width:120px; background:var(--primary-color);"><i class="bi bi-search"></i> ابحث الحين</button>
        </div>

        <div id="student-suggestions-box" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:15px;"></div>
    </div>

    <div id="student-profile-display-area"></div>`;

    // تفعيل البحث عند الضغط على زر Enter لراحة مستخدم اللوحة
    document.getElementById('student-search-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            window.searchStudentLive();
        }
    });
}

// 🔍 محرك البحث الجزئي والفرز الذكي للاقتراحات المتعددة
window.searchStudentLive = async function() {
    const input = document.getElementById('student-search-input');
    const suggestionsBox = document.getElementById('student-suggestions-box');
    const displayArea = document.getElementById('student-profile-display-area');
    
    if(!input || !suggestionsBox || !displayArea) return;
    
    const searchName = input.value.trim();
    if(!searchName) { alert('⚠️ يرجى كتابة اسم الطالب أولاً للاستعلام.'); return; }

    suggestionsBox.innerHTML = "";
    displayArea.innerHTML = `<p style="text-align:center; padding:20px; font-weight:bold; color:#666;">⏳ جاري مسح كشوف قيد الطلاب والبحث الجزئي...</p>`;

    try {
        // 🔥 استعلام البحث الجزئي المتقدم: يصيد الاسم حتى لو كتب المستخدم كلمة واحدة أو حروف أولى
        const q = query(collection(db, 'students'),
                        where('name', '>=', searchName),
                        where('name', '<=', searchName + '\uf8ff'));
        
        const snap = await getDocs(q);
        
        if(snap.empty) {
            displayArea.innerHTML = `<div class="card" style="text-align:center; color:var(--danger-color); font-weight:bold; padding:20px;">❌ لم يتم العثور على أي طالب يطابق هذا الاسم في قاعدة البيانات.</div>`;
            return;
        }

        let matches = [];
        snap.forEach(doc => {
            matches.push({ id: doc.id, ...doc.data() });
        });

        // الحالة الأولى: إذا تم العثور على نتيجة واحدة دقيقة بالملي
        if(matches.length === 1) {
            window.loadStudentFullProfile(matches[0]);
        } 
        // الحالة الثانية: إذا وجد أكثر من طالب يتشابهون في نفس الحروف (نظام الاقتراحات)
        else {
            displayArea.innerHTML = `<div style="background:#eef7fc; color:#2980b9; padding:12px; border-radius:8px; font-size:13px; font-weight:bold; margin-bottom:10px;"><i class="bi bi-info-circle-fill"></i> تم العثور على (${matches.length}) طلاب يتشابهون في الاسم، يرجى اختيار الطالب المقصود من الأزرار أعلاه:</div>`;
            
            let buttonsHtml = '';
            matches.forEach((student, index) => {
                // تخزين داتا الطالب في مصفوفة عائمة مؤقتة بداخل الـ window ليسهل استدعاؤها بضغطة زر
                if(!window.currentSearchSuggestions) window.currentSearchSuggestions = {};
                window.currentSearchSuggestions[student.id] = student;

                buttonsHtml += `
                    <button onclick="window.loadStudentFullProfile(window.currentSearchSuggestions['${student.id}'])" 
                            style="background:#fff; color:var(--primary-color); border:2px solid var(--primary-color); padding:8px 14px; font-size:12px; font-weight:bold; width:auto; border-radius:30px;">
                        👤 ${student.name} (${student.classId || 'بدون صف'})
                    </button>`;
            });
            suggestionsBox.innerHTML = buttonsHtml;
        }

    } catch(err) {
        displayArea.innerHTML = `<div class="card" style="color:red; text-align:center;">خطأ في محرك البحث: ${err.message}</div>`;
    }
};

// 📊 دالة سحب وضخ داتا الطالب المختار بالكامل (ملف جرافي شامل)
window.loadStudentFullProfile = async function(student) {
    const suggestionsBox = document.getElementById('student-suggestions-box');
    const displayArea = document.getElementById('student-profile-display-area');
    
    if(suggestionsBox) suggestionsBox.innerHTML = ""; // تنظيف الصندوق بعد الاختيار المستقر
    if(!displayArea) return;

    displayArea.innerHTML = `<p style="text-align:center; padding:20px; font-weight:bold; color:var(--hover-color);">⏳ جاري تجميع كشف علامات السلوك والحضور التراكمي للطالب...</p>`;

    try {
        const studentNameClean = student.name.trim();

        // سحب العمليات الحية المرتبطة بالطالب المختار من كولكشن الغياب والسلوك والجوائز
        const [attSnap, behSnap, rewSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', studentNameClean))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', studentNameClean)))
        ]);

        // 1. فرز كشف الغياب
        let attendanceHtml = '';
        attSnap.forEach(doc => {
            const d = doc.data();
            const badge = d.status === 'absent' ? '<span class="badge danger">🔴 غياب</span>' : '<span class="badge success">🟢 حضور</span>';
            attendanceHtml += `<tr style="border-bottom:1px solid #eee;"><td>${d.date || '-'}</td><td style="text-align:center;">${d.period || 'الحصة الأولى'}</td><td style="text-align:center;">${badge}</td><td>أ. ${d.recordedBy || 'المعلم'}</td></tr>`;
        });

        // 2. فرز كشف السلوك والمخالفات
        let behaviorHtml = '';
        behSnap.forEach(doc => {
            const d = doc.data();
            behaviorHtml += `<tr style="border-bottom:1px solid #eee; color:var(--danger-color);"><td>${d.date || '-'}</td><td><b>⚠️ ${d.type || 'مخالفة'}</b></td><td>${d.notes || 'سلوك غير منضبط'}</td><td>رصد: ${d.recordedBy || 'المشرف'}</td></tr>`;
        });

        // 3. فرز كشف التكريمات والجوائز والتعزيز الإيجابي
        let rewardsHtml = '';
        rewSnap.forEach(doc => {
            const d = doc.data();
            rewardsHtml += `<tr style="border-bottom:1px solid #eee; color:var(--success-color);"><td>${d.date || '-'}</td><td><b>🏆 ${d.type || 'تعزيز إيجابي'}</b></td><td style="font-weight:bold;">+${d.points || '5'} نقاط تعزيز</td><td>بواسطة: ${d.recordedBy || 'المعلم'}</td></tr>`;
        });

        // 🎨 ضخ لوحة الملف الشامل والكامل للطالب بتصميم داشبورد تجاري ملكي
        displayArea.innerHTML = `
            <div class="card" style="background: linear-gradient(135deg, var(--primary-color) 0%, #2c2c4d 100%); color:#fff; border:none; padding:25px; border-radius:12px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="font-size:20px; font-weight:900; color:#fff;">👤 الطالب: ${student.name}</h3>
                        <p style="font-size:12px; opacity:0.85; font-weight:bold; margin-top:4px;">المرحلة الدراسية: متوسطة سالم الحسينان للبنين</p>
                    </div>
                    <div style="text-align:left; background:rgba(255,255,255,0.15); padding:8px 15px; border-radius:8px;">
                        <p style="font-size:14px; font-weight:900; color:var(--hover-color);">🏫 الصف: ${student.classId || '-'}</p>
                        <p style="font-size:11px; font-weight:bold; margin-top:2px;">رقم القيد: ${student.studentNumber || '-'}</p>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="card" style="border-top-color:var(--accent-color); background:#fff; padding:15px; border-radius:12px;">
                    <h3 style="font-size:14px; font-weight:900; margin-bottom:10px; color:var(--primary-color);"><i class="bi bi-calendar3"></i> سجل الحضور والغياب التفصيلي</h3>
                    <div style="max-height:220px; overflow-y:auto; font-size:12px;">
                        <table style="margin-top:0;">
                            <thead><tr style="background:#f4f6f9;"><th>التاريخ</th><th style="text-align:center;">الحصة</th><th style="text-align:center;">الحالة</th><th>الراصد</th></tr></thead>
                            <tbody>${attendanceHtml || '<tr><td colspan="4" style="text-align:center; padding:15px; color:green; font-weight:bold;">🟢 ملتزم ومواظب بالكامل ولم يسجل غياب.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div class="card" style="border-top-color:var(--success-color); background:#fff; padding:15px; border-radius:12px; margin-bottom:0; flex:1;">
                        <h3 style="font-size:14px; font-weight:900; margin-bottom:8px; color:var(--success-color);"><i class="bi bi-trophy-fill"></i> سجل التكريم والتعزيز الإيجابي</h3>
                        <div style="max-height:110px; overflow-y:auto; font-size:12px;">
                            <table style="margin-top:0;"><tbody>${rewardsHtml || '<tr><td style="text-align:center; padding:10px; color:#999;">لم يقيد جوائز تعزيزية بعد.</td></tr>'}</tbody></table>
                        </div>
                    </div>

                    <div class="card" style="border-top-color:var(--danger-color); background:#fff; padding:15px; border-radius:12px; margin-bottom:0; flex:1;">
                        <h3 style="font-size:14px; font-weight:900; margin-bottom:8px; color:var(--danger-color);"><i class="bi bi-shield-slash-fill"></i> سجل التنبيهات والمخالفات السلوكية</h3>
                        <div style="max-height:110px; overflow-y:auto; font-size:12px;">
                            <table style="margin-top:0;"><tbody>${behaviorHtml || '<tr><td style="text-align:center; padding:10px; color:green; font-weight:bold;">✓ السجل السلوكي للطالب نظيف ومثالي.</td></tr>'}</tbody></table>
                        </div>
                    </div>
                </div>
            </div>

            <button onclick="window.exportAsManzoumaPDF('student-profile-display-area', 'الملف_الشامل_للطالب')" style="background:var(--primary-color); margin-top:15px; font-size:12px; font-weight:bold;"><i class="bi bi-printer-fill"></i> طباعة واعتماد الملف الشامل للطالب PDF</button>
        `;

    } catch(err) {
        displayArea.innerHTML = `<div class="card" style="color:red; text-align:center;">❌ فشل في جلب ملف الطالب التراكمي: ${err.message}</div>`;
    }
};