// 🔴 موديل جرد وحصر الطلاب الغائبين اليوم لايف بالمنظومة
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initAttendanceModule() {
    const container = document.getElementById('tab-absent');
    if (!container) return;

    // 🛡️ جدار حماية وعزل الأخطاء (Error Boundary) لمنع تعليق اللوحة
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-person-x-fill" style="color:var(--danger-color);"></i> كشف الحصر الفوري للطلاب الغائبين اليوم</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
                📈 الكشف يقرأ مباشرة من عمليات الرصد الحية التي يرفعها المعلمون من الفصول حالياً.
            </p>
            
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#fff0f0; color:var(--danger-color);">
                            <th>اسم الطالب الغائب رباعي</th>
                            <th style="text-align:center;">الفصل الدراسي</th>
                            <th style="text-align:center;">حالة الرصد</th>
                            <th>المعلم المسؤول عن الرصد</th>
                        </tr>
                    </thead>
                    <tbody id="live-absents-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري سحب كشوف الحصص لايف...</td></tr>
                    </tbody>
                </table>
            </div>
            <button onclick="window.exportAsManzoumaPDF('tab-absent', 'كشف_غسيل_الغياب_اليومي')" style="background:var(--primary-color); margin-top:15px; font-size:12px;"><i class="bi bi-printer-fill"></i> طباعة كشف الغياب الحالي PDF</button>
        </div>`;

        loadTodayAbsentsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل موديل الغائبين اليوم: ${e.message}</div>`;
    }
}

async function loadTodayAbsentsLive() {
    const tbody = document.getElementById('live-absents-tbody');
    if (!tbody) return;

    const todayStr = new Date().toLocaleDateString('ar-KW');

    try {
        // استعلام مستهدف يبحث فقط عن غيابات تاريخ اليوم الموحد
        const q = query(collection(db, 'attendance'), where('date', '==', todayStr), where('status', '==', 'absent'));
        const snap = await getDocs(q);
        
        let html = '';
        let count = 0;

        snap.forEach(doc => {
            const data = doc.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.studentName || data.name || 'طالب غير معرف'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge danger">غائب اليوم</span></td>
                    <td style="color:#666; font-size:12px; font-weight:700;"><i class="bi bi-person-workspace"></i> أ. ${data.recordedBy || 'هيئة التعليم'}</td>
                </tr>
            `;
            count++;
        });

        tbody.innerHTML = count === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--success-color); padding:25px; font-weight:bold;">🥇 مبروك! لا توجد حالات غياب مرصودة لليوم حتى الآن، أو بانتظار رفع المعلمين.</td></tr>` : html;
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">💡 قاعدة بيانات الغياب بانتظار حركة الرصد الأولى لليوم.</td></tr>`;
    }
}