import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════════════════════
// نظام المراسلات — واجهة مثل واتساب
// المدير ↔ أي شخص | المعلم ↔ ولي أمر طلابه + المدير
// ولي الأمر ↔ المدير + رئيس القسم + الأخصائي
// ══════════════════════════════════════════════════════════════

let _msgUnsub = null;
let _currentChatId = null;

function cleanupMsgListeners() {
    if(_msgUnsub) { try { _msgUnsub(); } catch(e) {} _msgUnsub = null; }
}

// من يقدر يراسل من
function getAllowedContacts(myRole) {
    // المدير والمساعد والمشرف — يراسلون الكل
    if(['admin','assistant_manager'].includes(myRole)) return 'all';
    if(myRole === 'wing_supervisor') return ['admin','assistant_manager','social_worker'];
    // رئيس القسم والأخصائي — يراسلون المدير والمعلمين وأولياء الأمور
    if(['department_head','social_worker'].includes(myRole)) return ['admin','assistant_manager','teacher','parent'];
    // المعلم — يراسل المدير وأولياء أمور طلابه
    if(myRole === 'teacher') return ['admin','assistant_manager'];
    // ولي الأمر — يراسل المدير ورئيس القسم والأخصائي
    if(myRole === 'parent') return ['admin','assistant_manager','department_head','social_worker'];
    return [];
}

export async function initMailboxModule() {
    var container = document.getElementById('tab-mailbox');
    if(!container) return;

    container.innerHTML = `
    <style>
        .msg-container { max-width:600px; margin:0 auto; height:calc(100vh - 160px); display:flex; flex-direction:column; }
        .msg-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--line); }
        .msg-header h2 { font-size:16px; font-weight:900; color:var(--navy); margin:0; }
        .msg-list { flex:1; overflow-y:auto; }
        .msg-conv { display:flex; align-items:center; padding:14px 16px; border-bottom:1px solid #f0f2f5; cursor:pointer; gap:12px; transition:background .15s; }
        .msg-conv:hover, .msg-conv:active { background:#f0f4f8; }
        .msg-avatar { width:46px; height:46px; border-radius:50%; background:var(--navy); color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; flex-shrink:0; }
        .msg-info { flex:1; min-width:0; }
        .msg-name { font-size:14px; font-weight:800; color:#111; }
        .msg-role-tag { font-size:10px; font-weight:700; color:var(--mid); }
        .msg-last { font-size:12px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
        .msg-meta { text-align:left; flex-shrink:0; }
        .msg-time { font-size:10px; color:#aaa; font-weight:700; }
        .msg-badge { display:inline-block; background:var(--sky); color:#fff; font-size:10px; font-weight:900; min-width:18px; height:18px; line-height:18px; text-align:center; border-radius:50%; margin-top:4px; }

        /* المحادثة */
        .chat-header { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--line); background:#fff; }
        .chat-back { background:none; border:none; font-size:20px; cursor:pointer; padding:4px; }
        .chat-name { font-size:15px; font-weight:800; color:var(--navy); }
        .chat-messages { flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; gap:6px; }
        .chat-bubble { max-width:80%; padding:10px 14px; border-radius:16px; font-size:13px; line-height:1.5; word-wrap:break-word; }
        .chat-bubble.sent { background:var(--navy); color:#fff; border-bottom-right-radius:4px; align-self:flex-start; }
        .chat-bubble.received { background:#f0f2f5; color:#111; border-bottom-left-radius:4px; align-self:flex-end; }
        .chat-bubble .bubble-time { font-size:9px; opacity:.6; margin-top:4px; display:block; }
        .chat-input-bar { display:flex; gap:8px; padding:10px 16px; border-top:1px solid var(--line); background:#fff; }
        .chat-input { flex:1; padding:10px 14px; border:1.5px solid var(--line); border-radius:22px; font-family:'Cairo',sans-serif; font-size:13px; outline:none; resize:none; }
        .chat-send { background:var(--navy); color:#fff; border:none; width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; }
        .chat-send:active { opacity:.7; }
        .chat-empty { text-align:center; padding:40px; color:#aaa; font-size:13px; font-weight:700; }

        /* محادثة جديدة */
        .new-chat-list { flex:1; overflow-y:auto; }
        .new-chat-item { display:flex; align-items:center; padding:12px 16px; border-bottom:1px solid #f0f2f5; cursor:pointer; gap:12px; }
        .new-chat-item:hover { background:#f0f4f8; }
    </style>

    <div class="msg-container" id="msg-container">
        <!-- شاشة قائمة المحادثات -->
        <div id="msg-screen-list">
            <div class="msg-header">
                <h2><i class="bi bi-chat-dots-fill" style="color:var(--sky)"></i> المراسلات</h2>
                <button onclick="window.showNewChat()" style="background:var(--sky);color:#fff;border:none;padding:7px 14px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">
                    <i class="bi bi-plus-lg"></i> محادثة جديدة
                </button>
            </div>
            <div class="msg-list" id="msg-conversations-list">
                <div class="chat-empty">⏳ جاري التحميل...</div>
            </div>
        </div>

        <!-- شاشة المحادثة -->
        <div id="msg-screen-chat" style="display:none;flex-direction:column;height:100%">
            <div class="chat-header">
                <button class="chat-back" onclick="window.backToList()">→</button>
                <div>
                    <div class="chat-name" id="chat-partner-name"></div>
                    <div class="msg-role-tag" id="chat-partner-role"></div>
                </div>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-bar">
                <button class="chat-send" onclick="window.sendMessage()"><i class="bi bi-send-fill"></i></button>
                <input class="chat-input" id="chat-input" placeholder="اكتب رسالة..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendMessage()}">
            </div>
        </div>

        <!-- شاشة محادثة جديدة -->
        <div id="msg-screen-new" style="display:none;flex-direction:column;height:100%">
            <div class="chat-header">
                <button class="chat-back" onclick="window.backToList()">→</button>
                <div class="chat-name">محادثة جديدة</div>
            </div>
            <div style="padding:12px 16px">
                <input id="new-chat-search" placeholder="🔍 ابحث بالاسم..." oninput="window.filterNewChatList(this.value)" style="width:100%;padding:10px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:'Cairo',sans-serif;font-size:13px;outline:none">
            </div>
            <div class="new-chat-list" id="new-chat-list">
                <div class="chat-empty">⏳ جاري التحميل...</div>
            </div>
        </div>
    </div>`;

    loadConversations();
}

// ══ تحميل المحادثات ══
async function loadConversations() {
    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myId = me.odId || me.odId || me.odId || (me.odId + '_' + me.role);
    var myUserId = me.userId || '';
    var list = document.getElementById('msg-conversations-list');
    if(!list) return;

    try {
        // جلب كل المحادثات اللي أنا طرف فيها
        var snap = await getDocs(query(
            collection(db, 'conversations'),
            where('schoolId', '==', schoolId),
            where('participants', 'array-contains', myUserId)
        ));

        if(snap.empty) {
            list.innerHTML = '<div class="chat-empty">📭 لا توجد محادثات بعد<br><br>اضغط "محادثة جديدة" للبدء</div>';
            return;
        }

        // ترتيب بآخر رسالة
        var convs = snap.docs.map(d => ({id: d.id, ...d.data()}))
            .sort((a,b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));

        var roleLabels = {
            admin:'المدير', assistant_manager:'مساعد المدير', teacher:'معلم',
            department_head:'رئيس قسم', social_worker:'أخصائي',
            parent:'ولي أمر', nurse:'ممرض', guard:'حارس'
        };

        list.innerHTML = convs.map(c => {
            var partner = c.participantNames?.find(n => n.userId !== myUserId) || {};
            var unread = c.unreadBy?.[myUserId] || 0;
            var time = c.lastMessageAt?.toDate?.();
            var timeStr = time ? time.toLocaleTimeString('ar-KW', {hour:'2-digit', minute:'2-digit'}) : '';
            var initial = (partner.name || '؟').charAt(0);

            return '<div class="msg-conv" onclick="window.openChat(\''+c.id+'\',\''+( partner.name||'').replace(/'/g,"")+'\',\''+( partner.role||'')+'\')">'+
                '<div class="msg-avatar">'+initial+'</div>'+
                '<div class="msg-info">'+
                    '<div class="msg-name">'+(partner.name||'مستخدم')+'</div>'+
                    '<div class="msg-role-tag">'+(roleLabels[partner.role]||'')+'</div>'+
                    '<div class="msg-last">'+(c.lastMessage||'')+'</div>'+
                '</div>'+
                '<div class="msg-meta">'+
                    '<div class="msg-time">'+timeStr+'</div>'+
                    (unread > 0 ? '<div class="msg-badge">'+unread+'</div>' : '')+
                '</div>'+
            '</div>';
        }).join('');

    } catch(e) {
        list.innerHTML = '<div class="chat-empty">❌ '+e.message+'</div>';
    }
}

// ══ فتح محادثة ══
window.openChat = async function(convId, partnerName, partnerRole) {
    _currentChatId = convId;
    var roleLabels = {
        admin:'المدير', assistant_manager:'مساعد المدير', teacher:'معلم',
        department_head:'رئيس قسم', social_worker:'أخصائي',
        parent:'ولي أمر', nurse:'ممرض', guard:'حارس'
    };

    document.getElementById('msg-screen-list').style.display = 'none';
    document.getElementById('msg-screen-new').style.display = 'none';
    var chatScreen = document.getElementById('msg-screen-chat');
    chatScreen.style.display = 'flex';
    document.getElementById('chat-partner-name').textContent = partnerName;
    document.getElementById('chat-partner-role').textContent = roleLabels[partnerRole] || '';

    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myUserId = me.userId || '';

    // mark as read
    try {
        var convRef = doc(db, 'conversations', convId);
        var updates = {};
        updates['unreadBy.'+myUserId] = 0;
        await updateDoc(convRef, updates);
    } catch(e) {}

    // listen to messages
    cleanupMsgListeners();
    var msgContainer = document.getElementById('chat-messages');

    _msgUnsub = onSnapshot(
        query(collection(db, 'conversations', convId, 'messages'), orderBy('createdAt', 'asc')),
        snap => {
            msgContainer.innerHTML = snap.docs.map(d => {
                var m = d.data();
                var isMine = m.senderId === myUserId;
                var time = m.createdAt?.toDate?.();
                var timeStr = time ? time.toLocaleTimeString('ar-KW', {hour:'2-digit', minute:'2-digit'}) : '';
                return '<div class="chat-bubble '+(isMine?'sent':'received')+'">'+
                    m.text+
                    '<span class="bubble-time">'+timeStr+'</span>'+
                '</div>';
            }).join('');

            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    );

    document.getElementById('chat-input').focus();
};

// ══ إرسال رسالة ══
window.sendMessage = async function() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if(!text || !_currentChatId) return;
    input.value = '';

    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myUserId = me.userId || '';
    var myName = me.name || '';

    try {
        // أضف الرسالة
        await addDoc(collection(db, 'conversations', _currentChatId, 'messages'), {
            text,
            senderId: myUserId,
            senderName: myName,
            createdAt: serverTimestamp()
        });

        // حدّث المحادثة
        var convRef = doc(db, 'conversations', _currentChatId);
        var convSnap = await getDocs(query(collection(db, 'conversations'), where('__name__', '==', _currentChatId)));

        // جلب المشاركين لتحديث unread
        if(!convSnap.empty) {
            var conv = convSnap.docs[0].data();
            var updates = {
                lastMessage: text,
                lastMessageAt: serverTimestamp()
            };
            // زيادة unread للطرف الآخر
            (conv.participants || []).forEach(uid => {
                if(uid !== myUserId) updates['unreadBy.'+uid] = (conv.unreadBy?.[uid] || 0) + 1;
            });
            await updateDoc(convRef, updates);
        }
    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

// ══ رجوع للقائمة ══
window.backToList = function() {
    cleanupMsgListeners();
    _currentChatId = null;
    document.getElementById('msg-screen-chat').style.display = 'none';
    document.getElementById('msg-screen-new').style.display = 'none';
    document.getElementById('msg-screen-list').style.display = 'block';
    loadConversations();
};

// ══ محادثة جديدة ══
let _allContacts = [];

window.showNewChat = async function() {
    document.getElementById('msg-screen-list').style.display = 'none';
    document.getElementById('msg-screen-chat').style.display = 'none';
    var newScreen = document.getElementById('msg-screen-new');
    newScreen.style.display = 'flex';

    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myRole = me.role || '';
    var myUserId = me.userId || '';
    var allowed = getAllowedContacts(myRole);

    try {
        var snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
        var roleLabels = {
            admin:'المدير', assistant_manager:'مساعد المدير', teacher:'معلم',
            department_head:'رئيس قسم', social_worker:'أخصائي',
            nurse:'ممرض', guard:'حارس'
        };

        _allContacts = snap.docs
            .map(d => ({id: d.id, ...d.data()}))
            .filter(u => {
                if(u.userId === myUserId) return false;
                if(allowed === 'all') return true;
                return allowed.includes(u.role);
            })
            .sort((a,b) => (a.name||'').localeCompare(b.name||'', 'ar'));

        renderContactList(_allContacts, roleLabels);
    } catch(e) {
        document.getElementById('new-chat-list').innerHTML = '<div class="chat-empty">❌ '+e.message+'</div>';
    }
};

function renderContactList(contacts, roleLabels) {
    var list = document.getElementById('new-chat-list');
    if(!contacts.length) {
        list.innerHTML = '<div class="chat-empty">لا يوجد جهات اتصال متاحة</div>';
        return;
    }
    roleLabels = roleLabels || {admin:'المدير',assistant_manager:'مساعد المدير',teacher:'معلم',department_head:'رئيس قسم',social_worker:'أخصائي',nurse:'ممرض',guard:'حارس'};

    list.innerHTML = contacts.map(u => {
        var initial = (u.name || '؟').charAt(0);
        return '<div class="new-chat-item" onclick="window.startNewChat(\''+u.userId+'\',\''+( u.name||'').replace(/'/g,"")+'\',\''+u.role+'\')">'+
            '<div class="msg-avatar" style="width:40px;height:40px;font-size:16px">'+initial+'</div>'+
            '<div>'+
                '<div class="msg-name">'+(u.name||'مستخدم')+'</div>'+
                '<div class="msg-role-tag">'+(roleLabels[u.role]||u.role)+'</div>'+
            '</div>'+
        '</div>';
    }).join('');
}

window.filterNewChatList = function(val) {
    var roleLabels = {admin:'المدير',assistant_manager:'مساعد المدير',teacher:'معلم',department_head:'رئيس قسم',social_worker:'أخصائي',nurse:'ممرض',guard:'حارس'};
    var filtered = val ? _allContacts.filter(u => (u.name||'').includes(val)) : _allContacts;
    renderContactList(filtered, roleLabels);
};

// ══ بدء محادثة جديدة ══
window.startNewChat = async function(partnerId, partnerName, partnerRole) {
    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myUserId = me.userId || '';
    var myName = me.name || '';
    var myRole = me.role || '';

    try {
        // تحقق: هل في محادثة موجودة مع هذا الشخص
        var existing = await getDocs(query(
            collection(db, 'conversations'),
            where('schoolId', '==', schoolId),
            where('participants', 'array-contains', myUserId)
        ));

        var convId = null;
        existing.forEach(d => {
            var data = d.data();
            if(data.participants?.includes(partnerId)) convId = d.id;
        });

        if(!convId) {
            // إنشاء محادثة جديدة
            var convRef = await addDoc(collection(db, 'conversations'), {
                schoolId,
                participants: [myUserId, partnerId],
                participantNames: [
                    {userId: myUserId, name: myName, role: myRole},
                    {userId: partnerId, name: partnerName, role: partnerRole}
                ],
                lastMessage: '',
                lastMessageAt: serverTimestamp(),
                unreadBy: {},
                createdAt: serverTimestamp()
            });
            convId = convRef.id;
        }

        window.openChat(convId, partnerName, partnerRole);

    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};
