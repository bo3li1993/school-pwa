import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let localStudentsMap = {};
let allClassesCache = [];
let currentClassStudents = [];
let allStudentsCache = [];
let filteredStudents = [];
let currentPage = 1;
const PAGE_SIZE = 20;

export async function initStudentsManageModule() {
    const container = document.getElementById('tab-students-manage');
    if (!container) return;

    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    container.innerHTML = `
    <!-- ===== جدول الطلاب الكامل ===== -->
    <div class="card" style="border-top:5px solid var(--navy); padding:0; overflow:hidden;">
        <div style="padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--line);">
            <h2 style="margin:0; font-size:17px;"><i class="bi bi-people-fill" style="color:var(--gold);"></i> قائمة الطلاب</h2>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="window.exportStudentsExcel()" style="background:#16a34a;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-file-earmark-excel-fill"></i> Excel</button>
                <button onclick="window.exportStudentsPDF()" style="background:#dc2626;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-file-earmark-pdf-fill"></i> PDF</button>
                <button onclick="window.openAddStudentModal()" style="background:var(--sky);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-person-plus-fill"></i> إضافة طالب</button>
            </div>
        </div>

        <!-- فلاتر البحث -->
        <div style="padding:14px 20px; background:#f8fafc; border-bottom:1px solid var(--line); display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="st-search" placeholder="🔍 بحث بالاسم أو الرقم المدني..." onInput="window.applyStudentFilters()" style="flex:1;min-width:180px;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:600;outline:none;">
            <select id="st-filter-class" onchange="window.applyStudentFilters()" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;outline:none;background:#fff;">
                <option value="">كل الفصول</option>
            </select>
            <span id="st-count-badge" style="background:var(--ice);color:var(--sky);padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;white-space:nowrap;">0 طالب</span>
        </div>

        <!-- الجدول -->
        <div style="overflow-x:auto;">
            <table id="st-table" style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                    <tr style="background:var(--navy);color:#fff;text-align:right;">
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">#</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">الاسم</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">الصف</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">الرقم المدني</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">هاتف ولي الأمر</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">إجراءات</th>
                    </tr>
                </thead>
                <tbody id="st-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:40px;color:#999;font-weight:700;">⏳ جاري تحميل البيانات...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- ترقيم الصفحات -->
        <div id="st-pagination" style="padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);background:#f8fafc;">
            <div id="st-page-info" style="font-size:13px;font-weight:700;color:var(--mid);"></div>
            <div id="st-page-btns" style="display:flex;gap:6px;"></div>
        </div>
    </div>

    <!-- ===== ملف الطالب الفردي ===== -->
    <div class="card" style="border-top:5px solid var(--sky); margin-top:16px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--gold);"></i> ملف الطالب الفردي</h2>
        <p style="font-size:12px;color:#666;margin-bottom:15px;font-weight:bold;">🔍 حدد الصف ثم اختر الطالب للاطلاع على كافة سجلاته.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:15px;">
            <div>
                <label style="font-weight:700;font-size:12px;color:#444;">الصف الدراسي:</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)" style="width:100%;padding:10px;">
                    <option value="">-- جاري سحب الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700;font-size:12px;color:#444;">اسم الطالب:</label>
                <select id="prof-student-select" disabled style="width:100%;padding:10px;">
                    <option value="">-- بانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="window.triggerStudentProfileFetch()" style="flex:1;background:var(--navy);font-weight:900;padding:14px;border-radius:8px;border:none;color:#fff;cursor:pointer;"><i class="bi bi-search"></i> جلب السجل التاريخي الكامل</button>
            <button onclick="window.resetStudentDashboardLiveView()" id="btn-student-reset" style="background:#7f8c8d;border-radius:8px;border:none;color:#fff;padding:0 20px;display:none;"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
    </div>
    <div id="student-profile-display-area"></div>

    <!-- ===== الإدارة الجماعية ===== -->
    <div class="card" style="border-top:5px solid var(--sky);margin-top:16px;">
        <h2><i class="bi bi-list-check" style="color:var(--sky);"></i> إدارة جماعية (نقل / تحديد متعدد)</h2>
        <p style="font-size:12px;color:#666;margin-bottom:15px;font-weight:bold;">اختر الفصل لعرض كل طلابه، حدد من تريد نقلهم، ثم اختر الفصل الجديد.</p>
        <div style="margin-bottom:15px;">
            <label style="font-weight:700;font-size:12px;color:#444;">اعرض طلاب الفصل:</label>
            <select id="bulk-class-select" onchange="window.loadBulkClassStudents(this.value)" style="width:100%;padding:10px;">
                <option value="">-- اختر الفصل --</option>
            </select>
        </div>
        <div id="bulk-students-list" style="margin-bottom:14px;">
            <p style="text-align:center;color:#999;padding:20px;font-weight:700;">👆 اختر فصلاً لعرض طلابه</p>
        </div>
        <div id="bulk-actions-bar" style="display:none;gap:10px;align-items:center;flex-wrap:wrap;background:#f8fafc;padding:14px;border-radius:10px;">
            <span id="bulk-selected-count" style="font-weight:900;color:var(--sky);font-size:14px;">0 طالب محدد</span>
            <select id="bulk-target-class" style="padding:9px;border-radius:8px;border:1px solid var(--line);flex:1;min-width:150px;">
                <option value="">-- انقل إلى فصل --</option>
            </select>
            <button onclick="window.executeBulkTransfer()" style="background:var(--sky);color:#fff;border:none;padding:9px 18px;border-radius:8px;font-weight:700;cursor:pointer;"><i class="bi bi-arrow-left-right"></i> نقل المحدد</button>
        </div>
    </div>

    ${isAdmin ? `
    <!-- ===== منطقة الخطر ===== -->
    <div class="card" style="border-top:5px solid var(--red);margin-top:16px;">
        <h2><i class="bi bi-exclamation-octagon-fill" style="color:var(--red);"></i> منطقة الخطر — حذف جميع الطلاب</h2>
        <p style="font-size:12px;color:#666;margin-bottom:12px;font-weight:bold;">سيتم نقل جميع طلاب المدرسة لأرشيف "المحذوفين" (قابل للاسترجاع). سجلات الغياب والسلوك تبقى محفوظة.</p>
        <button onclick="window.openDeleteAllModal()" style="background:var(--red);color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:900;cursor:pointer;"><i class="bi bi-trash3-fill"></i> حذف جميع طلاب المدرسة</button>
    </div>
    <div id="delete-all-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:90%;direction:rtl;">
            <h3 style="color:var(--red);font-weight:900;margin-bottom:10px;"><i class="bi bi-exclamation-triangle-fill"></i> تأكيد حذف جميع الطلاب</h3>
            <p style="font-size:13px;color:#666;margin-bottom:14px;">هذا الإجراء سينقل <b id="delete-all-count">0</b> طالب لأرشيف المحذوفين. للمتابعة، اكتب اسم مدرستك: <b id="delete-all-school-name" style="color:var(--red);"></b></p>
            <input type="text" id="delete-all-confirm-input" placeholder="اكتب اسم المدرسة هنا" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:8px;margin-bottom:14px;box-sizing:border-box;">
            <div style="display:flex;gap:8px;">
                <button onclick="window.executeDeleteAllStudents()" style="flex:1;background:var(--red);color:#fff;border:none;padding:11px;border-radius:8px;font-weight:700;cursor:pointer;">تأكيد الحذف</button>
                <button onclick="window.closeDeleteAllModal()" style="background:#fff;color:var(--mid);border:1.5px solid var(--line);padding:11px 18px;border-radius:8px;font-weight:700;cursor:pointer;">إلغاء</button>
            </div>
        </div>
    </div>` : ''}

    <!-- ===== Modal إضافة/تعديل طالب ===== -->
    <div id="student-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:16px;padding:28px;max-width:460px;width:92%;direction:rtl;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h3 id="student-modal-title" style="font-weight:900;font-size:17px;color:var(--navy);margin:0;">إضافة طالب</h3>
                <button onclick="window.closeStudentModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">✕</button>
            </div>
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">الاسم الكامل *</label>
            <input id="sm-name" type="text" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:12px;box-sizing:border-box;">
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">الصف الدراسي *</label>
            <select id="sm-class" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:12px;">
                <option value="">-- اختر الصف --</option>
            </select>
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">الرقم المدني</label>
            <input id="sm-civil" type="text" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:12px;box-sizing:border-box;">
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">هاتف ولي الأمر</label>
            <input id="sm-phone" type="tel" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:18px;box-sizing:border-box;">
            <input type="hidden" id="sm-doc-id">
            <button onclick="window.saveStudentModal()" style="width:100%;background:var(--sky);color:#fff;border:none;padding:13px;border-radius:8px;font-family:Cairo;font-weight:900;font-size:15px;cursor:pointer;"><i class="bi bi-check-circle-fill"></i> حفظ</button>
        </div>
    </div>
    `;

    await loadAllStudents();
}

// ===== تحميل كل الطلاب =====
async function loadAllStudents() {
    const schoolId = getActiveSchoolId();
    try {
        const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        allStudentsCache = [];
        let classesSet = new Set();

        snap.forEach(d => {
            const data = d.data();
            allStudentsCache.push({ id: d.id, ...data });
            if (data.classId) classesSet.add(data.classId.trim());
        });

        allStudentsCache.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        allClassesCache = Array.from(classesSet).sort((a, b) => a.localeCompare(b));

        // تعبئة فلتر الفصول
        const classOpts = '<option value="">كل الفصول</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('st-filter-class').innerHTML = classOpts;

        // تعبئة dropdown ملف الطالب والإدارة الجماعية
        const classOptsSelect = '<option value="">-- الرجاء اختيار الصف --</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('prof-class-select').innerHTML = classOptsSelect;
        document.getElementById('bulk-class-select').innerHTML = classOptsSelect;
        document.getElementById('sm-class').innerHTML = '<option value="">-- اختر الصف --</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');

        filteredStudents = [...allStudentsCache];
        currentPage = 1;
        renderStudentTable();
    } catch (e) {
        document.getElementById('st-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc2626;">❌ خطأ: ${e.message}</td></tr>`;
    }
}

// ===== تطبيق الفلاتر =====
window.applyStudentFilters = function() {
    const search = document.getElementById('st-search').value.trim().toLowerCase();
    const classFilter = document.getElementById('st-filter-class').value;

    filteredStudents = allStudentsCache.filter(s => {
        const matchSearch = !search || (s.name || '').toLowerCase().includes(search) || (s.civilId || '').includes(search);
        const matchClass = !classFilter || s.classId === classFilter;
        return matchSearch && matchClass;
    });

    currentPage = 1;
    renderStudentTable();
};

// ===== رسم الجدول =====
function renderStudentTable() {
    const tbody = document.getElementById('st-tbody');
    const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredStudents.slice(start, start + PAGE_SIZE);

    // badge العداد
    document.getElementById('st-count-badge').textContent = `${filteredStudents.length} طالب`;

    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;font-weight:700;">لا توجد نتائج</td></tr>`;
        document.getElementById('st-page-info').textContent = '';
        document.getElementById('st-page-btns').innerHTML = '';
        return;
    }

    tbody.innerHTML = pageData.map((s, i) => `
        <tr style="border-bottom:1px solid #f0f0f0;${i % 2 === 0 ? '' : 'background:#fafbfc;'}">
            <td style="padding:10px 14px;color:var(--mid);font-size:12px;font-weight:700;">${start + i + 1}</td>
            <td style="padding:10px 14px;font-weight:700;">${s.name || '-'}</td>
            <td style="padding:10px 14px;"><span style="background:var(--ice);color:var(--sky);padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${s.classId || '-'}</span></td>
            <td style="padding:10px 14px;font-size:13px;color:var(--mid);">${s.civilId || '-'}</td>
            <td style="padding:10px 14px;font-size:13px;">${s.parentPhone || '-'}</td>
            <td style="padding:10px 14px;">
                <div style="display:flex;gap:6px;">
                    <button onclick="window.openEditStudentModal('${s.id}')" style="background:var(--sky);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-family:Cairo;font-size:12px;font-weight:700;cursor:pointer;"><i class="bi bi-pencil-fill"></i> تعديل</button>
                    <button onclick="window.deleteStudent('${s.id}','${(s.name||'').replace(/'/g,"\\'")}') " style="background:#fee2e2;color:#dc2626;border:none;padding:5px 12px;border-radius:6px;font-family:Cairo;font-size:12px;font-weight:700;cursor:pointer;"><i class="bi bi-trash3"></i></button>
                </div>
            </td>
        </tr>`).join('');

    // معلومات الصفحة
    document.getElementById('st-page-info').textContent = `عرض ${start + 1} - ${Math.min(start + PAGE_SIZE, filteredStudents.length)} من ${filteredStudents.length}`;

    // أزرار التنقل
    let btns = '';
    if (currentPage > 1) btns += `<button onclick="window.goStudentPage(${currentPage - 1})" style="${paginBtnStyle()}"><i class="bi bi-chevron-right"></i></button>`;
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
        btns += `<button onclick="window.goStudentPage(${p})" style="${paginBtnStyle(p === currentPage)}">${p}</button>`;
    }
    if (currentPage < totalPages) btns += `<button onclick="window.goStudentPage(${currentPage + 1})" style="${paginBtnStyle()}"><i class="bi bi-chevron-left"></i></button>`;
    document.getElementById('st-page-btns').innerHTML = btns;
}

function paginBtnStyle(active = false) {
    return `padding:6px 12px;border:1.5px solid ${active ? 'var(--sky)' : 'var(--line)'};border-radius:7px;font-family:Cairo;font-size:13px;font-weight:700;cursor:pointer;background:${active ? 'var(--sky)' : '#fff'};color:${active ? '#fff' : 'var(--mid)'};`;
}

window.goStudentPage = function(page) {
    currentPage = page;
    renderStudentTable();
    document.getElementById('tab-students-manage').scrollIntoView({ behavior: 'smooth' });
};

// ===== Modal إضافة/تعديل =====
window.openAddStudentModal = function() {
    document.getElementById('student-modal-title').textContent = 'إضافة طالب جديد';
    document.getElementById('sm-name').value = '';
    document.getElementById('sm-class').value = '';
    document.getElementById('sm-civil').value = '';
    document.getElementById('sm-phone').value = '';
    document.getElementById('sm-doc-id').value = '';
    document.getElementById('student-modal').style.display = 'flex';
};

window.openEditStudentModal = function(docId) {
    const s = allStudentsCache.find(x => x.id === docId);
    if (!s) return;
    document.getElementById('student-modal-title').textContent = 'تعديل بيانات الطالب';
    document.getElementById('sm-name').value = s.name || '';
    document.getElementById('sm-class').value = s.classId || '';
    document.getElementById('sm-civil').value = s.civilId || '';
    document.getElementById('sm-phone').value = s.parentPhone || '';
    document.getElementById('sm-doc-id').value = docId;
    document.getElementById('student-modal').style.display = 'flex';
};

window.closeStudentModal = function() {
    document.getElementById('student-modal').style.display = 'none';
};

window.saveStudentModal = async function() {
    const name = document.getElementById('sm-name').value.trim();
    const classId = document.getElementById('sm-class').value.trim();
    const civilId = document.getElementById('sm-civil').value.trim();
    const parentPhone = document.getElementById('sm-phone').value.trim();
    const docId = document.getElementById('sm-doc-id').value;

    if (!name || !classId) { window.showToast('الاسم والصف مطلوبان', 'error'); return; }

    const schoolId = getActiveSchoolId();
    const data = { name, classId, civilId, parentPhone, schoolId };

    try {
        if (docId) {
            await updateDoc(doc(db, 'students', docId), data);
            const idx = allStudentsCache.findIndex(x => x.id === docId);
            if (idx !== -1) allStudentsCache[idx] = { id: docId, ...data };
            window.showToast('✅ تم تعديل بيانات الطالب');
        } else {
            const ref = await addDoc(collection(db, 'students'), { ...data, createdAt: serverTimestamp() });
            allStudentsCache.push({ id: ref.id, ...data });
            // تحديث الفصول لو جديد
            if (!allClassesCache.includes(classId)) {
                allClassesCache.push(classId);
                allClassesCache.sort((a, b) => a.localeCompare(b));
                const newOpts = '<option value="">كل الفصول</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');
                document.getElementById('st-filter-class').innerHTML = newOpts;
            }
            window.showToast('✅ تم إضافة الطالب بنجاح');
        }
        window.closeStudentModal();
        allStudentsCache.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        window.applyStudentFilters();
    } catch (e) { window.showToast('❌ خطأ: ' + e.message, 'error'); }
};

window.deleteStudent = async function(docId, name) {
    if (!confirm(`حذف الطالب "${name}" من القائمة؟`)) return;
    try {
        await deleteDoc(doc(db, 'students', docId));
        allStudentsCache = allStudentsCache.filter(x => x.id !== docId);
        window.applyStudentFilters();
        window.showToast('✅ تم حذف الطالب');
    } catch (e) { window.showToast('❌ خطأ: ' + e.message, 'error'); }
};

// ===== Export Excel =====
window.exportStudentsExcel = function() {
    const data = filteredStudents.map((s, i) => ({
        '#': i + 1,
        'الاسم': s.name || '',
        'الصف': s.classId || '',
        'الرقم المدني': s.civilId || '',
        'هاتف ولي الأمر': s.parentPhone || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data, { header: ['#', 'الاسم', 'الصف', 'الرقم المدني', 'هاتف ولي الأمر'] });
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
    XLSX.writeFile(wb, `قائمة_الطلاب_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.showToast('✅ تم تصدير Excel بنجاح');
};

// ===== Export PDF =====
window.exportStudentsPDF = function() {
    const classFilter = document.getElementById('st-filter-class').value;
    const subtitle = classFilter ? `الصف: ${classFilter}` : `إجمالي الطلاب: ${filteredStudents.length}`;
    const rows = filteredStudents.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td style="font-weight:700;">${s.name || '-'}</td>
            <td>${s.classId || '-'}</td>
            <td>${s.civilId || '-'}</td>
            <td>${s.parentPhone || '-'}</td>
        </tr>`).join('');
    const html = `
        <table>
            <thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>الرقم المدني</th><th>هاتف ولي الأمر</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    window.ManzoumaReport.printDirect(html, 'قائمة الطلاب', subtitle);
};

// ===== ملف الطالب الفردي =====
window.handleStudentClassChange = async function(classId) {
    const studentSelect = document.getElementById('prof-student-select');
    if (!studentSelect) return;
    if (!classId) { studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>'; studentSelect.disabled = true; return; }
    studentSelect.innerHTML = '<option value="">⏳ جاري سحب الأسماء...</option>';
    studentSelect.disabled = true;
    localStudentsMap = {};
    const schoolId = getActiveSchoolId();
    try {
        const snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId)));
        let list = [];
        snap.forEach(d => { const data = d.data(); if (data.name) { const n = data.name.trim(); list.push(n); localStudentsMap[n] = { id: d.id, ...data }; } });
        list.sort((a, b) => a.localeCompare(b, 'ar'));
        studentSelect.innerHTML = list.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : '<option value="">-- اختر الطالب --</option>' + list.map(n => `<option value="${n}">${n}</option>`).join('');
        studentSelect.disabled = list.length === 0;
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
    displayArea.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:#999;font-weight:700;">⏳ جاري تحميل السجل الكامل...</div>`;
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
        <div class="card" style="border-right:5px solid var(--sky);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="margin:0 0 4px;font-size:16px;">👤 ${name}</h3>
                <span style="background:var(--ice);color:var(--sky);padding:3px 10px;border-radius:6px;font-size:13px;font-weight:700;">الفصل: ${student.classId || '-'}</span>
                <span style="color:var(--mid);font-size:13px;margin-right:8px;"><i class="bi bi-telephone-fill"></i> ${student.parentPhone || 'غير مسجل'}</span>
            </div>
            <div style="display:flex;gap:10px;">
                <div style="text-align:center;background:#fef2f2;padding:8px 14px;border-radius:8px;"><div style="font-size:20px;font-weight:900;color:#dc2626;">${absentCount}</div><div style="font-size:10px;color:#666;">غياب</div></div>
                <div style="text-align:center;background:#fffbeb;padding:8px 14px;border-radius:8px;"><div style="font-size:20px;font-weight:900;color:var(--gold);">${lateCount}</div><div style="font-size:10px;color:#666;">تأخير</div></div>
                <div style="text-align:center;background:#f0fdf4;padding:8px 14px;border-radius:8px;"><div style="font-size:20px;font-weight:900;color:#16a34a;">${rewSnap.size}</div><div style="font-size:10px;color:#666;">حوافز</div></div>
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
    snap.forEach(d => { const data = d.data(); rows += '<tr>' + fields.map(f => `<td style="padding:7px;font-size:12.5px;">${data[f] || '-'}</td>`).join('') + '</tr>'; });
    return `<div class="card" style="margin-top:12px;"><h4 style="font-size:14px;margin-bottom:8px;">${title} <span style="color:#999;font-size:12px;">(${snap.size})</span></h4>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:#f8fafc;">${labels.map(l => `<th style="padding:7px;font-size:12px;text-align:right;">${l}</th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${labels.length}" style="text-align:center;padding:14px;color:#999;">لا توجد سجلات</td></tr>`}</tbody>
    </table></div></div>`;
}

// ===== الإدارة الجماعية =====
window.loadBulkClassStudents = async function(classId) {
    const listEl = document.getElementById('bulk-students-list');
    const actionsBar = document.getElementById('bulk-actions-bar');
    actionsBar.style.display = 'none';
    if (!classId) { listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-weight:700;">👆 اختر فصلاً لعرض طلابه</p>'; return; }
    listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">⏳ جاري التحميل...</p>';
    const schoolId = getActiveSchoolId();
    const snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId), where('schoolId', '==', schoolId)));
    currentClassStudents = [];
    snap.forEach(d => currentClassStudents.push({ id: d.id, ...d.data() }));
    currentClassStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    if (!currentClassStudents.length) { listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-weight:700;">لا يوجد طلاب بهذا الفصل</p>'; return; }
    let html = `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:2px solid var(--line);margin-bottom:8px;">
        <input type="checkbox" id="bulk-select-all" onchange="window.toggleAllBulkStudents(this.checked)" style="width:18px;height:18px;cursor:pointer;">
        <label for="bulk-select-all" style="font-weight:700;font-size:13px;cursor:pointer;">تحديد الكل (${currentClassStudents.length} طالب)</label></div>`;
    currentClassStudents.forEach((s, i) => {
        html += `<div style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f0f0f0;">
            <input type="checkbox" class="bulk-student-cb" data-idx="${i}" onchange="window.updateBulkSelectionCount()" style="width:17px;height:17px;cursor:pointer;">
            <span style="font-weight:700;font-size:13.5px;">${s.name}</span>
            <span style="color:#999;font-size:11px;margin-right:auto;">${s.parentPhone || ''}</span></div>`;
    });
    listEl.innerHTML = html;
    const targetSelect = document.getElementById('bulk-target-class');
    targetSelect.innerHTML = '<option value="">-- انقل إلى فصل --</option>' + allClassesCache.filter(c => c !== classId).map(c => `<option value="${c}">${c}</option>`).join('');
};

window.toggleAllBulkStudents = function(checked) {
    document.querySelectorAll('.bulk-student-cb').forEach(cb => cb.checked = checked);
    window.updateBulkSelectionCount();
};

window.updateBulkSelectionCount = function() {
    const checked = document.querySelectorAll('.bulk-student-cb:checked').length;
    document.getElementById('bulk-selected-count').textContent = `${checked} طالب محدد`;
    document.getElementById('bulk-actions-bar').style.display = checked > 0 ? 'flex' : 'none';
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
        selectedStudents.forEach(s => { batch.update(doc(db, 'students', s.id), { classId: targetClass }); });
        await batch.commit();
        window.showToast(`✅ تم نقل ${selectedStudents.length} طالب إلى ${targetClass}`);
        window.loadBulkClassStudents(document.getElementById('bulk-class-select').value);
        await loadAllStudents();
    } catch (e) { window.showToast('❌ خطأ في النقل: ' + e.message, 'error'); }
};

// ===== حذف جميع الطلاب =====
window.openDeleteAllModal = async function() {
    const schoolId = getActiveSchoolId();
    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    document.getElementById('delete-all-count').textContent = snap.size;
    document.getElementById('delete-all-school-name').textContent = currentUser.schoolName || schoolId;
    document.getElementById('delete-all-confirm-input').value = '';
    document.getElementById('delete-all-modal').style.display = 'flex';
};

window.closeDeleteAllModal = function() { document.getElementById('delete-all-modal').style.display = 'none'; };

window.executeDeleteAllStudents = async function() {
    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const expectedName = (currentUser.schoolName || getActiveSchoolId() || '').trim();
    const typedName = document.getElementById('delete-all-confirm-input').value.trim();
    if (typedName !== expectedName) { window.showToast('❌ الاسم المكتوب غير مطابق', 'error'); return; }
    const schoolId = getActiveSchoolId();
    try {
        const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        const batch = writeBatch(db);
        let count = 0;
        for (const d of snap.docs) {
            const archiveRef = doc(collection(db, 'deleted_students'));
            batch.set(archiveRef, { ...d.data(), originalId: d.id, deletedAt: serverTimestamp(), deletedBy: currentUser.name || 'unknown' });
            batch.delete(doc(db, 'students', d.id));
            count++;
        }
        await batch.commit();
        window.closeDeleteAllModal();
        window.showToast(`✅ تم نقل ${count} طالب لأرشيف المحذوفين`);
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { window.showToast('❌ خطأ: ' + e.message, 'error'); }
};
