import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±Ø§Ø³Ù„Ø§Øª â€” ÙˆØ§Ø¬Ù‡Ø© Ù…Ø«Ù„ ÙˆØ§ØªØ³Ø§Ø¨
// Ø§Ù„Ù…Ø¯ÙŠØ± â†” Ø£ÙŠ Ø´Ø®Øµ | Ø§Ù„Ù…Ø¹Ù„Ù… â†” ÙˆÙ„ÙŠ Ø£Ù…Ø± Ø·Ù„Ø§Ø¨Ù‡ + Ø§Ù„Ù…Ø¯ÙŠØ±
// ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± â†” Ø§Ù„Ù…Ø¯ÙŠØ± + Ø±Ø¦ÙŠØ³ Ø§Ù„Ù‚Ø³Ù… + Ø§Ù„Ø£Ø®ØµØ§Ø¦ÙŠ
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let _msgUnsub = null;
let _currentChatId = null;

function cleanupMsgListeners() {
    if(_msgUnsub) { try { _msgUnsub(); } catch(e) {} _msgUnsub = null; }
}

// Ù…Ù† ÙŠÙ‚Ø¯Ø± ÙŠØ±Ø§Ø³Ù„ Ù…Ù†
function getAllowedContacts(myRole) {
    // Ø§Ù„Ù…Ø¯ÙŠØ± ÙˆØ§Ù„Ù…Ø³Ø§Ø¹Ø¯ ÙˆØ§Ù„Ù…Ø´Ø±Ù â€” ÙŠØ±Ø§Ø³Ù„ÙˆÙ† Ø§Ù„ÙƒÙ„
    if(['admin','assistant_manager'].includes(myRole)) return 'all';
    if(myRole === 'wing_supervisor') return ['admin','assistant_manager','social_worker'];
    // Ø±Ø¦ÙŠØ³ Ø§Ù„Ù‚Ø³Ù… ÙˆØ§Ù„Ø£Ø®ØµØ§Ø¦ÙŠ â€” ÙŠØ±Ø§Ø³Ù„ÙˆÙ† Ø§Ù„Ù…Ø¯ÙŠØ± ÙˆØ§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙˆØ£ÙˆÙ„ÙŠØ§Ø¡ Ø§Ù„Ø£Ù…ÙˆØ±
    if(['department_head','social_worker'].includes(myRole)) return ['admin','assistant_manager','teacher','parent'];
    // Ø§Ù„Ù…Ø¹Ù„Ù… â€” ÙŠØ±Ø§Ø³Ù„ Ø§Ù„Ù…Ø¯ÙŠØ± ÙˆØ£ÙˆÙ„ÙŠØ§Ø¡ Ø£Ù…ÙˆØ± Ø·Ù„Ø§Ø¨Ù‡
    if(myRole === 'teacher') return ['admin','assistant_manager'];
    // ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø± â€” ÙŠØ±Ø§Ø³Ù„ Ø§Ù„Ù…Ø¯ÙŠØ± ÙˆØ±Ø¦ÙŠØ³ Ø§Ù„Ù‚Ø³Ù… ÙˆØ§Ù„Ø£Ø®ØµØ§Ø¦ÙŠ
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

        /* Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© */
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

        /* Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø© */
        .new-chat-list { flex:1; overflow-y:auto; }
        .new-chat-item { display:flex; align-items:center; padding:12px 16px; border-bottom:1px solid #f0f2f5; cursor:pointer; gap:12px; }
        .new-chat-item:hover { background:#f0f4f8; }
    </style>

    <div class="msg-container" id="msg-container">
        <!-- Ø´Ø§Ø´Ø© Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª -->
        <div id="msg-screen-list">
            <div class="msg-header">
                <h2><i class="bi bi-chat-dots-fill" style="color:var(--sky)"></i> Ø§Ù„Ù…Ø±Ø§Ø³Ù„Ø§Øª</h2>
                <button onclick="window.showNewChat()" style="background:var(--sky);color:#fff;border:none;padding:7px 14px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">
                    <i class="bi bi-plus-lg"></i> Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©
                </button>
            </div>
            <div class="msg-list" id="msg-conversations-list">
                <div class="chat-empty">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
            </div>
        </div>

        <!-- Ø´Ø§Ø´Ø© Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© -->
        <div id="msg-screen-chat" style="display:none;flex-direction:column;height:100%">
            <div class="chat-header">
                <button class="chat-back" onclick="window.backToList()">â†’</button>
                <div>
                    <div class="chat-name" id="chat-partner-name"></div>
                    <div class="msg-role-tag" id="chat-partner-role"></div>
                </div>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-bar">
                <button class="chat-send" onclick="window.sendMessage()"><i class="bi bi-send-fill"></i></button>
                <input class="chat-input" id="chat-input" placeholder="Ø§ÙƒØªØ¨ Ø±Ø³Ø§Ù„Ø©..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendMessage()}">
            </div>
        </div>

        <!-- Ø´Ø§Ø´Ø© Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø© -->
        <div id="msg-screen-new" style="display:none;flex-direction:column;height:100%">
            <div class="chat-header">
                <button class="chat-back" onclick="window.backToList()">â†’</button>
                <div class="chat-name">Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©</div>
            </div>
            <div style="padding:12px 16px">
                <input id="new-chat-search" placeholder="ðŸ” Ø§Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù…..." oninput="window.filterNewChatList(this.value)" style="width:100%;padding:10px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:'Cairo',sans-serif;font-size:13px;outline:none">
            </div>
            <div class="new-chat-list" id="new-chat-list">
                <div class="chat-empty">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</div>
            </div>
        </div>
    </div>`;

    loadConversations();
}

// â•â• ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª â•â•
async function loadConversations() {
    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myId = me.odId || me.odId || me.odId || (me.odId + '_' + me.role);
    var myUserId = me.userId || '';
    var list = document.getElementById('msg-conversations-list');
    if(!list) return;

    try {
        // Ø¬Ù„Ø¨ ÙƒÙ„ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø§Ù„Ù„ÙŠ Ø£Ù†Ø§ Ø·Ø±Ù ÙÙŠÙ‡Ø§
        var snap = await getDocs(query(
            collection(db, 'conversations'),
            where('schoolId', '==', schoolId),
            where('participants', 'array-contains', myUserId)
        ));

        if(snap.empty) {
            list.innerHTML = '<div class="chat-empty">ðŸ“­ Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø¨Ø¹Ø¯<br><br>Ø§Ø¶ØºØ· "Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©" Ù„Ù„Ø¨Ø¯Ø¡</div>';
            return;
        }

        // ØªØ±ØªÙŠØ¨ Ø¨Ø¢Ø®Ø± Ø±Ø³Ø§Ù„Ø©
        var convs = snap.docs.map(d => ({id: d.id, ...d.data()}))
            .sort((a,b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));

        var roleLabels = {
            admin:'Ø§Ù„Ù…Ø¯ÙŠØ±', assistant_manager:'Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù…Ø¯ÙŠØ±', teacher:'Ù…Ø¹Ù„Ù…',
            department_head:'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…', social_worker:'Ø£Ø®ØµØ§Ø¦ÙŠ',
            parent:'ÙˆÙ„ÙŠ Ø£Ù…Ø±', nurse:'Ù…Ù…Ø±Ø¶', guard:'Ø­Ø§Ø±Ø³'
        };

        list.innerHTML = convs.map(c => {
            var partner = c.participantNames?.find(n => n.userId !== myUserId) || {};
            var unread = c.unreadBy?.[myUserId] || 0;
            var time = c.lastMessageAt?.toDate?.();
            var timeStr = time ? time.toLocaleTimeString('ar-KW', {hour:'2-digit', minute:'2-digit'}) : '';
            var initial = (partner.name || 'ØŸ').charAt(0);

            return '<div class="msg-conv" onclick="window.openChat(\''+c.id+'\',\''+( partner.name||'').replace(/'/g,"")+'\',\''+( partner.role||'')+'\')">'+
                '<div class="msg-avatar">'+initial+'</div>'+
                '<div class="msg-info">'+
                    '<div class="msg-name">'+(partner.name||'Ù…Ø³ØªØ®Ø¯Ù…')+'</div>'+
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
        list.innerHTML = '<div class="chat-empty">âŒ '+e.message+'</div>';
    }
}

// â•â• ÙØªØ­ Ù…Ø­Ø§Ø¯Ø«Ø© â•â•
window.openChat = async function(convId, partnerName, partnerRole) {
    _currentChatId = convId;
    var roleLabels = {
        admin:'Ø§Ù„Ù…Ø¯ÙŠØ±', assistant_manager:'Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù…Ø¯ÙŠØ±', teacher:'Ù…Ø¹Ù„Ù…',
        department_head:'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…', social_worker:'Ø£Ø®ØµØ§Ø¦ÙŠ',
        parent:'ÙˆÙ„ÙŠ Ø£Ù…Ø±', nurse:'Ù…Ù…Ø±Ø¶', guard:'Ø­Ø§Ø±Ø³'
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

// â•â• Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© â•â•
window.sendMessage = async function() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if(!text || !_currentChatId) return;
    input.value = '';

    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myUserId = me.userId || '';
    var myName = me.name || '';

    try {
        // Ø£Ø¶Ù Ø§Ù„Ø±Ø³Ø§Ù„Ø©
        await addDoc(collection(db, 'conversations', _currentChatId, 'messages'), {
            text,
            senderId: myUserId,
            senderName: myName,
            createdAt: serverTimestamp()
        });

        // Ø­Ø¯Ù‘Ø« Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©
        var convRef = doc(db, 'conversations', _currentChatId);
        var convSnap = await getDocs(query(collection(db, 'conversations'), where('__name__', '==', _currentChatId)));

        // Ø¬Ù„Ø¨ Ø§Ù„Ù…Ø´Ø§Ø±ÙƒÙŠÙ† Ù„ØªØ­Ø¯ÙŠØ« unread
        if(!convSnap.empty) {
            var conv = convSnap.docs[0].data();
            var updates = {
                lastMessage: text,
                lastMessageAt: serverTimestamp()
            };
            // Ø²ÙŠØ§Ø¯Ø© unread Ù„Ù„Ø·Ø±Ù Ø§Ù„Ø¢Ø®Ø±
            (conv.participants || []).forEach(uid => {
                if(uid !== myUserId) updates['unreadBy.'+uid] = (conv.unreadBy?.[uid] || 0) + 1;
            });
            await updateDoc(convRef, updates);
        }
    } catch(e) {
        window.showToast?.('âŒ ' + e.message, 'error');
    }
};

// â•â• Ø±Ø¬ÙˆØ¹ Ù„Ù„Ù‚Ø§Ø¦Ù…Ø© â•â•
window.backToList = function() {
    cleanupMsgListeners();
    _currentChatId = null;
    document.getElementById('msg-screen-chat').style.display = 'none';
    document.getElementById('msg-screen-new').style.display = 'none';
    document.getElementById('msg-screen-list').style.display = 'block';
    loadConversations();
};

// â•â• Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø© â•â•
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
            admin:'Ø§Ù„Ù…Ø¯ÙŠØ±', assistant_manager:'Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù…Ø¯ÙŠØ±', teacher:'Ù…Ø¹Ù„Ù…',
            department_head:'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…', social_worker:'Ø£Ø®ØµØ§Ø¦ÙŠ',
            nurse:'Ù…Ù…Ø±Ø¶', guard:'Ø­Ø§Ø±Ø³'
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
        document.getElementById('new-chat-list').innerHTML = '<div class="chat-empty">âŒ '+e.message+'</div>';
    }
};

function renderContactList(contacts, roleLabels) {
    var list = document.getElementById('new-chat-list');
    if(!contacts.length) {
        list.innerHTML = '<div class="chat-empty">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¬Ù‡Ø§Øª Ø§ØªØµØ§Ù„ Ù…ØªØ§Ø­Ø©</div>';
        return;
    }
    roleLabels = roleLabels || {admin:'Ø§Ù„Ù…Ø¯ÙŠØ±',assistant_manager:'Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù…Ø¯ÙŠØ±',teacher:'Ù…Ø¹Ù„Ù…',department_head:'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…',social_worker:'Ø£Ø®ØµØ§Ø¦ÙŠ',nurse:'Ù…Ù…Ø±Ø¶',guard:'Ø­Ø§Ø±Ø³'};

    list.innerHTML = contacts.map(u => {
        var initial = (u.name || 'ØŸ').charAt(0);
        return '<div class="new-chat-item" onclick="window.startNewChat(\''+u.userId+'\',\''+( u.name||'').replace(/'/g,"")+'\',\''+u.role+'\')">'+
            '<div class="msg-avatar" style="width:40px;height:40px;font-size:16px">'+initial+'</div>'+
            '<div>'+
                '<div class="msg-name">'+(u.name||'Ù…Ø³ØªØ®Ø¯Ù…')+'</div>'+
                '<div class="msg-role-tag">'+(roleLabels[u.role]||u.role)+'</div>'+
            '</div>'+
        '</div>';
    }).join('');
}

window.filterNewChatList = function(val) {
    var roleLabels = {admin:'Ø§Ù„Ù…Ø¯ÙŠØ±',assistant_manager:'Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ù…Ø¯ÙŠØ±',teacher:'Ù…Ø¹Ù„Ù…',department_head:'Ø±Ø¦ÙŠØ³ Ù‚Ø³Ù…',social_worker:'Ø£Ø®ØµØ§Ø¦ÙŠ',nurse:'Ù…Ù…Ø±Ø¶',guard:'Ø­Ø§Ø±Ø³'};
    var filtered = val ? _allContacts.filter(u => (u.name||'').includes(val)) : _allContacts;
    renderContactList(filtered, roleLabels);
};

// â•â• Ø¨Ø¯Ø¡ Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø© â•â•
window.startNewChat = async function(partnerId, partnerName, partnerRole) {
    var schoolId = getActiveSchoolId();
    var me = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var myUserId = me.userId || '';
    var myName = me.name || '';
    var myRole = me.role || '';

    try {
        // ØªØ­Ù‚Ù‚: Ù‡Ù„ ÙÙŠ Ù…Ø­Ø§Ø¯Ø«Ø© Ù…ÙˆØ¬ÙˆØ¯Ø© Ù…Ø¹ Ù‡Ø°Ø§ Ø§Ù„Ø´Ø®Øµ
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
            // Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©
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
        window.showToast?.('âŒ ' + e.message, 'error');
    }
};
