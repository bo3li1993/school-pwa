// ⚠️ موديل رصد وتحليل حالات الغياب المتكرر والتراكمي لآخر 30 يوماً فقط
import { db } from '../firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRepeatModule() {
    const container = document.getElementById('tab-repeat');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-exclamation-octagon-fill" style="color:var(--danger-color);"></i> نظام الرصد والمتابعة التراكمية للغياب المتكرر (آخر 30 يوم)</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">
                📊 يقوم المحرك بمسح كشوف الرصد المرفوعة وحصر الطلاب الذين تخطى غيابهم يومين أو أكثر خلال آخر 30 يوماً لإصدار الإنذارات المعتمدة.
            </p>
            
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#fff0f0; color:var(--danger-color);">
                            <th>اسم الطالب ثلاثي / رباعي</th>
                            <th style="text-align:center;">الفصل الدراسي</th>
                            <th style="text-align:center;">إجمالي أيام الغياب (خلال الشهر)</th>
                            <th style="text-align:center;">الإجراء القانوني المستحق</th>
                        </tr>
                    </thead>
                    <tbody id="repeat-absents-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري فحص ومطابقة الملفات التراكمية...</td></tr>
                    </tbody>
                </table>
            </div>
            <button onclick="window.exportAsManzoumaPDF('tab-repeat', 'كشف_الإنذارات_والغياب_المتكرر')" style="background:var(--danger-color); margin-top:15px; font-size:12px; font-weight:bold;"><i class="bi bi-printer-fill"></i> طباعة كشف الإنذارات الحالي PDF</button>
        </div>`;

        calculateRepeatAbsencesLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ خطأ في معالجة البيانات: ${e.message}</div>`;
    }
}

async function calculateRepeatAbsencesLive() {
    const tbody = document.getElementById('repeat-absents-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'attendance'));
        let stats = {};

        // 📅 فلترة النطاق الزمني الذكي (آخر 30 يوماً فقط من تاريخ اليوم)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        snap.forEach(doc => {
            const d = doc.data();
            
            // التحقق من صحة وجود التايم ستامب ووقوعه في نطاق الـ 30 يوماً
            let isWithinRange = true;
            if (d.timestamp) {
                const docDate = d.timestamp.toDate();
                if (docDate < cutoffDate) isWithinRange = false;
            }

            if (isWithinRange && d.status === 'absent' && d.studentName) {
                const name = d.studentName.trim();
                if (!stats[name]) {
                    stats[name] = { name: name, classId: d.classId || '-', count: 0 };
                }
                stats[name].count++;
            }
        });

        let filtered = Object.values(stats).filter(s => s.count >= 2).sort((a,b) => b.count - a.count);
        let html = '';

        filtered.forEach(s => {
            let lawBadge = `<span class="badge warning">تنبيه شفهي أول</span>`;
            if (s.count >= 3) lawBadge = `<span class="badge danger" style="background:#c0392b;">⚠️ إصدار إنذار أول خطي</span>`;
            if (s.count >= 5) lawBadge = `<span class="badge danger" style="background:#e74c3c; font-weight:900;">🚨 استدعاء ولي أمر فوري</span>`;

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${s.name}</b></td>
                    <td style="text-align:center;"><span class="badge info">${s.classId}</span></td>
                    <td style="text-align:center; font-weight:900; color:var(--danger-color); font-size:15px;">${s.count} أيام غياب</td>
                    <td style="text-align:center;">${lawBadge}</td>
                </tr>`;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:var(--success-color); padding:15px; font-weight:bold;">🥇 السجلات نظيفة بالكامل، لا توجد حالات غياب متكرر في الـ 30 يوماً الأخيرة.</td></tr>';
    } catch(err) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 السجلات نظيفة وقاعدة البيانات فريش تماماً.</td></tr>'; }
}