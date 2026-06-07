import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDateSearchModule() {
    const container = document.getElementById('tab-date');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--primary-color); text-align: right;">
        <h2><i class="bi bi-calendar-search"></i> محرك الأرشفة والبحث التاريخي الموحد للغياب</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">ابحث بكشوف غياب الحصص المرفوعة سابقاً عبر اختيار التاريخ مباشرة من الرزنامة الذكية بدون كتابة يدوية.</p>
        <div style="display:flex; gap:10px;">
            <input type="date" id="search-target-date-picker" style="margin-bottom:0; flex:1; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-weight:bold;">
            <button onclick="window.triggerDateAttendanceSearchLive()" style="width:130px; font-weight:bold; background:var(--primary-color); color:#fff;"><i class="bi bi-search"></i> جرد التاريخ</button>
        </div>
    </div>
    <div class="card" id="date-search-results-card" style="border-top-color:var(--accent-color); display:none; text-align: right;">
        <h2>📋 كشف السجلات المرصودة للتاريخ المستعلم عنه:</h2>
        <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%;">
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
    const datePicker = document.getElementById('search-target-date-picker');
    const resultCard = document.getElementById('date-search-results-card');
    const tbody = document.getElementById('date-search-tbody');
    
    if(!datePicker || !datePicker.value) { alert('⚠️ يرجى تحديد التاريخ من الرزنامة أولاً!'); return; }

    // 🔄 تحويل صيغة تاريخ الرزنامة تلقائياً لتطابق صيغة كود الفايربيس ar-KW (٢٠٢٦/٦/٦)
    const selectedDate = new Date(datePicker.value);
    const formattedDateStr = selectedDate.toLocaleDateString('ar-KW');

    resultCard.style.display = 'block';
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-weight:bold; padding:15px;">⏳ جاري جلب الأرشيف ومطابقة التاريخ السحابي (${formattedDateStr})...</td></tr>`;
    
    try {
        const q = query(collection(db, 'attendance'), where('date', '==', formattedDateStr));
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