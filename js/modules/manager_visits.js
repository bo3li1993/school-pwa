// 👔 موديل رصد وتفقدات وزيارات المدير والمدراء المساعدين للجناح والفصول
import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initManagerVisitsModule() {
    const container = document.getElementById('tab-manager-visits');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-eye-fill" style="color:var(--accent-color);"></i> توثيق ورصد الزيارات التفقدية للإدارة المدرسية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">قم بجدول وتوثيق زيارتك التفقدية للفصول؛ البيانات المرصودة هني تظهر لايف على شاشة التلفزيون الكبيرة.</p>
            
            <form id="manager-visit-form" onsubmit="window.handleRegisterManagerVisitLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">اختر الصف / الفصل المزار</label>
                        <select id="m-visit-class" required>
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">اسم المعلم المتواجد بالحصة</label>
                        <input type="text" id="m-visit-teacher" placeholder="اكتب اسم المعلم المزار" required>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">التوصية والملاحظة الإدارية المرصودة (حالة الاستقرار البنائي)</label>
                    <input type="text" id="m-visit-notes" placeholder="مثال: الحصة مستقرة، والطلاب ملتزمون بالهدوء التام والسبورة مكتملة الأركان" required>
                </div>
                
                <button type="submit" style="width:100%; background:var(--primary-color); font-weight:700; margin-top:5px;"><i class="bi bi-shield-plus"></i> حفظ وبث بطاقة الزيارة الإدارية فوراً</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-file-earmark-spreadsheet"></i> سجل جرد الزيارات والتفقدات الإدارية المعتمدة</h2>
            <div style="overflow-x:auto; margin-top:10px;">
                <table style="width:100%;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="text-align:center;">الفصل</th>
                            <th>المعلم المتواجد</th>
                            <th>التوصية الإدارية المرصودة</th>
                        </tr>
                    </thead>
                    <tbody id="manager-visits-tbody">
                        <tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">جاري سحب السجل الإداري...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // 🔄 أتمتة جلب الفصول الحية من السيرفر مباشرة لإنهاء التثبيت اليدوي القديم
        const classSelect = document.getElementById('m-visit-class');
        const snap = await getDocs(collection(db, 'students'));
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- اختر الفصل المزار --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadManagerVisitsLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center;">⚠️ تعذر فتح سجل زيارات المدير: ${e.message}</div>`;
    }
}

window.handleRegisterManagerVisitLive = async function(e) {
    e.preventDefault();
    const cId = document.getElementById('m-visit-class').value;
    const tName = document.getElementById('m-visit-teacher').value.trim();
    const notes = document.getElementById('m-visit-notes').value.trim();

    try {
        await addDoc(collection(db, 'manager_visits'), {
            classId: cId,
            teacherName: tName,
            notes: notes,
            createdAt: serverTimestamp()
        });
        alert('✓ تم رصد وتوثيق الزيارة الإدارية بنجاح، وتحديث شاشة التلفزيون لايف لمكتب المدير.');
        document.getElementById('manager-visit-form').reset();
        loadManagerVisitsLogsLive();
    } catch(err) { alert('خطأ سحابي: ' + err.message); }
};

async function loadManagerVisitsLogsLive() {
    const tbody = document.getElementById('manager-visits-tbody');
    if(!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'manager_visits'));
        let html = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td><b>👤 أ. ${data.teacherName || '-'}</b></td>
                    <td style="color:#555; font-size:12px; font-weight:700;">${data.notes || '-'}</td>
                </tr>`;
        });

        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 السجل خالي من أي زيارات تفقدية حالياً.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#666; padding:15px;">💡 بانتظار قيد حركات الزيارة الإدارية الأولى.</td></tr>'; }
}