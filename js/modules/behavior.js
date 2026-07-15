import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, addDoc, query, where, serverTimestamp, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initBehaviorModule() {
    const container = document.getElementById('tab-behavior');
    if (!container) return;

    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-shield-exclamation" style="color:var(--danger-color);"></i> نظام رصد الإجراءات التربوية والمتابعة السلوكية للطلاب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">الرجاء تحديد الصف الدراسي لاستدعاء كشف الأسماء المعتمد، ثم اختيار الإجراء السلوكي وحالة المتابعة.</p>
            
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
                        <label style="font-weight:700; font-size:12px; color:#444;">3. المعلم المحيل للحالة (جهة الإحالة):</label>
                        <input type="text" id="beh-referred-by" value="${currentUser.name || ''}" readonly style="padding:12px; background:var(--off); color:var(--mid); font-weight:700;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">4. الإجراء التربوي المتخذ:</label>
                        <select id="beh-action-type" required>
                            <option value="تنبيه شفهي مبدئي">⚠️ تنبيه شفهي مبدئي وتوجيه إرشادي</option>
                            <option value="تعهد خطي رسمي">📝 أخذ تعهد خطي رسمي بحضور الأخصائي</option>
                            <option value="استدعاء ولي أمر الطالب">👥 استدعاء ولي أمر الطالب للمدرسة رسمياً</option>
                            <option value="إنذار حرمان إداري">🚫 إصدار إنذار حرمان إداري (بطاقة سلوك)</option>
                            <option value="تحويل إلى إدارة المدرسة">⚖️ تحويل رسمي مباشر إلى إدارة المدرسة</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:12px; color:#444;">5. موقف وحالة المتابعة السلوكية:</label>
                        <select id="beh-followup-status" required>
                            <option value="تمت المتابعة والإقفال">✅ تمت المتابعة والإقفال رسمياً</option>
                            <option value="قيد المتابعة والمراجعة">⏳ لا، قيد المتابعة والمراجعة المستمرة</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:12px; color:#444;">تفاصيل وملاحظات حالة المتابعة السلوكية للائحة:</label>
                    <textarea id="beh-notes" rows="3" placeholder="أدخل ملخص الإجراء المتخذ، أسباب المتابعة، وتفاصيل المقابلة بدقة..." required style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:8px; font-weight:600; font-size:13px; outline:none; margin-top:5px; color:#333;"></textarea>
                </div>
                
                <button type="submit" style="width:100%; background:var(--danger-color); color:#fff; font-weight:900; margin-top:15px; padding:15px; border-radius:8px; cursor:pointer; border:none;"><i class="bi bi-file-earmark-plus-fill"></i> اعتماد وتسجيل الإجراء التربوي بسجل الطالب</button>
            </form>
        </div>

        
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button onclick="window.printBehaviorPDF()" 
                    style="background:#dc2626; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> تصدير PDF
                </button>
                <button onclick="window.printBehaviorDirect()" 
                    style="background:#0b2545; color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> طباعة مباشرة
                </button>
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
                            <th style="padding:10px; border:1px solid #eee; text-align:center;">حالة المتابعة</th>
                            <th style="padding:10px; border:1px solid #eee;">المعلم المحيل</th>
                            <th style="padding:10px; border:1px solid #eee;">ملاحظات الأخصائي الرسمي</th>
                        </tr>
                    </thead>
                    <tbody id="behavior-logs-tbody">
                        <tr><td colspan="7" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري جلب السجلات السلوكية الحية فوراً...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        const classSelect = document.getElementById('beh-class-select');
        const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية الحالية

        // تصفية الفصول المتاحة بناءً على طلاب المدرسة الحالية فقط لمنع التداخل
        const qClasses = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        onSnapshot(qClasses, (snapshot) => {
            let classesSet = new Set();
            snapshot.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
            
            // جلب احتياطي يدعم السجلات القديمة لمدرسة الحسينان الأساسية
            if (classesSet.size === 0 && schoolId === 'hosainan') {
                const qFallback = query(collection(db, 'students'));
                getDocs(qFallback).then(fallbackSnap => {
                    fallbackSnap.forEach(doc => {
                        const d = doc.data();
                        if(!d.schoolId && d.classId) classesSet.add(d.classId.trim());
                    });
                    renderClassesDropdown(classesSet, classSelect);
                });
            } else {
                renderClassesDropdown(classesSet, classSelect);
            }
        });

        loadBehaviorLogsLive(); 
    } catch(e) { console.error(e); }
}

function renderClassesDropdown(classesSet, element) {
    if (!element) return;
    let htmlClasses = '<option value="">-- الرجاء اختيار الصف الدراسي --</option>';
    Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
    element.innerHTML = htmlClasses;
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

    const schoolId = getActiveSchoolId();

    try {
        // فلترة مزدوجة: الفصل التابع للمدرسة الحالية فقط لضمان الخصوصية التامة
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        onSnapshot(q, (snapshot) => {
            let arr = [];
            snapshot.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
            
            // خط دفاع خلفي للداتا العامة القديمة
            if (arr.length === 0 && schoolId === 'hosainan') {
                const qFallback = query(collection(db, 'students'), where('classId', '==', classId.trim()));
                getDocs(qFallback).then(fallbackSnap => {
                    let fArr = [];
                    fallbackSnap.forEach(doc => {
                        const d = doc.data();
                        if(!d.schoolId && d.name) fArr.push(d.name.trim());
                    });
                    fArr.sort((a, b) => a.localeCompare(b, 'ar'));
                    populateStudentsDropdown(fArr, studentSelect);
                });
            } else {
                arr.sort((a, b) => a.localeCompare(b, 'ar'));
                populateStudentsDropdown(arr, studentSelect);
            }
        });
    } catch (e) { studentSelect.innerHTML = '<option value="">❌ خطأ في استدعاء البيانات</option>'; }
};

function populateStudentsDropdown(arr, element) {
    let html = '<option value="">-- اختر اسم الطالب من الكشف المعتمد --</option>';
    arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });
    element.innerHTML = arr.length === 0 ? '<option value="">⚠️ لا يوجد طلاب بالفصل</option>' : html;
    element.disabled = arr.length === 0;
}

window.handleRegisterBehaviorLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('beh-student-select').value;
    const cId = document.getElementById('beh-class-select').value;
    const refBy = document.getElementById('beh-referred-by').value.trim();
    const action = document.getElementById('beh-action-type').value;
    const followup = document.getElementById('beh-followup-status').value;
    const notes = document.getElementById('beh-notes').value.trim();
    const schoolId = getActiveSchoolId(); // 🏢 ربط الـ SaaS المركزي

    if(!sName || !cId) { window.showToast("⚠️ الرجاء تحديد الطالب والصف أولاً قبل الاعتماد!"); return; }

    try {
        const todayISO = getTodayISO(); // التاريخ الدولي الموحد والمصحح للمقارنات التلقائية
        
        await addDoc(collection(db, 'behavior'), {
            schoolId: schoolId, // 🔑 البصمة الأمنية للمدرسة الراصدة
            studentName: sName.trim(),
            name: sName.trim(),
            classId: cId.trim(),
            referredBy: refBy,
            action: action,
            followUpStatus: followup,
            notes: notes,
            dateStr: todayISO,
            date: todayISO,
            createdAt: serverTimestamp()
        });
        
        window.showToast('✓ تم اعتماد وتسجيل الإجراء التربوي بنجاح، وتحديث ملف الطالب التراكمي فوراً.');
        document.getElementById('behavior-reg-form').reset();
        document.getElementById('beh-student-select').innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        document.getElementById('beh-student-select').disabled = true;
    } catch(err) { window.showToast('❌ خطأ: ' + err.message, 'error'); }
};

function loadBehaviorLogsLive() {
    const tbody = document.getElementById('behavior-logs-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId();

    // جلب وحصر أرشيف المتابعات السلوكية التابع للمدرسة الحالية فقط
    const qLogs = query(collection(db, 'behavior'), where('schoolId', '==', schoolId));

    onSnapshot(qLogs, (snapshot) => {
        let html = '';
        
        // إذا كان فارغاً والمدرسة هي الحسينان، نسحب الأرشيف القديم الغير مقيد بـ schoolId
        if (snapshot.empty && schoolId === 'hosainan') {
            getDocs(getActiveSchoolId() ? query(collection(db, 'behavior'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'behavior')).then(oldSnap => {
                let fHtml = '';
                oldSnap.forEach(d => {
                    const data = d.data();
                    if (!data.schoolId) fHtml += buildBehaviorRowHtml(data);
                });
                tbody.innerHTML = fHtml || '<tr><td colspan="7" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">✅ السجل المركزي للمتابعة السلوكية سليم تماماً.</td></tr>';
            });
            return;
        }

        snapshot.forEach(d => {
            html += buildBehaviorRowHtml(d.data());
        });
        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; color:#27ae60; padding:15px; font-weight:bold;">✅ السجل المركزي للمتابعة السلوكية سليم تماماً.</td></tr>';
    }, (err) => { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px;">💡 بانتظار تسجيل أولى الحالات السلوكية بالمنظومة.</td></tr>'; });
}

function buildBehaviorRowHtml(data) {
    const statusBadge = data.followUpStatus && data.followUpStatus.includes('تمت') ? 
        `<span class="badge success" style="background:#27ae60; padding:3px 8px; border-radius:4px; color:#fff;">تم الإقفال</span>` : 
        `<span class="badge warning" style="background:#e67e22; padding:3px 8px; border-radius:4px; color:#fff;">قيد المتابعة</span>`;

    return `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px; font-weight:bold; color:#7f8c8d;">📅 ${data.dateStr || data.date || '-'}</td>
            <td style="padding:10px;"><b>👤 ${data.studentName || data.name || '-'}</b></td>
            <td style="padding:10px; text-align:center;"><span class="badge info" style="background:var(--accent-color); padding:3px 8px; color:#fff; border-radius:4px;">${data.classId || '-'}</span></td>
            <td style="padding:10px; text-align:center;"><span class="badge danger" style="background:#c0392b; padding:4px 8px; color:#fff; border-radius:4px; font-weight:bold;">${data.action || 'إجراء معتمد'}</span></td>
            <td style="padding:10px; text-align:center;">${statusBadge}</td>
            <td style="padding:10px; font-weight:700; color:#2980b9;">أ. ${data.referredBy || 'غير محدد'}</td>
            <td style="padding:10px; color:#555; font-size:12px; font-weight:bold;">${data.notes || '-'}</td>
        </tr>`;
}
// ===== طباعة السجل =====
window.printBehaviorPDF = async function() {
    const tbody = document.getElementById('behavior-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للتصدير', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>الإجراء</th><th>المتابعة</th><th>المحيل</th><th>الملاحظات</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    await window.ManzoumaReport.exportPDF(contentHTML, 'سجل_الإجراءات_السلوكية', 'سجل الإجراءات السلوكية');
};

window.printBehaviorDirect = function() {
    const tbody = document.getElementById('behavior-logs-tbody');
    if(!tbody || !tbody.innerHTML.trim()) { window.showToast('⚠️ لا توجد بيانات للطباعة', 'info'); return; }
    const contentHTML = `<table><thead><tr><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>الإجراء</th><th>المتابعة</th><th>المحيل</th><th>الملاحظات</th></tr></thead><tbody>${tbody.innerHTML}</tbody></table>`;
    window.ManzoumaReport.printDirect(contentHTML, 'سجل الإجراءات السلوكية');
};