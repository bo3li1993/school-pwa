import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTeachersModule() {
    const container = document.getElementById('tab-teacher-directory');
    if (!container) return;

    // 🏢 البصمة المدرسية للفلترة الأمنية
    const schoolId = getActiveSchoolId();

    try {
        container.innerHTML = `
        <div class="card" style="border-top:5px solid var(--primary-color);">
            <h2><i class="bi bi-address-card-fill"></i> دليل الهيئة التعليمية والإدارية (مدرسة: ${schoolId})</h2>
            <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">كشف موحد بأسماء الموظفين والصلاحيات المعتمدة بداخل مدرستك فقط.</p>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f4f6f9;">
                            <th>اسم المعلم / الموظف</th>
                            <th style="text-align:center;">رقم المستخدم ID</th>
                            <th style="text-align:center;">طبيعة الدور</th>
                        </tr>
                    </thead>
                    <tbody id="teachers-directory-tbody">
                        <tr><td colspan="3" style="text-align:center; padding:15px; font-weight:bold;">⏳ جاري جرد الدليل السحابي لمدرستك...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // استعلام ذكي يفلتر المستخدمين حسب المدرسة
        const q = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);

        // التوافقية للمدرسة الأم (سالم الحسينان) إذا كانت البيانات بدون حقل schoolId
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(collection(db, 'users'));
        }

        let html = '';
        snap.forEach(doc => {
            const d = doc.data();
            // تصفية أمنية إضافية لضمان عدم خلط البيانات
            if(d.schoolId && d.schoolId !== schoolId) return;
            
            html += `<tr style="border-bottom:1px solid #eee;">
                <td><b>👤 أ. ${d.name || '-'}</b></td>
                <td style="text-align:center; font-weight:700; color:var(--accent-color);">${d.userId || '-'}</td>
                <td style="text-align:center;">
                    <span class="badge ${d.role === 'admin' ? 'danger' : 'info'}">
                        ${d.role === 'admin' ? 'الإدارة المدرسية' : 'هيئة التعليم'}
                    </span>
                </td>
            </tr>`;
        });

        document.getElementById('teachers-directory-tbody').innerHTML = html || '<tr><td colspan="3" style="text-align:center; padding:15px;">💡 لا يوجد موظفين مقيدين بهذه المدرسة.</td></tr>';
    } catch(e) { 
        container.innerHTML = `<div class="card" style="color:red; text-align:center;">⚠️ خطأ: ${e.message}</div>`; 
    }
}