// 🩺 موديل العيادة المدرسية والصحة الطلابية المربوط بالمركزي والفرز الأبجدي
import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initClinicModule() {
    const container = document.getElementById('tab-clinic');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid #3498db; text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-heart-pulse-fill" style="color:#3498db;"></i> سجل العيادة المدرسية والصحة الطلابية</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">نظام الدخول السريع لعيادة المدرسة؛ حدد فصل الطالب لاستدعاء اسمه ومتابعة حالته الطبية فوراً بدون كيبورد.</p>
            
            <form id="clinic-reg-form" onsubmit="window.handleRegisterClinicLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="clinic-class-select" onchange="window.handleClinicClassChange(this.value)" required>
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب المريض</label>
                        <select id="clinic-student-select" disabled required>
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. التشخيص العارض / الشكوى</label>
                        <select id="clinic-complaint" required>
                            <option value="ارتفاع درجة الحرارة">🌡️ ارتفاع درجة الحرارة</option>
                            <option value="صداع وألم بالرأس">🤕 صداع وألم بالرأس</option>
                            <option value="ألم بالمعدة ومغص">🤢 ألم بالمعدة ومغص</option>
                            <option value="إصابة جرح / كدمة بالملعب">🏃 جرح / إصابة بالملاعب</option>
                            <option value="إعياء عام وإرهاق">💤 إعياء عام وإرهاق</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">الإجراء الطبي والعلاج الممنوح</label>
                    <input type="text" id="clinic-treatment" placeholder="مثال: إعطاء بندول + مكوث بالعيادة لمدة حصة كاملة" required>
                </div>
                
                <button type="submit" style="width:100%; background:#3498db; font-weight:700; margin-top:5px;"><i class="bi bi-plus-square-fill"></i> تقييد وإرسال بطاقة الزيارة الصحية</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-capsule"></i> كشف زيارات العيادة المدرسية المقيدة اليوم لايف</h2>
            <div style="overflow-x:auto;">
                <table id="clinic-logs-table" style="width:100%;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>اسم الطالب المريض</th>
                            <th style="text-align:center;">الفصل</th>
                            <th style="text-align:center;">العارض الطبي</th>
                            <th>الإجراء والعلاج الممنوح</th>
                        </tr>
                    </thead>
                    <tbody id="clinic-logs-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري مراجعة سجلات العيادة السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // جلب الفصول لايف
        const classSelect = document.getElementById('clinic-class-select');
        const snap = await getDocs(collection(db, 'students'));
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadClinicLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل موديل العيادة: ${e.message}</div>`;
    }
}

window.handleClinicClassChange = async function(classId) {
    const studentSelect = document.getElementById('clinic-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري فرز الكشف أبجدياً...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب المريض --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

window.handleRegisterClinicLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('clinic-student-select').value;
    const cId = document.getElementById('clinic-class-select').value;
    const complaint = document.getElementById('clinic-complaint').value;
    const treatment = document.getElementById('clinic-treatment').value.trim();

    try {
        await addDoc(collection(db, 'clinic'), {
            studentName: sName,
            classId: cId,
            complaint: complaint,
            treatment: treatment,
            createdAt: serverTimestamp()
        });
        alert('✓ تم تسجيل البيانات الصحية للطالب بنجاح السيرفر.');
        document.getElementById('clinic-reg-form').reset();
        document.getElementById('clinic-student-select').innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        document.getElementById('clinic-student-select').disabled = true;
        loadClinicLogsLive();
    } catch(err) {
        alert('خطأ في الاتصال: ' + err.message);
    }
};

async function loadClinicLogsLive() {
    const tbody = document.getElementById('clinic-logs-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'clinic'));
        let html = '';
        
        snap.forEach(d => {
            const data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.studentName || 'غير محدد'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge success" style="background:#3498db;">${data.complaint || '-'}</span></td>
                    <td style="color:#555; font-size:12px; font-weight:700;">${data.treatment || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 لا توجد زيارات مقيدة للعيادة اليوم.</td></tr>';
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 بانتظار قيد أول حالة صحية لتهيئة الجدول.</td></tr>';
    }
}