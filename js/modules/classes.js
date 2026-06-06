// 🏫 موديل إدارة وجرد الفصول الدراسية المربوط بالمركزي الموحد
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initClassesModule() {
    const container = document.getElementById('tab-classes-list') || document.getElementById('tab-classes');
    if (!container) return;

    // 🛡️ جدار حماية وعزل الأخطاء (Error Boundary) لضمان استقرار الشاشة الإدارية
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-door-open-fill" style="color:var(--primary-color);"></i> نظام جرد وفحص الفصول الدراسية المعتمدة</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">استعراض إحصائي شامل لتوزيع الفصول وكثافة قيد الطلاب الحالية بداخل غرف المنشأة.</p>
            
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f4f6f9;">
                            <th>الفصل الدراسي الرسمي</th>
                            <th style="text-align:center;">إجمالي الطلاب المقيدين بالسيرفر</th>
                            <th style="text-align:center;">حالة نشاط الفصل</th>
                        </tr>
                    </thead>
                    <tbody id="school-classes-tbody">
                        <tr><td colspan="3" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري فحص كثافة الفصول السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        loadSchoolClassesStatsLive();
    } catch(e) {
        container.innerHTML = `
            <div class="card" style="border-top:5px solid var(--danger-color); color:var(--danger-color); text-align:center; padding:20px; font-weight:bold;">
               ⚠️ تعذر تحميل شاشة جرد الفصول: ${e.message}
            </div>`;
    }
}

async function loadSchoolClassesStatsLive() {
    const tbody = document.getElementById('school-classes-tbody');
    if (!tbody) return;

    try {
        // سحب كشف الطلاب الموحد لتحليل وتوزيع الكثافة على الفصول الـ 14 بذكاء
        const snap = await getDocs(collection(db, 'students'));
        let classCounts = {};
        
        // قائمة فصول المدرسة الرسمية المعتمدة لضمان ظهورها بالجدول حتى لو كانت فريش
        const defaultClasses = ["6/1", "6/2", "6/3", "6/4", "7/1", "7/2", "7/3", "7/4", "8/1", "8/2", "8/3", "8/4", "9/1", "9/2"];
        defaultClasses.forEach(c => classCounts[c] = 0);

        snap.forEach(doc => {
            const data = doc.data();
            if (data.classId) {
                const cId = data.classId.trim();
                if (classCounts[cId] !== undefined) {
                    classCounts[cId]++;
                } else {
                    classCounts[cId] = 1;
                }
            }
        });

        let html = '';
        Object.keys(classCounts).sort().forEach(cId => {
            const count = classCounts[cId];
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>🏫 صف ${cId}</b></td>
                    <td style="text-align:center; font-weight:700; color:var(--primary-color); font-size:14px;">${count} طلاب مقيدين</td>
                    <td style="text-align:center;"><span class="badge ${count > 0 ? 'success' : 'warning'}">${count > 0 ? 'نشط ومستقر' : 'خالٍ من الطلاب حالياً'}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; padding:15px;">💡 لا توجد فصول دراسية مقيدة.</td></tr>';
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red; padding:15px; font-weight:bold;">❌ تعذر استدعاء الكثافة الطلابية من السيرفر الموحد.</td></tr>';
    }
}