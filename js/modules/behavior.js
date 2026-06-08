// 📑 موديل رصد ومتابعة البطاقات السلوكية والمخالفات المفرزة أبجدياً - معتمد رسمياً
import { db } from '../firebase-config.js';
import { collection, addDoc, query, where, serverTimestamp, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// دالة مركزية ثابتة لتوحيد صيغة قراءة وكتابة التاريخ ومنع اختفاء السجلات القديمة بين الأجهزة
function getUnifiedDateString() {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export async function initBehaviorModule() {
    const container = document.getElementById('tab-behavior');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-sidebar-check" style="color:var(--danger-color);"></i> نظام رصد الإجراءات التربوية والمتابعة السلوكية للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">الرجاء تحديد الصف الدراسي لاستدعاء كشف الأسماء المعتمد، ثم اختيار الإجراء السلوكي المنفذ.</p>
            
            <form id="behavior-reg-form" onsubmit="window.handleRegisterBehaviorLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">1. الصف الدراسي:</label>
                        <select id="beh-class-select" onchange="window.handleBehClassChange(this.value)" required>
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">2. اسم الطالب رباعي:</label>
                        <select id="beh-student-select" disabled required>
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">3. الإجراء التربوي المتخذ:</label>
                        <select id="beh-action-type" required>
                            <option value="تنبيه شفهي مبدئي">⚠️ تنبيه شفهي مبدئي</option>
                            <option value="تعهد خطي رسمي">📝 تعهد خطي رسمي من الأخصائي</option>
                            <option value="استدعاء ولي أمر الطالب">👥 استدعاء ولي أمر الطالب للمدرسة</option>
                            <option value="إنذار حرمان إداري">🚫 إنذار حرمان إداري (بطاقة سلوك)</option>
                            <option value="تحويل إلى إدارة المدرسة">⚖️ تحويل رسمي إلى إدارة المنشأة</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:12px; color:#444;">تفاصيل وملاحظات حالة المتابعة السلوكية:</label>
                    <input type="text" id="beh-notes" placeholder="أدخل ملخص الإجراء المتخذ وأسباب المتابعة بدقة..." required style="padding:12px;">
                </div>
                
                <button type="submit" style="width:100%; background:var(--danger-color); color:#fff; font-weight:900; margin-top:10px; padding:15px; border-radius:8px; cursor:pointer; border:none;"><i class="bi bi-file-earmark-plus-fill"></i> اعتماد وتسجيل الإجراء التربوي بسجل الطالب</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-list-task"></i> الأرشيف المركزي لقرارات الضبط السلوكي والمتابعة</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:10px; border:1px solid #eee;">تاريخ الإجراء</th>
                            <th style="padding:10px; border:1px solid #eee;">اسم الطالب ثلاثي/رباعي</th>
                            <th style="padding:10px; border:1px solid #eee; text-align:center;">الفصل</th>
                            <th style="padding:10px; border:1px solid #eee; text-align:center;">الإجراء التربوي المقيد</th>
                            <th style="padding:10px; border:1px solid #eee;">ملاحظات الأخصائي الرسمي</th>
                        </tr>
                    </thead>
                    <tbody id="behavior-logs-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري جلب السجلات السلوكية الحية فوراً...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // سحب الفصول المتاحة لايف من قاعدة البيانات
        const classSelect = document.getElementById('beh-class-select');
        const snap = await onSnapshot(collection(db, 'students'), (snapshot) => {
            let classesSet = new Set();
            snapshot.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
            
            let htmlClasses = '<option value="">-- الرجاء اختيار الصف الدراسي --</option>';
            Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
            if (classSelect) classSelect.innerHTML = htmlClasses;
        });

        loadBehaviorLogsLive(); // تفعيل محرك البث الفوري
    } catch(e) { console.error(e); }
}

window.handleBehClassChange = async function(classId) {
    const studentSelect = document.getElementById('beh-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري فرز أسماء الفصل أبجدياً لايف...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await onSnapshot(q, (snapshot) => {
            let arr = [];
            snapshot.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
            arr.sort((a, b) => a.localeCompare(b, 'ar'));

            let html = '<option value="">-- اختر اسم الطالب من الكشف المعتمد --</option>';
            arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

            studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ لا يوجد طلاب بالفصل</option>' : html;
            studentSelect.disabled = arr.length === 0;
        });
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في استدعاء البيانات</option>';
    }
};

window.handleRegisterBehaviorLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('beh-student-select').value;
    const cId = document.getElementById('beh-class-select').value;
    const action = document.getElementById('beh-action-type').value;
    const notes = document.getElementById('beh-notes').value.trim();

    if(!sName || !cId) { alert("⚠️ الرجاء تحديد الطالب والصف أولاً قبل الاعتماد!"); return; }

    try {
        const unifiedDate = getUnifiedDateString(); // توحيد صيغة التاريخ لمنع تضارب الأجهزة
        
        await addDoc(collection(db, 'behavior'), {
            studentName: sName.trim(),
            name: sName.trim(),
            classId: cId.trim(),
            action: action,
            notes: notes,
            dateStr: unifiedDate,
            date: unifiedDate,
            createdAt: serverTimestamp()
        });
        
        alert('✓ تم اعتماد وتسجيل الإجراء التربوي بنجاح، وتحديث ملف الطالب التراكمي فوراً.');
        document.getElementById('behavior-reg-form').reset();
        document.getElementById('beh-student-select').innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        document.getElementById('beh-student-select').disabled = true;
    } catch(err) {
        alert('خطأ أثناء الحفظ السحابي: ' + err.message);
    }
};

// محرك البث اللحظي السريع جداً لجرد السجلات السلوكية
function loadBehaviorLogsLive() {
    const tbody = document.getElementById('behavior-logs-tbody');
    if (!tbody) return;

    onSnapshot(collection(db, 'behavior'), (snapshot) => {
        let html = '';
        snapshot.forEach(d => {
            const data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px; font-weight:bold; color:#7f8c8d;">📅 ${data.dateStr || data.date || '-'}</td>
                    <td style="padding:10px;"><b>👤 ${data.studentName || data.name || '-'}</b></td>
                    <td style="padding:10px; text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="padding:10px; text-align:center;"><span class="badge danger" style="background:#c0392b;">${data.action || 'إجراء معتمد'}</span></td>
                    <td style="padding:10px; color:#555; font-size:12px; font-weight:bold;">${data.notes || '-'}</td>
                </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">✅ السجل المركزي للمتابعة السلوكية سليم تماماً.</td></tr>';
    }, (err) => { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;">💡 بانتظار تسجيل أولى الحالات السلوكية بالمنظومة.</td></tr>'; });
}