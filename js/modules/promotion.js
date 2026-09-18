import { db, getActiveSchoolId, auth } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initPromotionModule() {
    var container = document.getElementById('tab-promotion');
    if (!container) return;

    var now = new Date();
    var startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    var currentYearLabel = `${startYear}-${startYear + 1}`;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--gold);">
        <h2><i class="bi bi-arrow-up-circle-fill" style="color:var(--gold);"></i> Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ø³Ù†ÙˆÙŠ Ù„Ù„Ø·Ù„Ø§Ø¨</h2>
        <p style="font-size:13px; color:#666; margin-bottom:15px; line-height:1.8;">
            Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙŠÙ†Ù‚Ù„ <b>ÙƒÙ„ Ø·Ø§Ù„Ø¨ ØµÙØ§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ù„Ù„Ø£Ø¹Ù„Ù‰</b> (Ù†ÙØ³ Ø§Ù„Ø´Ø¹Ø¨Ø©)ØŒ ÙˆÙŠÙ†Ù‚Ù„ Ø·Ù„Ø§Ø¨ Ø§Ù„ØµÙ Ø§Ù„ØªØ§Ø³Ø¹ Ù„Ø£Ø±Ø´ÙŠÙ "Ø§Ù„Ø®Ø±ÙŠØ¬ÙŠÙ†".
            ÙƒÙ„ Ø³Ø¬Ù„Ø§Øª Ø§Ù„ØºÙŠØ§Ø¨ ÙˆØ§Ù„Ø³Ù„ÙˆÙƒ ÙˆØ§Ù„Ø§Ø³ØªØ¦Ø°Ø§Ù† ÙˆØ§Ù„Ø¹ÙŠØ§Ø¯Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØªÙÙˆØ³ÙŽÙ… ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© <b>${currentYearLabel}</b> Ù‚Ø¨Ù„ Ø§Ù„ØªØ±Ø­ÙŠÙ„ØŒ ÙˆØªØ¨Ù‚Ù‰ Ù…Ø­ÙÙˆØ¸Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø§Ø·Ù„Ø§Ø¹ Ù…Ù† ØªØ¨ÙˆÙŠØ¨ "Ø§Ù„Ø£Ø±Ø´ÙŠÙ".
        </p>
        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:14px; margin-bottom:16px;">
            <p style="font-size:12.5px; color:#92400e; font-weight:700;">
                <i class="bi bi-exclamation-triangle-fill"></i> ØªÙ†Ø¨ÙŠÙ‡: Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙŠÙÙØ¶ÙŽÙ‘Ù„ ØªÙ†ÙÙŠØ°Ù‡ <b>Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© ÙÙ‚Ø·</b> ÙÙŠ Ø¨Ø¯Ø§ÙŠØ© ÙƒÙ„ Ø¹Ø§Ù… Ø¯Ø±Ø§Ø³ÙŠ Ø¬Ø¯ÙŠØ¯. Ù„Ø§ ØªÙƒØ±Ø±Ù‡ Ø®Ù„Ø§Ù„ Ù†ÙØ³ Ø§Ù„Ø¹Ø§Ù….
            </p>
        </div>
        <div id="promotion-preview" style="margin-bottom:16px;">
            <p style="text-align:center; color:#999; padding:15px;">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ø¶ÙŠØ± Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªØ±Ø­ÙŠÙ„...</p>
        </div>
        <button id="btn-start-promotion" onclick="window.openPromotionModal()"
            style="width:100%; background:var(--gold); color:#fff; border:none; padding:14px; border-radius:10px; font-weight:900; font-size:15px; cursor:pointer;">
            <i class="bi bi-arrow-up-circle-fill"></i> Ø¨Ø¯Ø¡ Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ø³Ù†ÙˆÙŠ Ù„Ø¹Ø§Ù… ${currentYearLabel}
        </button>
    </div>

    <div class="card">
        <h3 style="font-size:14px; margin-bottom:10px;"><i class="bi bi-clock-history"></i> Ø³Ø¬Ù„ Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©</h3>
        <div id="promotion-logs-list">
            <p style="text-align:center; color:#999; padding:15px;">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>
        </div>
    </div>

    <!-- Modal ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ±Ø­ÙŠÙ„ -->
    <div id="promotion-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:9999; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:440px; width:100%; direction:rtl;">
            <h3 style="color:var(--danger-color); font-weight:900; margin-bottom:10px;">
                <i class="bi bi-exclamation-octagon-fill"></i> ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ø³Ù†ÙˆÙŠ
            </h3>
            <p style="font-size:13px; color:#666; margin-bottom:14px; line-height:1.8;">
                Ø³ÙŠØªÙ… ØªØ±Ø­ÙŠÙ„ <b id="pm-student-count">-</b> Ø·Ø§Ù„Ø¨ØŒ ÙˆØ£Ø±Ø´ÙØ© <b id="pm-grad-count">-</b> Ø®Ø±ÙŠØ¬ Ù…Ù† Ø§Ù„ØµÙ Ø§Ù„ØªØ§Ø³Ø¹.
                Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŒ Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ù…Ø¯Ø±Ø³ØªÙƒ Ø¨Ø§Ù„Ø¶Ø¨Ø·: <b id="pm-school-name" style="color:var(--danger-color);"></b>
            </p>
            <input type="text" id="pm-confirm-input" placeholder="Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ù‡Ù†Ø§"
                style="width:100%; padding:11px; border:1.5px solid var(--line); border-radius:8px; margin-bottom:14px; box-sizing:border-box;">
            <div id="pm-progress" style="display:none; text-align:center; padding:15px; font-weight:700; color:var(--gold);">
                â³ Ø¬Ø§Ø±ÙŠ ØªÙ†ÙÙŠØ° Ø§Ù„ØªØ±Ø­ÙŠÙ„ØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± ÙˆÙ„Ø§ ØªØºÙ„Ù‚ Ø§Ù„ØµÙØ­Ø©...
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="window.executePromotion()" id="btn-confirm-promotion"
                    style="flex:1; background:var(--danger-color); color:#fff; border:none; padding:11px; border-radius:8px; font-weight:700; cursor:pointer;">
                    ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹
                </button>
                <button onclick="window.closePromotionModal()"
                    style="background:#fff; color:var(--mid); border:1.5px solid var(--line); padding:11px 18px; border-radius:8px; font-weight:700; cursor:pointer;">
                    Ø¥Ù„ØºØ§Ø¡
                </button>
            </div>
        </div>
    </div>`;

    loadPromotionPreview();
    loadPromotionLogs();
}

async function loadPromotionPreview() {
    var previewEl = document.getElementById('promotion-preview');
    var schoolId = getActiveSchoolId();

    try {
        var snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        var promoted = 0, graduated = 0;
        var byGrade = {};

        snap.forEach(d => {
            var classId = d.data().classId || '';
            var parts = classId.split('/');
            if (parts.length !== 2) return;
            var grade = parseInt(parts[0]);
            if (isNaN(grade)) return;
            byGrade[grade] = (byGrade[grade] || 0) + 1;
            if (grade >= 9) graduated++; else promoted++;
        });

        window._promotionCounts = { promoted, graduated, total: snap.size };

        var html = `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px;">`;
        Object.keys(byGrade).sort().forEach(grade => {
            var isGrad = parseInt(grade) >= 9;
            html += `
            <div style="text-align:center; background:${isGrad?'#fef2f2':'#f0fdf4'}; padding:12px; border-radius:8px;">
                <div style="font-size:22px; font-weight:900; color:${isGrad?'var(--danger-color)':'var(--success-color)'};">${byGrade[grade]}</div>
                <div style="font-size:11px; color:#666; font-weight:700;">${isGrad ? 'ØµÙ '+grade+' (ØªØ®Ø±Ù‘Ø¬)' : 'ØµÙ '+grade+' â†’ '+(parseInt(grade)+1)}</div>
            </div>`;
        });
        html += `</div>`;
        previewEl.innerHTML = html;
    } catch (e) {
        previewEl.innerHTML = `<p style="color:red; text-align:center; padding:15px;">âŒ Ø®Ø·Ø£: ${e.message}</p>`;
    }
}

async function loadPromotionLogs() {
    var listEl = document.getElementById('promotion-logs-list');
    var schoolId = getActiveSchoolId();

    try {
        var snap = await getDocs(query(collection(db, 'promotion_logs'), where('schoolId', '==', schoolId)));
        if (snap.empty) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; padding:15px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù…Ù„ÙŠØ§Øª ØªØ±Ø­ÙŠÙ„ Ø³Ø§Ø¨Ù‚Ø©</p>';
            return;
        }
        var docs = snap.docs.sort((a, b) => (b.data().performedAt?.seconds || 0) - (a.data().performedAt?.seconds || 0));
        var html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
        html += '<thead><tr style="background:#f8fafc;"><th style="padding:8px;">Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©</th><th style="padding:8px;">Ù…ÙØ±Ø­ÙŽÙ‘Ù„</th><th style="padding:8px;">Ø®Ø±ÙŠØ¬ÙˆÙ†</th><th style="padding:8px;">Ø§Ù„ØªØ§Ø±ÙŠØ®</th></tr></thead><tbody>';
        docs.forEach(d => {
            var log = d.data();
            var dateStr = log.performedAt?.toDate ? log.performedAt.toDate().toLocaleDateString('ar-KW') : '-';
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; font-weight:700;">${log.yearLabel}</td>
                <td style="padding:8px; text-align:center; color:var(--success-color); font-weight:700;">${log.promoted}</td>
                <td style="padding:8px; text-align:center; color:var(--gold); font-weight:700;">${log.graduated}</td>
                <td style="padding:8px; color:#666;">${dateStr}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<p style="color:red; text-align:center; padding:15px;">âŒ Ø®Ø·Ø£: ${e.message}</p>`;
    }
}

window.openPromotionModal = function() {
    var counts = window._promotionCounts || { promoted: 0, graduated: 0 };
    var currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');

    document.getElementById('pm-student-count').textContent = counts.promoted;
    document.getElementById('pm-grad-count').textContent = counts.graduated;
    document.getElementById('pm-school-name').textContent = currentUser.schoolName || getActiveSchoolId();
    document.getElementById('pm-confirm-input').value = '';
    document.getElementById('pm-progress').style.display = 'none';
    document.getElementById('btn-confirm-promotion').style.display = 'block';
    document.getElementById('promotion-modal').style.display = 'flex';
};

window.closePromotionModal = function() {
    document.getElementById('promotion-modal').style.display = 'none';
};

window.executePromotion = async function() {
    var currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var expectedName = (currentUser.schoolName || getActiveSchoolId() || '').trim();
    var typedName = document.getElementById('pm-confirm-input').value.trim();

    if (typedName !== expectedName) {
        window.showToast('âŒ Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ù…ÙƒØªÙˆØ¨ ØºÙŠØ± Ù…Ø·Ø§Ø¨Ù‚ â€” ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©', 'error');
        return;
    }

    document.getElementById('pm-progress').style.display = 'block';
    document.getElementById('btn-confirm-promotion').style.display = 'none';

    try {
        var { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        var functions = getFunctions(auth.app, 'me-central1');
        var promoteFn = httpsCallable(functions, 'promoteStudents');

        var schoolId = getActiveSchoolId();
        var result = await promoteFn({ schoolId });

        window.closePromotionModal();
        window.showToast(`âœ… ØªÙ… Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø¨Ù†Ø¬Ø§Ø­: ${result.data.promoted} Ø·Ø§Ù„Ø¨ Ù…ÙØ±Ø­ÙŽÙ‘Ù„ØŒ ${result.data.graduated} Ø®Ø±ÙŠØ¬`);
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
        window.showToast('âŒ Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ±Ø­ÙŠÙ„: ' + e.message, 'error');
        document.getElementById('pm-progress').style.display = 'none';
        document.getElementById('btn-confirm-promotion').style.display = 'block';
    }
};
