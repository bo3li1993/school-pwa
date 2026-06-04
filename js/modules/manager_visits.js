import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء واجهة سجل زيارات مدير المدرسة الفنية والإدارية
export async function initManagerVisitsModule() {
    const container = document.getElementById('tab-manager-visits');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-person-workspace" style="color:var(--accent-color);"></i> استمارة توثيق زيارات مدير المدرسة وتقييم الأداء والدروس</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">تستخدم هذه الاستمارة لتوثيق الجولات التوجيهية لمدير المنشأة التعليمية ورصد الكفاءة داخل الفصل الدراسي.</p>
            
            <form id="manager-visit-form" onsubmit="window.submitManagerVisitForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم المعلم المَزور</label>
                        <input type="text" id="mv-teacher-name" placeholder="أدخل اسم المعلم كاملاً" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل / الحصة الدراسية</label>
                        <input type="text" id="mv-class-id" placeholder="مثال: الصف التاسع/3 - الحصة الرابعة" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">موضوع الدرس / المادة</label>
                        <input type="text" id="mv-lesson-topic" placeholder="مثال: رياضيات - الهندسة الإحداثية" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">إيجابيات الحصة ونقاط التميز الفني</label>
                        <textarea id="mv-strengths" rows="2" placeholder="اكتب نقاط القوة الملاحظة..." required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;"></textarea>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">ملاحظات ونقاط تتطلب تطوير مستقبلي</label>
                        <textarea id="mv-weaknesses" rows="2" placeholder="اكتب التوجيهات التطويرية..." required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;"></textarea>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 2fr 1fr; gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">التوصيات النهائية لمدير المدرسة</label>
                        <input type="text" id="mv-recommendations" placeholder="التوصيات الإدارية والتربوية المعتمدة" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">التقدير العام للحصة</label>
                        <select id="mv-rating" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="امتياز">امتياز</option>
                            <option value="جيد جداً">جيد جداً</option>
                            <option value="جيد">جيد</option>
                            <option value="مقبول">مقبول</option>
                        </select>
                    </div>
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-bookmark-star-fill"></i> اعتماد وتوقيع تقرير مدير المدرسة سحابياً</button>
            </form>
        </div>

        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--accent-color);">
            <h2><i class="bi bi-archive-fill"></i> أرشيف التقارير والزيارات الفنية لمدير المدرسة</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التاريخ والوقت</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">المعلم والفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">موضوع الدرس</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التقدير العام</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">التوصيات الإدارية</th>
                        </tr>
                    </thead>
                    <tbody id="manager-visits-archive-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري جلب وثائق الإدارة العليا...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadManagerVisitsArchiveFromServer();
}

// دالة حفظ التقرير بالسيرفر
window.submitManagerVisitForm = async function(e) {
    e.preventDefault();
    const teacherName = document.getElementById('mv-teacher-name').value.trim();
    const classId = document.getElementById('mv-class-id').value.trim();
    const lessonTopic = document.getElementById('mv-lesson-topic').value.trim();
    const strengths = document.getElementById('mv-strengths').value.trim();
    const weaknesses = document.getElementById('mv-weaknesses').value.trim();
    const recommendations = document.getElementById('mv-recommendations').value.trim();
    const rating = document.getElementById('mv-rating').value;

    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'manager_visits'), {
            teacherName: teacherName,
            classId: classId,
            lessonTopic: lessonTopic,
            strengths: strengths,
            weaknesses: weaknesses,
            recommendations: recommendations,
            rating: rating,
            date: currentDate,
            time: currentTime,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم توثيق واعتماد تقرير المدير بنجاح للمعلم (أ. ${teacherName}).`);
        document.getElementById('manager-visit-form').reset();
        loadManagerVisitsArchiveFromServer();
    } catch (err) { alert('خطأ أثناء حفظ تقرير الإدارة: ' + err.message); }
};

// دالة سحب وعرض أرشيف التقارير
async function loadManagerVisitsArchiveFromServer() {
    const tbody = document.getElementById('manager-visits-archive-tbody');
    if (!tbody) return;
    try {
        const snap = await getDocs(collection(db, 'manager_visits'));
        let html = ''; let count = 0;
        snap.forEach(docSnap => {
            count++;
            const m = docSnap.data();
            let rBadge = 'success';
            if(m.rating === 'جيد') rBadge = 'warning';
            if(m.rating === 'مقبول') rBadge = 'danger';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><small>${m.date || ''}<br>${m.time || ''}</small></td>
                  <td style="padding:12px;"><b>أ. ${m.teacherName}</b><br><small style="color:#777;">${m.classId}</small></td>
                  <td style="padding:12px; font-weight:700; color:var(--primary-color);">${m.lessonTopic}</td>
                  <td style="padding:12px;"><span class="badge ${rBadge}">${m.rating}</span></td>
                  <td style="padding:12px;"><p style="font-size:11px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${m.recommendations}">${m.recommendations}</p></td>
                </tr>
            `;
        });
        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">لا توجد تقارير زيارات مؤرشفة للمدير حالياً.</td></tr>' : html;
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ في جلب الأرشيف الإداري.</td></tr>'; }
}