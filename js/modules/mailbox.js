import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, arrayUnion, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// إعدادات ومفاتيح قواعد البيانات السحابية المعتمدة للمدرسة
const firebaseConfig = {
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    storageBucket: "hosainan-school.firebasestorage.app",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let activeAdminThreadId = null;

// دالة بناء وتوليد واجهة صندوق المراسلات والطلبات داخل التبويب الإداري
export async function initMailboxModule() {
    const container = document.getElementById('tab-announcements');
    if (!container) return;

    let html = `
        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; text-align: right;">
            
            <!-- نموذج نشر وتعميم توجيه إداري للمعلمين والشاشات -->
            <div class="card" style="background:#fffdf0; border-top: 4px solid var(--accent-color); padding:20px; border-radius:12px;">
                <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:10px;"><i class="bi bi-megaphone-fill" style="color:var(--accent-color);"></i> بث تعميم إداري موحد لجميع المعلمين والعاملين</h2>
                <textarea id="announcement-input-text" rows="3" placeholder="اكتب نص التوجيه الإداري المراد تعميمه هنا..." style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; text-align:right;"></textarea>
                <button onclick="window.saveAdminAnnouncement()" style="background:var(--accent-color); color:white; width:100%; border:none; padding:12px; font-weight:700; border-radius:6px; cursor:pointer;">🚀 نشر وتعميم التوجيه الإداري فوراً</button>
            </div>

            <!-- جدول استعراض الرسائل والطلبات المنفصلة وحالاتها -->
            <div class="card" style="background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid var(--primary-color);">
                <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-inbox-fill" style="color:var(--primary-color);"></i> صندوق المراسلات والطلبات الرسمية الواردة من أولياء الأمور</h2>
                <p style="font-size: 12px; color: #666; margin-bottom: 15px; font-weight: bold;">نظام إدارة الملفات والتذاكر المنفصلة مفرز زمنياً وبحسب الحالات الإدارية مع توثيق الأوقات</p>
                
                <div style="overflow-x: auto;">
                    <table style="width:100%; border-collapse:collapse; text-align:right;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th style="padding:12px; border-bottom:2px solid #ddd;">تاريخ وآخر حركة</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب الدراسي</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd;">العنوان والموضوع الرسمي</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd;">الجهة المستهدفة بالطلب</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd;">حالة الملف الحالية</th>
                                <th style="padding:12px; border-bottom:2px solid #ddd;">إجراءات الإدارة والمسؤولين</th>
                            </tr>
                        </thead>
                        <tbody id="admin-threads-list-tbody">
                            <tr><td colspan="7" style="text-align:center; color:#aaa; font-weight:bold; padding:20px;">جاري سحب وفحص ملفات المراسلات من الخادم السحابي...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    loadAdminMailboxInboxThreads();
}

// دالة جلب وعرض ملفات المراسلات في الجدول الإداري
async function loadAdminMailboxInboxThreads() {
    const tbody = document.getElementById('admin-threads-list-tbody');
    if(!tbody) return;
    
    try {
        const snap = await getDocs(collection(db, 'school_threads'));
        let html = ''; let count = 0;
        
        snap.forEach(docSnap => {
            count++;
            const t = docSnap.data();
            
            let badgeColorClass = 'warning';
            if(t.status === 'تم الرد') badgeColorClass = 'success';
            if(t.status === 'مغلق') badgeColorClass = 'danger';
            
            html += `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px;"><span class="badge info" style="background:#6c757d; font-size:10px;">${t.lastUpdatedDate || '-'} ${t.lastUpdatedTime || ''}</span></td>
                  <td style="padding:12px;"><b>${t.studentName}</b></td>
                  <td style="padding:12px;"><span class="badge info" style="background:var(--primary-color);">${t.classId || '-'}</span></td>
                  <td style="padding:12px;"><span style="font-weight:700; color:var(--primary-color);">${t.subject}</span></td>
                  <td style="padding:12px;"><small style="font-weight:700; color:#555;">${t.targetRole || 'الإدارة'}</small></td>
                  <td style="padding:12px;"><span class="badge ${badgeColorClass}">${t.status || 'قيد الانتظار'}</span></td>
                  <td style="padding:12px;">
                    <button onclick="window.openAdminThreadChatModal('${docSnap.id}')" style="padding:5px 12px; font-size:11px; background:var(--primary-color); color:white; border:none; border-radius:4px; cursor:pointer;"><i class="bi bi-folder-symlink-fill"></i> مراجعة الملف</button>
                  </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = count === 0 ? '<tr><td colspan="7" style="text-align:center; color:#999; font-weight:bold; padding:20px;">صندوق الطلبات والمراسلات خالي من أي طلبات واردة حالياً.</td></tr>' : html;
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">خطأ في الاتصال بالخادم الرقمي.</td></tr>';
    }
}

// دالة فتح المودال وعرض المحادثة الرسمية المعزولة للموضوع
window.openAdminThreadChatModal = async function(threadId) {
    activeAdminThreadId = threadId;
    document.getElementById('admin-chat-modal').style.display = 'flex';
    const bubblesArea = document.getElementById('admin-thread-messages-bubbles-area');
    bubblesArea.innerHTML = '<p style="text-align:center; font-size:12px; color:#666;">جاري سحب المحادثات والتوثيق الزمني...</p>';
    
    try {
        const tDoc = await getDoc(doc(db, 'school_threads', threadId));
        if(tDoc.exists()) {
            const t = tDoc.data();
            document.getElementById('admin-modal-thread-title').innerHTML = `<i class="bi bi-folder2-open"></i> ملف موضوع: ${t.subject}`;
            document.getElementById('admin-modal-thread-meta').textContent = `اسم الطالب: ${t.studentName} | الصف: ${t.classId} | الجهة المستهدفة: ${t.targetRole}`;
            
            if(t.status === 'مغلق') { document.getElementById('admin-reply-form-wrapper').classList.add('hidden'); }
            else { document.getElementById('admin-reply-form-wrapper').classList.remove('hidden'); }
            
            if(t.messages && t.messages.length > 0) {
                bubblesArea.innerHTML = t.messages.map((m, index) => {
                    const isParent = m.sender === 'parent';
                    const bubbleClass = isParent ? 'parent' : 'admin';
                    const label = isParent ? 'ولي الأمر' : `رد الإدارة الرسمية (${t.targetRole})`;
                    const stampLabel = index === 0 ? 'وقت الإرسال المعتمد' : 'وقت الرد الفعلي';
                    
                    return `
                        <div class="chat-bubble ${bubbleClass}">
                          <strong>${label}:</strong><br>
                          ${m.text}
                          <span class="chat-time"><i class="bi bi-clock"></i> ${stampLabel}: ${m.date || ''} - الساعة ${m.time || ''}</span>
                        </div>
                    `;
                }).join('');
                bubblesArea.scrollTop = bubblesArea.scrollHeight;
            }
        }
    } catch(e) { bubblesArea.innerHTML = '<p style="color:red; font-size:12px;">خطأ في سحب ملف الرسائل.</p>'; }
};

// دالة إرسال الرد الإداري الرسمي وتحديث الحالة
window.submitAdminReplyToThread = async function() {
    const replyText = document.getElementById('admin-thread-reply-input').value.trim();
    if(!replyText || !activeAdminThreadId) return;
    
    const currentTime = new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'});
    const currentDate = new Date().toLocaleDateString('ar-KW');
    const threadRef = doc(db, 'school_threads', activeAdminThreadId);
    
    try {
        await updateDoc(threadRef, {
            lastUpdatedTime: currentTime, lastUpdatedDate: currentDate, status: 'تم الرد',
            messages: arrayUnion({ sender: 'admin', text: replyText, time: currentTime, date: currentDate })
        });
        document.getElementById('admin-thread-reply-input').value = '';
        window.openAdminThreadChatModal(activeAdminThreadId);
        loadAdminMailboxInboxThreads();
    } catch(e) { alert('خطأ أثناء إرسال الرد الرسمي: ' + e.message); }
};

// دالة إغلاق وأرشفة الملف نهائياً لحماية السجلات
window.closeThreadPermanently = async function() {
    if(!confirm('هل تؤكد إغلاق هذا الملف نهائياً؟ لن يتمكن ولي الأمر من إرسال ردود إضافية بعد الإغلاق لحماية السجل.')) return;
    const threadRef = doc(db, 'school_threads', activeAdminThreadId);
    try {
        await updateDoc(threadRef, { status: 'مغلق' });
        document.getElementById('admin-chat-modal').style.display = 'none';
        loadAdminMailboxInboxThreads();
        alert('✓ تم إغلاق وأرشفة ملف المراسلة بنجاح بالمنظومة.');
    } catch(e) { alert('خطأ أثناء أرشفة الملف: ' + e.message); }
};

// وظيفة بث التعاميم الإدارية الموحدة للمعلمين
window.saveAdminAnnouncement = async function() {
    const text = document.getElementById('announcement-input-text').value.trim();
    if(!text) { alert('الرجاء كتابة نص التعميم أولاً!'); return; }
    
    let adminName = "إدارة المدرسة";
    const savedUser = localStorage.getItem('hs_user');
    if(savedUser) { const u = JSON.parse(savedUser); adminName = u.name || "إدارة المدرسة"; }

    try {
        await addDoc(collection(db, 'announcements'), {
            text: text,
            author: adminName,
            date: new Date().toLocaleDateString('ar-KW'),
            time: new Date().toLocaleTimeString('ar-KW', {hour: '2-digit', minute:'2-digit'}),
            createdAt: serverTimestamp()
        });
        document.getElementById('announcement-input-text').value = '';
        alert('✓ تم نشر وتعميم التوجيه الإداري بنجاح بالمنظومة السحابية لجميع العاملين.');
    } catch(e) { alert('خطأ أثناء نشر التعميم: ' + e.message); }
};