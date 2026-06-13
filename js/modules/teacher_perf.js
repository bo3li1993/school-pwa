import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTeacherPerfModule() {
    const container = document.getElementById('tab-teacher-perf');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--success-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-graph-up-arrow" style="color:var(--success-color);"></i> مؤشرات كفاءة الأداء والزيارات التراكمية للمعلمين</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">
                📊 يقوم المحرك بذكاء بقراءة كولكشن الزيارات الفنية وحساب إجمالي عدد الزيارات المرصودة لكل معلم لمساعدة الإدارة في التقييم السنوي.
            </p>
            
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f4f6f9; color:var(--primary-color);">
                            <th style="padding:10px;">اسم المعلم المعتمد بالمنشأة</th>
                            <th style="padding:10px; text-align:center;">القسم الفني / المادة</th>
                            <th style="padding:10px; text-align:center;">إجمالي عدد الزيارات الفنية</th>
                            <th style="padding:10px; text-align:center;">حالة استقرار التقييم</th>
                        </tr>
                    </thead>
                    <tbody id="teacher-perf-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري تحليل ومطابقة البيانات الفنية...</td></tr>
                    </tbody>
                </table>
            </div>
            <button onclick="window.exportAsManzoumaPDF('tab-teacher-perf', 'تقرير_كفاءة_الاداء_التعليمي')" style="background:var(--success-color); width:100%; margin-top:15px; font-weight:bold; border:none; padding:10px; color:#fff; cursor:pointer; border-radius:6px;"><i class="bi bi-printer-fill"></i> طباعة لوحة تقييم الأداء الحالية PDF</button>
        </div>`;

        calculateTeacherPerformanceLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل لوحة كفاءة الأداء: ${e.message}</div>`;
    }
}

async function calculateTeacherPerformanceLive() {
    const tbody = document.getElementById('teacher-perf-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية

    try {
        // استعلام ذكي ومحمي حسب المدرسة
        const q = query(collection(db, 'technical_visits'), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);

        // توافقية الداتا القديمة
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(collection(db, 'technical_visits'));
        }

        let perfMap = {};

        snap.forEach(doc => {
            const data = doc.data();
            // حماية أمنية للبيانات
            if (data.schoolId && data.schoolId !== schoolId) return;

            const tName = data.teacherName ? data.teacherName.trim() : 'معلم غير معرف';
            
            if (!perfMap[tName]) {
                perfMap[tName] = { name: tName, subject: data.subject || 'القسم الفني', count: 0 };
            }
            perfMap[tName].count++;
        });

        let sortedTeachers = Object.values(perfMap).sort((a,b) => b.count - a.count);
        let html = '';

        sortedTeachers.forEach(t => {
            let statusBadge = `<span class="badge" style="background:#2ecc71; color:#fff; padding:3px 8px; border-radius:4px;">مستقر (ممتاز)</span>`;
            if(t.count < 2) statusBadge = `<span class="badge" style="background:#f39c12; color:#fff; padding:3px 8px; border-radius:4px;">يحتاج زيارات إضافية</span>`;

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;"><b>👤 أ. ${t.name}</b></td>
                    <td style="padding:10px; text-align:center;"><span class="badge info">${t.subject}</span></td>
                    <td style="padding:10px; text-align:center; font-weight:900; color:var(--primary-color); font-size:15px;">${t.count} زيارات</td>
                    <td style="padding:10px; text-align:center;">${statusBadge}</td>
                </tr>`;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 لا توجد زيارات فنية مقيدة حالياً بالسيرفر.</td></tr>';
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">❌ خطأ في الاتصال بالسيرفر.</td></tr>';
    }
}