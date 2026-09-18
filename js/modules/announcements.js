// XSS Prevention
function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, addDoc, deleteDoc, updateDoc, doc, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• onSnapshot cleanup â•â•
let _annUnsubs = [];
window._cleanupAnnouncements = function() {
    _annUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _annUnsubs = [];
};

let unsubscribeAnnouncements = null;

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// Ø§Ù„Ø¯Ø§Ù„Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…ÙˆØ¯ÙŠÙˆÙ„ Ø¹Ù†Ø¯ ÙØªØ­ Ø§Ù„ØªØ¨ÙˆÙŠØ¨
export function initAnnouncementsModule() {
    var container = document.getElementById('tab-announcements');
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px; font-family: 'Cairo', sans-serif; direction: rtl; padding: 8px;">

            <!-- Ø¨Ø·Ø§Ù‚Ø© Ø¥Ø¶Ø§ÙØ© Ø¥Ø¹Ù„Ø§Ù† -->
            <div class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="color: #0b2545; font-weight: 900; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-megaphone-fill" style="color: #d4920a;"></i> Ù†Ø´Ø± Ø¥Ø¹Ù„Ø§Ù† Ø£Ùˆ ØªØ¹Ù…ÙŠÙ… Ø¬Ø¯ÙŠØ¯ Ù„Ù„Ù…Ù†Ø´Ø£Ø©
                </h2>

                <form id="form-add-announcement" onsubmit="window.handlePublishAnnouncement(event)">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† / Ø§Ù„Ø®Ø¨Ø± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ</label>
                        <input type="text" id="ann-title" placeholder="Ù…Ø«Ø§Ù„: ØªØ¹Ù…ÙŠÙ… Ø¨Ø´Ø£Ù† Ø¬Ø¯Ø§ÙˆÙ„ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© Ø§Ù„Ø£ÙˆÙ„Ù‰" required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none; font-family: 'Cairo', sans-serif; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">ØªÙØ§ØµÙŠÙ„ ÙˆÙ…Ø­ØªÙˆÙ‰ Ø§Ù„ØªØ¹Ù…ÙŠÙ… Ø¨Ø§Ù„ÙƒØ§Ù…Ù„</label>
                        <textarea id="ann-content" rows="4" placeholder="Ø§ÙƒØªØ¨ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† ÙˆØ§Ù„ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ù…ÙˆØ¬Ù‡Ø© Ù„Ù„Ù‡ÙŠØ¦Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ© Ø£Ùˆ Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ± Ù‡Ù†Ø§..." required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none; resize: vertical; font-family: 'Cairo', sans-serif; box-sizing: border-box;"></textarea>
                    </div>

                    <!-- Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© â€” ÙÙƒØ±Ø© Ø¬Ø¯ÙŠØ¯Ø© -->
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">Ø£Ù‡Ù…ÙŠØ© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†</label>
                        <select id="ann-priority" style="width: 100%; padding: 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13.5px; font-family: 'Cairo', sans-serif; background: #fff;">
                            <option value="normal">ðŸ”µ Ø¹Ø§Ø¯ÙŠ</option>
                            <option value="important">ðŸŸ¡ Ù…Ù‡Ù…</option>
                            <option value="urgent">ðŸ”´ Ø¹Ø§Ø¬Ù„</option>
                        </select>
                    </div>

                    <!-- Ø§Ù„Ø¬Ù‡Ø© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ© â€” ÙÙƒØ±Ø© Ø¬Ø¯ÙŠØ¯Ø© -->
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">Ø§Ù„Ø¬Ù‡Ø© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©</label>
                        <select id="ann-target" style="width: 100%; padding: 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13.5px; font-family: 'Cairo', sans-serif; background: #fff;">
                            <option value="all">ðŸ‘¥ Ø§Ù„Ø¬Ù…ÙŠØ¹</option>
                            <option value="staff">ðŸ‘¨â€ðŸ« Ø§Ù„Ù‡ÙŠØ¦Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ© ÙÙ‚Ø·</option>
                            <option value="parents">ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ± ÙÙ‚Ø·</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">Ø¥Ø±ÙØ§Ù‚ ØµÙˆØ±Ø© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† Ø§Ù„ÙØ¹Ø§Ù„ÙŠØ© Ø£Ùˆ Ù„ÙˆØ­Ø© Ø§Ù„Ø´Ø±Ù (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</label>
                        <input type="file" id="ann-image-file" accept="image/*" onchange="window.processAnnouncementImage(event)" style="width: 100%; padding: 8px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #f9fafb; cursor: pointer; box-sizing: border-box;">
                        <div id="ann-image-preview" style="margin-top: 10px; display: none; align-items: center; gap: 8px;">
                            <img id="img-preview-src" src="" style="max-height: 160px; border-radius: 8px; border: 1px dashed #1a78c2; padding: 4px;">
                            <button type="button" onclick="window.clearAnnouncementImage()" style="background: #dc2626; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Cairo', sans-serif;">Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø©</button>
                        </div>
                    </div>

                    <div style="text-align: left;">
                        <button type="submit" id="btn-publish-ann" style="background: #1a78c2; color: #fff; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: 'Cairo', sans-serif;">
                            <i class="bi bi-send-fill"></i> Ø¨Ø« ÙˆÙ†Ø´Ø± Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† ÙÙˆØ±Ø§Ù‹
                        </button>
                    </div>
                </form>
            </div>

            <!-- ÙÙ„ØªØ± Ø§Ù„Ø¨Ø­Ø« â€” ÙÙƒØ±Ø© Ø¬Ø¯ÙŠØ¯Ø© -->
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <input id="ann-search" type="text" placeholder="ðŸ” Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª..." oninput="window.filterAnnouncements()" style="flex: 1; min-width: 200px; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13.5px; font-family: 'Cairo', sans-serif; outline: none;">
                <select id="ann-filter-priority" onchange="window.filterAnnouncements()" style="padding: 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; font-family: 'Cairo', sans-serif; background: #fff;">
                    <option value="all">ÙƒÙ„ Ø§Ù„Ø£Ù‡Ù…ÙŠØ©</option>
                    <option value="urgent">ðŸ”´ Ø¹Ø§Ø¬Ù„</option>
                    <option value="important">ðŸŸ¡ Ù…Ù‡Ù…</option>
                    <option value="normal">ðŸ”µ Ø¹Ø§Ø¯ÙŠ</option>
                </select>
            </div>

            <!-- Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ø§Ù„Ø­ÙŠØ© -->
            <div>
                <h3 style="color: #0b2545; font-weight: 900; font-size: 16px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="bi bi-collection-play-fill" style="color: #1a78c2;"></i> Ø¬Ø¯Ø§Ø± Ø§Ù„Ø£Ø®Ø¨Ø§Ø± ÙˆØ§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ø§Ù„Ù†Ø´Ø·Ø© Ø¨Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ø­Ø§Ù„ÙŠØ§Ù‹
                </h3>
                <div id="container-announcements-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280; font-weight: 700;">â³ Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ø±Ø§Ø¯Ø§Ø± Ø§Ù„Ø£Ø®Ø¨Ø§Ø± ÙˆØ§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ø³Ø¬Ù„Ø§Øª...</div>
                </div>
            </div>

        </div>
    `;

    window.currentAnnouncementBase64Image = "";
    window._allAnnouncements = [];
    startLiveAnnouncementsListener();
}

// Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµÙˆØ±Ø© Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø©
window.processAnnouncementImage = function(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
        window.showToast("âš ï¸ Ø§Ù„ØµÙˆØ±Ø© ÙƒØ¨ÙŠØ±Ø© Ø¬Ø¯Ø§Ù‹! ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø© Ø¨Ø­Ø¬Ù… Ø£Ù‚Ù„ Ù…Ù† 800 ÙƒÙŠÙ„ÙˆØ¨Ø§ÙŠØª.", "warning");
        event.target.value = "";
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        window.currentAnnouncementBase64Image = e.target.result;
        var previewDiv = document.getElementById('ann-image-preview');
        var imgPreview = document.getElementById('img-preview-src');
        if (previewDiv && imgPreview) {
            imgPreview.src = e.target.result;
            previewDiv.style.display = 'flex';
        }
    };
    reader.readAsDataURL(file);
};

// ØªØµÙÙŠØ± Ø®Ø§Ù†Ø© Ø§Ù„ØµÙˆØ±Ø©
window.clearAnnouncementImage = function() {
    window.currentAnnouncementBase64Image = "";
    var fileInput = document.getElementById('ann-image-file');
    var previewDiv = document.getElementById('ann-image-preview');
    if (fileInput) fileInput.value = "";
    if (previewDiv) previewDiv.style.display = "none";
};

// Ù†Ø´Ø± Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† ÙÙŠ Firestore
window.handlePublishAnnouncement = async function(event) {
    event.preventDefault();
    var schoolId = getActiveSchoolId();
    if (!schoolId) return;

    var titleEl = document.getElementById('ann-title');
    var contentEl = document.getElementById('ann-content');
    var priorityEl = document.getElementById('ann-priority');
    var targetEl = document.getElementById('ann-target');
    var btn = document.getElementById('btn-publish-ann');

    if (!titleEl.value.trim() || !contentEl.value.trim()) {
        window.showToast("âš ï¸ ÙŠØ±Ø¬Ù‰ ØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ø£ÙˆÙ„Ø§Ù‹", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "â³ Ø¬Ø§Ø±ÙŠ Ù†Ø´Ø± ÙˆØªØ¹Ù…ÙŠÙ… Ø§Ù„Ø¨Ù„Ø§Øº...";

    try {
        var userSession = JSON.parse(localStorage.getItem('hs_user') || '{}');

        await addDoc(collection(db, 'announcements'), {
            schoolId: schoolId,
            title: titleEl.value.trim(),
            content: contentEl.value.trim(),
            imageUrl: window.currentAnnouncementBase64Image || "",
            priority: priorityEl?.value || "normal",
            target: targetEl?.value || "all",
            publisherName: userSession.name || "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©",
            dateStr: getTodayISO(),
            timeStr: new Date().toLocaleTimeString('ar-KW', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
        });

        window.showToast("âœ… ØªÙ… Ø¨Ø« ÙˆÙ†Ø´Ø± Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† Ø¨Ù†Ø¬Ø§Ø­ ÙÙŠ Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ©.");
        titleEl.value = "";
        contentEl.value = "";
        if (priorityEl) priorityEl.value = "normal";
        if (targetEl) targetEl.value = "all";
        window.clearAnnouncementImage();

    } catch (error) {
        console.error("Error publishing announcement:", error);
        window.showToast("âŒ ÙØ´Ù„ Ø§Ù„Ù†Ø´Ø± Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠ: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-fill"></i> Ø¨Ø« ÙˆÙ†Ø´Ø± Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† ÙÙˆØ±Ø§Ù‹';
    }
};

// ÙÙ„ØªØ±Ø© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª
window.filterAnnouncements = function() {
    var search = (document.getElementById('ann-search')?.value || '').trim().toLowerCase();
    var priority = document.getElementById('ann-filter-priority')?.value || 'all';

    var filtered = (window._allAnnouncements || []).filter(ann => {
        var matchSearch = !search || ann.title.toLowerCase().includes(search) || ann.content.toLowerCase().includes(search);
        var matchPriority = priority === 'all' || ann.priority === priority;
        return matchSearch && matchPriority;
    });

    renderAnnouncements(filtered);
};

// Ø¹Ø±Ø¶ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª
function renderAnnouncements(list) {
    var listContainer = document.getElementById('container-announcements-list');
    if (!listContainer) return;

    if (!list || list.length === 0) {
        listContainer.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:50px; background:#f9fafb; border:1px dashed #cbd5e1; border-radius:12px; color:#6b7280; font-weight:700;">
                <i class="bi bi-megaphone" style="font-size:32px; display:block; margin-bottom:8px; color:#94a3b8;"></i>
                Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ø£Ùˆ ØªØ¹Ø§Ù…ÙŠÙ… Ù†Ø´Ø·Ø© Ù…Ù†Ø´ÙˆØ±Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ø­Ø§Ù„ÙŠØ§Ù‹.
            </div>
        `;
        return;
    }

    var priorityColors = { urgent: '#dc2626', important: '#d97706', normal: '#1a78c2' };
    var priorityLabels = { urgent: 'ðŸ”´ Ø¹Ø§Ø¬Ù„', important: 'ðŸŸ¡ Ù…Ù‡Ù…', normal: 'ðŸ”µ Ø¹Ø§Ø¯ÙŠ' };
    var targetLabels = { all: 'ðŸ‘¥ Ø§Ù„Ø¬Ù…ÙŠØ¹', staff: 'ðŸ‘¨â€ðŸ« Ø§Ù„Ù‡ÙŠØ¦Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©', parents: 'ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Ø£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ±' };

    listContainer.innerHTML = list.map(ann => `
        <div class="card" style="background:#fff; border:1px solid #e5e7eb; border-right: 4px solid ${priorityColors[ann.priority] || '#1a78c2'}; border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); position:relative;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <span style="background:${priorityColors[ann.priority] || '#1a78c2'}22; color:${priorityColors[ann.priority] || '#1a78c2'}; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:800;">${priorityLabels[ann.priority] || 'ðŸ”µ Ø¹Ø§Ø¯ÙŠ'}</span>
                    <span style="background:#f3f4f6; color:#6b7280; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700;">${targetLabels[ann.target] || 'ðŸ‘¥ Ø§Ù„Ø¬Ù…ÙŠØ¹'}</span>
                </div>
                ${ann.imageUrl ? `<img src="${ann.imageUrl}" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:12px; border:1px solid #f3f4f6;">` : ''}
                <h4 style="color:#0b2545; font-weight:900; font-size:15px; margin-bottom:6px; line-height:1.4;">${escHtml(ann.title)}</h4>
                <p style="color:#374151; font-size:13px; font-weight:600; line-height:1.6; white-space:pre-wrap; margin-bottom:12px;">${escHtml(ann.content)}</p>
            </div>

            <div style="border-top:1px dashed #f3f4f6; padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="font-size:11px; color:#6b7280; font-weight:700;">
                    <span><i class="bi bi-person-circle"></i> ${escHtml(ann.publisherName)}</span><br>
                    <span style="color:#9ca3af; margin-top:2px; display:inline-block;"><i class="bi bi-clock"></i> ${escHtml(ann.dateStr)} â€” ${escHtml(ann.timeStr)}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="window.handleEditAnnouncement('${ann.id}', \`${escHtml(ann.title)}\`, \`${escHtml(ann.content)}\`)" style="background:rgba(26,120,194,0.08); color:#1a78c2; border:1px solid rgba(26,120,194,0.15); padding:6px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:11px;"><i class="bi bi-pencil-fill"></i> ØªØ¹Ø¯ÙŠÙ„</button>
                    <button onclick="window.handleDeleteAnnouncement('${ann.id}')" style="background:rgba(220,38,38,0.08); color:#dc2626; border:1px solid rgba(220,38,38,0.15); padding:6px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:11px;"><i class="bi bi-trash3-fill"></i> Ø­Ø°Ù</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Ø§Ù„Ù…Ø³ØªÙ…Ø¹ Ø§Ù„Ø­ÙŠ Ù„Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª
function startLiveAnnouncementsListener() {
    var schoolId = getActiveSchoolId();
    if (!schoolId) return;

    if (unsubscribeAnnouncements) unsubscribeAnnouncements();

    var q = query(
        collection(db, 'announcements'),
        where('schoolId', '==', schoolId)
    );

    unsubscribeAnnouncements = onSnapshot(q, (snapshot) => {
        var arr = [];
        snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
        arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        window._allAnnouncements = arr;
        window.filterAnnouncements();
    }, (error) => {
        console.error("Live announcements error:", error);
    });

    _annUnsubs.push(unsubscribeAnnouncements);
}

// ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†
window.handleEditAnnouncement = function(annId, currentTitle, currentContent) {
    var newTitle = prompt("Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†:", currentTitle);
    if (newTitle === null) return;
    var newContent = prompt("Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†:", currentContent);
    if (newContent === null) return;

    if (!newTitle.trim() || !newContent.trim()) {
        window.showToast("âš ï¸ Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ±Ùƒ Ø§Ù„Ø­Ù‚ÙˆÙ„ ÙØ§Ø±ØºØ©", "warning");
        return;
    }

    updateDoc(doc(db, 'announcements', annId), {
        title: newTitle.trim(),
        content: newContent.trim(),
        editedAt: new Date().toISOString()
    }).then(() => {
        window.showToast("âœ… ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† Ø¨Ù†Ø¬Ø§Ø­.");
    }).catch(err => {
        window.showToast("âŒ ØªØ¹Ø°Ø± Ø§Ù„ØªØ¹Ø¯ÙŠÙ„: " + err.message, "error");
    });
};

// Ø­Ø°Ù Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†
window.handleDeleteAnnouncement = async function(annId) {
    if (!confirm("Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø±ØºØ¨ØªÙƒ ÙÙŠ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† ÙˆØ¥Ø²Ø§Ù„ØªÙ‡ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ Ù…Ù† Ø´Ø§Ø´Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙˆØ§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø©ØŸ")) return;

    try {
        await deleteDoc(doc(db, 'announcements', annId));
        window.showToast("âœ” ØªÙ… Ø³Ø­Ø¨ ÙˆØ¥Ø²Ø§Ù„Ø© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† Ù…Ù† Ø¬Ø¯Ø§Ø± Ø§Ù„Ù…Ø¯Ø±Ø³Ø© Ø¨Ù†Ø¬Ø§Ø­.");
    } catch (error) {
        window.showToast("âŒ ØªØ¹Ø°Ø± Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø­Ø°Ù: " + error.message, "error");
    }
};
