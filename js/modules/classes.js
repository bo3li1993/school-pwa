import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initClassesModule() {
    var container = document.getElementById('tab-classes') || document.getElementById('tab-classes');
    if (!container) return;

    // 🛡️ جدار حماية وعزل الأخطاء
    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-door-open-fill" style="color:var(--primary-color);"></i> نظام جرد وفحص الفصول الدراسية المعتمدة</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">استعراض إحصائي شامل لتوزيع الفصول وكثافة قيد الطلاب الحالية بداخل غرف المنشأة.</p>
            
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f4f6f9;">
                            <th>الفصل الدراسي</th>
                            <th style="text-align:center;">عدد الطلاب</th>
                            <th style="text-align:center;">الحالة</th>
                            <th style="text-align:center;">عرض / تعديل</th>
                        </tr>
                    </thead>
                    <tbody id="school-classes-tbody">
                        <tr><td colspan="3" style="text-align:center; color:#999; padding:15px; font-weight:bold;">⏳ جاري فحص كثافة الفصول السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        loadSchoolClassesStatsLive();
    } catch(e) {
        container.innerHTML = `
            <div class="card" style="border-top:5px solid var(--danger-color); color:var(--danger-color); text-align:center; padding:20px; font-weight:bold;">
                ⚠️ تعذر تحميل شاشة جرد الفصول: ${e.message}
            </div>`;
    }
}

async function loadSchoolClassesStatsLive() {
    var tbody = document.getElementById('school-classes-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية الديناميكية

    try {
        // سحب كشف طلاب المدرسة الحالية فقط
        var qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        var snap = await getDocs(qStudents);
        
        // دعم التوافقية للمدرسة القديمة (في حال وجود داتا قديمة بدون schoolId)
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(getActiveSchoolId() ? query(collection(db, 'students'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'students'));
        }

        var classCounts = {};
        var defaultClasses = ["6/1", "6/2", "6/3", "6/4", "7/1", "7/2", "7/3", "7/4", "8/1", "8/2", "8/3", "8/4", "9/1", "9/2"];
        defaultClasses.forEach(c => classCounts[c] = 0);

        snap.forEach(doc => {
            var d = doc.data();
            // فلترة أمنية إضافية لضمان عدم خلط داتا المدارس
            if ((!d.schoolId || d.schoolId === schoolId) && d.classId) {
                var cId = d.classId.trim();
                if (classCounts[cId] !== undefined) {
                    classCounts[cId]++;
                } else {
                    classCounts[cId] = 1;
                }
            }
        });

        var html = '';
        Object.keys(classCounts).sort().forEach(cId => {
            var count = classCounts[cId];
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td><b>🏫 صف ${cId}</b></td>
                    <td style="text-align:center; font-weight:800; color:var(--primary-color); font-size:16px; cursor:pointer;" onclick="window.showClassStudents('${cId}')">${count}</td>
                    <td style="text-align:center;"><span style="background:${count > 0 ? '#2ecc71' : '#f1c40f'}; color:#fff; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">${count > 0 ? 'نشط ومستقر' : 'خالٍ من الطلاب'}</span></td>
                    <td style="text-align:center;">
                        <button onclick="window.showClassStudents('${cId}')"
                            style="background:var(--sky,#1a78c2);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer">
                            👁 عرض
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; padding:15px;">💡 لا توجد فصول دراسية مقيدة.</td></tr>';
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red; padding:15px; font-weight:bold;">❌ تعذر استدعاء الكثافة الطلابية من السيرفر الموحد.</td></tr>';
    }
}

// ══ عرض طلاب الفصل مع إمكانية نقلهم ══
window.showClassStudents = async function(classId) {
    var { getDocs: gd, query: q, collection: col, where: wh, updateDoc, doc }
        = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    var { db: database, getActiveSchoolId: getSchool }
        = await import('../firebase-config.js');

    document.getElementById('class-students-modal')?.remove();

    var modal = document.createElement('div');
    modal.id    = 'class-students-modal';
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

        // جلب كل الفصول للنقل
        var allSnap = await gd(q(col(database,'students'), wh('schoolId','==',schoolId)));
        var allClasses = [...new Set(allSnap.docs.map(d=>d.data().classId).filter(Boolean))].sort();
        var classOpts  = allClasses.map(c=>`<option value="${c}">${c}</option>`).join('');

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
        var { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        var { db: database }   = await import('../firebase-config.js');
        await updateDoc(doc(database,'students',studentId), { classId: newClass });
        window.showToast?.(`✅ تم نقل الطالب إلى ${newClass}`);
        document.getElementById('class-students-modal')?.remove();
        // تحديث الجدول
        setTimeout(() => document.querySelector('[data-tab="tab-classes"]')?.click(), 500);
    } catch(e) { window.showToast?.('❌ ' + e.message, 'error'); }
};
