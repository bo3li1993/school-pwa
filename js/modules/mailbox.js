// ✉️ موديل إدارة المراسلات والتعاميم الموجهة لأولياء الأمور
import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initMailboxModule() {
    const container = document.getElementById('tab-announcements');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--accent-color); text-align: right;">
            <h2><i class="bi bi-megaphone-fill" style="color:var(--accent-color);"></i> نشر إعلان وتعميم رسمي لأولياء الأمور</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">التعاميم المنشورة هني تظهر فوراً في لوحة تحكم ولي الأمر عند فتح البوابة.</p>
            <form id="announcement-form" onsubmit="window.handlePublishAnnouncementLive(event)">
                <label style="font-weight:700;">نص التعميم والخبر المدرسي المعتمد</label>
                <textarea id="ann-text" placeholder="اكتب نص التعميم الإداري هنا..." rows="3" required></textarea>
                <button type="submit" style="background:var(--accent-color); width:100%; font-weight:bold;"><i class="bi bi-send-check-fill"></i> بث وتعميم الخبر سحابياً</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--success-color); text-align: right;">
            <h2><i class="bi bi-chat-left-heart-fill" style="color:var(--success-color);"></i> صندوق الرسائل والطلبات الواردة من أولياء الأمور</h2>
            <div style="overflow-x:auto; margin-top:10px;">
                <table>
                    <thead>
                        <tr style="background:#f4f6f9;">
                            <th>الطالب</th>
                            <th style="text-align:center;">الفصل</th>
                            <th>نص رسالة ولي الأمر الواردة</th>
                            <th style="text-align:center;">الإجراء المتبع</th>
                        </tr>
                    </thead>
                    <tbody id="parent-messages-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">جاري مراجعة البريد الوارد...</td></tr>
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

    try {
        await addDoc(collection(db, 'announcements'), {
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

    try {
        // قراءة رصيد المحادثات من كولكشن school_threads الموحد
        const snap = await getDocs(collection(db, 'school_threads'));
        let html = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            if(data.senderRole === 'parent') {
                html += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td><b>👤 ${data.studentName || '-'}</b></td>
                        <td style="text-align:center;"><span class="badge info">${data.classId || '-'}</span></td>
                        <td style="color:#333; font-weight:700;">${data.message || '-'}</td>
                        <td style="text-align:center;">
                            <button onclick="alert('جاري العمل على تفعيل نظام الردود السريعة المباشرة')" style="padding:4px 10px; font-size:11px; background:var(--success-color);"><i class="bi bi-reply-fill"></i> رد رسمي</button>
                        </td>
                    </tr>`;
            }
        });

        tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 الصندوق الوارد خالي من رسائل أولياء الأمور حالياً.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px;">💡 بانتظار قيد أولى المراسلات لتفعيل الصندوق.</td></tr>'; }
}