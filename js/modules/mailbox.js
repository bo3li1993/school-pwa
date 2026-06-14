import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initMailboxModule() {
    const container = document.getElementById('tab-announcements');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-megaphone-fill" style="color:var(--accent-color);"></i> نشر إعلان وتعميم رسمي لأولياء الأمور</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">التعاميم المنشورة هني تظهر فوراً في لوحة تحكم ولي الأمر عند فتح البوابة.</p>
            <form id="announcement-form" onsubmit="window.handlePublishAnnouncementLive(event)">
                <label style="font-weight:700; font-size:12px; color:#444;">نص التعميم والخبر المدرسي المعتمد</label>
                <textarea id="ann-text" placeholder="اكتب نص التعميم الإداري هنا..." rows="3" required style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:10px;"></textarea>
                <button type="submit" style="background:var(--accent-color); width:100%; font-weight:bold; border:none; padding:12px; border-radius:8px; cursor:pointer; color:#fff;"><i class="bi bi-send-check-fill"></i> بث وتعميم الخبر سحابياً</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--success-color); text-align: right; background:#fff; padding:20px; border-radius:12px; margin-top:20px;">
            <h2><i class="bi bi-chat-left-heart-fill" style="color:var(--success-color);"></i> صندوق الرسائل والطلبات الواردة من أولياء الأمور</h2>
            <div style="overflow-x:auto; margin-top:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f4f6f9;">
                            <th style="padding:10px;">الطالب المستعلم</th>
                            <th style="text-align:center; width:80px; padding:10px;">الفصل</th>
                            <th style="padding:10px;">نص رسالة ولي الأمر الواردة</th>
                            <th style="text-align:center; width:120px; padding:10px;">الإجراء المتبع</th>
                        </tr>
                    </thead>
                    <tbody id="parent-messages-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري مراجعة البريد الوارد السحابي...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        loadParentMailboxLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center;">⚠️ خطأ في موديل المراسلات: ${e.message}</div>`;
    }
}

window.handlePublishAnnouncementLive = async function(e) {
    e.preventDefault();
    const text = document.getElementById('ann-text').value.trim();
    const schoolId = getActiveSchoolId(); // 🏢 ربط مركزي

    try {
        await addDoc(collection(db, 'announcements'), {
            schoolId: schoolId, // 🔑 الحماية الأمنية
            message: text,
            createdAt: serverTimestamp()
        });
        alert('✓ تم بنجاح بث ونشر التعميم الرسمي لجميع أولياء الأمور.');
        document.getElementById('announcement-form').reset();
    } catch(err) { alert('خطأ في النشر: ' + err.message); }
};

async function loadParentMailboxLive() {
    const tbody = document.getElementById('parent-messages-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId();

    try {
        // فلترة الرسائل الخاصة بالمدرسة الحالية فقط
        const q = query(collection(db, 'school_threads'), where('schoolId', '==', schoolId));
        let snap = await getDocs(q);
        
        // التوافقية للداتا القديمة
        if (snap.empty && schoolId === 'hosainan') {
            snap = await getDocs(getActiveSchoolId() ? query(collection(db, 'school_threads'), where('schoolId', '==', getActiveSchoolId())) : collection(db, 'school_threads'));
        }

        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            // تصفية أمنية إضافية للداتا القديمة
            if(data.senderRole === 'parent' && (!data.schoolId || data.schoolId === schoolId)) {
                const safeName = data.studentName ? data.studentName.replace(/'/g, "\\'") : '';
                const safeClass = data.classId ? data.classId.replace(/'/g, "\\'") : '';

                html += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;"><b>👤 ${data.studentName || '-'}</b></td>
                        <td style="padding:10px; text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                        <td style="padding:10px; color:#333; font-weight:700;">${data.message || '-'}</td>
                        <td style="padding:10px; text-align:center;">
                            <button onclick="window.sendAdminReplyLive('${safeName}', '${safeClass}')" style="padding:5px 12px; font-size:11px; background:var(--success-color); border:none; color:#fff; font-weight:bold; cursor:pointer; border-radius:4px;"><i class="bi bi-reply-fill"></i> رد رسمي حّي</button>
                        </td>
                    </tr>`;
            }
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 الصندوق الوارد خالي من رسائل أولياء الأمور حالياً.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 بانتظار قيد أولى المراسلات لتفعيل الصندوق.</td></tr>'; }
}

window.sendAdminReplyLive = async function(studentName, classId) {
    const replyText = prompt(`اكتب الرد الرسمي المعتمد الموجه لولي أمر الطالب:\n(${studentName}):`);
    if(!replyText || !replyText.trim()) return;

    const schoolId = getActiveSchoolId();

    try {
        await addDoc(collection(db, 'school_threads'), {
            schoolId: schoolId, // 🔑 البصمة الأمنية للرد
            studentName: studentName,
            classId: classId,
            message: replyText.trim(),
            senderRole: 'admin',
            createdAt: serverTimestamp()
        });
        alert('✅ تم إرسال وبث الرد الرسمي لولي الأمر بنجاح، وظهر بصفحته لايف.');
        loadParentMailboxLive(); 
    } catch(err) {
        alert('❌ فشل إرسال الرد السحابي: ' + err.message);
    }
};