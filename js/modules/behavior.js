// 📑 موديل رصد ومتابعة البطاقات السلوكية والمخالفات المفرزة أبجدياً
import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initBehaviorModule() {
    const container = document.getElementById('tab-behavior');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-shield-exclamation" style="color:var(--danger-color);"></i> رصد ومتابعة سلوك الطلاب (البطاقات السلوكية)</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">اختر الفصل الدراسي ليقوم النظام بفرز الأسماء أبجدياً فوراً بدون الحاجة للكتابة اليدوية.</p>
            
            <form id="behavior-reg-form" onsubmit="window.handleRegisterBehaviorLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="beh-class-select" onchange="window.handleBehClassChange(this.value)" required>
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب من الفصل</label>
                        <select id="beh-student-select" disabled required>
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. نوع الإجراء / المخالفة</label>
                        <select id="beh-action-type" required>
                            <option value="تنبيه شفهي أول">⚠️ تنبيه شفهي أول</option>
                            <option value="إخلال بالنظام داخل الفصل">🚫 إخلال بالنظام داخل الفصل</option>
                            <option value="عدم إحضار الأدوات والواجبات">📚 عدم إحضار الأدوات/الواجبات</option>
                            <option value="سلوك سلبي متكرر">🛑 سلوك سلبي متكرر (بطاقة صفراء)</option>
                            <option value="تعهد خطي رسمي">📝 تعهد خطي رسمي من الأخصائي</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">ملاحظات وتفاصيل السلوك المرصود</label>
                    <input type="text" id="beh-notes" placeholder="اكتب تفاصيل المخالفة باختصار..." required>
                </div>
                
                <button type="submit" style="width:100%; background:var(--danger-color); font-weight:700; margin-top:5px;"><i class="bi bi-file-earmark-plus-fill"></i> تقييد وإصدار البطاقة السلوكية فوراً</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-list-task"></i> سجل الضبط السلوكي المرصود بالمنظومة</h2>
            <div style="overflow-x:auto;">
                <table id="behavior-logs-table">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th>اسم الطالب الدراسي</th>
                            <th style="text-align:center;">الفصل</th>
                            <th style="text-align:center;">نوع المخالفة المقيدة</th>
                            <th>ملاحظات الأخصائي / المدرس</th>
                        </tr>
                    </thead>
                    <tbody id="behavior-logs-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري سحب السجلات السلوكية الحية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // 🔄 جلب الفصول المتاحة لايف من قاعدة البيانات بدلاً من التثبيت اليدوي
        const classSelect = document.getElementById('beh-class-select');
        const snap = await getDocs(collection(db, 'students'));
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;

        loadBehaviorLogsLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ خطأ: ${e.message}</div>`;
    }
}

window.handleBehClassChange = async function(classId) {
    const studentSelect = document.getElementById('beh-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري جلب كشف الفصل...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب المخالف --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ لا يوجد طلاب بالفصل</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

window.handleRegisterBehaviorLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('beh-student-select').value;
    const cId = document.getElementById('beh-class-select').value;
    const action = document.getElementById('beh-action-type').value;
    const notes = document.getElementById('beh-notes').value.trim();

    try {
        await addDoc(collection(db, 'behavior'), {
            studentName: sName,
            name: sName,
            classId: cId,
            action: action,
            notes: notes,
            createdAt: serverTimestamp()
        });
        alert('✓ تم تسجيل وإصدار المخالفة السلوكية بنجاح سحابي.');
        document.getElementById('behavior-reg-form').reset();
        document.getElementById('beh-student-select').innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        document.getElementById('beh-student-select').disabled = true;
        loadBehaviorLogsLive();
    } catch(err) {
        alert('خطأ سحابي: ' + err.message);
    }
};

async function loadBehaviorLogsLive() {
    const tbody = document.getElementById('behavior-logs-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'behavior'));
        let html = '';
        
        snap.forEach(d => {
            const data = d.data();
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>👤 ${data.studentName || data.name || 'غير محدد'}</b></td>
                    <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                    <td style="text-align:center;"><span class="badge danger">${data.action || 'مخالفة'}</span></td>
                    <td style="color:#666; font-size:12px;">${data.notes || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">🥇 السجل السلوكي نظيف بالكامل.</td></tr>';
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">💡 قاعدة بيانات السلوك جاهزة لاستقبال المخالفات أولية.</td></tr>';
    }
}