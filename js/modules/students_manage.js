import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let localStudentsMap = {};
let allClassesCache = [];
let currentClassStudents = []; // للقائمة الجماعية

export async function initStudentsManageModule() {
    const container = document.getElementById('tab-students-manage');
    if (!container) return;

    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--primary-color);">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--hover-color);"></i> محرك الاستعلام عن ملف الطالب الفردي</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            🔍 حدد الصف الدراسي ثم اختر اسم الطالب للاطلاع على كافة سجلاته.
        </p>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">الصف الدراسي:</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)" style="width:100%; padding:10px;">
                    <option value="">-- جاري سحب الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">اسم الطالب:</label>
                <select id="prof-student-select" disabled style="width:100%; padding:10px;">
                    <option value="">-- بانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <div style="display:flex; gap:10px;">
            <button onclick="window.triggerStudentProfileFetch()" style="flex:1; background:var(--primary-color); font-weight:900; padding:14px; border-radius:8px; border:none; color:#fff; cursor:pointer;"><i class="bi bi-search"></i> جلب السجل التاريخي الكامل</button>
            <button onclick="window.resetStudentDashboardLiveView()" id="btn-student-reset" style="background:#7f8c8d; border-radius:8px; border:none; color:#fff; padding:0 20px; display:none;"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
    </div>
    <div id="student-profile-display-area"></div>

    <div class="card" style="border-top: 5px solid var(--sky); margin-top:16px;">
        <h2><i class="bi bi-list-check" style="color:var(--sky);"></i> إدارة جماعية للطلاب (نقل / تحديد متعدد)</h2>
        <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
            اختر الفصل لعرض كل طلابه، حدد من تريد نقلهم، ثم اختر الفصل الجديد.
        </p>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:12px; color:#444;">اعرض طلاب الفصل:</label>
                <select id="bulk-class-select" onchange="window.loadBulkClassStudents(this.value)" style="width:100%; padding:10px;">
                    <option value="">-- اختر الفصل --</option>
                </select>
            </div>
        </div>
        <div id="bulk-students-list" style="margin-bottom:14px;">
            <p style="text-align:center; color:#999; padding:20px; font-weight:700;">👆 اختر فصلاً لعرض طلابه</p>
        </div>
        <div id="bulk-actions-bar" style="display:none; gap:10px; align-items:center; flex-wrap:wrap; background:#f8fafc; padding:14px; border-radius:10px;">
            <span id="bulk-selected-count" style="font-weight:900; color:var(--sky); font-size:14px;">0 طالب محدد</span>
            <select id="bulk-target-class" style="padding:9px; border-radius:8px; border:1px solid var(--line); flex:1; min-width:150px;">
                <option value="">-- انقل إلى فصل --</option>
            </select>
            <button onclick="window.executeBulkTransfer()" style="background:var(--sky); color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:700; cursor:pointer;">
                <i class="bi bi-arrow-left-right"></i> نقل المحدد
            </button>
        </div>
    </div>

    ${isAdmin ? `
    <div class="card" style="border-top: 5px solid var(--danger-color); margin-top:16px;">
        <h2><i class="bi bi-exclamation-octagon-fill" style="color:var(--danger-color);"></i> منطقة الخطر — حذف جميع الطلاب</h2>
        <p style="font-size:12px; color:#666; margin-bottom:12px; font-weight:bold;">
            سيتم نقل جميع طلاب المدرسة لأرشيف "المحذوفين" (قابل للاسترجاع)، وليس حذفاً نهائياً فورياً.
            سجلات الغياب والسلوك السابقة تبقى محفوظة كما هي.
        </p>
        <button onclick="window.openDeleteAllModal()" style="background:var(--danger-color); color:#fff; border:none; padding:12px 20px; border-radius:8px; font-weight:900; cursor:pointer;">
            <i class="bi bi-trash3-fill"></i> حذف جميع طلاب المدرسة
        </button>
    </div>

    <!-- Modal تأكيد الحذف -->
    <div id="delete-all-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:28px; max-width:420px; width:90%; direction:rtl;">
            <h3 style="color:var(--danger-color); font-weight:900; margin-bottom:10px;">
                <i class="bi bi-exclamation-triangle-fill"></i> تأكيد حذف جميع الطلاب
            </h3>
            <p style="font-size:13px; color:#666; margin-bottom:14px;">
                هذا الإجراء سينقل <b id="delete-all-count">0</b> طالب لأرشيف المحذوفين.
                للمتابعة، اكتب اسم مدرستك بالضبط: <b id="delete-all-school-name" style="color:var(--danger-color);"></b>
            </p>
            <input type="text" id="delete-all-confirm-input" placeholder="اكتب اسم المدرسة هنا"
                style="width:100%; padding:11px; border:1.5px solid var(--line); border-radius:8px; margin-bottom:14px; box-sizing:border-box;">
            <div style="display:flex; gap:8px;">
                <button onclick="window.executeDeleteAllStudents()" style="flex:1; background:var(--danger-color); color:#fff; border:none; padding:11px; border-radius:8px; font-weight:700; cursor:pointer;">
                    تأكيد الحذف نهائياً
                </button>
                <button onclick="window.closeDeleteAllModal()" style="background:#fff; color:var(--mid); border:1.5px solid var(--line); padding:11px 18px; border-radius:8px; font-weight:700; cursor:pointer;">
                    إلغاء
                </button>
            </div>
        </div>
    </div>` : ''}
    `;

    // تحميل الفصول للمدرسة الحالية
    const schoolId = getActiveSchoolId();
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));

    let classesSet = new Set();
    snap.forEach(d => { if (d.data().classId) classesSet.add(d.data().classId.trim()); });
    allClassesCache = Array.from(classesSet).sort((a, b) => a.localeCompare(b));

    const classOptions = '<option value="">-- الرجاء اختيار الصف --</option>' +
        allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');

    document.getElementById('prof-class-select').innerHTML = classOptions;
    document.getElementById('bulk-class-select').innerHTML = classOptions;
}

// ===== ملف الطالب الفردي =====
window.handleStudentClassChange = async function(classId) {
    const studentSelect = document.getElementById('prof-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب الأسماء...</option>';
    studentSelect.disabled = true;
    localStudentsMap = {};

    const schoolId = getActiveSchoolId();

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        const snap = await getDocs(q);

        let studentsList = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.name) {
                const cleanName = data.name.trim();
                studentsList.push(cleanName);
                localStudentsMap[cleanName] = { id: d.id, ...data };
            }
        });
        studentsList.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر الطالب --</option>';
        studentsList.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = studentsList.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = studentsList.length === 0;
    } catch (e) { studentSelect.innerHTML = '<option value="">❌ خطأ في الاتصال</option>'; }
};

window.triggerStudentProfileFetch = function() {
    const sName = document.getElementById('prof-student-select').value;
    if (!sName || !localStudentsMap[sName]) { window.showToast('⚠️ يرجى اختيار الطالب!', 'info'); return; }
    document.getElementById('btn-student-reset').style.display = 'inline-block';
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

window.resetStudentDashboardLiveView = function() {
    document.getElementById('student-profile-display-area').innerHTML = '';
    document.getElementById('btn-student-reset').style.display = 'none';
    document.getElementById('prof-student-select').value = '';
};

window.loadStudentFullProfile = async function(student) {
    const displayArea = document.getElementById('student-profile-display-area');
    const schoolId = getActiveSchoolId();
    displayArea.innerHTML = `<div class="card" style="text-align:center; padding:30px; color:#999; font-weight:700;">⏳ جاري تحميل السجل الكامل...</div>`;

    try {
        const name = student.name.trim();
        const [attSnap, behSnap, rewSnap, gateSnap, clinicSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', name), where('schoolId', '==', schoolId)))
        ]);

        const absentCount = attSnap.docs.filter(d => d.data().status === 'absent').length;
        const lateCount = attSnap.docs.filter(d => d.data().status === 'late').length;

        let html = `
        <div class="card" style="border-right:5px solid var(--sky); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
                <h3 style="margin:0 0 4px; font-size:16px;">👤 ${name}</h3>
                <span style="background:var(--ice); color:var(--sky); padding:3px 10px; border-radius:6px; font-size:13px; font-weight:700;">الفصل: ${student.classId || '-'}</span>
                <span style="color:var(--mid); font-size:13px; margin-right:8px;"><i class="bi bi-telephone-fill"></i> ${student.parentPhone || 'غير مسجل'}</span>
            </div>
            <div style="display:flex; gap:10px;">
                <div style="text-align:center; background:#fef2f2; padding:8px 14px; border-radius:8px;">
                    <div style="font-size:20px; font-weight:900; color:var(--danger-color);">${absentCount}</div>
                    <div style="font-size:10px; color:#666;">غياب</div>
                </div>
                <div style="text-align:center; background:#fffbeb; padding:8px 14px; border-radius:8px;">
                    <div style="font-size:20px; font-weight:900; color:var(--gold);">${lateCount}</div>
                    <div style="font-size:10px; color:#666;">تأخير</div>
                </div>
                <div style="text-align:center; background:#f0fdf4; padding:8px 14px; border-radius:8px;">
                    <div style="font-size:20px; font-weight:900; color:var(--success-color);">${rewSnap.size}</div>
                    <div style="font-size:10px; color:#666;">حوافز</div>
                </div>
            </div>
        </div>`;

        html += buildRecordsTable('السجل السلوكي', behSnap, ['dateStr', 'type', 'notes', 'action'], ['التاريخ', 'النوع', 'الملاحظات', 'الإجراء']);
        html += buildRecordsTable('سجل الاستئذان', gateSnap, ['dateStr', 'reason', 'relative', 'status'], ['التاريخ', 'السبب', 'المستلم', 'الحالة']);
        html += buildRecordsTable('سجل العيادة', clinicSnap, ['dateStr', 'complaint', 'treatment'], ['التاريخ', 'الشكوى', 'العلاج']);

        displayArea.innerHTML = html;
    } catch (err) { displayArea.innerHTML = `<div class="card" style="color:red;">❌ خطأ: ${err.message}</div>`; }
};

function buildRecordsTable(title, snap, fields, labels) {
    let rows = '';
    snap.forEach(d => {
        const data = d.data();
        rows += '<tr style="border-bottom:1px solid #eee;">' +
            fields.map(f => `<td style="padding:7px; font-size:12.5px;">${data[f] || '-'}</td>`).join('') +
            '</tr>';
    });
    return `
    <div class="card" style="margin-top:12px;">
        <h4 style="font-size:14px; margin-bottom:8px;">${title} <span style="color:#999; font-size:12px;">(${snap.size})</span></h4>
        <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#f8fafc;">${labels.map(l => `<th style="padding:7px; font-size:12px; text-align:right;">${l}</th>`).join('')}</tr></thead>
            <tbody>${rows || `<tr><td colspan="${labels.length}" style="text-align:center; padding:14px; color:#999;">لا توجد سجلات</td></tr>`}</tbody>
        </table></div>
    </div>`;
}

// ===== الإدارة الجماعية (نقل متعدد) =====
window.loadBulkClassStudents = async function(classId) {
    const listEl = document.getElementById('bulk-students-list');
    const actionsBar = document.getElementById('bulk-actions-bar');
    actionsBar.style.display = 'none';

    if (!classId) {
        listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px; font-weight:700;">👆 اختر فصلاً لعرض طلابه</p>';
        return;
    }

    listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">⏳ جاري التحميل...</p>';
    const schoolId = getActiveSchoolId();

    const snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId), where('schoolId', '==', schoolId)));
    currentClassStudents = [];
    snap.forEach(d => currentClassStudents.push({ id: d.id, ...d.data() }));
    currentClassStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

    if (!currentClassStudents.length) {
        listEl.innerHTML = '<p style="text-align:center; color:#999; padding:20px; font-weight:700;">لا يوجد طلاب بهذا الفصل</p>';
        return;
    }

    let html = `
    <div style="display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:2px solid var(--line); margin-bottom:8px;">
        <input type="checkbox" id="bulk-select-all" onchange="window.toggleAllBulkStudents(this.checked)" style="width:18px; height:18px; cursor:pointer;">
        <label for="bulk-select-all" style="font-weight:700; font-size:13px; cursor:pointer;">تحديد الكل (${currentClassStudents.length} طالب)</label>
    </div>`;

    currentClassStudents.forEach((s, i) => {
        html += `
        <div style="display:flex; align-items:center; gap:10px; padding:9px 6px; border-bottom:1px solid #f0f0f0;">
            <input type="checkbox" class="bulk-student-cb" data-idx="${i}" onchange="window.updateBulkSelectionCount()" style="width:17px; height:17px; cursor:pointer;">
            <span style="font-weight:700; font-size:13.5px;">${s.name}</span>
            <span style="color:#999; font-size:11px; margin-right:auto;">${s.parentPhone || ''}</span>
        </div>`;
    });

    listEl.innerHTML = html;

    // تعبئة قائمة الفصول المستهدفة (كل الفصول ما عدا الحالي)
    const targetSelect = document.getElementById('bulk-target-class');
    targetSelect.innerHTML = '<option value="">-- انقل إلى فصل --</option>' +
        allClassesCache.filter(c => c !== classId).map(c => `<option value="${c}">${c}</option>`).join('');
};

window.toggleAllBulkStudents = function(checked) {
    document.querySelectorAll('.bulk-student-cb').forEach(cb => cb.checked = checked);
    window.updateBulkSelectionCount();
};

window.updateBulkSelectionCount = function() {
    const checked = document.querySelectorAll('.bulk-student-cb:checked').length;
    const actionsBar = document.getElementById('bulk-actions-bar');
    const countEl = document.getElementById('bulk-selected-count');
    countEl.textContent = `${checked} طالب محدد`;
    actionsBar.style.display = checked > 0 ? 'flex' : 'none';
};

window.executeBulkTransfer = async function() {
    const targetClass = document.getElementById('bulk-target-class').value;
    if (!targetClass) { window.showToast('⚠️ اختر الفصل المستهدف أولاً', 'info'); return; }

    const selectedIdxs = [...document.querySelectorAll('.bulk-student-cb:checked')].map(cb => parseInt(cb.dataset.idx));
    if (!selectedIdxs.length) { window.showToast('⚠️ لم يتم تحديد أي طالب', 'info'); return; }

    const selectedStudents = selectedIdxs.map(i => currentClassStudents[i]);
    if (!confirm(`نقل ${selectedStudents.length} طالب إلى الفصل ${targetClass}؟`)) return;

    try {
        const batch = writeBatch(db);
        selectedStudents.forEach(s => {
            batch.update(doc(db, 'students', s.id), { classId: targetClass });
        });
        await batch.commit();

        window.showToast(`✅ تم نقل ${selectedStudents.length} طالب إلى ${targetClass}`);
        window.loadBulkClassStudents(document.getElementById('bulk-class-select').value);
    } catch (e) {
        window.showToast('❌ خطأ في النقل: ' + e.message, 'error');
    }
};

// ===== حذف جميع الطلاب (Admin فقط، Soft Delete) =====
window.openDeleteAllModal = async function() {
    const schoolId = getActiveSchoolId();
    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));

    document.getElementById('delete-all-count').textContent = snap.size;
    document.getElementById('delete-all-school-name').textContent = currentUser.schoolName || schoolId;
    document.getElementById('delete-all-confirm-input').value = '';
    document.getElementById('delete-all-modal').style.display = 'flex';
};

window.closeDeleteAllModal = function() {
    document.getElementById('delete-all-modal').style.display = 'none';
};

window.executeDeleteAllStudents = async function() {
    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const expectedName = (currentUser.schoolName || getActiveSchoolId() || '').trim();
    const typedName = document.getElementById('delete-all-confirm-input').value.trim();

    if (typedName !== expectedName) {
        window.showToast('❌ الاسم المكتوب غير مطابق — تم إلغاء العملية', 'error');
        return;
    }

    const schoolId = getActiveSchoolId();
    try {
        const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        const batch = writeBatch(db);
        let count = 0;

        for (const d of snap.docs) {
            const data = d.data();
            // نقل لأرشيف المحذوفين بدل الحذف النهائي
            const archiveRef = doc(collection(db, 'deleted_students'));
            batch.set(archiveRef, {
                ...data,
                originalId: d.id,
                deletedAt: serverTimestamp(),
                deletedBy: currentUser.name || currentUser.userId || 'unknown'
            });
            batch.delete(doc(db, 'students', d.id));
            count++;
        }

        await batch.commit();
        window.closeDeleteAllModal();
        window.showToast(`✅ تم نقل ${count} طالب لأرشيف المحذوفين`);
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        window.showToast('❌ خطأ: ' + e.message, 'error');
    }
};
