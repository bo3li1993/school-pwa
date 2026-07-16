import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let unsubscribeAnnouncements = null;

// ⚡ الدالة الرئيسية لتشغيل الموديول عند فتح التبويب
export function initAnnouncementsModule() {
    const container = document.getElementById('tab-announcements');
    if (!container) return;

    // بناء الواجهة البرمجية الكاملة (نموذج الإضافة + قائمة العرض اللحظية)
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px; font-family: 'Cairo', sans-serif; direction: rtl;">
            
            <!-- 📣 بطاقة إضافة إعلان أو خبر جديد للمدرسة -->
            <div class="card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="color: #0b2545; font-weight: 900; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-megaphone-fill" style="color: #d4920a;"></i> نشر إعلان أو تعميم جديد للمنشأة
                </h2>
                
                <form id="form-add-announcement" onsubmit="window.handlePublishAnnouncement(event)">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">عنوان الإعلان / الخبر الرئيسي</label>
                        <input type="text" id="ann-title" placeholder="مثال: تعميم بشأن جداول اختبارات الفترة الدراسية الأولى" required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none;">
                    </div>
                    
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">تفاصيل ومحتوى التعميم بالكامل</label>
                        <textarea id="ann-content" rows="4" placeholder="اكتب تفاصيل الإعلان والتعليمات الموجهة للهيئة التعليمية أو أولياء الأمور هنا..." required style="width: 100%; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14.5px; font-weight: 600; outline: none; resize: vertical; font-family: 'Cairo', sans-serif;"></textarea>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 700; font-size: 13.5px; margin-bottom: 6px; color: #111827;">إرفاق صورة الإعلان الفعالية أو لوحة الشرف (اختياري)</label>
                        <input type="file" id="ann-image-file" accept="image/*" onchange="window.processAnnouncementImage(event)" style="width: 100%; padding: 8px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #f9fafb; cursor: pointer;">
                        <div id="ann-image-preview" style="margin-top: 10px; display: none;">
                            <img id="img-preview-src" src="" style="max-height: 160px; border-radius: 8px; border: 1px dashed #1a78c2; padding: 4px;">
                            <button type="button" onclick="window.clearAnnouncementImage()" style="background: #dc2626; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-right: 8px; cursor: pointer;">حذف الصورة</button>
                        </div>
                    </div>
                    
                    <div style="text-align: left;">
                        <button type="submit" id="btn-publish-ann" style="background: #1a78c2; color: #fff; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s;">
                            <i class="bi bi-send-fill"></i> بث ونشر الإعلان فوراً لوجهات المنصة
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- 📰 معرض الإعلانات الحية المنشورة حالياً بالمدرسة -->
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

    // تصفير وتنظيف أي صور معلقة من الجلسات السابقة
    window.currentAnnouncementBase64Image = "";

    // تشغيل محرك الاستماع الحي الموحد للإعلانات الخاصة بهذه المدرسة فقط
    startLiveAnnouncementsListener();
}

// 🖼️ معالجة الصورة المرفوعة وضغطها محلياً لتفادي مشاكل سيرفرات الميديا
window.processAnnouncementImage = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) { // حماية لمنع رفع صور عملاقة تستهلك الذاكرة
        window.showToast("⚠️ الصورة كبيرة جداً! يرجى اختيار صورة بحجم أقل من 800 كيلوبايت لضمان سرعة التحميل.", "warning");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        window.currentAnnouncementBase64Image = e.target.result;
        const previewDiv = document.getElementById('ann-image-preview');
        const imgPreview = document.getElementById('img-preview-src');
        if (previewDiv && imgPreview) {
            imgPreview.src = e.target.result;
            previewDiv.style.display = 'flex';
            previewDiv.style.alignItems = 'center';
        }
    };
    reader.readAsDataURL(file);
};

// 🗑️ تصفير خانة الصورة
window.clearAnnouncementImage = function() {
    window.currentAnnouncementBase64Image = "";
    const fileInput = document.getElementById('ann-image-file');
    const previewDiv = document.getElementById('ann-image-preview');
    if (fileInput) fileInput.value = "";
    if (previewDiv) previewDiv.style.display = "none";
};

// 🚀 محرك ضخ وتوثيق الإعلان في الفايرستور ببصمة المنشأة الصارمة
window.handlePublishAnnouncement = async function(event) {
    event.preventDefault();
    const schoolId = getActiveSchoolId();
    if (!schoolId) return;

    const titleEl = document.getElementById('ann-title');
    const contentEl = document.getElementById('ann-content');
    const btn = document.getElementById('btn-publish-ann');

    if (!titleEl || !contentEl || !titleEl.value.trim() || !contentEl.value.trim()) {
        window.showToast("⚠️ يرجى تعبئة الحقول المطلوبة أولاً", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "⏳ جاري نشر وتعميم البلاغ...";

    try {
        const userSession = JSON.parse(localStorage.getItem('hs_user') || '{}');
        
        await addDoc(collection(db, 'announcements'), {
            schoolId: schoolId,
            title: titleEl.value.trim(),
            content: contentEl.value.trim(),
            imageUrl: window.currentAnnouncementBase64Image || "",
            publisherName: userSession.name || "إدارة المدرسة",
            dateStr: new Date().toLocaleDateString('ar-KW'),
            timeStr: new Date().toLocaleTimeString('ar-KW', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
        });

        window.showToast("✅ تم بث ونشر الإعلان بنجاح في المنظومة الرقمية.");
        
        // إعادة تهيئة النموذج
        titleEl.value = "";
        contentEl.value = "";
        window.clearAnnouncementImage();

    } catch (error) {
        console.error("Error publishing announcement:", error);
        window.showToast("❌ فشل النشر السحابي: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-fill"></i> بث ونشر الإعلان فوراً لوجهات المنصة';
    }
};

// 📡 مستمع رادار الإعلانات اللحظي والمؤمن بالبصمة لتأمين التعددية (Multi-tenant SaaS)
function startLiveAnnouncementsListener() {
    const schoolId = getActiveSchoolId();
    if (!schoolId) return;

    if (unsubscribeAnnouncements) unsubscribeAnnouncements();

    const q = query(
        collection(db, 'announcements'),
        where('schoolId', '==', schoolId)
    );

    unsubscribeAnnouncements = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('container-announcements-list');
        if (!listContainer) return;

        if (snapshot.empty) {
            listContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:50px; background:#f9fafb; border:1px dashed #cbd5e1; border-radius:12px; color:#6b7280; font-weight:700;">
                    <i class="bi bi-megaphone" style="font-size:32px; display:block; margin-bottom:8px; color:#94a3b8;"></i>
                    لا توجد إعلانات أو تعاميم نشطة منشورة لهذه المدرسة حالياً.
                </div>
            `;
            return;
        }

        // تجميع السجلات وفرزها محلياً من الأحدث للأقدم لعدم استهلاك فهارس مركبة معقدة
        const announcementsArray = [];
        snapshot.forEach(doc => {
            announcementsArray.push({ id: doc.id, ...doc.data() });
        });
        announcementsArray.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

        listContainer.innerHTML = announcementsArray.map(ann => `
            <div class="card" style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition: 0.2s; position:relative;">
                <div>
                    ${ann.imageUrl ? `<img src="${ann.imageUrl}" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:12px; border:1px solid #f3f4f6;">` : ''}
                    <h4 style="color:#0b2545; font-weight:900; font-size:15px; margin-bottom:6px; line-height:1.4; padding-left:24px;">${ann.title}</h4>
                    <p style="color:#374151; font-size:13px; font-weight:600; line-height:1.6; white-space:pre-wrap; margin-bottom:12px;">${ann.content}</p>
                </div>
                
                <div style="border-top:1px dashed #f3f4f6; padding-top:10px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#6b7280; font-weight:700;">
                    <div>
                        <span><i class="bi bi-person-circle"></i> ${ann.publisherName}</span><br>
                        <span style="color:#9ca3af; margin-top:2px; display:inline-block;"><i class="bi bi-clock"></i> ${ann.dateStr} — ${ann.timeStr}</span>
                    </div>
                    <button onclick="window.handleDeleteAnnouncement('${ann.id}')" style="background:rgba(220,38,38,0.08); color:#dc2626; border:1px solid rgba(220,38,38,0.15); padding:6px 10px; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; font-size:11px; transition:0.2s;"><i class="bi bi-trash3-fill"></i> حذف الإعلان</button>
                </div>
            </div>
        `).join('');

    }, (error) => {
        console.error("Live announcements core error:", error);
    });
}

// 🗑️ موديول حذف الإعلان من جدار المدرسة
window.handleDeleteAnnouncement = async function(annId) {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الإعلان وإزالته نهائياً من شاشات المعلمين والمنظومة؟")) return;

    try {
        await deleteDoc(doc(db, 'announcements', annId));
        window.showToast("✓ تم سحب وإزالة الإعلان من جدار المدرسة بنجاح.");
    } catch (error) {
        window.showToast("❌ تعذر إتمام الحذف: " + error.message, "error");
    }
};