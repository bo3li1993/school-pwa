import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDateSearchModule() {
    const container = document.getElementById('tab-date');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--primary-color);">
        <h2><i class="bi bi-calendar-search"></i> محرك الأرشفة والبحث التاريخي الموحد للغياب</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">ابحث بكشوف غياب الحصص المرفوعة سابقاً عبر إدخال التاريخ بالصيغة الموحدة المعتمدة للمدرسة.</p>
        <div style="display:flex; gap:10px;">
            <input type="text" id="search-target-date-string" placeholder="مثال للصيغة المعتمدة: ٢٠٢٦/٦/٦" style="margin-bottom:0;">
            <button onclick="window.triggerDateAttendanceSearchLive()" style="width:120px; font-weight:bold;"><i class="bi bi-search"></i> جرد التاريخ</button>
        </div>
    </div>
    <div class="card" id="date-search-results-card" style="border-top-color:var(--accent-color); display:none;">
        <h2>📋 كشف السجلات المرصودة للتاريخ المستعلم عنه:</h2>
        <div style="overflow-x:auto; margin-top:10px;">
            <table>
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th>اسم الطالب المدرسي</th>
                        <th style="text-align:center;">الفصل</th>
                        <th style="text-align:center;">حالة الرصد التراكمي</th>
                        <th>المعلم الراصد الموثق بالملف</th>
                    </tr>
                </thead>
                <tbody id="date-search-tbody"></tbody>
            </table>
        </div>
    </div>`;
}

window.triggerDateAttendanceSearchLive = async function() {
    const dateStr = document.getElementById('search-target-date-string').value.trim();
    const resultCard = document.getElementById('date-search-results-card');
    const tbody = document.getElementById('date-search-tbody');
    if(!dateStr) return;
    resultCard.style.display = 'block';
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-weight:bold; padding:15px;">⏳ جاري جلب الأرشيف ومطابقة صيغة التاريخ السحابي...</td></tr>`;
    try {
        // ✨ الفحص ليزري مستهدف يبحث بالصيغة الموحدة ar-KW لحل مشاكل تضارب تواريخ مكة المذكورة بالتقرير بالملي
        const q = query(collection(db, 'attendance'), where('date', '==', dateStr));
        const snap = await getDocs(q);
        let html = '';
        let count = 0;
        snap.forEach(doc => {
            const data = doc.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.studentName || data.name || '-'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge ${data.status==='absent'?'danger':'success'}">${data.status==='absent'?'غائب بالحصة':'حاضر ومقيد'}</span></td>
                    <td style="font-size:12px; color:#666; font-weight:700;">أ. ${data.recordedBy || 'عضو هيئة التعليم'}</td>
                </tr>`;
            count++;
        });
        tbody.innerHTML = count === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--danger-color); padding:15px; font-weight:bold;">⚠️ تنبيه: لم يتم العثور على أي حركات رصد مرفوعة بهذا التاريخ بالسيرفر.</td></tr>` : html;
    } catch(e) { tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">خطأ: ${e.message}</td></tr>`; }
};