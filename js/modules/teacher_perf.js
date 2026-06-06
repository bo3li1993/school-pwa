// 📈 موديل رصد كفاءة أداء المعلمين وجرد الزيارات الفنية التراكمية من كولكشن technical_visits
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTeacherPerfModule() {
    const container = document.getElementById('tab-teacher-perf');
    if (!container) return;

    // 🛡️ جدار حماية وعزل الأخطاء (Error Boundary)
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--success-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-graph-up-arrow" style="color:var(--success-color);"></i> مؤشرات كفاءة الأداء والزيارات التراكمية للمعلمين</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">
                📊 يقوم المحرك بذكاء بقراءة كولكشن technical_visits وحساب إجمالي عدد الزيارات الفنية المرصودة لكل معلم لمساعدة الإدارة في التقييم السنوي.
            </p>
            
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f4f6f9; color:var(--primary-color);">
                            <th>اسم المعلم المعتمد بالمنشأة</th>
                            <th style="text-align:center;">القسم الفني / المادة</th>
                            <th style="text-align:center;">إجمالي عدد الزيارات الفنية المرصودة له</th>
                            <th style="text-align:center;">حالة استقرار التقييم</th>
                        </tr>
                    </thead>
                    <tbody id="teacher-perf-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري تحليل ومطابقة البيانات الفنية...</td></tr>
                    </tbody>
                </table>
            </div>
            <button onclick="window.exportAsManzoumaPDF('tab-teacher-perf', 'تقرير_كفاءة_الاداء_التعليمي')" style="background:var(--success-color); margin-top:15px; font-size:12px;"><i class="bi bi-printer-fill"></i> طباعة لوحة تقييم الأداء الحالية PDF</button>
        </div>`;

        calculateTeacherPerformanceLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل لوحة كفاءة الأداء: ${e.message}</div>`;
    }
}

async function calculateTeacherPerformanceLive() {
    const tbody = document.getElementById('teacher-perf-tbody');
    if (!tbody) return;

    try {
        // ✨ القراءة الصحيحة والموحدة من كولكشن technical_visits لإنهاء أخطاء التضارب تماماً
        const snap = await getDocs(collection(db, 'technical_visits'));
        let perfMap = {};

        snap.forEach(doc => {
            const data = doc.data();
            const tName = data.teacherName ? data.teacherName.trim() : 'معلم غير معرف';
            
            if (!perfMap[tName]) {
                perfMap[tName] = { name: tName, subject: data.subject || 'القسم الفني', count: 0 };
            }
            perfMap[tName].count++;
        });

        let sortedTeachers = Object.values(perfMap).sort((a,b) => b.count - a.count);
        let html = '';

        sortedTeachers.forEach(t => {
            let statusBadge = `<span class="badge success">مستقر (ممتاز)</span>`;
            if(t.count < 2) statusBadge = `<span class="badge warning">يحتاج زيارات إضافية</span>`;

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 أ. ${t.name}</b></td>
                    <td style="text-align:center;"><span class="badge info">${t.subject}</span></td>
                    <td style="text-align:center; font-weight:900; color:var(--primary-color); font-size:15px;">${t.count} زيارات فنية</td>
                    <td style="text-align:center;">${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 لا توجد زيارات فنية مقيدة حالياً بالسيرفر لتوليد مؤشر الأداء.</td></tr>';
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 بانتظار قيد حركات الزيارات الفنية لتهيئة محرك الكفاءة.</td></tr>';
    }
}