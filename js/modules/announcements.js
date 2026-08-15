// XSS Prevention
function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•گâ•گ onSnapshot cleanup â•گâ•گ
let _annUnsubs = [];
window._cleanupAnnouncements = function() {
    _annUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _annUnsubs = [];
};


let unsubscribeAnnouncements = null;

// âڑ، ط§ظ„ط¯ط§ظ„ط© ط§ظ„ط±ط¦ظٹط³ظٹط© ظ„طھط´ط؛ظٹظ„ ط§ظ„ظ…ظˆط¯ظٹظˆظ„ ط¹ظ†ط¯ ظپطھط­ ط§ظ„طھط¨ظˆظٹط¨
export function initAnnouncementsModule() {
    var container = document.getElementById('tab-announcements');
    if (!container) return;

    // ط¨ظ†ط§ط، ط§ظ„ظˆط§ط¬ظ‡ط© ط§ظ„ط¨ط±ظ…ط¬ظٹط© ط§ظ„ظƒط§ظ…ظ„ط© (ظ†ظ…ظˆط°ط¬ ط§ظ„ط¥ط¶ط§ظپط© + ظ‚ط§ط¦ظ…ط© ط§ظ„ط¹ط±ط¶ ط§ظ„ظ„ط­ط¸ظٹط©)
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px; font-family: 'Cairo', sans-serif; direction: rtl;">
            
            <!-- ًں“£ ط¨ط·ط§ظ‚ط© ط¥ط¶ط§ظپط© ط¥ط¹ظ„ط§ظ† ط£ظˆ ط®ط¨ط± ط¬ط¯ظٹط¯ ظ„ظ„ظ…ط¯ط±ط³ط© -->
            <div class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="color: #0b2545; font-weight: 900; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-megaphone-fill" style="color: #d4920a;"></i> ظ†ط´ط± ط¥ط¹ظ„ط§ظ† ط£ظˆ طھط¹ظ…ظٹظ… ط¬ط¯ظٹط¯ ظ„ظ„ظ…ظ†ط´ط£ط©
                </h2>
                
                <form id="form-add-announcement" onsubmit="window.handlePublishAnnouncement(event)">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">ط¹ظ†ظˆط§ظ† ط§ظ„ط¥ط¹ظ„ط§ظ† / ط§ظ„ط®ط¨ط± ط§ظ„ط±ط¦ظٹط³ظٹ</label>
                        <input type="text" id="ann-title" placeholder="ظ…ط«ط§ظ„: طھط¹ظ…ظٹظ… ط¨ط´ط£ظ† ط¬ط¯ط§ظˆظ„ ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ظپطھط±ط© ط§ظ„ط¯ط±ط§ط³ظٹط© ط§ظ„ط£ظˆظ„ظ‰" required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none;">
                    </div>
                    
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">طھظپط§طµظٹظ„ ظˆظ…ط­طھظˆظ‰ ط§ظ„طھط¹ظ…ظٹظ… ط¨ط§ظ„ظƒط§ظ…ظ„</label>
                        <textarea id="ann-content" rows="4" placeholder="ط§ظƒطھط¨ طھظپط§طµظٹظ„ ط§ظ„ط¥ط¹ظ„ط§ظ† ظˆط§ظ„طھط¹ظ„ظٹظ…ط§طھ ط§ظ„ظ…ظˆط¬ظ‡ط© ظ„ظ„ظ‡ظٹط¦ط© ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ط£ظˆ ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط± ظ‡ظ†ط§..." required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none; resize: vertical; font-family: 'Cairo', sans-serif;"></textarea>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">ط¥ط±ظپط§ظ‚ طµظˆط±ط© ط§ظ„ط¥ط¹ظ„ط§ظ† ط§ظ„ظپط¹ط§ظ„ظٹط© ط£ظˆ ظ„ظˆط­ط© ط§ظ„ط´ط±ظپ (ط§ط®طھظٹط§ط±ظٹ)</label>
                        <input type="file" id="ann-image-file" accept="image/*" onchange="window.processAnnouncementImage(event)" style="width: 100%; padding: 8px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #f9fafb; cursor: pointer;">
                        <div id="ann-image-preview" style="margin-top: 10px; display: none;">
                            <img id="img-preview-src" src="" style="max-height: 160px; border-radius: 8px; border: 1px dashed #1a78c2; padding: 4px;">
                            <button type="button" onclick="window.clearAnnouncementImage()" style="background: #dc2626; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-right: 8px; cursor: pointer;">ط­ط°ظپ ط§ظ„طµظˆط±ط©</button>
                        </div>
                    </div>
                    
                    <div style="text-align: left;">
                        <button type="submit" id="btn-publish-ann" style="background: #1a78c2; color: #fff; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s;">
                            <i class="bi bi-send-fill"></i> ط¨ط« ظˆظ†ط´ط± ط§ظ„ط¥ط¹ظ„ط§ظ† ظپظˆط±ط§ظ‹ ظ„ظˆط¬ظ‡ط§طھ ط§ظ„ظ…ظ†طµط©
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- ًں“° ظ…ط¹ط±ط¶ ط§ظ„ط¥ط¹ظ„ط§ظ†ط§طھ ط§ظ„ط­ظٹط© ط§ظ„ظ…ظ†ط´ظˆط±ط© ط­ط§ظ„ظٹط§ظ‹ ط¨ط§ظ„ظ…ط¯ط±ط³ط© -->
            <div>
                <h3 style="color: #0b2545; font-weight: 900; font-size: 16px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="bi bi-collection-play-fill" style="color: #1a78c2;"></i> ط¬ط¯ط§ط± ط§ظ„ط£ط®ط¨ط§ط± ظˆط§ظ„ط¥ط¹ظ„ط§ظ†ط§طھ ط§ظ„ظ†ط´ط·ط© ط¨ط§ظ„ظ…ط¯ط±ط³ط© ط­ط§ظ„ظٹط§ظ‹
                </h3>
                <div id="container-announcements-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280; font-weight: 700;">âڈ³ ط¬ط§ط±ظٹ ظپط­طµ ط±ط§ط¯ط§ط± ط§ظ„ط£ط®ط¨ط§ط± ظˆط§ط³طھط¯ط¹ط§ط، ط§ظ„ط³ط¬ظ„ط§طھ...</div>
                </div>
            </div>

        </div>
    `;

    // طھطµظپظٹط± ظˆطھظ†ط¸ظٹظپ ط£ظٹ طµظˆط± ظ…ط¹ظ„ظ‚ط© ظ…ظ† ط§ظ„ط¬ظ„ط³ط§طھ ط§ظ„ط³ط§ط¨ظ‚ط©
    window.currentAnnouncementBase64Image = "";

    // طھط´ط؛ظٹظ„ ظ…ط­ط±ظƒ ط§ظ„ط§ط³طھظ…ط§ط¹ ط§ظ„ط­ظٹ ط§ظ„ظ…ظˆط­ط¯ ظ„ظ„ط¥ط¹ظ„ط§ظ†ط§طھ ط§ظ„ط®ط§طµط© ط¨ظ‡ط°ظ‡ ط§ظ„ظ…ط¯ط±ط³ط© ظپظ‚ط·
    startLiveAnnouncementsListener();
}

// ًں–¼ï¸ڈ ظ…ط¹ط§ظ„ط¬ط© ط§ظ„طµظˆط±ط© ط§ظ„ظ…ط±ظپظˆط¹ط© ظˆط¶ط؛ط·ظ‡ط§ ظ…ط­ظ„ظٹط§ظ‹ ظ„طھظپط§ط¯ظٹ ظ…ط´ط§ظƒظ„ ط³ظٹط±ظپط±ط§طھ ط§ظ„ظ…ظٹط¯ظٹط§
window.processAnnouncementImage = function(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) { // ط­ظ…ط§ظٹط© ظ„ظ…ظ†ط¹ ط±ظپط¹ طµظˆط± ط¹ظ…ظ„ط§ظ‚ط© طھط³طھظ‡ظ„ظƒ ط§ظ„ط°ط§ظƒط±ط©
        window.showToast("âڑ ï¸ڈ ط§ظ„طµظˆط±ط© ظƒط¨ظٹط±ط© ط¬ط¯ط§ظ‹! ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± طµظˆط±ط© ط¨ط­ط¬ظ… ط£ظ‚ظ„ ظ…ظ† 800 ظƒظٹظ„ظˆط¨ط§ظٹطھ ظ„ط¶ظ…ط§ظ† ط³ط±ط¹ط© ط§ظ„طھط­ظ…ظٹظ„.", "warning");
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
            previewDiv.style.alignItems = 'center';
        }
    };
    reader.readAsDataURL(file);
};

// ًں—‘ï¸ڈ طھطµظپظٹط± ط®ط§ظ†ط© ط§ظ„طµظˆط±ط©
window.clearAnnouncementImage = function() {
    window.currentAnnouncementBase64Image = "";
    var fileInput = document.getElementById('ann-image-file');
    var previewDiv = document.getElementById('ann-image-preview');
    if (fileInput) fileInput.value = "";
    if (previewDiv) previewDiv.style.display = "none";
};

// ًںڑ€ ظ…ط­ط±ظƒ ط¶ط® ظˆطھظˆط«ظٹظ‚ ط§ظ„ط¥ط¹ظ„ط§ظ† ظپظٹ ط§ظ„ظپط§ظٹط±ط³طھظˆط± ط¨ط¨طµظ…ط© ط§ظ„ظ…ظ†ط´ط£ط© ط§ظ„طµط§ط±ظ…ط©
window.handlePublishAnnouncement = async function(event) {
    event.preventDefault();
    var schoolId = getActiveSchoolId();
    if (!schoolId) return;

    var titleEl = document.getElementById('ann-title');
    var contentEl = document.getElementById('ann-content');
    var btn = document.getElementById('btn-publish-ann');

    if (!titleEl || !contentEl || !titleEl.value.trim() || !contentEl.value.trim()) {
        window.showToast("âڑ ï¸ڈ ظٹط±ط¬ظ‰ طھط¹ط¨ط¦ط© ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ط£ظˆظ„ط§ظ‹", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "âڈ³ ط¬ط§ط±ظٹ ظ†ط´ط± ظˆطھط¹ظ…ظٹظ… ط§ظ„ط¨ظ„ط§ط؛...";

    try {
        var userSession = JSON.parse(localStorage.getItem('hs_user') || '{}');
        
        await addDoc(collection(db, 'announcements'), {
            schoolId: schoolId,
            title: titleEl.value.trim(),
            content: contentEl.value.trim(),
            imageUrl: window.currentAnnouncementBase64Image || "",
            publisherName: userSession.name || "ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط¯ط±ط³ط©",
            dateStr: getTodayISO(),
            timeStr: new Date().toLocaleTimeString('ar-KW', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
        });

        window.showToast("âœ… طھظ… ط¨ط« ظˆظ†ط´ط± ط§ظ„ط¥ط¹ظ„ط§ظ† ط¨ظ†ط¬ط§ط­ ظپظٹ ط§ظ„ظ…ظ†ط¸ظˆظ…ط© ط§ظ„ط±ظ‚ظ…ظٹط©.");
        
        // ط¥ط¹ط§ط¯ط© طھظ‡ظٹط¦ط© ط§ظ„ظ†ظ…ظˆط°ط¬
        titleEl.value = "";
        contentEl.value = "";
        window.clearAnnouncementImage();

    } catch (error) {
        console.error("Error publishing announcement:", error);
        window.showToast("â‌Œ ظپط´ظ„ ط§ظ„ظ†ط´ط± ط§ظ„ط³ط­ط§ط¨ظٹ: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-fill"></i> ط¨ط« ظˆظ†ط´ط± ط§ظ„ط¥ط¹ظ„ط§ظ† ظپظˆط±ط§ظ‹ ظ„ظˆط¬ظ‡ط§طھ ط§ظ„ظ…ظ†طµط©';
    }
};

// ًں“، ظ…ط³طھظ…ط¹ ط±ط§ط¯ط§ط± ط§ظ„ط¥ط¹ظ„ط§ظ†ط§طھ ط§ظ„ظ„ط­ط¸ظٹ ظˆط§ظ„ظ…ط¤ظ…ظ† ط¨ط§ظ„ط¨طµظ…ط© ظ„طھط£ظ…ظٹظ† ط§ظ„طھط¹ط¯ط¯ظٹط© (Multi-tenant SaaS)
function startLiveAnnouncementsListener() {
    var schoolId = getActiveSchoolId();
    if (!schoolId) return;

    if (unsubscribeAnnouncements) unsubscribeAnnouncements();

    var q = query(
        collection(db, 'announcements'),
        where('schoolId', '==', schoolId)
    );

    unsubscribeAnnouncements = onSnapshot(q, (snapshot) => {
        var listContainer = document.getElementById('container-announcements-list');
        if (!listContainer) return;

        if (snapshot.empty) {
            listContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:50px; background:#f9fafb; border:1px dashed #cbd5e1; border-radius:12px; color:#6b7280; font-weight:700;">
                    <i class="bi bi-megaphone" style="font-size:32px; display:block; margin-bottom:8px; color:#94a3b8;"></i>
                    ظ„ط§ طھظˆط¬ط¯ ط¥ط¹ظ„ط§ظ†ط§طھ ط£ظˆ طھط¹ط§ظ…ظٹظ… ظ†ط´ط·ط© ظ…ظ†ط´ظˆط±ط© ظ„ظ‡ط°ظ‡ ط§ظ„ظ…ط¯ط±ط³ط© ط­ط§ظ„ظٹط§ظ‹.
                </div>
            `;
            return;
        }

        // طھط¬ظ…ظٹط¹ ط§ظ„ط³ط¬ظ„ط§طھ ظˆظپط±ط²ظ‡ط§ ظ…ط­ظ„ظٹط§ظ‹ ظ…ظ† ط§ظ„ط£ط­ط¯ط« ظ„ظ„ط£ظ‚ط¯ظ… ظ„ط¹ط¯ظ… ط§ط³طھظ‡ظ„ط§ظƒ ظپظ‡ط§ط±ط³ ظ…ط±ظƒط¨ط© ظ…ط¹ظ‚ط¯ط©
        var announcementsArray = [];
        snapshot.forEach(doc => {
            announcementsArray.push({ id: doc.id, ...doc.data() });
        });
        announcementsArray.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

        listContainer.innerHTML = announcementsArray.map(ann => `
            <div class="card" style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition: 0.2s; position:relative;">
                <div>
                    ${ann.imageUrl ? `<img src="${ann.imageUrl}" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:12px; border:1px solid #f3f4f6;">` : ''}
                    <h4 style="color:#0b2545; font-weight:900; font-size:15px; margin-bottom:6px; line-height:1.4; padding-left:24px;">${escHtml(ann.title)}</h4>
                    <p style="color:#374151; font-size:13px; font-weight:600; line-height:1.6; white-space:pre-wrap; margin-bottom:12px;">${escHtml(ann.content)}</p>
                </div>
                
                <div style="border-top:1px dashed #f3f4f6; padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#6b7280; font-weight:700;">
                    <div>
                        <span><i class="bi bi-person-circle"></i> ${escHtml(ann.publisherName)}</span><br>
                        <span style="color:#9ca3af; margin-top:2px; display:inline-block;"><i class="bi bi-clock"></i> ${escHtml(ann.dateStr)} â€” ${escHtml(ann.timeStr)}</span>
                    </div>
                    <button onclick="window.handleDeleteAnnouncement('${ann.id}')" style="background:rgba(220,38,38,0.08); color:#dc2626; border:1px solid rgba(220,38,38,0.15); padding:6px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:11px; transition:0.2s;"><i class="bi bi-trash3-fill"></i> ط­ط°ظپ ط§ظ„ط¥ط¹ظ„ط§ظ†</button>
                </div>
            </div>
        `).join('');

    }, (error) => {
        console.error("Live announcements core error:", error);
    });
}

// ًں—‘ï¸ڈ ظ…ظˆط¯ظٹظˆظ„ ط­ط°ظپ ط§ظ„ط¥ط¹ظ„ط§ظ† ظ…ظ† ط¬ط¯ط§ط± ط§ظ„ظ…ط¯ط±ط³ط©
window.handleDeleteAnnouncement = async function(annId) {
    if (!confirm("ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط±ط؛ط¨طھظƒ ظپظٹ ط­ط°ظپ ظ‡ط°ط§ ط§ظ„ط¥ط¹ظ„ط§ظ† ظˆط¥ط²ط§ظ„طھظ‡ ظ†ظ‡ط§ط¦ظٹط§ظ‹ ظ…ظ† ط´ط§ط´ط§طھ ط§ظ„ظ…ط¹ظ„ظ…ظٹظ† ظˆط§ظ„ظ…ظ†ط¸ظˆظ…ط©طں")) return;

    try {
        await deleteDoc(doc(db, 'announcements', annId));
        window.showToast("âœ“ طھظ… ط³ط­ط¨ ظˆط¥ط²ط§ظ„ط© ط§ظ„ط¥ط¹ظ„ط§ظ† ظ…ظ† ط¬ط¯ط§ط± ط§ظ„ظ…ط¯ط±ط³ط© ط¨ظ†ط¬ط§ط­.");
    } catch (error) {
        window.showToast("â‌Œ طھط¹ط°ط± ط¥طھظ…ط§ظ… ط§ظ„ط­ط°ظپ: " + error.message, "error");
    }
};