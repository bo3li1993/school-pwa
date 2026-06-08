// 📅 موديل الاستعلام التاريخي المطور - مفروز ومقسّم تلقائياً حسب الفصول الدراسية المعتمدة
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDateSearchModule() {
    const container = document.getElementById('tab-date');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-calendar-search" style="color:var(--accent-color);"></i> منظومة الأرشفة والاستعلام عن التقارير التاريخية السابقة</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">🔍 حدد التاريخ المطلوب لجرد كشوف الغياب اليومي مفروزة ومقسمة بالملي حسب الفصول الدراسية.</p>
        
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
            <div style="flex:1;">
                <label style="font-weight:700; font-size:12px; color:#444;">اختر تاريخ اليوم الدراسي المستعلم عنه:</label>
                <input type="date" id="search-date-input" style="margin-top:5px; padding:14px;">
            </div>
            <button onclick="window.fetchHistoricAttendanceByClassLive()" style="margin-top:18px; padding:14px 28px; background:var(--primary-color); font-weight:900;"><i class="bi bi-filter-square"></i> بدء جرد اليوم الدراسي</button>
            <button onclick="window.resetHistoricSearchArchiveView()" style="margin-top:18px; padding:14px 20px; background:#7f8c8d; font-weight:700; display:none;" id="btn-historic-reset"><i class="bi bi-arrow-counterclockwise"></i> 🔄 الرجوع للأرشيف</button>
        </div>
    </div>

    <div id="historic-results-display-area" style="text-align:right;"></div>
    `;
    
    // وضع تاريخ اليوم كخيار افتراضي بالخانة تسهيلاً للعمل
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('search-date-input').value = `${yyyy}-${mm}-${dd}`;
}

window.resetHistoricSearchArchiveView = function() {
    document.getElementById('historic-results-display-area').innerHTML = '';
    document.getElementById('btn-historic-reset').style.display = 'none';
};

window.fetchHistoricAttendanceByClassLive = async function() {
    const dateInput = document.getElementById('search-date-input').value;
    const displayArea = document.getElementById('historic-results-display-area');
    const resetBtn = document.getElementById('btn-historic-reset');

    if(!dateInput) { alert("⚠️ يرجى تحديد التاريخ أولاً للبدء!"); return; }

    // تحويل التاريخ المختار إلى الصيغة النصية الموحدة للسيرفر (Y/M/D) لمنع تضارب الأجهزة
    const dParts = dateInput.split('-');
    const targetDateStr = `${parseInt(dParts[0])}/${parseInt(dParts[1])}/${parseInt(dParts[2])}`;

    displayArea.innerHTML = `<p style="text-align:center; padding:25px; font-weight:bold; color:var(--hover-color);">⏳ جاري فحص الكشوف السحابية وفرز الطلاب حسب الفصول الدراسية الحين...</p>`;
    resetBtn.style.display = 'inline-flex';

    try {
        const q = query(collection(db, 'attendance'), where('dateStr', '==', targetDateStr));
        const snap = await getDocs(q);

        if(snap.empty) {
            displayArea.innerHTML = `
            <div class="card" style="text-align:center; padding:30px;">
                <i class="bi bi-calendar-x" style="font-size:40px; color:var(--danger-color);"></i>
                <p style="font-weight:bold; color:#555; margin-top:10px;">لا توجد أي سجلات حضور أو غياب مرفوعة في السيرفر لتاريخ: (${targetDateStr})</p>
            </div>`;
            return;
        }

        // المحرك الخارق: فرز البيانات وتجميعها داخل كائن حسب الصف
        let groupedData = {};
        snap.forEach(doc => {
            const d = doc.data();
            if(d.status === 'absent' || d.status === 'late') {
                const classKey = d.classId ? d.classId.trim() : "فصول غير معرفة";
                if(!groupedData[classKey]) groupedData[classKey] = [];
                groupedData[classKey].push({
                    name: d.studentName || d.name || "طالب غير مسجل",
                    period: d.period || "الحصة",
                    status: d.status,
                    teacher: d.recordedBy || "عضو الهيئة"
                });
            }
        });

        const sortedClasses = Object.keys(groupedData).sort();

        if(sortedClasses.length === 0) {
            displayArea.innerHTML = `
            <div class="card" style="text-align:center; padding:30px; border-top:5px solid var(--success-color);">
                <i class="bi bi-check-circle-fill" style="font-size:40px; color:var(--success-color);"></i>
                <p style="font-weight:bold; color:#27ae60; margin-top:10px;">تأكيد رسمي: كشف جرد تاريخ (${targetDateStr}) سليم تماماً ونسبة حضور الطلاب 100% بكافة الفصول.</p>
            </div>`;
            return;
        }

        // بناء العرض الرسمي النظيف والمقسّم حسب الصفوف
        let finalHtml = `<h3 style="font-size:14px; font-weight:900; color:var(--primary-color); margin-bottom:15px;"><i class="bi bi-file-earmark-check"></i> تقارير الغياب المعتمدة ليوم (${targetDateStr}) مفروزة حسب الصفوف:</h3>`;
        
        sortedClasses.forEach(className => {
            const studentsArr = groupedData[className];
            // ترتيب أسماء الطلاب داخل الصف أبجدياً
            studentsArr.sort((a,b) => a.name.localeCompare(b, 'ar'));

            finalHtml += `
            <div class="card" style="border-right:5px solid var(--hover-color); padding:15px; margin-bottom:15px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:between; align-items:center; background:#f8fafc; padding:8px 12px; border-radius:6px; margin-bottom:10px;">
                    <span style="font-weight:900; color:var(--primary-color); font-size:14px;"><i class="bi bi-door-open-fill"></i> الفصل الدراسي: [ ${className} ]</span>
                    <span class="badge danger" style="background:var(--danger-color); padding:4px 10px; border-radius:4px; font-size:11px; margin-right:auto;">إجمالي حالات رصد الغياب: ${studentsArr.length}</span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#f1f5f9; color:#333;">
                            <th style="padding:6px; border:1px solid #ddd; width:40px; text-align:center;">#</th>
                            <th style="padding:6px; border:1px solid #ddd; text-align:right;">اسم الطالب رباعي</th>
                            <th style="padding:6px; border:1px solid #ddd; text-align:center;">الحصة</th>
                            <th style="padding:6px; border:1px solid #ddd; text-align:center;">حالة الرصد</th>
                            <th style="padding:6px; border:1px solid #ddd; text-align:right;">المعلم الراصد</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentsArr.map((st, idx) => {
                            const statusLbl = st.status === 'absent' ? `<span style="color:var(--danger-color); font-weight:bold;">🔴 غائب</span>` : `<span style="color:var(--warning-color); font-weight:bold;">🟡 متأخر</span>`;
                            return `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:bold;">${idx+1}</td>
                                <td style="padding:6px; border:1px solid #ddd; font-weight:700;">👤 ${st.name}</td>
                                <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:bold; color:#2980b9;">${st.period}</td>
                                <td style="padding:6px; border:1px solid #ddd; text-align:center;">${statusLbl}</td>
                                <td style="padding:6px; border:1px solid #ddd; color:#666; font-weight:600;">أ. ${st.teacher}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`;
        });

        displayArea.innerHTML = finalHtml;
    } catch(err) {
        displayArea.innerHTML = `<p style="color:red; font-weight:bold;">❌ خطأ في عملية الفرز السحابي: ${err.message}</p>`;
    }
};