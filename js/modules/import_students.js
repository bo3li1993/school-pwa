import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, getDocs, query, where, writeBatch, doc, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initImportModule() {
    var container = document.getElementById('tab-import');
    if (!container) return;

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--sky);">
        <h2><i class="bi bi-upload" style="color:var(--sky);"></i> Ø±ÙØ¹ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø§Ø¨ Ù…Ù† Excel</h2>
        <p style="font-size:13px; color:#666; margin-bottom:16px; line-height:1.8;">
            Ø§Ø±ÙØ¹ Ù…Ù„Ù Excel ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø§Ø¨. <b>Ø§Ù„Ø£Ø¹Ù…Ø¯Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©:</b> Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ØŒ Ø§Ù„ØµÙØŒ Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)ØŒ Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± (Ø§Ø®ØªÙŠØ§Ø±ÙŠ).
        </p>

        <!-- ØªÙ†Ø²ÙŠÙ„ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ -->
        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:14px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div>
                <p style="font-weight:700; font-size:13px; color:#166534; margin:0 0 4px;">ðŸ“¥ Ù†Ù…ÙˆØ°Ø¬ Excel Ø¬Ø§Ù‡Ø²</p>
                <p style="font-size:12px; color:#4ade80; margin:0;">Ù†Ø²Ù‘Ù„ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ ÙˆØ§Ù…Ù„Ø£Ù‡ Ø«Ù… Ø§Ø±ÙØ¹Ù‡</p>
            </div>
            <button onclick="window.downloadImportTemplate()"
                style="background:#16a34a; color:#fff; border:none; padding:10px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                <i class="bi bi-file-earmark-excel-fill"></i> ØªÙ†Ø²ÙŠÙ„ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬
            </button>
        </div>

        <!-- Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø±ÙØ¹ -->
        <div id="import-drop-zone"
            style="border:2.5px dashed var(--sky); border-radius:12px; padding:40px 20px; text-align:center; cursor:pointer; transition:background .2s; margin-bottom:16px;"
            onclick="document.getElementById('import-file-input').click()"
            ondragover="event.preventDefault(); this.style.background='#e0f2fe';"
            ondragleave="this.style.background='';"
            ondrop="window.handleImportDrop(event)">
            <i class="bi bi-cloud-upload-fill" style="font-size:36px; color:var(--sky); display:block; margin-bottom:8px;"></i>
            <p style="font-weight:700; font-size:14px; color:var(--sky); margin:0 0 4px;">Ø§Ø³Ø­Ø¨ Ù…Ù„Ù Excel Ù‡Ù†Ø§ Ø£Ùˆ Ø§Ø¶ØºØ· Ù„Ù„Ø§Ø®ØªÙŠØ§Ø±</p>
            <p style="font-size:12px; color:#aaa; margin:0;">xlsx Ø£Ùˆ xls ÙÙ‚Ø·</p>
        </div>
        <input type="file" id="import-file-input" accept=".xlsx,.xls" style="display:none;" onchange="window.handleImportFile(this.files[0])">

        <!-- Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª -->
        <div id="import-preview" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                <div>
                    <span id="import-count-badge" style="background:var(--ice); color:var(--sky); padding:6px 14px; border-radius:8px; font-weight:900; font-size:14px;"></span>
                    <span id="import-dup-badge" style="display:none; background:#fef2f2; color:#dc2626; padding:6px 14px; border-radius:8px; font-weight:900; font-size:13px; margin-right:8px;"></span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="window.resetImport()"
                        style="background:#fff; color:#666; border:1.5px solid #e5e7eb; padding:8px 14px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                        <i class="bi bi-x-circle"></i> Ø¥Ù„ØºØ§Ø¡
                    </button>
                    <button id="btn-start-import" onclick="window.executeImport()"
                        style="background:var(--sky); color:#fff; border:none; padding:8px 18px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:700; cursor:pointer;">
                        <i class="bi bi-cloud-upload-fill"></i> Ø±ÙØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
                    </button>
                </div>
            </div>

            <!-- Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© -->
            <div style="overflow-x:auto; max-height:350px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:var(--navy); color:#fff; position:sticky; top:0;">
                            <th style="padding:10px 12px;">#</th>
                            <th style="padding:10px 12px;">Ø§Ù„Ø§Ø³Ù…</th>
                            <th style="padding:10px 12px;">Ø§Ù„ØµÙ</th>
                            <th style="padding:10px 12px;">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ</th>
                            <th style="padding:10px 12px;">Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±</th>
                            <th style="padding:10px 12px;">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                        </tr>
                    </thead>
                    <tbody id="import-preview-tbody"></tbody>
                </table>
            </div>
        </div>

        <!-- Ø´Ø±ÙŠØ· Ø§Ù„ØªÙ‚Ø¯Ù… -->
        <div id="import-progress" style="display:none; margin-top:16px;">
            <div style="background:#f1f5f9; border-radius:8px; overflow:hidden; height:12px; margin-bottom:8px;">
                <div id="import-progress-bar" style="background:var(--sky); height:100%; width:0%; transition:width .3s; border-radius:8px;"></div>
            </div>
            <p id="import-progress-text" style="text-align:center; font-weight:700; font-size:13px; color:var(--sky); margin:0;"></p>
        </div>
    </div>

    <!-- Ø³Ø¬Ù„ Ø§Ù„Ø±ÙØ¹Ø§Øª Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© -->
    <div class="card" style="border-top:5px solid var(--gold); margin-top:16px;">
        <h3 style="font-size:15px; margin-bottom:12px;"><i class="bi bi-clock-history" style="color:var(--gold);"></i> Ø³Ø¬Ù„ Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø±ÙØ¹ Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©</h3>
        <div id="import-logs">
            <p style="text-align:center; color:#999; padding:15px;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>
        </div>
    </div>`;

    loadImportLogs();
}

// ===== ØªÙ†Ø²ÙŠÙ„ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ =====
window.downloadImportTemplate = function() {
    if (typeof XLSX === 'undefined') { window.showToast?.('Ù…ÙƒØªØ¨Ø© Excel ØºÙŠØ± Ù…Ø­Ù…Ù„Ø©', 'error'); return; }
    var data = [
        { 'Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨': 'Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø¹Ù„ÙŠ', 'Ø§Ù„ØµÙ': '6/1', 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ': '123456789012', 'Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±': '50000000' },
        { 'Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨': 'ÙÙ‡Ø¯ Ø®Ø§Ù„Ø¯ Ø§Ù„Ù…Ø·ÙŠØ±ÙŠ', 'Ø§Ù„ØµÙ': '7/2', 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ': '', 'Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±': '60000000' },
        { 'Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨': 'Ø³Ø¹Ø¯ Ù†Ø§ØµØ± Ø§Ù„Ø´Ù…Ø±ÙŠ', 'Ø§Ù„ØµÙ': '8/3', 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ': '987654321012', 'Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±': '' },
    ];
    var ws = XLSX.utils.json_to_sheet(data, { header: ['Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨', 'Ø§Ù„ØµÙ', 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ', 'Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±'] });
    ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø·Ù„Ø§Ø¨');
    XLSX.writeFile(wb, 'Ù†Ù…ÙˆØ°Ø¬_Ø±ÙØ¹_Ø§Ù„Ø·Ù„Ø§Ø¨.xlsx');
    window.showToast?.('âœ… ØªÙ… ØªÙ†Ø²ÙŠÙ„ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬');
};

// ===== Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ù„Ù =====
var importData = [];
var existingStudents = new Set();

window.handleImportDrop = function(event) {
    event.preventDefault();
    document.getElementById('import-drop-zone').style.background = '';
    var file = event.dataTransfer.files[0];
    if (file) window.handleImportFile(file);
};

window.handleImportFile = async function(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) { window.showToast?.('ÙŠØ±Ø¬Ù‰ Ø±ÙØ¹ Ù…Ù„Ù Excel ÙÙ‚Ø·', 'error'); return; }
    if (typeof XLSX === 'undefined') { window.showToast?.('Ù…ÙƒØªØ¨Ø© Excel ØºÙŠØ± Ù…Ø­Ù…Ù„Ø©', 'error'); return; }

    window.showToast?.('â³ Ø¬Ø§Ø±ÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù...');

    var reader = new FileReader();
    reader.onload = async function(e) {
        try {
            var wb = XLSX.read(e.target.result, { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (!rows.length) { window.showToast?.('Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº', 'error'); return; }

            // Ø¬Ù„Ø¨ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ÙŠÙ† Ù„Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØªÙƒØ±Ø§Ø±
            var schoolId = getActiveSchoolId();
            var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
            existingStudents = new Set(snap.docs.map(d => (d.data().name || '').trim()));

            importData = [];
            var errors = [];

            rows.forEach((row, idx) => {
                var name = (row['Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨'] || row['Ø§Ù„Ø§Ø³Ù…'] || row['name'] || '').toString().trim();
                var classId = (row['Ø§Ù„ØµÙ'] || row['class'] || row['classId'] || '').toString().trim();
                var civilId = (row['Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø¯Ù†ÙŠ'] || row['civil'] || '').toString().trim();
                var parentPhone = (row['Ù‡Ø§ØªÙ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±'] || row['Ù‡Ø§ØªÙ'] || row['phone'] || '').toString().trim();

                if (!name) { errors.push(`Ø³Ø·Ø± ${idx + 2}: Ø§Ø³Ù… ÙØ§Ø±Øº`); return; }
                if (!classId) { errors.push(`Ø³Ø·Ø± ${idx + 2}: ØµÙ ÙØ§Ø±Øº`); return; }

                importData.push({
                    name, classId, civilId, parentPhone, schoolId,
                    isDuplicate: existingStudents.has(name)
                });
            });

            if (errors.length) window.showToast?.(`âš ï¸ ${errors.length} Ø³Ø·Ø± Ø¨Ù‡ Ù…Ø´ÙƒÙ„Ø© â€” ØªØ¬Ø§Ù‡Ù„Ù‡Ø§ ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©`, 'warning');

            renderImportPreview();

        } catch(err) {
            window.showToast?.('âŒ Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
};

function renderImportPreview() {
    var dups = importData.filter(s => s.isDuplicate).length;
    var newCount = importData.length - dups;

    document.getElementById('import-count-badge').textContent = `${importData.length} Ø·Ø§Ù„Ø¨ (${newCount} Ø¬Ø¯ÙŠØ¯)`;

    var dupBadge = document.getElementById('import-dup-badge');
    if (dups > 0) {
        dupBadge.style.display = 'inline-block';
        dupBadge.textContent = `${dups} Ù…ÙƒØ±Ø± â€” Ø³ÙŠØªÙ… ØªØ¬Ø§Ù‡Ù„Ù‡`;
    } else {
        dupBadge.style.display = 'none';
    }

    var tbody = document.getElementById('import-preview-tbody');
    tbody.innerHTML = importData.map((s, i) => `
        <tr style="border-bottom:1px solid #f0f0f0; ${s.isDuplicate ? 'background:#fef9c3; opacity:.7;' : ''}">
            <td style="padding:8px 12px; color:#999; font-size:12px;">${i + 1}</td>
            <td style="padding:8px 12px; font-weight:700;">${s.name}</td>
            <td style="padding:8px 12px;"><span style="background:var(--ice); color:var(--sky); padding:2px 8px; border-radius:5px; font-size:12px; font-weight:700;">${s.classId}</span></td>
            <td style="padding:8px 12px; font-size:12px; color:#666;">${s.civilId || '-'}</td>
            <td style="padding:8px 12px; font-size:12px;">${s.parentPhone || '-'}</td>
            <td style="padding:8px 12px;">
                ${s.isDuplicate
                    ? '<span style="background:#fef2f2; color:#dc2626; padding:2px 8px; border-radius:5px; font-size:11px; font-weight:700;">Ù…ÙƒØ±Ø±</span>'
                    : '<span style="background:#f0fdf4; color:#16a34a; padding:2px 8px; border-radius:5px; font-size:11px; font-weight:700;">Ø¬Ø¯ÙŠØ¯</span>'}
            </td>
        </tr>`).join('');

    document.getElementById('import-preview').style.display = 'block';
    document.getElementById('import-drop-zone').style.display = 'none';
}

window.resetImport = function() {
    importData = [];
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-drop-zone').style.display = 'block';
    document.getElementById('import-file-input').value = '';
    document.getElementById('import-progress').style.display = 'none';
};

// ===== ØªÙ†ÙÙŠØ° Ø§Ù„Ø±ÙØ¹ =====
window.executeImport = async function() {
    var newStudents = importData.filter(s => !s.isDuplicate);
    if (!newStudents.length) { window.showToast?.('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø¬Ø¯ÙŠØ¯Ø© Ù„Ù„Ø±ÙØ¹', 'warning'); return; }
    if (!confirm(`Ø±ÙØ¹ ${newStudents.length} Ø·Ø§Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ØŸ`)) return;

    document.getElementById('btn-start-import').disabled = true;
    document.getElementById('import-progress').style.display = 'block';

    var progressBar = document.getElementById('import-progress-bar');
    var progressText = document.getElementById('import-progress-text');

    try {
        var schoolId = getActiveSchoolId();
        var batchSize = 400;
        var total = newStudents.length;
        var done = 0;

        for (var i = 0; i < total; i += batchSize) {
            var chunk = newStudents.slice(i, i + batchSize);
            var batch = writeBatch(db);
            chunk.forEach(s => {
                var ref = doc(collection(db, 'students'));
                batch.set(ref, {
                    name: s.name,
                    classId: s.classId,
                    civilId: s.civilId,
                    parentPhone: s.parentPhone,
                    schoolId: s.schoolId,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            done += chunk.length;

            var pct = Math.round((done / total) * 100);
            progressBar.style.width = pct + '%';
            progressText.textContent = `Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹... ${done} / ${total} Ø·Ø§Ù„Ø¨`;
        }

        // ØªØ³Ø¬ÙŠÙ„ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø±ÙØ¹
        await addDoc(collection(db, 'import_logs'), {
            schoolId,
            count: total,
            duplicatesSkipped: importData.length - total,
            performedAt: serverTimestamp(),
            performedBy: JSON.parse(localStorage.getItem('hs_user') || '{}').name || 'admin'
        });

        progressText.textContent = `âœ… ØªÙ… Ø±ÙØ¹ ${total} Ø·Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­!`;
        progressBar.style.background = '#16a34a';
        window.showToast?.(`âœ… ØªÙ… Ø±ÙØ¹ ${total} Ø·Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­`);
        setTimeout(() => { window.resetImport(); loadImportLogs(); }, 2000);

    } catch(e) {
        progressText.textContent = 'âŒ Ø®Ø·Ø£: ' + e.message;
        progressBar.style.background = '#dc2626';
        document.getElementById('btn-start-import').disabled = false;
        window.showToast?.('âŒ ' + e.message, 'error');
    }
};

// ===== Ø³Ø¬Ù„ Ø§Ù„Ø±ÙØ¹Ø§Øª =====
async function loadImportLogs() {
    var el = document.getElementById('import-logs');
    if (!el) return;
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db, 'import_logs'), where('schoolId', '==', schoolId)));
        if (snap.empty) { el.innerHTML = '<p style="text-align:center; color:#999; padding:15px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù…Ù„ÙŠØ§Øª Ø±ÙØ¹ Ø³Ø§Ø¨Ù‚Ø©</p>'; return; }
        var docs = snap.docs.sort((a, b) => (b.data().performedAt?.seconds || 0) - (a.data().performedAt?.seconds || 0));
        var html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
        html += '<thead><tr style="background:#f8fafc;"><th style="padding:8px;">Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th style="padding:8px; text-align:center;">Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø±ÙÙˆØ¹ÙŠÙ†</th><th style="padding:8px; text-align:center;">Ù…ÙƒØ±Ø±Ø§Øª ØªØ¬Ø§Ù‡Ù„Øª</th><th style="padding:8px;">Ø¨ÙˆØ§Ø³Ø·Ø©</th></tr></thead><tbody>';
        docs.forEach(d => {
            var log = d.data();
            var dateStr = log.performedAt?.toDate ? log.performedAt.toDate().toLocaleDateString('ar-KW') : '-';
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; color:#666;">${dateStr}</td>
                <td style="padding:8px; text-align:center; font-weight:700; color:#16a34a;">${log.count}</td>
                <td style="padding:8px; text-align:center; color:#dc2626;">${log.duplicatesSkipped || 0}</td>
                <td style="padding:8px; font-weight:700;">${log.performedBy || '-'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        el.innerHTML = html;
    } catch(e) {
        el.innerHTML = `<p style="color:red; padding:10px;">âŒ ${e.message}</p>`;
    }
}
