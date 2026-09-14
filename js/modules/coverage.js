import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initCoverageModule() {
    var container = document.getElementById('tab-coverage');
    if (!container) return;

    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--sky);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <h2><i class="bi bi-journal-text" style="color:var(--sky);"></i> التغطية الدراسية</h2>
            <button onclick="window.showAddCoverageModal()"
                style="background:var(--sky); color:#fff; border:none; padding:9px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                <i class="bi bi-plus-circle-fill"></i> تسجيل تغطية
            </button>
        </div>
        <p style="font-size:12px; color:var(--mid); margin-bottom:16px;">تسجيل حصص التغطية عند غياب المعلمين</p>

        <!-- فلاتر -->
        <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
            <input type="date" id="cov-filter-date" value="${today}" onchange="window.loadCoverage()"
                style="padding:8px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; outline:none;">
            <button onclick="window.loadCoverage()"
                style="background:var(--navy); color:#fff; border:none; padding:8px 16px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                <i class="bi bi-search"></i> بحث
            </button>
            <button onclick="document.getElementById('cov-filter-date').value=''; window.loadCoverage()"
                style="background:#fff; color:var(--mid); border:1.5px solid var(--line); padding:8px 16px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">
                الكل
            </button>
        </div>

        <!-- الجدول -->
        <div style="overflow-x:auto;">
            <div id="cov-list"><div style="text-align:center; padding:30px; color:var(--mid);">⏳ جاري التحميل...</div></div>
        </div>
    </div>

    <!-- إحصاءات -->
    <div class="card" style="border-top:5px solid var(--gold); margin-top:14px;">
        <h3 style="font-size:14px; font-weight:900; margin-bottom:14px;"><i class="bi bi-bar-chart-fill" style="color:var(--gold);"></i> إحصاءات التغطية</h3>
        <div id="cov-stats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
            <div style="text-align:center; padding:15px; color:var(--mid);">⏳</div>
        </div>
    </div>

    <!-- Modal إضافة تغطية -->
    <div id="cov-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:480px; width:92%; direction:rtl; max-height:90vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-weight:900; color:var(--navy); margin:0; font-size:15px;"><i class="bi bi-journal-plus"></i> تسجيل تغطية دراسية</h3>
                <button onclick="document.getElementById('cov-modal').style.display='none'" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">المعلم الغائب *</label>
                    <select id="cov-absent-teacher" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff; box-sizing:border-box;">
                        <option value="">-- اختر المعلم --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">المعلم المغطي *</label>
                    <select id="cov-cover-teacher" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff; box-sizing:border-box;">
                        <option value="">-- اختر المعلم --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">الصف *</label>
                    <input type="text" id="cov-class" placeholder="6/1"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">المادة</label>
                    <input type="text" id="cov-subject" placeholder="الرياضيات"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">الحصة *</label>
                    <select id="cov-period" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff; box-sizing:border-box;">
                        ${[1,2,3,4,5,6,7].map(p=>`<option value="${p}">الحصة ${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">التاريخ</label>
                    <input type="date" id="cov-date" value="${today}"
                        style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:4px;">ملاحظات</label>
                <textarea id="cov-notes" placeholder="ملاحظات..."
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; min-height:60px; resize:vertical; box-sizing:border-box;"></textarea>
            </div>
            <button onclick="window.saveCoverage()"
                style="width:100%; background:var(--sky); color:#fff; border:none; padding:13px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:900; font-size:14px; cursor:pointer;">
                <i class="bi bi-check-circle-fill"></i> حفظ التغطية
            </button>
        </div>
    </div>`;

    await loadTeachersForCoverage();
    await window.loadCoverage();
    await loadCoverageStats();
}

async function loadTeachersForCoverage() {
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,'users'), where('schoolId','==',schoolId)));
        var teachers = snap.docs.map(d=>d.data()).filter(u=>u.role==='teacher').sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
        var opts = teachers.map(t=>`<option value="${t.name}">${t.name}${t.department?' ('+t.department+')':''}</option>`).join('');
        ['cov-absent-teacher','cov-cover-teacher'].forEach(id=>{
            var el=document.getElementById(id);
            if(el) el.innerHTML += opts;
        });
    } catch(e) {}
}

window.loadCoverage = async function() {
    var listEl = document.getElementById('cov-list');
    if (!listEl) return;
    var schoolId = getActiveSchoolId();
    var dateFilter = document.getElementById('cov-filter-date')?.value;

    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--mid);">⏳ جاري التحميل...</div>';

    try {
        var q = query(collection(db,'coverage'), where('schoolId','==',schoolId));
        var snap = await getDocs(q);
        var records = snap.docs.map(d=>({id:d.id,...d.data()}))
            .filter(r => !dateFilter || r.date === dateFilter)
            .sort((a,b)=>(b.date||'').localeCompare(a.date||''));

        if (!records.length) {
            listEl.innerHTML = '<div style="text-align:center; padding:30px; color:var(--mid); font-weight:700;">لا توجد تغطيات مسجلة</div>';
            return;
        }

        listEl.innerHTML = `<table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:var(--navy); color:#fff;">
                    <th style="padding:10px 12px;">#</th>
                    <th style="padding:10px 12px;">المعلم الغائب</th>
                    <th style="padding:10px 12px;">المعلم المغطي</th>
                    <th style="padding:10px 12px;">الصف</th>
                    <th style="padding:10px 12px;">المادة</th>
                    <th style="padding:10px 12px; text-align:center;">الحصة</th>
                    <th style="padding:10px 12px;">التاريخ</th>
                    <th style="padding:10px 12px; text-align:center;">إجراء</th>
                </tr>
            </thead>
            <tbody>
                ${records.map((r,i) => `
                <tr style="border-bottom:1px solid #f0f0f0; ${i%2?'background:#fafbfc;':''}">
                    <td style="padding:10px 12px; color:#aaa; font-size:12px;">${i+1}</td>
                    <td style="padding:10px 12px; font-weight:700;">${r.absentTeacher||'-'}</td>
                    <td style="padding:10px 12px; color:var(--sky); font-weight:700;">${r.coverTeacher||'-'}</td>
                    <td style="padding:10px 12px;">${r.classId||'-'}</td>
                    <td style="padding:10px 12px; font-size:12px; color:#666;">${r.subject||'-'}</td>
                    <td style="padding:10px 12px; text-align:center;">
                        <span style="background:var(--ice); color:var(--sky); padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">ح${r.period||'-'}</span>
                    </td>
                    <td style="padding:10px 12px; font-size:12px;">${r.date||'-'}</td>
                    <td style="padding:10px 12px; text-align:center;">
                        <button onclick="window.deleteCoverage('${r.id}')"
                            style="background:#fef2f2; color:#dc2626; border:none; padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; font-family:'Cairo',sans-serif;">
                            🗑 حذف
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) {
        listEl.innerHTML = `<div style="color:red; padding:20px;">❌ ${e.message}</div>`;
    }
};

window.showAddCoverageModal = function() {
    document.getElementById('cov-modal').style.display = 'flex';
};

window.saveCoverage = async function() {
    var absentTeacher = document.getElementById('cov-absent-teacher').value;
    var coverTeacher = document.getElementById('cov-cover-teacher').value;
    var classId = document.getElementById('cov-class').value.trim();
    var subject = document.getElementById('cov-subject').value.trim();
    var period = document.getElementById('cov-period').value;
    var date = document.getElementById('cov-date').value;
    var notes = document.getElementById('cov-notes').value.trim();
    var me = JSON.parse(localStorage.getItem('hs_user')||'{}');

    if (!absentTeacher || !coverTeacher || !classId) {
        window.showToast?.('أكمل الحقول المطلوبة', 'warning');
        return;
    }

    try {
        await addDoc(collection(db,'coverage'), {
            schoolId: getActiveSchoolId(),
            absentTeacher, coverTeacher, classId, subject,
            period: parseInt(period), date, notes,
            recordedBy: me.name || me.userId,
            createdAt: serverTimestamp()
        });
        window.showToast?.('✅ تم تسجيل التغطية');
        document.getElementById('cov-modal').style.display = 'none';
        ['cov-absent-teacher','cov-cover-teacher','cov-class','cov-subject','cov-notes'].forEach(id=>{
            var el=document.getElementById(id); if(el) el.value='';
        });
        await window.loadCoverage();
        await loadCoverageStats();
    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

window.deleteCoverage = async function(id) {
    if (!confirm('حذف هذه التغطية؟')) return;
    try {
        await deleteDoc(doc(db,'coverage',id));
        window.showToast?.('✅ تم الحذف');
        await window.loadCoverage();
        await loadCoverageStats();
    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

async function loadCoverageStats() {
    var statsEl = document.getElementById('cov-stats');
    if (!statsEl) return;
    var schoolId = getActiveSchoolId();
    var today = getTodayISO();

    try {
        var snap = await getDocs(query(collection(db,'coverage'), where('schoolId','==',schoolId)));
        var records = snap.docs.map(d=>d.data());
        var todayRecords = records.filter(r=>r.date===today);

        // أكثر المعلمين غياباً
        var absentCount = {};
        records.forEach(r=>{ absentCount[r.absentTeacher] = (absentCount[r.absentTeacher]||0)+1; });
        var topAbsent = Object.entries(absentCount).sort((a,b)=>b[1]-a[1])[0];

        // أكثر المعلمين تغطية
        var coverCount = {};
        records.forEach(r=>{ coverCount[r.coverTeacher] = (coverCount[r.coverTeacher]||0)+1; });
        var topCover = Object.entries(coverCount).sort((a,b)=>b[1]-a[1])[0];

        statsEl.innerHTML = [
            { icon:'📋', num: records.length, label:'إجمالي التغطيات' },
            { icon:'📅', num: todayRecords.length, label:'تغطيات اليوم' },
            { icon:'⚠️', num: topAbsent ? topAbsent[0] : '-', label:'أكثر غياباً', small: true },
            { icon:'🌟', num: topCover ? topCover[0] : '-', label:'أكثر تغطية', small: true },
        ].map(s => `
            <div style="background:#fff; border-radius:12px; padding:14px; border:1px solid var(--line); text-align:center;">
                <span style="font-size:24px; display:block; margin-bottom:6px;">${s.icon}</span>
                <span style="font-size:${s.small?'13':'22'}px; font-weight:900; display:block; color:var(--navy); margin-bottom:3px;">${s.num}</span>
                <span style="font-size:11px; font-weight:700; color:var(--mid);">${s.label}</span>
            </div>`).join('');
    } catch(e) {
        statsEl.innerHTML = `<div style="color:red; padding:10px;">❌ ${e.message}</div>`;
    }
}
