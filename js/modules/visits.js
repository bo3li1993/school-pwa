import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// إعدادات الفايربيس المعتمدة للمدرسة
const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// الـ 18 بنداً التقييمية الرسمية والمعتمدة للتوجيه ورؤساء الأقسام بالفصحى
const visitMetrics = [
    "1. الالتزام بالوقت المحدد لبدء الحصة الدراسية وإنهائها.",
    "2. وضوح صوت المعلم وسلامة لغته العربية ومخارج الحروف.",
    "3. التمهيد المشوق للحصة والربط بالدروس السابقة والواقع.",
    "4. صياغة الأهداف السلوكية (التعليمية) ووضوحها على السبورة.",
    "5. مهارة استخدام الوسائل التعليمية والتقنيات الحديثة.",
    "6. التنوع في استراتيجيات التدريس وتفعيل التعلم النشط.",
    "7. مراعاة الفروق الفردية بين المتعلمين وتوزيع الجهد.",
    "8. مهارة طرح الأسئلة الصفية المتنوعة ومستويات التفكير العليا.",
    "9. التمكن العلمي من المادة الدراسية وخلو الحصة من الأخطاء.",
    "10. إدارة الفصل وحسن السيطرة والمحافظة على النظام والنظافة.",
    "11. تفعيل دور المتعلم وجعله محوراً للعملية التعليمية.",
    "12. تقديم التعزيز الإيجابي الفوري (المادي والمعنوي) للمتميزين.",
    "13. متابعة دفاتر التدوين والواجبات المنزلية بدقة.",
    "14. مهارة الغلق الفعال للحصة والتأكد من تحقيق الأهداف.",
    "15. تطبيق التقويم التكويني والنهائي لقياس استيعاب الحصة.",
    "16. الالتزام بالخطة الزمنية المقررة لتوزيع المنهج الدراسي.",
    "17. العناية بالطلبة المتعثرين دراسياً وتقديم الدعم العلاجي.",
    "18. المظهر العام والالتزام باللوائح والنظم المدرسية المعتمدة."
];

// دالة بناء وتوليد استمارة التقييم ديناميكياً وفورياً داخل التبويب
export async function initVisitsModule() {
    const container = document.getElementById('tab-visits');
    if (!container) return;

    // تصميم الواجهة الرسمية للاستمارة
    let html = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-journal-check" style="color:var(--accent-color);"></i> استمارة توثيق الزيارات الفنية وتقييم الأداء والمعلمين</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يرجى تعبئة البيانات المعتمدة لرصد كفاءة الحصة الدراسية (تخضع الاستمارة للتوثيق السحابي الفوري)</p>
            
            <form id="visit-evaluation-form" onsubmit="window.submitVisitEvaluationForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:20px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم المعلم المشهود له بالزيارة</label>
                        <input type="text" id="v-teacher-name" placeholder="أدخل اسم المعلم كاملاً" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">القسم / المادة الدراسية</label>
                        <select id="v-dept-name" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                            <option value="">اختر القسم</option>
                            <option value="التربية الإسلامية">التربية الإسلامية</option>
                            <option value="اللغة العربية">اللغة العربية</option>
                            <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                            <option value="الرياضيات">الرياضيات</option>
                            <option value="العلوم">العلوم</option>
                            <option value="الاجتماعيات">الاجتماعيات</option>
                            <option value="الحاسوب">الحاسوب</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل / الحصة الدراسية</label>
                        <input type="text" id="v-class-lesson" placeholder="مثال: الصف السادس/1 - الحصة الثالثة" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                </div>

                <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
                <h3 style="font-size:14px; color:var(--primary-color); margin-bottom:15px; font-weight:800;">📋 بنود التقييم الفني المعتمدة (يرجى اختيار التقييم المناسب لكل بند)</h3>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
    `;

    // حقن الـ 18 بنداً مع أزرار راديو خماسية رسمية
    visitMetrics.forEach((metric, index) => {
        html += `
            <div style="background:#f8f9fa; padding:12px; border-radius:8px; border-right:4px solid var(--primary-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; text-align:right;">
                <span style="font-size:13px; font-weight:700; color:#333; max-width:65%; text-align:right;">${metric}</span>
                <div style="display:flex; gap:12px; direction:ltr;">
                    <label style="font-size:12px; font-weight:700; cursor:pointer;"><input type="radio" name="metric-${index}" value="5" required> ممتاز</label>
                    <label style="font-size:12px; font-weight:700; cursor:pointer;"><input type="radio" name="metric-${index}" value="4"> ج.جداً</label>
                    <label style="font-size:12px; font-weight:700; cursor:pointer;"><input type="radio" name="metric-${index}" value="3"> جيد</label>
                    <label style="font-size:12px; font-weight:700; cursor:pointer;"><input type="radio" name="metric-${index}" value="2"> مقبول</label>
                    <label style="font-size:12px; font-weight:700; cursor:pointer;"><input type="radio" name="metric-${index}" value="1"> ضعيف</label>
                </div>
            </div>
        `;
    });

    html += `
                </div>
                
                <div style="margin-top:20px; text-align:right;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">التوجيهات والتوصيات الفنية للمعلم</label>
                    <textarea id="v-recommendations" rows="3" placeholder="اكتب التوصيات التربوية والإدارية هنا..." style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;"></textarea>
                </div>

                <button type="submit" style="background:var(--success-color); color:white; border:none; width:100%; margin-top:20px; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-cloud-arrow-up-fill"></i> اعتماد وحفظ تقرير الزيارة الفنية بالنظام السحابي</button>
            </form>
        </div>

        <!-- جدول أرشيف التقارير السابقة المعتمدة -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--primary-color);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:15px;"><i class="bi bi-archive-fill"></i> أرشيف سجلات الزيارات الفنية المرصودة مسبقاً</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التاريخ والوقت</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم المعلم</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">القسم</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل / الحصة</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الدرجة المرصودة</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التوصيات الفنية</th>
                        </tr>
                    </thead>
                    <tbody id="visits-archive-tbody">
                        <tr><td colspan="6" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري سحب الأرشيف الإداري...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadVisitsArchiveFromServer();
}

// دالة معالجة وحفظ البيانات بالسيرفر بالأوقات الموثقة والدرجة التراكمية
window.submitVisitEvaluationForm = async function(e) {
    e.preventDefault();
    
    const teacherName = document.getElementById('v-teacher-name').value.trim();
    const deptName = document.getElementById('v-dept-name').value;
    const classLesson = document.getElementById('v-class-lesson').value.trim();
    const recommendations = document.getElementById('v-recommendations').value.trim();
    
    let totalScore = 0;
    for (let i = 0; i < 18; i++) {
        const selected = document.querySelector(`input[name="metric-${i}"]:checked`);
        if (selected) totalScore += parseInt(selected.value);
    }

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'technical_visits'), {
            teacherName: teacherName,
            deptName: deptName,
            classLesson: classLesson,
            recommendations: recommendations,
            totalScore: totalScore,
            maxPossible: 90,
            percentage: ((totalScore / 90) * 100).toFixed(1) + '%',
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });

        alert(`✓ تم اعتماد وحفظ تقرير الزيارة الفنية بنجاح!\nالدرجة الإجمالية المرصودة: ${totalScore} من 90`);
        document.getElementById('visit-evaluation-form').reset();
        loadVisitsArchiveFromServer();
    } catch (err) {
        alert('خطأ أثناء حفظ التقرير بالسيرفر: ' + err.message);
    }
};

// دالة سحب وعرض أرشيف التقارير من السيرفر بشكل رسمي ومنظم
async function loadVisitsArchiveFromServer() {
    const tbody = document.getElementById('visits-archive-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'technical_visits'));
        let html = ''; let count = 0;

        snap.forEach(docSnap => {
            count++;
            const v = docSnap.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${v.date || ''}<br>${v.time || ''}</small></td>
                  <td style="padding:12px;"><b>${v.teacherName}</b></td>
                  <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${v.deptName}</span></td>
                  <td style="padding:12px;"><small>${v.classLesson}</small></td>
                  <td style="padding:12px;"><span style="background:#27ae60; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${v.totalScore} / 90 (${v.percentage || ''})</span></td>
                  <td style="padding:12px;"><p style="font-size:11px; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${v.recommendations || 'لا يوجد'}">${v.recommendations || '-'}</p></td>
                </tr>
            `;
        });

        tbody.innerHTML = count === 0 ? '<tr><td colspan="6" style="text-align:center; color:#999; font-weight:bold; padding:15px;">لا توجد تقارير زيارات مؤرشفة حالياً بالسيرفر.</td></tr>' : html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:15px;">خطأ في سحب أرشيف البيانات.</td></tr>';
    }
}