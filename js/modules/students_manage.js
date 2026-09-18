import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ØªØ±ØªÙŠØ¨ Ø°ÙƒÙŠ: Ø¨Ø§Ù„ÙØµÙ„ (6/1 â†’ 6/2 â†’ 7/1...) Ø«Ù… Ø£Ø¨Ø¬Ø¯ÙŠ Ø¨Ø§Ù„Ø§Ø³Ù…
function smartSort(a, b) {
    var ca = a.classId || '', cb = b.classId || '';
    var pa = ca.split('/'), pb = cb.split('/');
    var ga = parseInt(pa[0]) || 0, gb = parseInt(pb[0]) || 0;
    if(ga !== gb) return ga - gb;
    var sa = parseInt(pa[1]) || 0, sb = parseInt(pb[1]) || 0;
    if(sa !== sb) return sa - sb;
    return (a.name || '').localeCompare(b.name || '', 'ar');
}

function smartClassSort(a, b) {
    var pa = a.split('/'), pb = b.split('/');
    var ga = parseInt(pa[0]) || 0, gb = parseInt(pb[0]) || 0;
    if(ga !== gb) return ga - gb;
    return (parseInt(pa[1]) || 0) - (parseInt(pb[1]) || 0);
}


let localStudentsMap = {};
let allClassesCache = [];
let currentClassStudents = [];
let allStudentsCache = [];
let filteredStudents = [];
let currentPage = 1;
const PAGE_SIZE = 20;

export async function initStudentsManageModule() {
    var container = document.getElementById('tab-students-manage');
    if (!container) return;

    var currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var isAdmin = currentUser.role === 'admin';

    container.innerHTML = `
    <!-- ===== Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙƒØ§Ù…Ù„ ===== -->
    <div class="card" style="border-top:5px solid var(--navy); padding:0; overflow:hidden;">
        <div style="padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--line);">
            <h2 style="margin:0; font-size:17px;"><i class="bi bi-people-fill" style="color:var(--gold);"></i> Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ù„Ø§Ø¨</h2>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="window.exportStudentsExcel()" style="background:#16a34a;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-file-earmark-excel-fill"></i> Excel</button>
                <button onclick="window.exportStudentsPDF()" style="background:#dc2626;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-file-earmark-pdf-fill"></i> PDF</button>
                <button onclick="window.openAddStudentModal()" style="background:var(--sky);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:Cairo;font-weight:700;font-size:13px;cursor:pointer;"><i class="bi bi-person-plus-fill"></i> Ø¥Ø¶Ø§ÙØ© Ø·Ø§Ù„Ø¨</button>
            </div>
        </div>

        <!-- ÙÙ„Ø§ØªØ± Ø§Ù„Ø¨Ø­Ø« -->
        <div style="padding:14px 20px; background:#f8fafc; border-bottom:1px solid var(--line); display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="st-search" placeholder="ðŸ” Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ..." onInput="window.applyStudentFilters()" style="flex:1;min-width:180px;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:600;outline:none;">
            <select id="st-filter-class" onchange="window.applyStudentFilters()" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;font-weight:700;outline:none;background:#fff;">
                <option value="">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>
            </select>
            <span id="st-count-badge" style="background:var(--ice);color:var(--sky);padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;white-space:nowrap;">0 Ø·Ø§Ù„Ø¨</span>
        </div>

        <!-- Ø§Ù„Ø¬Ø¯ÙˆÙ„ -->
        <div style="overflow-x:auto;">
            <table id="st-table" style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                    <tr style="background:var(--navy);color:#fff;text-align:right;">
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">#</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">Ø§Ù„Ø§Ø³Ù…</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">Ø§Ù„ØµÙ</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±</th>
                        <th style="padding:11px 14px;font-size:12px;font-weight:800;">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
                    </tr>
                </thead>
                <tbody id="st-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:40px;color:#999;font-weight:700;">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- ØªØ±Ù‚ÙŠÙ… Ø§Ù„ØµÙØ­Ø§Øª -->
        <div id="st-pagination" style="padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);background:#f8fafc;">
            <div id="st-page-info" style="font-size:13px;font-weight:700;color:var(--mid);"></div>
            <div id="st-page-btns" style="display:flex;gap:6px;"></div>
        </div>
    </div>

    <!-- ===== Ù…Ù„Ù Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„ÙØ±Ø¯ÙŠ ===== -->
    <div class="card" style="border-top:5px solid var(--sky); margin-top:16px;">
        <h2><i class="bi bi-person-bounding-box" style="color:var(--gold);"></i> Ù…Ù„Ù Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„ÙØ±Ø¯ÙŠ</h2>
        <p style="font-size:12px;color:#666;margin-bottom:15px;font-weight:bold;">ðŸ” Ø­Ø¯Ø¯ Ø§Ù„ØµÙ Ø«Ù… Ø§Ø®ØªØ± Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù„Ø§Ø·Ù„Ø§Ø¹ Ø¹Ù„Ù‰ ÙƒØ§ÙØ© Ø³Ø¬Ù„Ø§ØªÙ‡.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:15px;">
            <div>
                <label style="font-weight:700;font-size:12px;color:#444;">Ø§Ù„ØµÙ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ:</label>
                <select id="prof-class-select" onchange="window.handleStudentClassChange(this.value)" style="width:100%;padding:10px;">
                    <option value="">-- Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„ÙØµÙˆÙ„... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700;font-size:12px;color:#444;">Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨:</label>
                <select id="prof-student-select" disabled style="width:100%;padding:10px;">
                    <option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>
                </select>
            </div>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="window.triggerStudentProfileFetch()" style="flex:1;background:var(--navy);font-weight:900;padding:14px;border-radius:8px;border:none;color:#fff;cursor:pointer;"><i class="bi bi-search"></i> Ø¬Ù„Ø¨ Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠ Ø§Ù„ÙƒØ§Ù…Ù„</button>
            <button onclick="window.resetStudentDashboardLiveView()" id="btn-student-reset" style="background:#7f8c8d;border-radius:8px;border:none;color:#fff;padding:0 20px;display:none;"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
    </div>
    <div id="student-profile-display-area"></div>

    <!-- ===== Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¬Ù…Ø§Ø¹ÙŠØ© ===== -->
    <div class="card" style="border-top:5px solid var(--sky);margin-top:16px;">
        <h2><i class="bi bi-list-check" style="color:var(--sky);"></i> Ø¥Ø¯Ø§Ø±Ø© Ø¬Ù…Ø§Ø¹ÙŠØ© (Ù†Ù‚Ù„ / ØªØ­Ø¯ÙŠØ¯ Ù…ØªØ¹Ø¯Ø¯)</h2>
        <p style="font-size:12px;color:#666;margin-bottom:15px;font-weight:bold;">Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ù„Ø¹Ø±Ø¶ ÙƒÙ„ Ø·Ù„Ø§Ø¨Ù‡ØŒ Ø­Ø¯Ø¯ Ù…Ù† ØªØ±ÙŠØ¯ Ù†Ù‚Ù„Ù‡Ù…ØŒ Ø«Ù… Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯.</p>
        <div style="margin-bottom:15px;">
            <label style="font-weight:700;font-size:12px;color:#444;">Ø§Ø¹Ø±Ø¶ Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØµÙ„:</label>
            <select id="bulk-class-select" onchange="window.loadBulkClassStudents(this.value)" style="width:100%;padding:10px;">
                <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ --</option>
            </select>
        </div>
        <div id="bulk-students-list" style="margin-bottom:14px;">
            <p style="text-align:center;color:#999;padding:20px;font-weight:700;">ðŸ‘† Ø§Ø®ØªØ± ÙØµÙ„Ø§Ù‹ Ù„Ø¹Ø±Ø¶ Ø·Ù„Ø§Ø¨Ù‡</p>
        </div>
        <div id="bulk-actions-bar" style="display:none;gap:10px;align-items:center;flex-wrap:wrap;background:#f8fafc;padding:14px;border-radius:10px;">
            <span id="bulk-selected-count" style="font-weight:900;color:var(--sky);font-size:14px;">0 Ø·Ø§Ù„Ø¨ Ù…Ø­Ø¯Ø¯</span>
            <select id="bulk-target-class" style="padding:9px;border-radius:8px;border:1px solid var(--line);flex:1;min-width:150px;">
                <option value="">-- Ø§Ù†Ù‚Ù„ Ø¥Ù„Ù‰ ÙØµÙ„ --</option>
            </select>
            <button onclick="window.executeBulkTransfer()" style="background:var(--sky);color:#fff;border:none;padding:9px 18px;border-radius:8px;font-weight:700;cursor:pointer;"><i class="bi bi-arrow-left-right"></i> Ù†Ù‚Ù„ Ø§Ù„Ù…Ø­Ø¯Ø¯</button>
        </div>
    </div>

    ${isAdmin ? `
    <!-- ===== Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø®Ø·Ø± ===== -->
    <div class="card" style="border-top:5px solid var(--red);margin-top:16px;">
        <h2><i class="bi bi-exclamation-octagon-fill" style="color:var(--red);"></i> Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø®Ø·Ø± â€” Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ù„Ø§Ø¨</h2>
        <p style="font-size:12px;color:#666;margin-bottom:12px;font-weight:bold;">Ø³ÙŠØªÙ… Ù†Ù‚Ù„ Ø¬Ù…ÙŠØ¹ Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ù„Ø£Ø±Ø´ÙŠÙ "Ø§Ù„Ù…Ø­Ø°ÙˆÙÙŠÙ†" (Ù‚Ø§Ø¨Ù„ Ù„Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹). Ø³Ø¬Ù„Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨ ÙˆØ§Ù„Ø³Ù„ÙˆÙƒ ØªØ¨Ù‚Ù‰ Ù…Ø­ÙÙˆØ¸Ø©.</p>
        <button onclick="window.openDeleteAllModal()" style="background:var(--red);color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:900;cursor:pointer;"><i class="bi bi-trash3-fill"></i> Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</button>
    </div>
    <div id="delete-all-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:90%;direction:rtl;">
            <h3 style="color:var(--red);font-weight:900;margin-bottom:10px;"><i class="bi bi-exclamation-triangle-fill"></i> ØªØ£ÙƒÙŠØ¯ Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ù„Ø§Ø¨</h3>
            <p style="font-size:13px;color:#666;margin-bottom:14px;">Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø³ÙŠÙ†Ù‚Ù„ <b id="delete-all-count">0</b> Ø·Ø§Ù„Ø¨ Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù…Ø­Ø°ÙˆÙÙŠÙ†. Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŒ Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ù…Ø¯Ø±Ø³ØªÙƒ: <b id="delete-all-school-name" style="color:var(--red);"></b></p>
            <input type="text" id="delete-all-confirm-input" placeholder="Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ù‡Ù†Ø§" style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:8px;margin-bottom:14px;box-sizing:border-box;">
            <div style="display:flex;gap:8px;">
                <button onclick="window.executeDeleteAllStudents()" style="flex:1;background:var(--red);color:#fff;border:none;padding:11px;border-radius:8px;font-weight:700;cursor:pointer;">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</button>
                <button onclick="window.closeDeleteAllModal()" style="background:#fff;color:var(--mid);border:1.5px solid var(--line);padding:11px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Ø¥Ù„ØºØ§Ø¡</button>
            </div>
        </div>
    </div>` : ''}

    <!-- ===== Modal Ø¥Ø¶Ø§ÙØ©/ØªØ¹Ø¯ÙŠÙ„ Ø·Ø§Ù„Ø¨ ===== -->
    <div id="student-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:16px;padding:28px;max-width:460px;width:92%;direction:rtl;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <h3 id="student-modal-title" style="font-weight:900;font-size:17px;color:var(--navy);margin:0;">Ø¥Ø¶Ø§ÙØ© Ø·Ø§Ù„Ø¨</h3>
                <button onclick="window.closeStudentModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">âœ•</button>
            </div>
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„ *</label>
            <input id="sm-name" type="text" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:12px;box-sizing:border-box;">
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">Ø§Ù„ØµÙ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ *</label>
            <select id="sm-class" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:12px;">
                <option value="">-- Ø§Ø®ØªØ± Ø§Ù„ØµÙ --</option>
            </select>
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ</label>
            <input id="sm-civil" type="text" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:12px;box-sizing:border-box;">
            <label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±</label>
            <input id="sm-phone" type="tel" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:Cairo;font-size:14px;margin-bottom:18px;box-sizing:border-box;">
            <input type="hidden" id="sm-doc-id">
            <button onclick="window.saveStudentModal()" style="width:100%;background:var(--sky);color:#fff;border:none;padding:13px;border-radius:8px;font-family:Cairo;font-weight:900;font-size:15px;cursor:pointer;"><i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸</button>
        </div>
    </div>
    `;

    await loadAllStudents();
}

// ===== ØªØ­Ù…ÙŠÙ„ ÙƒÙ„ Ø§Ù„Ø·Ù„Ø§Ø¨ =====
async function loadAllStudents() {
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        allStudentsCache = [];
        var classesSet = new Set();

        snap.forEach(d => {
            var data = d.data();
            allStudentsCache.push({ id: d.id, ...data });
            if (data.classId) classesSet.add(data.classId.trim());
        });

        allStudentsCache.sort(smartSort);
        allClassesCache = Array.from(classesSet).sort(smartClassSort);

        // ØªØ¹Ø¨Ø¦Ø© ÙÙ„ØªØ± Ø§Ù„ÙØµÙˆÙ„
        var classOpts = '<option value="">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('st-filter-class').innerHTML = classOpts;

        // ØªØ¹Ø¨Ø¦Ø© dropdown Ù…Ù„Ù Ø§Ù„Ø·Ø§Ù„Ø¨ ÙˆØ§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¬Ù…Ø§Ø¹ÙŠØ©
        var classOptsSelect = '<option value="">-- Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ØµÙ --</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('prof-class-select').innerHTML = classOptsSelect;
        document.getElementById('bulk-class-select').innerHTML = classOptsSelect;
        document.getElementById('sm-class').innerHTML = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ØµÙ --</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');

        filteredStudents = [...allStudentsCache];
        currentPage = 1;
        renderStudentTable();
    } catch (e) {
        document.getElementById('st-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc2626;">âŒ Ø®Ø·Ø£: ${e.message}</td></tr>`;
    }
}

// ===== ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„ÙÙ„Ø§ØªØ± =====
window.applyStudentFilters = function() {
    var search = document.getElementById('st-search').value.trim().toLowerCase();
    var classFilter = document.getElementById('st-filter-class').value;

    filteredStudents = allStudentsCache.filter(s => {
        var matchSearch = !search || (s.name || '').toLowerCase().includes(search) || (s.civilId || '').includes(search);
        var matchClass = !classFilter || s.classId === classFilter;
        return matchSearch && matchClass;
    });

    currentPage = 1;
    renderStudentTable();
};

// ===== Ø±Ø³Ù… Ø§Ù„Ø¬Ø¯ÙˆÙ„ =====
function renderStudentTable() {
    var tbody = document.getElementById('st-tbody');
    var totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
    var start = (currentPage - 1) * PAGE_SIZE;
    var pageData = filteredStudents.slice(start, start + PAGE_SIZE);

    // badge Ø§Ù„Ø¹Ø¯Ø§Ø¯
    document.getElementById('st-count-badge').textContent = `${filteredStudents.length} Ø·Ø§Ù„Ø¨`;

    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;font-weight:700;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</td></tr>`;
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
                    <button onclick="window.openEditStudentModal('${s.id}')" style="background:var(--sky);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-family:Cairo;font-size:12px;font-weight:700;cursor:pointer;"><i class="bi bi-pencil-fill"></i> ØªØ¹Ø¯ÙŠÙ„</button>
                    <button onclick="window.deleteStudent('${s.id}','${(s.name||'').replace(/'/g,"\\'")}') " style="background:#fee2e2;color:#dc2626;border:none;padding:5px 12px;border-radius:6px;font-family:Cairo;font-size:12px;font-weight:700;cursor:pointer;"><i class="bi bi-trash3"></i></button>
                </div>
            </td>
        </tr>`).join('');

    // Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØµÙØ­Ø©
    document.getElementById('st-page-info').textContent = `Ø¹Ø±Ø¶ ${start + 1} - ${Math.min(start + PAGE_SIZE, filteredStudents.length)} Ù…Ù† ${filteredStudents.length}`;

    // Ø£Ø²Ø±Ø§Ø± Ø§Ù„ØªÙ†Ù‚Ù„
    var btns = '';
    if (currentPage > 1) btns += `<button onclick="window.goStudentPage(${currentPage - 1})" style="${paginBtnStyle()}"><i class="bi bi-chevron-right"></i></button>`;
    for (var p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
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

// ===== Modal Ø¥Ø¶Ø§ÙØ©/ØªØ¹Ø¯ÙŠÙ„ =====
window.openAddStudentModal = function() {
    document.getElementById('student-modal-title').textContent = 'Ø¥Ø¶Ø§ÙØ© Ø·Ø§Ù„Ø¨ Ø¬Ø¯ÙŠØ¯';
    document.getElementById('sm-name').value = '';
    document.getElementById('sm-class').value = '';
    document.getElementById('sm-civil').value = '';
    document.getElementById('sm-phone').value = '';
    document.getElementById('sm-doc-id').value = '';
    document.getElementById('student-modal').style.display = 'flex';
};

window.openEditStudentModal = function(docId) {
    var s = allStudentsCache.find(x => x.id === docId);
    if (!s) return;
    document.getElementById('student-modal-title').textContent = 'ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨';
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
    var name = document.getElementById('sm-name').value.trim();
    var classId = document.getElementById('sm-class').value.trim();
    var civilId = document.getElementById('sm-civil').value.trim();
    var parentPhone = document.getElementById('sm-phone').value.trim();
    var docId = document.getElementById('sm-doc-id').value;

    if (!name || !classId) { window.showToast('Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„ØµÙ Ù…Ø·Ù„ÙˆØ¨Ø§Ù†', 'error'); return; }

    var schoolId = getActiveSchoolId();
    var data = { name, classId, civilId, parentPhone, schoolId };

    try {
        if (docId) {
            await updateDoc(doc(db, 'students', docId), data);
            var idx = allStudentsCache.findIndex(x => x.id === docId);
            if (idx !== -1) allStudentsCache[idx] = { id: docId, ...data };
            window.showToast('âœ… ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨');
        } else {
            var ref = await addDoc(collection(db, 'students'), { ...data, createdAt: serverTimestamp() });
            allStudentsCache.push({ id: ref.id, ...data });
            // ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙØµÙˆÙ„ Ù„Ùˆ Ø¬Ø¯ÙŠØ¯
            if (!allClassesCache.includes(classId)) {
                allClassesCache.push(classId);
                allClassesCache.sort(smartClassSort);
                var newOpts = '<option value="">ÙƒÙ„ Ø§Ù„ÙØµÙˆÙ„</option>' + allClassesCache.map(c => `<option value="${c}">${c}</option>`).join('');
                document.getElementById('st-filter-class').innerHTML = newOpts;
            }
            window.showToast('âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­');
        }
        window.closeStudentModal();
        allStudentsCache.sort(smartSort);
        window.applyStudentFilters();
    } catch (e) { window.showToast('âŒ Ø®Ø·Ø£: ' + e.message, 'error'); }
};

window.deleteStudent = async function(docId, name) {
    if (!confirm(`Ø­Ø°Ù Ø§Ù„Ø·Ø§Ù„Ø¨ "${name}" Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©ØŸ`)) return;
    try {
        await deleteDoc(doc(db, 'students', docId));
        allStudentsCache = allStudentsCache.filter(x => x.id !== docId);
        window.applyStudentFilters();
        window.showToast('âœ… ØªÙ… Ø­Ø°Ù Ø§Ù„Ø·Ø§Ù„Ø¨');
    } catch (e) { window.showToast('âŒ Ø®Ø·Ø£: ' + e.message, 'error'); }
};

// ===== Export Excel =====
window.exportStudentsExcel = function() {
    var data = filteredStudents.map((s, i) => ({
        '#': i + 1,
        'Ø§Ù„Ø§Ø³Ù…': s.name || '',
        'Ø§Ù„ØµÙ': s.classId || '',
        'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ': s.civilId || '',
        'Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±': s.parentPhone || ''
    }));
    var ws = XLSX.utils.json_to_sheet(data, { header: ['#', 'Ø§Ù„Ø§Ø³Ù…', 'Ø§Ù„ØµÙ', 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ', 'Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±'] });
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø·Ù„Ø§Ø¨');
    XLSX.writeFile(wb, `Ù‚Ø§Ø¦Ù…Ø©_Ø§Ù„Ø·Ù„Ø§Ø¨_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.showToast('âœ… ØªÙ… ØªØµØ¯ÙŠØ± Excel Ø¨Ù†Ø¬Ø§Ø­');
};

// ===== Export PDF =====
window.exportStudentsPDF = function() {
    var classFilter = document.getElementById('st-filter-class').value;
    var subtitle = classFilter ? `Ø§Ù„ØµÙ: ${classFilter}` : `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨: ${filteredStudents.length}`;
    var rows = filteredStudents.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td style="font-weight:700;">${s.name || '-'}</td>
            <td>${s.classId || '-'}</td>
            <td>${s.civilId || '-'}</td>
            <td>${s.parentPhone || '-'}</td>
        </tr>`).join('');
    var html = `
        <table>
            <thead><tr><th>#</th><th>Ø§Ù„Ø§Ø³Ù…</th><th>Ø§Ù„ØµÙ</th><th>Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ</th><th>Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    window.ManzoumaReport.printDirect(html, 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ù„Ø§Ø¨', subtitle);
};

// ===== Ù…Ù„Ù Ø§Ù„Ø·Ø§Ù„Ø¨ Ø§Ù„ÙØ±Ø¯ÙŠ =====
window.handleStudentClassChange = async function(classId) {
    var studentSelect = document.getElementById('prof-student-select');
    if (!studentSelect) return;
    if (!classId) { studentSelect.innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>'; studentSelect.disabled = true; return; }
    studentSelect.innerHTML = '<option value="">â³ Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„Ø£Ø³Ù…Ø§Ø¡...</option>';
    studentSelect.disabled = true;
    localStudentsMap = {};
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId)));
        var list = [];
        snap.forEach(d => { var data = d.data(); if (data.name) { var n = data.name.trim(); list.push(n); localStudentsMap[n] = { id: d.id, ...data }; } });
        list.sort((a, b) => a.localeCompare(b, 'ar'));
        studentSelect.innerHTML = list.length === 0 ? '<option value="">âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨</option>' : '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ø·Ø§Ù„Ø¨ --</option>' + list.map(n => `<option value="${n}">${n}</option>`).join('');
        studentSelect.disabled = list.length === 0;
    } catch (e) { studentSelect.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§ØªØµØ§Ù„</option>'; }
};

window.triggerStudentProfileFetch = function() {
    var sName = document.getElementById('prof-student-select').value;
    if (!sName || !localStudentsMap[sName]) { window.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø·Ø§Ù„Ø¨!', 'info'); return; }
    document.getElementById('btn-student-reset').style.display = 'inline-block';
    window.loadStudentFullProfile(localStudentsMap[sName]);
};

window.resetStudentDashboardLiveView = function() {
    document.getElementById('student-profile-display-area').innerHTML = '';
    document.getElementById('btn-student-reset').style.display = 'none';
    document.getElementById('prof-student-select').value = '';
};

window.loadStudentFullProfile = async function(student) {
    var displayArea = document.getElementById('student-profile-display-area');
    var schoolId = getActiveSchoolId();
    displayArea.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:#999;font-weight:700;">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„ÙƒØ§Ù…Ù„...</div>`;
    try {
        var name = student.name.trim();
        var _pr = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'gatepass'), where('studentName', '==', name), where('schoolId', '==', schoolId))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', name), where('schoolId', '==', schoolId)))
        ]);
        var attSnap = _pr[0];          var behSnap = _pr[1];          var rewSnap = _pr[2];          var gateSnap = _pr[3];          var clinicSnap = _pr[4]; 
        var absentCount = attSnap.docs.filter(d => d.data().status === 'absent').length;
        var lateCount = attSnap.docs.filter(d => d.data().status === 'late').length;
        var html = `
        <div class="card" style="border-right:5px solid var(--sky);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="margin:0 0 4px;font-size:16px;">ðŸ‘¤ ${name}</h3>
                <span style="background:var(--ice);color:var(--sky);padding:3px 10px;border-radius:6px;font-size:13px;font-weight:700;">Ø§Ù„ÙØµÙ„: ${student.classId || '-'}</span>
                <span style="color:var(--mid);font-size:13px;margin-right:8px;"><i class="bi bi-telephone-fill"></i> ${student.parentPhone || 'ØºÙŠØ± Ù…Ø³Ø¬Ù„'}</span>
            </div>
            <div style="display:flex;gap:10px;">
                <div style="text-align:center;background:#fef2f2;padding:8px 14px;border-radius:8px;"><div style="font-size:20px;font-weight:900;color:#dc2626;">${absentCount}</div><div style="font-size:10px;color:#666;">ØºÙŠØ§Ø¨</div></div>
                <div style="text-align:center;background:#fffbeb;padding:8px 14px;border-radius:8px;"><div style="font-size:20px;font-weight:900;color:var(--gold);">${lateCount}</div><div style="font-size:10px;color:#666;">ØªØ£Ø®ÙŠØ±</div></div>
                <div style="text-align:center;background:#f0fdf4;padding:8px 14px;border-radius:8px;"><div style="font-size:20px;font-weight:900;color:#16a34a;">${rewSnap.size}</div><div style="font-size:10px;color:#666;">Ø­ÙˆØ§ÙØ²</div></div>
            </div>
        </div>`;
        html += buildRecordsTable('Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ø³Ù„ÙˆÙƒÙŠ', behSnap, ['dateStr', 'type', 'notes', 'action'], ['Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ù†ÙˆØ¹', 'Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª', 'Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡']);
        html += buildRecordsTable('Ø³Ø¬Ù„ Ø§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù†', gateSnap, ['dateStr', 'reason', 'relative', 'status'], ['Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ø³Ø¨Ø¨', 'Ø§Ù„Ù…Ø³ØªÙ„Ù…', 'Ø§Ù„Ø­Ø§Ù„Ø©']);
        html += buildRecordsTable('Ø³Ø¬Ù„ Ø§Ù„Ø¹ÙŠØ§Ø¯Ø©', clinicSnap, ['dateStr', 'complaint', 'treatment'], ['Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„Ø´ÙƒÙˆÙ‰', 'Ø§Ù„Ø¹Ù„Ø§Ø¬']);
        displayArea.innerHTML = html;
    } catch (err) { displayArea.innerHTML = `<div class="card" style="color:red;">âŒ Ø®Ø·Ø£: ${err.message}</div>`; }
};

function buildRecordsTable(title, snap, fields, labels) {
    var rows = '';
    snap.forEach(d => { var data = d.data(); rows += '<tr>' + fields.map(f => `<td style="padding:7px;font-size:12.5px;">${data[f] || '-'}</td>`).join('') + '</tr>'; });
    return `<div class="card" style="margin-top:12px;"><h4 style="font-size:14px;margin-bottom:8px;">${title} <span style="color:#999;font-size:12px;">(${snap.size})</span></h4>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:#f8fafc;">${labels.map(l => `<th style="padding:7px;font-size:12px;text-align:right;">${l}</th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${labels.length}" style="text-align:center;padding:14px;color:#999;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª</td></tr>`}</tbody>
    </table></div></div>`;
}

// ===== Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¬Ù…Ø§Ø¹ÙŠØ© =====
window.loadBulkClassStudents = async function(classId) {
    var listEl = document.getElementById('bulk-students-list');
    var actionsBar = document.getElementById('bulk-actions-bar');
    actionsBar.style.display = 'none';
    if (!classId) { listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-weight:700;">ðŸ‘† Ø§Ø®ØªØ± ÙØµÙ„Ø§Ù‹ Ù„Ø¹Ø±Ø¶ Ø·Ù„Ø§Ø¨Ù‡</p>'; return; }
    listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>';
    var schoolId = getActiveSchoolId();
    var snap = await getDocs(query(collection(db, 'students'), where('classId', '==', classId), where('schoolId', '==', schoolId)));
    currentClassStudents = [];
    snap.forEach(d => currentClassStudents.push({ id: d.id, ...d.data() }));
    currentClassStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    if (!currentClassStudents.length) { listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-weight:700;">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨ Ø¨Ù‡Ø°Ø§ Ø§Ù„ÙØµÙ„</p>'; return; }
    var html = `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:2px solid var(--line);margin-bottom:8px;">
        <input type="checkbox" id="bulk-select-all" onchange="window.toggleAllBulkStudents(this.checked)" style="width:18px;height:18px;cursor:pointer;">
        <label for="bulk-select-all" style="font-weight:700;font-size:13px;cursor:pointer;">ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„ (${currentClassStudents.length} Ø·Ø§Ù„Ø¨)</label></div>`;
    currentClassStudents.forEach((s, i) => {
        html += `<div style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f0f0f0;">
            <input type="checkbox" class="bulk-student-cb" data-idx="${i}" onchange="window.updateBulkSelectionCount()" style="width:17px;height:17px;cursor:pointer;">
            <span style="font-weight:700;font-size:13.5px;">${s.name}</span>
            <span style="color:#999;font-size:11px;margin-right:auto;">${s.parentPhone || ''}</span></div>`;
    });
    listEl.innerHTML = html;
    var targetSelect = document.getElementById('bulk-target-class');
    targetSelect.innerHTML = '<option value="">-- Ø§Ù†Ù‚Ù„ Ø¥Ù„Ù‰ ÙØµÙ„ --</option>' + allClassesCache.filter(c => c !== classId).map(c => `<option value="${c}">${c}</option>`).join('');
};

window.toggleAllBulkStudents = function(checked) {
    document.querySelectorAll('.bulk-student-cb').forEach(cb => cb.checked = checked);
    window.updateBulkSelectionCount();
};

window.updateBulkSelectionCount = function() {
    var checked = document.querySelectorAll('.bulk-student-cb:checked').length;
    document.getElementById('bulk-selected-count').textContent = `${checked} Ø·Ø§Ù„Ø¨ Ù…Ø­Ø¯Ø¯`;
    document.getElementById('bulk-actions-bar').style.display = checked > 0 ? 'flex' : 'none';
};

window.executeBulkTransfer = async function() {
    var targetClass = document.getElementById('bulk-target-class').value;
    if (!targetClass) { window.showToast('âš ï¸ Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù Ø£ÙˆÙ„Ø§Ù‹', 'info'); return; }
    var selectedIdxs = [...document.querySelectorAll('.bulk-student-cb:checked')].map(cb => parseInt(cb.dataset.idx));
    if (!selectedIdxs.length) { window.showToast('âš ï¸ Ù„Ù… ÙŠØªÙ… ØªØ­Ø¯ÙŠØ¯ Ø£ÙŠ Ø·Ø§Ù„Ø¨', 'info'); return; }
    var selectedStudents = selectedIdxs.map(i => currentClassStudents[i]);
    if (!confirm(`Ù†Ù‚Ù„ ${selectedStudents.length} Ø·Ø§Ù„Ø¨ Ø¥Ù„Ù‰ Ø§Ù„ÙØµÙ„ ${targetClass}ØŸ`)) return;
    try {
        var batch = writeBatch(db);
        selectedStudents.forEach(s => { batch.update(doc(db, 'students', s.id), { classId: targetClass }); });
        await batch.commit();
        window.showToast(`âœ… ØªÙ… Ù†Ù‚Ù„ ${selectedStudents.length} Ø·Ø§Ù„Ø¨ Ø¥Ù„Ù‰ ${targetClass}`);
        window.loadBulkClassStudents(document.getElementById('bulk-class-select').value);
        await loadAllStudents();
    } catch (e) { window.showToast('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ù†Ù‚Ù„: ' + e.message, 'error'); }
};

// ===== Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ù„Ø§Ø¨ =====
window.openDeleteAllModal = async function() {
    var schoolId = getActiveSchoolId();
    var currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
    document.getElementById('delete-all-count').textContent = snap.size;
    document.getElementById('delete-all-school-name').textContent = currentUser.schoolName || schoolId;
    document.getElementById('delete-all-confirm-input').value = '';
    document.getElementById('delete-all-modal').style.display = 'flex';
};

window.closeDeleteAllModal = function() { document.getElementById('delete-all-modal').style.display = 'none'; };

window.executeDeleteAllStudents = async function() {
    var currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var expectedName = (currentUser.schoolName || getActiveSchoolId() || '').trim();
    var typedName = document.getElementById('delete-all-confirm-input').value.trim();
    if (typedName !== expectedName) { window.showToast('âŒ Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ù…ÙƒØªÙˆØ¨ ØºÙŠØ± Ù…Ø·Ø§Ø¨Ù‚', 'error'); return; }
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        var batch = writeBatch(db);
        var count = 0;
        for (const d of snap.docs) {
            var archiveRef = doc(collection(db, 'deleted_students'));
            batch.set(archiveRef, { ...d.data(), originalId: d.id, deletedAt: serverTimestamp(), deletedBy: currentUser.name || 'unknown' });
            batch.delete(doc(db, 'students', d.id));
            count++;
        }
        await batch.commit();
        window.closeDeleteAllModal();
        window.showToast(`âœ… ØªÙ… Ù†Ù‚Ù„ ${count} Ø·Ø§Ù„Ø¨ Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù…Ø­Ø°ÙˆÙÙŠÙ†`);
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { window.showToast('âŒ Ø®Ø·Ø£: ' + e.message, 'error'); }
};