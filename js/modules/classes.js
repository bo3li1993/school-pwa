import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initClassesModule() {
    var container = document.getElementById('tab-classes');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top:5px solid var(--primary-color); text-align:right;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                <h2 style="margin:0;"><i class="bi bi-door-open-fill" style="color:var(--primary-color);"></i> الفصول الدراسية</h2>
                <button onclick="window.showAddClassModal()"
                    style="background:var(--primary-color); color:#fff; border:none; padding:9px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                    <i class="bi bi-plus-circle-fill"></i> إضافة فصل
                </button>
            </div>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">استعراض الفصول وتوزيع الطلاب — يمكن إضافة أو حذف فصل من هنا.</p>

            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f4f6f9;">
                            <th>الفصل الدراسي</th>
                            <th style="text-align:center;">عدد الطلاب</th>
                            <th style="text-align:center;">الحالة</th>
                            <th style="text-align:center;">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="school-classes-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">⏳ جاري تحميل الفصول...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal إضافة فصل -->
        <div id="add-class-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center; padding:16px;">
            <div style="background:#fff; border-radius:16px; padding:26px; max-width:380px; width:100%; direction:rtl; font-family:'Cairo',sans-serif;">
                <h3 style="font-weight:900; margin-bottom:16px; color:#0b2545;"><i class="bi bi-plus-circle-fill" style="color:var(--primary-color);"></i> إضافة فصل جديد</h3>
                <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px;">اسم الفصل (مثال: 6/5 أو 10/1)</label>
                <input type="text" id="new-class-id" placeholder="6/5"
                    style="width:100%; padding:11px; border:1.5px solid #e2e8f0; border-radius:8px; font-family:'Cairo',sans-serif; font-size:14px; font-weight:700; box-sizing:border-box; margin-bottom:16px; text-align:center;">
                <div style="display:flex; gap:8px;">
                    <button onclick="window.saveNewClass()"
                        style="flex:1; background:var(--primary-color); color:#fff; border:none; padding:11px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                        <i class="bi bi-check-circle-fill"></i> حفظ
                    </button>
                    <button onclick="document.getElementById('add-class-modal').style.display='none'"
                        style="background:#fff; color:#666; border:1.5px solid #e2e8f0; padding:11px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>`;

        await loadSchoolClasses();
    } catch(e) {
        container.innerHTML = `<div class="card" style="border-top:5px solid var(--danger-color); color:var(--danger-color); text-align:center; padding:20px; font-weight:bold;">⚠️ تعذر تحميل الفصول: ${e.message}</div>`;
    }
}

async function loadSchoolClasses() {
    var tbody = document.getElementById('school-classes-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId();
    if (!schoolId) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">❌ لم يتم تحديد المدرسة</td></tr>'; return; }

    try {
        // جلب الفصول المخصصة من Firestore
        var classesSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', schoolId)));
        
        // جلب الطلاب لحساب الكثافة
        var studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));

        var classCounts = {};

        // إضافة الفصول المخزنة
        classesSnap.forEach(d => { classCounts[d.data().classId || d.id] = 0; });

        // إذا ما في فصول مخزنة، استخدم الفصول الافتراضية
        if (Object.keys(classCounts).length === 0) {
            ["6/1","6/2","6/3","6/4","7/1","7/2","7/3","7/4","8/1","8/2","8/3","8/4","9/1","9/2"].forEach(c => classCounts[c] = 0);
        }

        // حساب عدد الطلاب في كل فصل
        studentsSnap.forEach(d => {
            var cId = d.data().classId?.trim();
            if (cId) {
                if (classCounts[cId] !== undefined) classCounts[cId]++;
                else classCounts[cId] = 1; // فصل موجود في الطلاب لكن غير مخزن
            }
        });

        var sortedClasses = Object.keys(classCounts).sort((a, b) => {
            var [ag, as_] = a.split('/').map(Number);
            var [bg, bs] = b.split('/').map(Number);
            return ag !== bg ? ag - bg : as_ - bs;
        });

        var html = '';
        sortedClasses.forEach(cId => {
            var count = classCounts[cId];
            var isActive = count > 0;
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>🏫 صف ${cId}</b></td>
                    <td style="text-align:center; font-weight:800; color:var(--primary-color); font-size:16px; cursor:pointer;" onclick="window.showClassStudents('${cId}')">${count}</td>
                    <td style="text-align:center;">
                        <span style="background:${isActive ? 'var(--green,#059669)' : '#f1c40f'}; color:#fff; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">
                            ${isActive ? 'نشط' : 'فارغ'}
                        </span>
                    </td>
                    <td style="text-align:center; display:flex; gap:6px; justify-content:center; padding:8px;">
                        <button onclick="window.showClassStudents('${cId}')"
                            style="background:var(--sky,#1a78c2); color:#fff; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:pointer;">
                            👁 عرض
                        </button>
                        <button onclick="window.deleteClassConfirm('${cId}', ${count})"
                            style="background:${isActive ? '#e5e7eb' : 'var(--red,#dc2626)'}; color:${isActive ? '#999' : '#fff'}; border:none; padding:5px 10px; border-radius:6px; font-family:'Cairo',sans-serif; font-size:11px; font-weight:700; cursor:${isActive ? 'not-allowed' : 'pointer'};"
                            ${isActive ? 'title="لا يمكن حذف فصل فيه طلاب" disabled' : ''}>
                            🗑 حذف
                        </button>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:15px; color:#aaa;">💡 لا توجد فصول. أضف فصلاً جديداً.</td></tr>';

    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:15px;">❌ ${err.message}</td></tr>`;
    }
}

window.showAddClassModal = function() {
    document.getElementById('new-class-id').value = '';
    document.getElementById('add-class-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('new-class-id').focus(), 100);
};

window.saveNewClass = async function() {
    var classId = document.getElementById('new-class-id').value.trim();
    if (!classId) { window.showToast?.('أدخل اسم الفصل', 'warning'); return; }

    // التحقق من الصيغة (رقم/رقم)
    if (!/^\d+\/\d+$/.test(classId)) {
        window.showToast?.('صيغة الفصل غير صحيحة — مثال: 6/1', 'warning');
        return;
    }

    var schoolId = getActiveSchoolId();
    try {
        var docRef = doc(db, 'classes', `${schoolId}_${classId.replace('/', '-')}`);
        var existing = await getDoc(docRef);
        if (existing.exists()) { window.showToast?.('الفصل موجود مسبقاً', 'warning'); return; }

        await setDoc(docRef, { classId, schoolId, createdAt: new Date().toISOString() });
        document.getElementById('add-class-modal').style.display = 'none';
        window.showToast?.(`✅ تم إضافة فصل ${classId}`);
        await loadSchoolClasses();
    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

window.deleteClassConfirm = async function(classId, studentCount) {
    if (studentCount > 0) { window.showToast?.('لا يمكن حذف فصل فيه طلاب', 'warning'); return; }
    if (!confirm(`هل تريد حذف فصل ${classId}؟ لا يمكن التراجع.`)) return;

    var schoolId = getActiveSchoolId();
    try {
        await deleteDoc(doc(db, 'classes', `${schoolId}_${classId.replace('/', '-')}`));
        window.showToast?.(`✅ تم حذف فصل ${classId}`);
        await loadSchoolClasses();
    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

// ══ عرض طلاب الفصل مع إمكانية نقلهم ══
window.showClassStudents = async function(classId) {
    var { getDocs: gd, query: q, collection: col, where: wh, updateDoc, doc: docFn }
        = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    var { db: database, getActiveSchoolId: getSchool }
        = await import('../firebase-config.js');

    document.getElementById('class-students-modal')?.remove();

    var modal = document.createElement('div');
    modal.id = 'class-students-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:22px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;direction:rtl;font-family:'Cairo',sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="font-size:15px;font-weight:900;color:#0b2545;margin:0">🏫 طلاب الصف ${classId}</h3>
            <button onclick="document.getElementById('class-students-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer">✕</button>
        </div>
        <div id="class-students-body" style="font-size:13px;text-align:center;padding:20px;color:#aaa">⏳ جاري التحميل...</div>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);

    try {
        var schoolId = getSchool();
        var snap = await gd(q(col(database,'students'), wh('schoolId','==',schoolId), wh('classId','==',classId)));
        var body = document.getElementById('class-students-body');

        if(snap.empty) { body.innerHTML = '<div style="padding:20px;color:#aaa">لا يوجد طلاب في هذا الفصل</div>'; return; }

        var allSnap = await gd(q(col(database,'students'), wh('schoolId','==',schoolId)));
        var allClasses = [...new Set(allSnap.docs.map(d=>d.data().classId).filter(Boolean))].sort();

        var rows = snap.docs.map(d => {
            var s = d.data();
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f0f0f0;gap:8px">
                <span style="font-weight:700;font-size:13px;flex:1">${s.name||'—'}</span>
                <select id="move-${d.id}" style="padding:5px 8px;border:1.5px solid #e5e7eb;border-radius:6px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600">
                    ${allClasses.map(c=>`<option value="${c}" ${c===classId?'selected':''}>${c}</option>`).join('')}
                </select>
                <button onclick="window.moveStudent('${d.id}','${classId}')"
                    style="background:#1a78c2;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer">
                    نقل
                </button>
            </div>`;
        }).join('');

        body.innerHTML = `
            <div style="font-size:11px;color:#aaa;font-weight:700;margin-bottom:8px">إجمالي: ${snap.size} طالب</div>
            ${rows}`;

    } catch(e) {
        document.getElementById('class-students-body').innerHTML = '❌ ' + e.message;
    }
};

window.moveStudent = async function(studentId, currentClass) {
    var newClass = document.getElementById(`move-${studentId}`)?.value;
    if(!newClass || newClass === currentClass) { window.showToast?.('اختر فصلاً مختلفاً','warning'); return; }

    try {
        var { updateDoc, doc: docFn } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var { db: database } = await import('../firebase-config.js');
        await updateDoc(docFn(database,'students',studentId), { classId: newClass });
        window.showToast?.(`✅ تم نقل الطالب إلى ${newClass}`);
        document.getElementById('class-students-modal')?.remove();
        await loadSchoolClasses();
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};
