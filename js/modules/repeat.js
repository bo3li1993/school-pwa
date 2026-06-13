import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRepeatModule() {
    const container = document.getElementById('tab-repeat');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-exclamation-octagon-fill" style="color:var(--danger-color);"></i> نظام الرصد والمتابعة التراكمية للغياب المتكرر (آخر 30 يوم)</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:20px;">
            📊 يقوم المحرك بمسح كشوف الرصد المرفوعة وحصر الطلاب الذين تخطى غيابهم يومين أو أكثر خلال آخر 30 يوماً.
        </p>
        
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#fff0f0; color:var(--danger-color);">
                        <th style="padding:10px;">اسم الطالب</th>
                        <th style="padding:10px; text-align:center;">الفصل</th>
                        <th style="padding:10px; text-align:center;">إجمالي أيام الغياب</th>
                        <th style="padding:10px; text-align:center;">الإجراء القانوني</th>
                    </tr>
                </thead>
                <tbody id="repeat-absents-tbody">
                    <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري فحص ومطابقة الملفات التراكمية...</td></tr>
                </tbody>
            </table>
        </div>
        <button onclick="window.exportAsManzoumaPDF('tab-repeat', 'كشف_الإنذارات_والغياب_المتكرر')" style="background:var(--danger-color); width:100%; color:#fff; border:none; padding:12px; margin-top:15px; font-weight:bold; cursor:pointer; border-radius:8px;"><i class="bi bi-printer-fill"></i> طباعة كشف الإنذارات الحالي PDF</button>
    </div>`;

    calculateRepeatAbsencesLive();
}

async function calculateRepeatAbsencesLive() {
    const tbody = document.getElementById('repeat-absents-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId(); // 🏢 البصمة الأمنية للمدرسة
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    try {
        // استعلام سحابي مباشر (فلترة حسب المدرسة والحالة)
        const q = query(
            collection(db, 'attendance'), 
            where('schoolId', '==', schoolId),
            where('status', '==', 'absent')
        );
        
        let snap = await getDocs(q);

        // التوافقية للمدرسة القديمة
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(query(collection(db, 'attendance'), where('status', '==', 'absent')));
        }

        let stats = {};

        snap.forEach(doc => {
            const d = doc.data();
            
            // حماية إضافية للداتا القديمة
            if (d.schoolId && d.schoolId !== schoolId) return;

            let isWithinRange = true;
            if (d.timestamp) {
                const docDate = d.timestamp.toDate();
                if (docDate < cutoffDate) isWithinRange = false;
            }

            if (isWithinRange && d.studentName) {
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
            let lawBadge = `<span class="badge" style="background:#e67e22; color:#fff; padding:3px 8px; border-radius:4px;">تنبيه شفهي أول</span>`;
            if (s.count >= 3) lawBadge = `<span class="badge" style="background:#c0392b; color:#fff; padding:3px 8px; border-radius:4px;">⚠️ إنذار أول خطي</span>`;
            if (s.count >= 5) lawBadge = `<span class="badge" style="background:#8e44ad; color:#fff; padding:3px 8px; border-radius:4px; font-weight:900;">🚨 استدعاء ولي أمر</span>`;

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;"><b>👤 ${s.name}</b></td>
                    <td style="padding:10px; text-align:center;"><span class="badge info">${s.classId}</span></td>
                    <td style="padding:10px; text-align:center; font-weight:900; color:var(--danger-color);">${s.count} أيام</td>
                    <td style="padding:10px; text-align:center;">${lawBadge}</td>
                </tr>`;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">🥇 ممتاز! لا يوجد طلاب متجاوزين لنسبة الغياب هذا الشهر.</td></tr>';
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">خطأ أثناء سحب البيانات: ${err.message}</td></tr>`;
    }
}