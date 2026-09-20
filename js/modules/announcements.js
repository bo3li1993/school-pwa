// XSS Prevention
function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, addDoc, deleteDoc, updateDoc, doc, onSnapshot, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══ onSnapshot cleanup ══
let _annUnsubs = [];
window._cleanupAnnouncements = function() {
    _annUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
    _annUnsubs = [];
};

let unsubscribeAnnouncements = null;

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// الدالة الرئيسية لتشغيل الموديول عند فتح التبويب
export function initAnnouncementsModule() {
    var container = document.getElementById('tab-announcements');
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px; font-family: 'Cairo', sans-serif; direction: rtl; padding: 8px;">

            <!-- بطاقة إضافة إعلان -->
            <div class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="color: #0b2545; font-weight: 900; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-megaphone-fill" style="color: #d4920a;"></i> نشر إعلان أو تعميم جديد للمنشأة
                </h2>

                <form id="form-add-announcement" onsubmit="window.handlePublishAnnouncement(event)">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">عنوان الإعلان / الخبر الرئيسي</label>
                        <input type="text" id="ann-title" placeholder="مثال: تعميم بشأن جداول اختبارات الفترة الدراسية الأولى" required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none; font-family: 'Cairo', sans-serif; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">تفاصيل ومحتوى التعميم بالكامل</label>
                        <textarea id="ann-content" rows="4" placeholder="اكتب تفاصيل الإعلان والتعليمات الموجهة للهيئة التعليمية أو أولياء الأمور هنا..." required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none; resize: vertical; font-family: 'Cairo', sans-serif; box-sizing: border-box;"></textarea>
                    </div>

                    <!-- الأولوية — فكرة جديدة -->
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">أهمية الإعلان</label>
                        <select id="ann-priority" style="width: 100%; padding: 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13.5px; font-family: 'Cairo', sans-serif; background: #fff;">
                            <option value="normal">🔵 عادي</option>
                            <option value="important">🟡 مهم</option>
                            <option value="urgent">🔴 عاجل</option>
                        </select>
                    </div>

                    <!-- الجهة المستهدفة — فكرة جديدة -->
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">الجهة المستهدفة</label>
                        <select id="ann-target" style="width: 100%; padding: 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13.5px; font-family: 'Cairo', sans-serif; background: #fff;">
                            <option value="all">👥 الجميع</option>
                            <option value="staff">👨‍🏫 الهيئة التعليمية فقط</option>
                            <option value="parents">👨‍👩‍👧 أولياء الأمور فقط</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">إرفاق صورة الإعلان الفعالية أو لوحة الشرف (اختياري)</label>
                        <input type="file" id="ann-image-file" accept="image/*" onchange="window.processAnnouncementImage(event)" style="width: 100%; padding: 8px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #f9fafb; cursor: pointer; box-sizing: border-box;">
                        <div id="ann-image-preview" style="margin-top: 10px; display: none; align-items: center; gap: 8px;">
                            <img id="img-preview-src" src="" style="max-height: 160px; border-radius: 8px; border: 1px dashed #1a78c2; padding: 4px;">
                            <button type="button" onclick="window.clearAnnouncementImage()" style="background: #dc2626; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Cairo', sans-serif;">حذف الصورة</button>
                        </div>
                    </div>

                    <div style="text-align: left;">
                        <button type="submit" id="btn-publish-ann" style="background: #1a78c2; color: #fff; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: 'Cairo', sans-serif;">
                            <i class="bi bi-send-fill"></i> بث ونشر الإعلان فوراً
                        </button>
                    </div>
                </form>
            </div>

            <!-- فلتر البحث — فكرة جديدة -->
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <input id="ann-search" type="text" placeholder="🔍 ابحث في الإعلانات..." oninput="window.filterAnnouncements()" style="flex: 1; min-width: 200px; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13.5px; font-family: 'Cairo', sans-serif; outline: none;">
                <select id="ann-filter-priority" onchange="window.filterAnnouncements()" style="padding: 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; font-family: 'Cairo', sans-serif; background: #fff;">
                    <option value="all">كل الأهمية</option>
                    <option value="urgent">🔴 عاجل</option>
                    <option value="important">🟡 مهم</option>
                    <option value="normal">🔵 عادي</option>
                </select>
            </div>

            <!-- قائمة الإعلانات الحية -->
            <div>
                <h3 style="color: #0b2545; font-weight: 900; font-size: 16px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="bi bi-collection-play-fill" style="color: #1a78c2;"></i> جدار الأخبار والإعلانات النشطة بالمدرسة حالياً
                </h3>
                <div id="container-announcements-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280; font-weight: 700;">⏳ جاري فحص رادار الأخبار واستدعاء السجلات...</div>
                </div>
            </div>

        </div>
    `;

    window.currentAnnouncementBase64Image = "";
    window._allAnnouncements = [];
    startLiveAnnouncementsListener();
}

// معالجة الصورة المرفوعة
window.processAnnouncementImage = function(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
        window.showToast("⚠️ الصورة كبيرة جداً! يرجى اختيار صورة بحجم أقل من 800 كيلوبايت.", "warning");
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

// تصفير خانة الصورة
window.clearAnnouncementImage = function() {
    window.currentAnnouncementBase64Image = "";
    var fileInput = document.getElementById('ann-image-file');
    var previewDiv = document.getElementById('ann-image-preview');
    if (fileInput) fileInput.value = "";
    if (previewDiv) previewDiv.style.display = "none";
};

// نشر الإعلان في Firestore
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
        window.showToast("⚠️ يرجى تعبئة الحقول المطلوبة أولاً", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "⏳ جاري نشر وتعميم البلاغ...";

    try {
        var userSession = JSON.parse(localStorage.getItem('hs_user') || '{}');

        await addDoc(collection(db, 'announcements'), {
            schoolId: schoolId,
            title: titleEl.value.trim(),
            content: contentEl.value.trim(),
            imageUrl: window.currentAnnouncementBase64Image || "",
            priority: priorityEl?.value || "normal",
            target: targetEl?.value || "all",
            publisherName: userSession.name || "إدارة المدرسة",
            dateStr: getTodayISO(),
            timeStr: new Date().toLocaleTimeString('ar-KW', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
        });

        window.showToast("✅ تم بث ونشر الإعلان بنجاح في المنظومة الرقمية.");
        titleEl.value = "";
        contentEl.value = "";
        if (priorityEl) priorityEl.value = "normal";
        if (targetEl) targetEl.value = "all";
        window.clearAnnouncementImage();

    } catch (error) {
        console.error("Error publishing announcement:", error);
        window.showToast("❌ فشل النشر السحابي: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-fill"></i> بث ونشر الإعلان فوراً';
    }
};

// فلترة الإعلانات
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

// عرض الإعلانات
function renderAnnouncements(list) {
    var listContainer = document.getElementById('container-announcements-list');
    if (!listContainer) return;

    if (!list || list.length === 0) {
        listContainer.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:50px; background:#f9fafb; border:1px dashed #cbd5e1; border-radius:12px; color:#6b7280; font-weight:700;">
                <i class="bi bi-megaphone" style="font-size:32px; display:block; margin-bottom:8px; color:#94a3b8;"></i>
                لا توجد إعلانات أو تعاميم نشطة منشورة لهذه المدرسة حالياً.
            </div>
        `;
        return;
    }

    var priorityColors = { urgent: '#dc2626', important: '#d97706', normal: '#1a78c2' };
    var priorityLabels = { urgent: '🔴 عاجل', important: '🟡 مهم', normal: '🔵 عادي' };
    var targetLabels = { all: '👥 الجميع', staff: '👨‍🏫 الهيئة التعليمية', parents: '👨‍👩‍👧 أولياء الأمور' };

    listContainer.innerHTML = list.map(ann => `
        <div class="card" style="background:#fff; border:1px solid #e5e7eb; border-right: 4px solid ${priorityColors[ann.priority] || '#1a78c2'}; border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); position:relative;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <span style="background:${priorityColors[ann.priority] || '#1a78c2'}22; color:${priorityColors[ann.priority] || '#1a78c2'}; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:800;">${priorityLabels[ann.priority] || '🔵 عادي'}</span>
                    <span style="background:#f3f4f6; color:#6b7280; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700;">${targetLabels[ann.target] || '👥 الجميع'}</span>
                </div>
                ${ann.imageUrl ? `<img src="${ann.imageUrl}" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:12px; border:1px solid #f3f4f6;">` : ''}
                <h4 style="color:#0b2545; font-weight:900; font-size:15px; margin-bottom:6px; line-height:1.4;">${escHtml(ann.title)}</h4>
                <p style="color:#374151; font-size:13px; font-weight:600; line-height:1.6; white-space:pre-wrap; margin-bottom:12px;">${escHtml(ann.content)}</p>
            </div>

            <div style="border-top:1px dashed #f3f4f6; padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="font-size:11px; color:#6b7280; font-weight:700;">
                    <span><i class="bi bi-person-circle"></i> ${escHtml(ann.publisherName)}</span><br>
                    <span style="color:#9ca3af; margin-top:2px; display:inline-block;"><i class="bi bi-clock"></i> ${escHtml(ann.dateStr)} — ${escHtml(ann.timeStr)}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="window.handleEditAnnouncement('${ann.id}', \`${escHtml(ann.title)}\`, \`${escHtml(ann.content)}\`)" style="background:rgba(26,120,194,0.08); color:#1a78c2; border:1px solid rgba(26,120,194,0.15); padding:6px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:11px;"><i class="bi bi-pencil-fill"></i> تعديل</button>
                    <button onclick="window.handleDeleteAnnouncement('${ann.id}')" style="background:rgba(220,38,38,0.08); color:#dc2626; border:1px solid rgba(220,38,38,0.15); padding:6px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:11px;"><i class="bi bi-trash3-fill"></i> حذف</button>
                </div>
            </div>
        </div>
    `).join('');
}

// المستمع الحي للإعلانات
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

// تعديل الإعلان
window.handleEditAnnouncement = function(annId, currentTitle, currentContent) {
    var newTitle = prompt("عنوان الإعلان:", currentTitle);
    if (newTitle === null) return;
    var newContent = prompt("محتوى الإعلان:", currentContent);
    if (newContent === null) return;

    if (!newTitle.trim() || !newContent.trim()) {
        window.showToast("⚠️ لا يمكن ترك الحقول فارغة", "warning");
        return;
    }

    updateDoc(doc(db, 'announcements', annId), {
        title: newTitle.trim(),
        content: newContent.trim(),
        editedAt: new Date().toISOString()
    }).then(() => {
        window.showToast("✅ تم تعديل الإعلان بنجاح.");
    }).catch(err => {
        window.showToast("❌ تعذر التعديل: " + err.message, "error");
    });
};

// حذف الإعلان
window.handleDeleteAnnouncement = async function(annId) {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الإعلان وإزالته نهائياً من شاشات المعلمين والمنظومة؟")) return;

    try {
        await deleteDoc(doc(db, 'announcements', annId));
        window.showToast("✔ تم سحب وإزالة الإعلان من جدار المدرسة بنجاح.");
    } catch (error) {
        window.showToast("❌ تعذر إتمام الحذف: " + error.message, "error");
    }
};
