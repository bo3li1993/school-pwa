import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const ALL_CLASSES = [
    '6/1','6/2','6/3','6/4',
    '7/1','7/2','7/3','7/4',
    '8/1','8/2','8/3','8/4',
    '9/1','9/2','9/3','9/4'
];

export async function initStudentModule() {
    const container = document.getElementById('tab-student') || document.querySelector('.tab-content.active');
    if (!container) return;

    container.innerHTML = `
        <div style="background:#fff; padding:24px; border-radius:14px; border:1px solid var(--line); margin-bottom:18px;">
            <h2 style="margin:0 0 16px; color:var(--navy); font-weight:900; font-size:16px;">
                <i class="bi bi-person-badge"></i> ملف الطالب
            </h2>

            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
                <div>
                    <label class="st-label">١. اختر الفصل</label>
                    <select id="st-select-class" class="st-input" onchange="window.loadClassStudentsList(this.value)">
                        <option value="">-- اختر الفصل --</option>
                        ${ALL_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="st-label">٢. اختر اسم الطالب</label>
                    <select id="st-select-student" class="st-input" disabled onchange="window.showStudentProfile(this.value)">
                        <option value="">-- اختر الفصل أولاً --</option>
                    </select>
                </div>
            </div>
        </div>

        <div id="student-results-container"></div>

        <style>
            .st-label{font-weight:700;font-size:12.5px;color:var(--text);display:block;margin-bottom:5px}
            .st-input{width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:600;text-align:right;outline:none;background:#fff}
            .st-input:focus{border-color:var(--sky)}
            .st-input:disabled{background:var(--off);color:var(--soft)}
        </style>
    `;
}

// ===== تخزين بيانات الفصل المحمّل حالياً =====
let currentClassStudents = [];

// ===== الخطوة 1: تحميل أسماء طلاب الفصل المختار =====
window.loadClassStudentsList = async function(classId) {
    const studentSelect = document.getElementById('st-select-student');
    const resultsDiv = document.getElementById('student-results-container');
    resultsDiv.innerHTML = '';
    currentClassStudents = [];

    if (!classId) {
        studentSelect.disabled = true;
        studentSelect.innerHTML = '<option value="">-- اختر الفصل أولاً --</option>';
        return;
    }

    const user = JSON.parse(localStorage.getItem('hs_user'));
    const schoolId = user?.schoolId;
    if (!schoolId) return;

    studentSelect.disabled = true;
    studentSelect.innerHTML = '<option value="">⏳ جاري التحميل...</option>';

    try {
        const q = query(collection(db, 'students'),
            where('schoolId', '==', schoolId),
            where('classId', '==', classId)
        );
        const snap = await getDocs(q);

        currentClassStudents = [];
        snap.forEach(docSnap => {
            currentClassStudents.push({ id: docSnap.id, ...docSnap.data() });
        });

        // فرز أبجدي عربي
        currentClassStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

        if (currentClassStudents.length === 0) {
            studentSelect.innerHTML = '<option value="">⚠️ لا يوجد طلاب في هذا الفصل</option>';
            studentSelect.disabled = true;
            return;
        }

        studentSelect.innerHTML = '<option value="">-- اختر اسم الطالب --</option>' +
            currentClassStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        studentSelect.disabled = false;

    } catch (err) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في التحميل</option>';
        console.error('خطأ تحميل الطلاب:', err);
    }
};

// ===== الخطوة 2: عرض ملف الطالب المختار =====
window.showStudentProfile = function(studentDocId) {
    const resultsDiv = document.getElementById('student-results-container');
    if (!studentDocId) { resultsDiv.innerHTML = ''; return; }

    const data = currentClassStudents.find(s => s.id === studentDocId);
    if (!data) return;

    resultsDiv.innerHTML = `
        <div class="card" style="border-right:5px solid var(--sky); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:16px;">
            <div>
                <h3 style="margin:0 0 4px; font-size:16px;">👤 ${data.name}</h3>
                <span style="background:var(--ice); color:var(--sky); padding:3px 10px; border-radius:6px; font-size:13px; font-weight:700;">الفصل: ${data.classId}</span>
                <span style="color:var(--mid); font-size:13px; margin-right:8px;"><i class="bi bi-telephone-fill"></i> ${data.parentPhone || 'غير مسجل'}</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="window.contactParent('${data.parentPhone||''}', '${data.name}')"
                    style="background:#25d366; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:13px;">
                    <i class="bi bi-whatsapp"></i> مراسلة
                </button>
                <button onclick="window.exportStudentProfilePDF('${data.name}', '${data.classId}', '${data.parentPhone||''}')"
                    style="background:#dc2626; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:13px;">
                    <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                </button>
                <button onclick="window.printStudentProfileDirect('${data.name}', '${data.classId}')"
                    style="background:#0b2545; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:13px;">
                    <i class="bi bi-printer-fill"></i> طباعة
                </button>
                <div style="display:flex; align-items:center; border:1.5px solid var(--line); border-radius:8px; overflow:hidden;">
                    <select id="new-class-${data.id}" style="border:none; border-radius:0; margin:0; min-width:90px; font-size:13px;">
                        <option value="">نقل لفصل...</option>
                        ${ALL_CLASSES.filter(c => c !== data.classId).map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button onclick="window.transferStudent('${data.id}')"
                        style="background:var(--navy); color:#fff; border:none; padding:8px 14px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:13px;">نقل</button>
                </div>
            </div>
        </div>

        <div class="card" style="border-right:5px solid var(--danger-color);">
            <h4 style="font-size:14px; color:var(--danger-color); margin-bottom:8px;"><i class="bi bi-calendar-x"></i> سجل الغياب والتأخير فقط</h4>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead><tr style="background:#f8fafc;"><th style="padding:8px;">التاريخ</th><th style="padding:8px;">الحالة</th><th style="padding:8px;">الحصة</th><th style="padding:8px;">سجّلها</th></tr></thead>
                <tbody id="profile-table-attendance"><tr><td colspan="4" style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>

        <div class="card" style="border-right:5px solid var(--gold);">
            <h4 style="font-size:14px; color:var(--gold); margin-bottom:8px;"><i class="bi bi-shield-slash"></i> السجل السلوكي</h4>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead><tr style="background:#f8fafc;"><th style="padding:8px;">التاريخ</th><th style="padding:8px;">النوع</th><th style="padding:8px;">التفاصيل</th><th style="padding:8px;">الإجراء</th></tr></thead>
                <tbody id="profile-table-behavior"><tr><td colspan="4" style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>

        <div class="card" style="border-right:5px solid var(--success-color);">
            <h4 style="font-size:14px; color:var(--success-color); margin-bottom:8px;"><i class="bi bi-ticket-detailed"></i> الاستئذان</h4>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead><tr style="background:#f8fafc;"><th style="padding:8px;">التاريخ</th><th style="padding:8px;">السبب</th><th style="padding:8px;">المستلم</th><th style="padding:8px;">الحالة</th></tr></thead>
                <tbody id="profile-table-gatepass"><tr><td colspan="4" style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>

        <div class="card" style="border-right:5px solid var(--sky);">
            <h4 style="font-size:14px; color:var(--sky); margin-bottom:8px;"><i class="bi bi-heart-pulse"></i> زيارات العيادة</h4>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead><tr style="background:#f8fafc;"><th style="padding:8px;">التاريخ</th><th style="padding:8px;">الشكوى</th><th style="padding:8px;">العلاج</th></tr></thead>
                <tbody id="profile-table-clinic"><tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>
    `;

    loadStudentHistory(data.name.trim());
};

// ===== جلب سجلات السلوك/الاستئذان/العيادة للطالب المختار =====
async function loadStudentHistory(studentName) {
    const schoolId = getActiveSchoolId();

    // أ) الغياب والتأخير فقط (بدون حضور)
    try {
        const qAtt = query(collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('studentName', '==', studentName),
            where('status', 'in', ['absent', 'late']));
        // ══ جلب كل بيانات الطالب بالتوازي ══
        const [snapAtt, snapBeh, snapGate, snapClinic] = await Promise.all([getDocs(qAtt),
        let hAtt = '';
        const docs = snapAtt.docs.sort((a,b) => (b.data().dateStr||'').localeCompare(a.data().dateStr||''));
        docs.forEach(docSnap => {
            const d = docSnap.data();
            const isAbsent = d.status === 'absent';
            const badge = isAbsent
                ? 'background:var(--danger-color); color:#fff;'
                : 'background:var(--accent-color); color:#fff;';
            hAtt += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${d.dateStr || d.date || '-'}</td>
                <td style="padding:8px;"><span style="padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; ${badge}">${isAbsent ? 'غائب' : 'متأخر'}</span></td>
                <td style="padding:8px; text-align:center;">الحصة ${d.period || '-'}</td>
                <td style="padding:8px; color:#666;">${d.teacherName || d.recordedBy || '-'}</td>
            </tr>`;
        });
        document.getElementById('profile-table-attendance').innerHTML = hAtt ||
            `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--success-color); font-weight:bold;">✅ لا يوجد غياب أو تأخير مسجّل.</td></tr>`;
    } catch(e) {
        document.getElementById('profile-table-attendance').innerHTML =
            `<tr><td colspan="4" style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`;
    }

    // ب) السلوك
    try {
        const qBeh = query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
            getDocs(qBeh),
        let hBeh = '';
        snapBeh.forEach(docSnap => {
            const d = docSnap.data();
            const badgeColor = d.type === 'سلبي' ? 'background:var(--danger-color);' : (d.type === 'إيجابي' ? 'background:var(--success-color);' : 'background:#94a3b8;');
            hBeh += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${d.dateStr || d.date || '-'}</td>
                <td style="padding:8px;"><span style="color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; ${badgeColor}">${d.type || '—'}</span></td>
                <td style="padding:8px;">${d.notes || d.details || '-'}</td>
                <td style="padding:8px; font-weight:bold;">${d.action || '-'}</td>
            </tr>`;
        });
        document.getElementById('profile-table-behavior').innerHTML = hBeh ||
            `<tr><td colspan="4" style="text-align:center; padding:15px; color:#999;">✅ السجل السلوكي نظيف.</td></tr>`;
    } catch(e) {
        document.getElementById('profile-table-behavior').innerHTML =
            `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`;
    }

    // ج) الاستئذان
    try {
        const qGate = query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
            getDocs(qGate),
        let hGate = '';
        snapGate.forEach(docSnap => {
            const d = docSnap.data();
            hGate += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${d.dateStr || '-'}</td>
                <td style="padding:8px;">${d.reason || '-'}</td>
                <td style="padding:8px;">${d.relative || '-'} (${d.relation || '-'})</td>
                <td style="padding:8px;"><span style="padding:2px 6px; border-radius:4px; font-size:11px; ${d.status==='exited'?'background:var(--success-color);':'background:var(--accent-color);'} color:#fff;">${d.status==='exited'?'غادر ✅':'معلّق ⏳'}</span></td>
            </tr>`;
        });
        document.getElementById('profile-table-gatepass').innerHTML = hGate ||
            `<tr><td colspan="4" style="text-align:center; padding:15px; color:#999;">💡 لا توجد استئذانات.</td></tr>`;
    } catch(e) {
        document.getElementById('profile-table-gatepass').innerHTML =
            `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`;
    }

    // د) زيارات العيادة
    try {
        const qClinic = query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
            getDocs(qClinic)]);

        let hClinic = '';
        snapClinic.forEach(docSnap => {
            const d = docSnap.data();
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('ar-KW') : (d.dateStr || '-');
            hClinic += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${dateStr}</td>
                <td style="padding:8px; font-weight:bold; color:var(--danger-color);">${d.complaint || '-'}</td>
                <td style="padding:8px;">${d.treatment || '-'}</td>
            </tr>`;
        });
        document.getElementById('profile-table-clinic').innerHTML = hClinic ||
            `<tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">💡 لا توجد زيارات عيادة.</td></tr>`;
    } catch(e) {
        document.getElementById('profile-table-clinic').innerHTML =
            `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`;
    }
}

// ===== نقل الطالب لفصل جديد =====
window.transferStudent = async function(docId) {
    const newClassInput = document.getElementById(`new-class-${docId}`).value.trim();
    if (!newClassInput) return window.showToast('⚠️ يرجى اختيار الفصل الجديد من القائمة');

    if (!confirm(`هل أنت متأكد من نقل الطالب إلى فصل ${newClassInput}؟`)) return;

    try {
        await updateDoc(doc(db, 'students', docId), { classId: newClassInput });
        document.getElementById(`class-display-${docId}`).textContent = newClassInput;
        window.showToast('✅ تم نقل الطالب بنجاح.');

        // إعادة تحميل قائمة الفصل الحالي (الطالب انتقل فخرج من القائمة)
        const currentClass = document.getElementById('st-select-class').value;
        window.loadClassStudentsList(currentClass);
        document.getElementById('student-results-container').innerHTML = '';

    } catch (error) {
        window.showToast('❌ فشلت عملية النقل: ' + error.message);
    }
};

// ===== التواصل مع ولي الأمر =====
window.contactParent = function(phone, studentName) {
    if (!phone) return window.showToast('⚠️ رقم هاتف ولي الأمر غير مسجل في النظام.');

    const user = JSON.parse(localStorage.getItem('hs_user'));
    const msg = `مرحباً ولي أمر الطالب *${studentName}*،\nتتواصل معكم إدارة *${user?.schoolName || 'المدرسة'}* بخصوص مستوى الطالب وحضوره.\n\n_المنظومة الرقمية الشاملة_`;

    let formattedPhone = phone.startsWith('965') ? phone : '965' + phone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ===== تصدير ملف الطالب PDF =====
window.exportStudentProfilePDF = async function(studentName, classId, parentPhone) {
    const container = document.getElementById('student-results-container');
    if (!container) return;

    const tables = container.querySelectorAll('.card');
    let contentHTML = `
    <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <div style="font-size:16px; font-weight:900; color:#0b2545;">${studentName}</div>
            <div style="font-size:12px; color:#666; margin-top:2px;">الفصل: ${classId} &nbsp;|&nbsp; هاتف ولي الأمر: ${parentPhone || 'غير مسجل'}</div>
        </div>
        <div style="font-size:24px;">👤</div>
    </div>`;

    // نسخ محتوى الكروت مباشرة
    tables.forEach(card => {
        const h4 = card.querySelector('h4');
        const table = card.querySelector('table');
        if (h4 && table) {
            contentHTML += `<div class="section-title">${h4.textContent}</div>`;
            // إعادة بناء الجدول بستايل الطباعة
            const headers = [...table.querySelectorAll('th')].map(th => th.textContent);
            const rows = [...table.querySelectorAll('tbody tr')].map(tr =>
                [...tr.querySelectorAll('td')].map(td => td.textContent.trim())
            );
            if (rows.length === 0) {
                contentHTML += `<p style="color:#666; font-size:12px; padding:8px 0;">لا توجد سجلات.</p>`;
            } else {
                contentHTML += `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
            }
        }
    });

    await window.ManzoumaReport.exportPDF(
        contentHTML,
        `ملف_الطالب_${studentName.replace(/ /g,'_')}`,
        `ملف الطالب الشامل`,
        `${studentName} — الفصل ${classId}`
    );
};

// ===== طباعة مباشرة =====
window.printStudentProfileDirect = function(studentName, classId) {
    const container = document.getElementById('student-results-container');
    if (!container) return;

    const tables = container.querySelectorAll('.card');
    let contentHTML = `<div style="font-size:16px; font-weight:900; margin-bottom:16px; color:#0b2545;">الطالب: ${studentName} — الفصل: ${classId}</div>`;
    tables.forEach(card => {
        const h4 = card.querySelector('h4');
        const table = card.querySelector('table');
        if (h4 && table) {
            const headers = [...table.querySelectorAll('th')].map(th => th.textContent);
            const rows = [...table.querySelectorAll('tbody tr')].map(tr =>
                [...tr.querySelectorAll('td')].map(td => td.textContent.trim())
            );
            contentHTML += `<div class="section-title">${h4.textContent}</div>`;
            contentHTML += `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.length ? rows.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}" style="text-align:center;color:#999;">لا توجد سجلات</td></tr>`}</tbody></table>`;
        }
    });

    window.ManzoumaReport.printDirect(contentHTML, 'ملف الطالب الشامل', `${studentName} — الفصل ${classId}`);
};
