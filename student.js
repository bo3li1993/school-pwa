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
        <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid var(--line); border-right:4px solid var(--sky); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom:14px;">
            <div>
                <h3 style="margin:0 0 6px; color:var(--navy); font-weight:900; font-size:17px;">${data.name}</h3>
                <span style="background:var(--ice); color:var(--sky); padding:4px 10px; border-radius:6px; font-size:13px; font-weight:700;">
                    فصل: <span id="class-display-${data.id}">${data.classId}</span>
                </span>
                <span style="color:var(--mid); font-size:13px; margin-right:10px;">
                    <i class="bi bi-telephone-fill"></i> ${data.parentPhone || 'غير مسجل'}
                </span>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button onclick="window.contactParent('${data.parentPhone||''}', '${data.name}')"
                    style="background:#25d366; color:#fff; border:none; padding:9px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-family:'Cairo';">
                    <i class="bi bi-whatsapp"></i> مراسلة
                </button>

                <div style="display:flex; align-items:center; gap:0; border:1.5px solid var(--line); border-radius:8px; overflow:hidden;">
                    <select id="new-class-${data.id}" class="st-input" style="border:none; border-radius:0; min-width:100px;">
                        <option value="">نقل لفصل...</option>
                        ${ALL_CLASSES.filter(c => c !== data.classId).map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button onclick="window.transferStudent('${data.id}')"
                        style="background:var(--navy); color:#fff; border:none; padding:9px 16px; font-weight:700; cursor:pointer; font-family:'Cairo';">
                        نقل
                    </button>
                </div>
            </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
            <h3 style="font-size:14px;"><i class="bi bi-calendar-x" style="color:var(--danger-color);"></i> سجل الحضور والغياب</h3>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <tbody id="profile-table-attendance"><tr><td style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>

        <div class="card" style="margin-bottom:14px;">
            <h3 style="font-size:14px;"><i class="bi bi-shield-exclamation" style="color:var(--accent-color);"></i> السجل السلوكي</h3>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <tbody id="profile-table-behavior"><tr><td style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>

        <div class="card" style="margin-bottom:14px;">
            <h3 style="font-size:14px;"><i class="bi bi-door-open" style="color:var(--sky);"></i> سجل الاستئذان وبوابة الأمن</h3>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <tbody id="profile-table-gatepass"><tr><td style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>

        <div class="card">
            <h3 style="font-size:14px;"><i class="bi bi-heart-pulse" style="color:var(--danger-color);"></i> سجل زيارات العيادة</h3>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
                <tbody id="profile-table-clinic"><tr><td style="text-align:center; padding:15px; color:#999;">🔍 جاري الفحص...</td></tr></tbody>
            </table></div>
        </div>
    `;

    loadStudentHistory(data.name.trim());
};

// ===== جلب سجلات الحضور/السلوك/الاستئذان للطالب المختار =====
async function loadStudentHistory(studentName) {
    const schoolId = getActiveSchoolId();

    // أ) الحضور والغياب
    try {
        const qAtt = query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
        const snapAtt = await getDocs(qAtt);
        let hAtt = '';
        snapAtt.forEach(docSnap => {
            const d = docSnap.data();
            const badgeColor = d.status === 'absent' ? 'background:var(--danger-color);' : (d.status === 'late' ? 'background:var(--accent-color);' : 'background:var(--success-color);');
            const statusText = d.status === 'absent' ? 'غياب' : (d.status === 'late' ? 'تأخير' : 'حضور');
            hAtt += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">🕒 ${d.date || d.dateStr || '-'}</td>
                <td style="padding:8px;"><span style="color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; ${badgeColor}">${statusText}</span></td>
                <td style="padding:8px; font-weight:bold;">الحصة: ${d.period || 'غير محددة'}</td>
                <td style="padding:8px; color:#666;">${d.teacherName || d.recordedBy || '-'}</td>
            </tr>`;
        });
        document.getElementById('profile-table-attendance').innerHTML = hAtt || `<tr><td style="text-align:center; padding:15px; color:#999;">✨ سجل الطالب ممتاز، لا توجد حالات غياب مرصودة.</td></tr>`;
    } catch(e) { document.getElementById('profile-table-attendance').innerHTML = `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`; }

    // ب) السلوك
    try {
        const qBeh = query(collection(db, 'behavior'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
        const snapBeh = await getDocs(qBeh);
        let hBeh = '';
        snapBeh.forEach(docSnap => {
            const d = docSnap.data();
            const badgeColor = d.type === 'سلبي' ? 'background:var(--danger-color);' : (d.type === 'إيجابي' ? 'background:var(--success-color);' : 'background:#94a3b8;');
            hBeh += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">🕒 ${d.dateStr || d.date || '-'}</td>
                <td style="padding:8px;"><span style="color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; ${badgeColor}">${d.type || '—'}</span></td>
                <td style="padding:8px;">${d.notes || d.details || '-'}</td>
                <td style="padding:8px; color:var(--hover-color); font-weight:bold;">${d.action || '-'}</td>
            </tr>`;
        });
        document.getElementById('profile-table-behavior').innerHTML = hBeh || `<tr><td style="text-align:center; padding:15px; color:#999;">✅ السجل السلوكي نظيف تماماً.</td></tr>`;
    } catch(e) { document.getElementById('profile-table-behavior').innerHTML = `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`; }

    // ج) الاستئذان
    try {
        const qGate = query(collection(db, 'gatepass'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
        const snapGate = await getDocs(qGate);
        let hGate = '';
        snapGate.forEach(docSnap => {
            const d = docSnap.data();
            const statusBadge = d.status === 'exited' ? 'background:var(--success-color); color:#fff;' : 'background:var(--accent-color); color:#fff;';
            const statusText = d.status === 'exited' ? 'غادر المدرسة رسميًا ✅' : 'مأذون له / معلق عند الباب ⏳';
            hGate += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">🕒 ${d.dateStr || '-'}</td>
                <td style="padding:8px;">${d.relative || '-'}</td>
                <td style="padding:8px;">${d.relation || '-'}</td>
                <td style="padding:8px;">${d.reason || '-'}</td>
                <td style="padding:8px;"><span style="padding:2px 6px; border-radius:4px; font-size:11px; ${statusBadge}">${statusText}</span></td>
            </tr>`;
        });
        document.getElementById('profile-table-gatepass').innerHTML = hGate || `<tr><td style="text-align:center; padding:15px; color:#999;">💡 لم يتم رصد أي استئذانات سابقة.</td></tr>`;
    } catch(e) { document.getElementById('profile-table-gatepass').innerHTML = `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`; }

    // د) زيارات العيادة
    try {
        const qClinic = query(collection(db, 'clinic'), where('schoolId', '==', schoolId), where('studentName', '==', studentName));
        const snapClinic = await getDocs(qClinic);
        let hClinic = '';
        snapClinic.forEach(docSnap => {
            const d = docSnap.data();
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('ar-KW') : (d.dateStr || '-');
            hClinic += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">🕒 ${dateStr}</td>
                <td style="padding:8px; font-weight:bold; color:var(--danger-color);">${d.complaint || '-'}</td>
                <td style="padding:8px;">${d.treatment || '-'}</td>
            </tr>`;
        });
        document.getElementById('profile-table-clinic').innerHTML = hClinic || `<tr><td style="text-align:center; padding:15px; color:#999;">💡 لا توجد زيارات سابقة للعيادة.</td></tr>`;
    } catch(e) { document.getElementById('profile-table-clinic').innerHTML = `<tr><td style="padding:8px; color:red;">خطأ: ${e.message}</td></tr>`; }
}

// ===== نقل الطالب لفصل جديد =====
window.transferStudent = async function(docId) {
    const newClassInput = document.getElementById(`new-class-${docId}`).value.trim();
    if (!newClassInput) return alert('⚠️ يرجى اختيار الفصل الجديد من القائمة');

    if (!confirm(`هل أنت متأكد من نقل الطالب إلى فصل ${newClassInput}؟`)) return;

    try {
        await updateDoc(doc(db, 'students', docId), { classId: newClassInput });
        document.getElementById(`class-display-${docId}`).textContent = newClassInput;
        alert('✅ تم نقل الطالب بنجاح.');

        // إعادة تحميل قائمة الفصل الحالي (الطالب انتقل فخرج من القائمة)
        const currentClass = document.getElementById('st-select-class').value;
        window.loadClassStudentsList(currentClass);
        document.getElementById('student-results-container').innerHTML = '';

    } catch (error) {
        alert('❌ فشلت عملية النقل: ' + error.message);
    }
};

// ===== التواصل مع ولي الأمر =====
window.contactParent = function(phone, studentName) {
    if (!phone) return alert('⚠️ رقم هاتف ولي الأمر غير مسجل في النظام.');

    const user = JSON.parse(localStorage.getItem('hs_user'));
    const msg = `مرحباً ولي أمر الطالب *${studentName}*،\nتتواصل معكم إدارة *${user?.schoolName || 'المدرسة'}* بخصوص مستوى الطالب وحضوره.\n\n_المنظومة الرقمية الشاملة_`;

    let formattedPhone = phone.startsWith('965') ? phone : '965' + phone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
};
