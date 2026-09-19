import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

var studentStatuses = {};
var allStudentsLoaded = [];
var currentClassId = '';

export async function initQuickAttendanceModule() {
    var container = document.getElementById('tab-quick-attendance');
    if (!container) return;

    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');

    container.innerHTML = `
    <style>
    .qa-topbar {
        background: var(--navy);
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 10px;
    }
    .qa-topbar h2 { color:#fff; font-size:15px; font-weight:900; margin:0; }
    .qa-topbar span { color:rgba(255,255,255,.7); font-size:12px; font-weight:700; }

    .qa-class-selector {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 14px;
        border: 1px solid var(--line);
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .qa-class-selector label { font-weight:800; font-size:13px; color:var(--mid); }

    .qa-class-select {
        flex: 1;
        min-width: 180px;
        padding: 10px 14px;
        border: 2px solid var(--line);
        border-radius: 8px;
        font-family: 'Cairo',sans-serif;
        font-size:14px;
        font-weight: 700;
        outline: none;
        background: var(--off);
        transition: border-color .2s;
    }
    .qa-class-select:focus { border-color: var(--sky); background: #fff; }

    .qa-date-badge {
        background: var(--ice);
        color: var(--sky);
        padding: 8px 14px;
        border-radius: 8px;
        font-weight: 900;
        font-size: 13px;
    }

    .qa-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 14px;
    }

    .qa-stat {
        background: #fff;
        border-radius: 10px;
        padding: 14px;
        text-align: center;
        border: 1px solid var(--line);
    }

    .qa-stat-num {
        font-size: 24px;
        font-weight: 900;
        display: block;
        margin-bottom: 4px;
    }

    .qa-stat-label { font-size: 11px; font-weight: 700; color: var(--mid); }
    .qa-stat.present .qa-stat-num { color: #16a34a; }
    .qa-stat.absent  .qa-stat-num { color: #dc2626; }
    .qa-stat.late    .qa-stat-num { color: #d97706; }

    .qa-period-tabs {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 4px;
        margin-bottom: 14px;
        scrollbar-width: none;
    }
    .qa-period-tabs::-webkit-scrollbar { display: none; }

    .qa-period-tab {
        flex-shrink: 0;
        padding: 7px 14px;
        border: 2px solid var(--line);
        border-radius: 8px;
        font-family: 'Cairo',sans-serif;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        background: #fff;
        color: var(--mid);
        transition: all .2s;
    }
    .qa-period-tab.active {
        border-color: var(--sky);
        background: var(--sky);
        color: #fff;
    }

    .qa-students-grid {
        background: #fff;
        border-radius: 12px;
        border: 1px solid var(--line);
        overflow: hidden;
    }

    .qa-student-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        gap: 10px;
    }
    .qa-student-row:last-child { border-bottom: none; }

    .qa-student-name {
        font-weight: 700;
        font-size: 13px;
        flex: 1;
    }

    .qa-status-btns { display: flex; gap: 6px; }

    .qa-btn {
        padding: 6px 12px;
        border: 2px solid var(--line);
        border-radius: 7px;
        font-family: 'Cairo',sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        background: #fff;
        color: var(--mid);
        transition: all .15s;
    }

    .qa-btn.present.active { background: #f0fdf4; border-color: #16a34a; color: #16a34a; }
    .qa-btn.absent.active  { background: #fef2f2; border-color: #dc2626; color: #dc2626; }
    .qa-btn.late.active    { background: #fffbeb; border-color: #d97706; color: #d97706; }

    .qa-save-btn {
        width: 100%;
        padding: 14px;
        background: var(--sky);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-family: 'Cairo',sans-serif;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
        margin-top: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all .2s;
    }
    .qa-save-btn:hover { opacity: .92; }
    .qa-save-btn:disabled { opacity: .6; cursor: not-allowed; }

    .qa-log-section {
        margin-top: 20px;
        background: #fff;
        border-radius: 12px;
        border: 1px solid var(--line);
        overflow: hidden;
    }

    .qa-log-header {
        padding: 14px 16px;
        background: var(--off);
        border-bottom: 1px solid var(--line);
        font-weight: 900;
        font-size: 13px;
        color: var(--navy);
    }

    .qa-empty {
        text-align: center;
        padding: 30px;
        color: var(--mid);
        font-weight: 700;
        font-size: 13px;
    }
    </style>

    <div class="qa-topbar">
        <div>
            <h2><i class="bi bi-clipboard2-check-fill"></i> كشف الحضور السريع</h2>
            <span>للمدير والوكيل والمشرف</span>
        </div>
        <span class="qa-date-badge">📅 ${today}</span>
    </div>

    <!-- اختيار الفصل والحصة -->
    <div class="qa-class-selector">
        <label><i class="bi bi-door-open-fill"></i> الفصل:</label>
        <select id="qa-class-select" class="qa-class-select" onchange="window.qaOnClassChange(this.value)">
            <option value="">-- اختر الفصل --</option>
        </select>
    </div>

    <!-- تبويبات الحصص -->
    <div class="qa-period-tabs" id="qa-period-tabs" style="display:none;">
        ${[1,2,3,4,5,6,7].map(p => `
        <button class="qa-period-tab ${p===1?'active':''}" onclick="window.qaSelectPeriod(${p}, this)">
            ح${p}
        </button>`).join('')}
    </div>

    <!-- الإحصائيات -->
    <div class="qa-stats" id="qa-stats" style="display:none;">
        <div class="qa-stat present">
            <span class="qa-stat-num" id="qa-present-count">0</span>
            <span class="qa-stat-label">حاضر</span>
        </div>
        <div class="qa-stat absent">
            <span class="qa-stat-num" id="qa-absent-count">0</span>
            <span class="qa-stat-label">غائب</span>
        </div>
        <div class="qa-stat late">
            <span class="qa-stat-num" id="qa-late-count">0</span>
            <span class="qa-stat-label">متأخر</span>
        </div>
    </div>

    <!-- قائمة الطلاب -->
    <div id="qa-students-container">
        <div class="qa-empty">اختر الفصل لعرض الطلاب</div>
    </div>

    <!-- زر الحفظ -->
    <div id="qa-save-section" style="display:none;">
        <button class="qa-save-btn" id="qa-save-btn" onclick="window.qaSaveAttendance()">
            <i class="bi bi-check-circle-fill"></i> حفظ كشف الحضور
        </button>
    </div>

    <!-- سجل اليوم -->
    <div class="qa-log-section">
        <div class="qa-log-header"><i class="bi bi-list-check"></i> سجل الغياب اليوم</div>
        <div id="qa-today-log"><div class="qa-empty">⏳ جاري التحميل...</div></div>
    </div>`;

    // تحميل الفصول
    try {
        var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        var classes = [...new Set(snap.docs.map(d => d.data().classId).filter(Boolean))].sort((a, b) => {
            var pa = a.split('/'), pb = b.split('/');
            return (parseInt(pa[0])||0) - (parseInt(pb[0])||0) || (parseInt(pa[1])||0) - (parseInt(pb[1])||0);
        });

        var sel = document.getElementById('qa-class-select');
        classes.forEach(c => {
            var opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            sel.appendChild(opt);
        });
    } catch(e) {}

    // تحميل سجل اليوم
    await qaLoadTodayLog();
}

var qaPeriod = 1;

window.qaSelectPeriod = function(period, btn) {
    qaPeriod = period;
    document.querySelectorAll('.qa-period-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    if (currentClassId) window.qaOnClassChange(currentClassId);
};

window.qaOnClassChange = async function(classId) {
    currentClassId = classId;
    var container = document.getElementById('qa-students-container');
    var saveSection = document.getElementById('qa-save-section');
    var stats = document.getElementById('qa-stats');
    var periodTabs = document.getElementById('qa-period-tabs');

    if (!classId) {
        container.innerHTML = '<div class="qa-empty">اختر الفصل لعرض الطلاب</div>';
        saveSection.style.display = 'none';
        stats.style.display = 'none';
        periodTabs.style.display = 'none';
        return;
    }

    periodTabs.style.display = 'flex';
    container.innerHTML = '<div class="qa-empty">⏳ جاري تحميل الطلاب...</div>';
    studentStatuses = {};
    allStudentsLoaded = [];

    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(
            collection(db, 'students'),
            where('schoolId', '==', schoolId),
            where('classId', '==', classId)
        ));

        allStudentsLoaded = snap.docs.map(d => d.data().name).filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'ar'));

        if (!allStudentsLoaded.length) {
            container.innerHTML = '<div class="qa-empty">لا يوجد طلاب في هذا الفصل</div>';
            return;
        }

        allStudentsLoaded.forEach(name => { studentStatuses[name] = 'present'; });

        container.innerHTML = `<div class="qa-students-grid">` +
            allStudentsLoaded.map((name, idx) => {
                var safeId = name.replace(/\s/g, '_').replace(/'/g, '');
                return `<div class="qa-student-row">
                    <span class="qa-student-name">${idx + 1}. ${name}</span>
                    <div class="qa-status-btns" id="qbtns-${safeId}">
                        <button class="qa-btn present active" onclick="window.qaSetStatus('${name.replace(/'/g, "\\'")}', 'present', this.parentElement)">حاضر ✓</button>
                        <button class="qa-btn absent" onclick="window.qaSetStatus('${name.replace(/'/g, "\\'")}', 'absent', this.parentElement)">غائب ✗</button>
                        <button class="qa-btn late" onclick="window.qaSetStatus('${name.replace(/'/g, "\\'")}', 'late', this.parentElement)">متأخر ⏰</button>
                    </div>
                </div>`;
            }).join('') + '</div>';

        saveSection.style.display = 'block';
        stats.style.display = 'grid';
        qaUpdateStats();

    } catch(e) {
        container.innerHTML = `<div class="qa-empty" style="color:#dc2626;">❌ ${e.message}</div>`;
    }
};

window.qaSetStatus = function(name, status, btnsEl) {
    studentStatuses[name] = status;
    btnsEl.querySelectorAll('.qa-btn').forEach(b => b.classList.remove('active'));
    btnsEl.querySelector('.' + status).classList.add('active');
    qaUpdateStats();
};

function qaUpdateStats() {
    var present = Object.values(studentStatuses).filter(s => s === 'present').length;
    var absent = Object.values(studentStatuses).filter(s => s === 'absent').length;
    var late = Object.values(studentStatuses).filter(s => s === 'late').length;
    document.getElementById('qa-present-count').textContent = present;
    document.getElementById('qa-absent-count').textContent = absent;
    document.getElementById('qa-late-count').textContent = late;
}

window.qaSaveAttendance = async function() {
    var schoolId = getActiveSchoolId();
    var today = getTodayISO();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var btn = document.getElementById('qa-save-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> جاري الحفظ...';

    try {
        var batch = writeBatch(db);
        var batchCount = 0;

        for (var [name, status] of Object.entries(studentStatuses)) {
            var ref = doc(collection(db, 'attendance'));
            batch.set(ref, {
                schoolId,
                studentName: name,
                classId: currentClassId,
                status,
                period: qaPeriod,
                date: today,
                recordedBy: me.name || me.userId || 'admin',
                recordedByRole: me.role || 'admin',
                createdAt: serverTimestamp()
            });
            batchCount++;
            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        if (batchCount > 0) await batch.commit();

        window.showToast?.('✅ تم حفظ كشف الحضور بنجاح');
        btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> تم الحفظ ✓';
        btn.style.background = '#16a34a';
        await qaLoadTodayLog();

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> حفظ كشف الحضور';
            btn.style.background = '';
        }, 3000);

    } catch(e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> حفظ كشف الحضور';
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

async function qaLoadTodayLog() {
    var logEl = document.getElementById('qa-today-log');
    if (!logEl) return;

    var schoolId = getActiveSchoolId();
    var today = getTodayISO();

    try {
        var snap = await getDocs(query(
            collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('date', '==', today),
            where('status', '!=', 'present')
        ));

        if (snap.empty) {
            logEl.innerHTML = '<div class="qa-empty">✅ لا يوجد غياب اليوم</div>';
            return;
        }

        var rows = snap.docs.map(d => d.data())
            .sort((a, b) => {
                var ca = (a.classId||'').split('/').map(Number);
                var cb = (b.classId||'').split('/').map(Number);
                return ca[0]-cb[0] || ca[1]-cb[1];
            });

        logEl.innerHTML = `<table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:var(--off);">
                    <th style="padding:10px 12px; text-align:right; font-weight:900;">الطالب</th>
                    <th style="padding:10px 12px; text-align:center;">الفصل</th>
                    <th style="padding:10px 12px; text-align:center;">الحصة</th>
                    <th style="padding:10px 12px; text-align:center;">الحالة</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => `
                <tr style="border-bottom:1px solid #f0f0f0;">
                    <td style="padding:10px 12px; font-weight:700;">${r.studentName || '-'}</td>
                    <td style="padding:10px 12px; text-align:center;">${r.classId || '-'}</td>
                    <td style="padding:10px 12px; text-align:center;">ح${r.period || '-'}</td>
                    <td style="padding:10px 12px; text-align:center;">
                        <span style="background:${r.status==='absent'?'#fef2f2':'#fffbeb'}; color:${r.status==='absent'?'#dc2626':'#d97706'}; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700;">
                            ${r.status==='absent'?'غائب':'متأخر'}
                        </span>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    } catch(e) {
        logEl.innerHTML = `<div class="qa-empty" style="color:#dc2626;">❌ ${e.message}</div>`;
    }
}
