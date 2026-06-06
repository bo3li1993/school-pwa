// 🎫 موديل حقيبة تصاريح الاستئذان والخروج المبكر للطلاب بربط مركزي آمن
import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGatepassModule() {
    const container = document.getElementById('tab-gatepass');
    if (!container) return;

    // 🛡️ جدار حماية وعزل الأخطاء (Error Boundary) لمنع تعليق اللوحة الإدارية
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-ticket-perforated-fill" style="color:var(--accent-color);"></i> حقيبة تصاريح الاستئذان والخروج المبكر للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">إصدار إلكتروني فوري لبطاقة الاستئذان المعتمدة؛ اختر الفصل وسيتكفل المحرك بجلب كشف الأسماء مفرزاً أبجدياً.</p>
            
            <form id="gatepass-reg-form" onsubmit="window.handleRegisterGatepassLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="gate-class-select" onchange="window.handleGateClassChange(this.value)" required>
                            <option value="">-- اختر الفصل --</option>
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب المستأذن</label>
                        <select id="gate-student-select" disabled required>
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. صلة قرابة المستلم</label>
                        <select id="gate-relative" required>
                            <option value="الأب شخصياً">👨 الأب شخصياً</option>
                            <option value="الأم شخصياً">👩 الأم شخصياً</option>
                            <option value="الأخ / الخال / العم">👥 قريب من الدرجة الأولى</option>
                            <option value="سائق العائلة (بتفويض خطي)">🚗 سائق العائلة بتفويض</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">سبب الاستئذان الرسمي وعذر الخروج</label>
                    <input type="text" id="gate-reason" placeholder="مثال: مراجعة مستشفى حكومي موثقة بموعد" required>
                </div>
                
                <button type="submit" style="width:100%; background:var(--accent-color); font-weight:700; margin-top:5px;"><i class="bi bi-printer-fill"></i> اعتماد وحفظ تصريح الخروج السحابي</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-door-open"></i> كشف الطلاب المخرجين بتصاريح رسمية اليوم</h2>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>اسم الطالب الدراسي</th>
                            <th style="text-align:center;">الفصل</th>
                            <th style="text-align:center;">المستلم</th>
                            <th>سبب الخروج المبكر المعتمد</th>
                        </tr>
                    </thead>
                    <tbody id="gatepass-logs-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري جلب بيانات بوابة الخروج...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        loadGatepassLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل موديل تصاريح الخروج: ${e.message}</div>`;
    }
}

window.handleGateClassChange = async function(classId) {
    const studentSelect = document.getElementById('gate-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب الأسماء كويتيّاً...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ الفصل خالي</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ بالشبكة</option>';
    }
};

window.handleRegisterGatepassLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('gate-student-select').value;
    const cId = document.getElementById('gate-class-select').value;
    const relative = document.getElementById('gate-relative').value;
    const reason = document.getElementById('gate-reason').value.trim();

    try {
        // الحفظ بكولكشن الاستئذان الموحد
        await addDoc(collection(db, 'gatepass'), {
            studentName: sName,
            classId: cId,
            relative: relative,
            reason: reason,
            createdAt: serverTimestamp()
        });
        alert('✓ تم حفظ واعتماد تصريح الاستئذان فورياً بالسيرفر المركزي.');
        document.getElementById('gatepass-reg-form').reset();
        document.getElementById('gate-student-select').innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        document.getElementById('gate-student-select').disabled = true;
        loadGatepassLogsLive();
    } catch(err) {
        alert('خطأ: ' + err.message);
    }
};

async function loadGatepassLogsLive() {
    const tbody = document.getElementById('gatepass-logs-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'gatepass'));
        let html = '';
        
        snap.forEach(d => {
            const data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.studentName || 'غير محدد'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge warning">${data.relative || '-'}</span></td>
                    <td style="color:#555; font-size:12px; font-weight:700;">${data.reason || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 لم يستأذن أي طالب اليوم لحد الآن.</td></tr>';
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 بانتظار إصدار أول تصريح رسمي.</td></tr>';
    }
}