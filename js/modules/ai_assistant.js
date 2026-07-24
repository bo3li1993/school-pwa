import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, query, where, getDocs, limit }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ══════════════════════════════════════════════
// المساعد الذكي — يفهم الأسئلة بالعربي ويجاوب
// من بيانات Firestore مباشرة
// ══════════════════════════════════════════════

let chatHistory = [];

export function initAiAssistant() {
    // زر المساعد الثابت
    const btn = document.createElement('div');
    btn.id = 'ai-assistant-btn';
    btn.innerHTML = `<i class="bi bi-robot"></i><span class="ai-pulse"></span>`;
    btn.title = 'المساعد الذكي';
    btn.onclick = toggleAssistant;
    document.body.appendChild(btn);

    // نافذة المساعد
    const win = document.createElement('div');
    win.id = 'ai-assistant-win';
    win.innerHTML = `
    <div class="ai-win-header">
        <div style="display:flex;align-items:center;gap:10px">
            <div class="ai-avatar">🤖</div>
            <div>
                <div style="font-weight:900;font-size:14px">المساعد الذكي</div>
                <div style="font-size:11px;opacity:.7">اسألني أي شيء عن المدرسة</div>
            </div>
        </div>
        <button onclick="toggleAssistant()" class="ai-close-btn">✕</button>
    </div>

    <div class="ai-messages" id="ai-messages">
        <div class="ai-msg ai-msg-bot">
            <div class="ai-msg-bubble">
                مرحباً! 👋 أنا مساعدك الذكي.<br>
                اسألني مثلاً:<br>
                • <span class="ai-suggest" onclick="askQuestion('كم طالب غاب اليوم؟')">كم طالب غاب اليوم؟</span><br>
                • <span class="ai-suggest" onclick="askQuestion('أكثر فصل غياباً هذا الأسبوع')">أكثر فصل غياباً هذا الأسبوع</span><br>
                • <span class="ai-suggest" onclick="askQuestion('كم حادثة سلوكية هذا الشهر؟')">كم حادثة سلوكية هذا الشهر؟</span><br>
                • <span class="ai-suggest" onclick="askQuestion('من أكثر الطلاب غياباً؟')">من أكثر الطلاب غياباً؟</span>
            </div>
        </div>
    </div>

    <div class="ai-input-row">
        <input type="text" id="ai-input" placeholder="اكتب سؤالك هنا..."
            onkeydown="if(event.key==='Enter') window.sendAiMessage()">
        <button onclick="window.sendAiMessage()" class="ai-send-btn">
            <i class="bi bi-send-fill"></i>
        </button>
    </div>
    `;
    document.body.appendChild(win);

    // CSS
    const style = document.createElement('style');
    style.textContent = `
    #ai-assistant-btn {
        position:fixed; bottom:80px; left:20px;
        width:56px; height:56px; border-radius:50%;
        background:var(--navy); color:#fff;
        display:flex; align-items:center; justify-content:center;
        font-size:22px; cursor:pointer; z-index:8000;
        box-shadow:0 4px 20px rgba(11,37,69,.4);
        transition:transform .2s, box-shadow .2s;
    }
    #ai-assistant-btn:hover { transform:scale(1.1); box-shadow:0 6px 28px rgba(11,37,69,.5); }
    .ai-pulse {
        position:absolute; top:0; right:0;
        width:14px; height:14px; background:#25d366;
        border-radius:50%; border:2px solid #fff;
        animation:pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }

    #ai-assistant-win {
        position:fixed; bottom:148px; left:20px;
        width:340px; max-height:500px;
        background:#fff; border-radius:18px;
        box-shadow:0 8px 40px rgba(0,0,0,.18);
        display:none; flex-direction:column;
        z-index:8001; overflow:hidden;
        border:1px solid var(--line);
        font-family:'Cairo',sans-serif;
    }
    #ai-assistant-win.show { display:flex; }

    .ai-win-header {
        background:var(--navy); color:#fff;
        padding:14px 16px;
        display:flex; justify-content:space-between; align-items:center;
    }
    .ai-avatar {
        width:36px; height:36px; border-radius:50%;
        background:rgba(255,255,255,.15);
        display:flex; align-items:center; justify-content:center;
        font-size:18px;
    }
    .ai-close-btn {
        background:rgba(255,255,255,.1); border:none;
        color:#fff; width:28px; height:28px;
        border-radius:50%; cursor:pointer; font-size:14px;
        display:flex; align-items:center; justify-content:center;
    }
    .ai-messages {
        flex:1; overflow-y:auto; padding:14px;
        display:flex; flex-direction:column; gap:10px;
        background:#f8f9fc;
    }
    .ai-msg { display:flex; }
    .ai-msg-bot { justify-content:flex-start; }
    .ai-msg-user { justify-content:flex-end; }
    .ai-msg-bubble {
        max-width:85%; padding:10px 14px;
        border-radius:14px; font-size:13px;
        font-weight:600; line-height:1.6;
    }
    .ai-msg-bot .ai-msg-bubble {
        background:#fff; color:#111;
        border:1px solid var(--line);
        border-bottom-right-radius:4px;
    }
    .ai-msg-user .ai-msg-bubble {
        background:var(--navy); color:#fff;
        border-bottom-left-radius:4px;
    }
    .ai-suggest {
        color:var(--sky); cursor:pointer; font-weight:700;
        text-decoration:underline dotted;
    }
    .ai-suggest:hover { color:var(--navy); }
    .ai-typing {
        display:flex; gap:4px; padding:10px 14px;
        background:#fff; border:1px solid var(--line);
        border-radius:14px; border-bottom-right-radius:4px;
        width:fit-content;
    }
    .ai-dot {
        width:7px; height:7px; border-radius:50%;
        background:var(--mid); animation:typing .9s infinite;
    }
    .ai-dot:nth-child(2){ animation-delay:.15s }
    .ai-dot:nth-child(3){ animation-delay:.3s }
    @keyframes typing { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

    .ai-input-row {
        display:flex; gap:8px; padding:12px;
        border-top:1px solid var(--line); background:#fff;
    }
    #ai-input {
        flex:1; padding:9px 12px;
        border:1.5px solid var(--line); border-radius:10px;
        font-family:'Cairo',sans-serif; font-size:13px;
        font-weight:600; outline:none;
        transition:border-color .2s;
    }
    #ai-input:focus { border-color:var(--navy); }
    .ai-send-btn {
        background:var(--navy); color:#fff;
        border:none; border-radius:10px;
        width:38px; height:38px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        font-size:14px; transition:opacity .2s;
    }
    .ai-send-btn:hover { opacity:.85; }

    @media(max-width:480px) {
        #ai-assistant-win { width:calc(100vw - 24px); left:12px; bottom:140px; }
    }
    `;
    document.head.appendChild(style);
}

function toggleAssistant() {
    const win = document.getElementById('ai-assistant-win');
    win.classList.toggle('show');
    if(win.classList.contains('show')) {
        document.getElementById('ai-input').focus();
    }
}

window.askQuestion = function(q) {
    document.getElementById('ai-input').value = q;
    window.sendAiMessage();
};

window.sendAiMessage = async function() {
    const input = document.getElementById('ai-input');
    const q = input.value.trim();
    if(!q) return;
    input.value = '';

    addMessage(q, 'user');
    showTyping();

    try {
        // جلب البيانات من Firestore
        const schoolId = getActiveSchoolId();
        const context  = await buildDataContext(schoolId, q);

        // استدعاء Claude
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 1000,
                system: `أنت مساعد ذكي داخل منظومة إدارة مدرسة في الكويت.
تجاوب بالعربي بشكل مختصر وواضح.
لا تستخدم مصطلحات تقنية.
الأرقام والأسماء من البيانات الفعلية فقط.
إذا السؤال عن إجراء، وضّح الخطوات ببساطة.`,
                messages: [
                    ...chatHistory.slice(-6),
                    { role: 'user', content: `البيانات الحالية:\n${context}\n\nالسؤال: ${q}` }
                ]
            })
        });

        const data   = await response.json();
        const answer = data.content?.[0]?.text || 'تعذر الحصول على إجابة';

        hideTyping();
        addMessage(answer, 'bot');

        chatHistory.push({ role:'user', content: q });
        chatHistory.push({ role:'assistant', content: answer });

    } catch(e) {
        hideTyping();
        addMessage('⚠️ تعذر الاتصال، حاول مرة أخرى', 'bot');
    }
};

// ══ بناء سياق البيانات ══
async function buildDataContext(schoolId, question) {
    const today = getTodayISO();
    const d = new Date();
    const weekAgo = new Date(d); weekAgo.setDate(d.getDate()-7);
    const weekISO = weekAgo.toISOString().slice(0,10);
    const monthAgo = new Date(d); monthAgo.setMonth(d.getMonth()-1);
    const monthISO = monthAgo.toISOString().slice(0,10);

    const q = question.toLowerCase();
    let context = `التاريخ: ${today}\n`;

    try {
        // غياب اليوم دائماً
        const todayAbs = await getDocs(query(collection(db,'attendance'),
            where('schoolId','==',schoolId), where('date','==',today), where('status','==','absent'), limit(200)));
        context += `غياب اليوم: ${todayAbs.size} طالب\n`;

        // توزيع بالفصل
        if(todayAbs.size > 0) {
            const byClass = {};
            todayAbs.forEach(d => {
                const c = d.data().classId||'—';
                byClass[c] = (byClass[c]||0)+1;
            });
            const sorted = Object.entries(byClass).sort((a,b)=>b[1]-a[1]).slice(0,5);
            context += `أكثر الفصول غياباً اليوم: ${sorted.map(([c,n])=>`${c}(${n})`).join('، ')}\n`;
        }

        // أسبوع أو شهر
        if(q.includes('أسبوع') || q.includes('اسبوع')) {
            const weekSnap = await getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId), where('date','>=',weekISO), where('status','==','absent'), limit(200)));
            context += `غياب الأسبوع الماضي: ${weekSnap.size}\n`;

            const byClass = {};
            weekSnap.forEach(d => { const c=d.data().classId||'—'; byClass[c]=(byClass[c]||0)+1; });
            const top = Object.entries(byClass).sort((a,b)=>b[1]-a[1])[0];
            if(top) context += `أكثر فصل غياباً هذا الأسبوع: ${top[0]} (${top[1]} غياب)\n`;
        }

        if(q.includes('شهر')) {
            const monthSnap = await getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId), where('date','>=',monthISO), where('status','==','absent'), limit(200)));
            context += `غياب هذا الشهر: ${monthSnap.size}\n`;
        }

        // سلوك
        if(q.includes('سلوك') || q.includes('حادث') || q.includes('مخالف')) {
            const behSnap = await getDocs(query(collection(db,'behavior'),
                where('schoolId','==',schoolId), where('date','==',today)));
            context += `حوادث سلوكية اليوم: ${behSnap.size}\n`;
        }

        // أكثر طالب غياباً
        if(q.includes('أكثر') || q.includes('اكثر') || q.includes('من غاب') || q.includes('متكرر')) {
            const allAbs = await getDocs(query(collection(db,'attendance'),
                where('schoolId','==',schoolId), where('status','==','absent'), limit(200)));
            const byStudent = {};
            allAbs.forEach(d => {
                const name = d.data().studentName||'—';
                byStudent[name] = (byStudent[name]||0)+1;
            });
            const top5 = Object.entries(byStudent).sort((a,b)=>b[1]-a[1]).slice(0,5);
            context += `أكثر الطلاب غياباً: ${top5.map(([n,c])=>`${n}(${c})`).join('، ')}\n`;
        }

        // إجمالي الطلاب
        if(q.includes('طلاب') || q.includes('عدد') || q.includes('إجمالي')) {
            const stuSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
            context += `إجمالي الطلاب: ${stuSnap.size}\n`;
        }

        // استئذان
        if(q.includes('استئذان') || q.includes('خرج') || q.includes('تصريح')) {
            const gateSnap = await getDocs(query(collection(db,'gatepass'),
                where('schoolId','==',schoolId), where('dateStr','==',today)));
            context += `استئذان اليوم: ${gateSnap.size}\n`;
        }

        // عيادة
        if(q.includes('عيادة') || q.includes('مريض') || q.includes('صحة')) {
            const clinicSnap = await getDocs(query(collection(db,'clinic'),
                where('schoolId','==',schoolId), where('date','==',today)));
            context += `مراجعات العيادة اليوم: ${clinicSnap.size}\n`;
        }

    } catch(e) { context += '(تعذر جلب بعض البيانات)\n'; }

    return context;
}

function addMessage(text, type) {
    const msgs = document.getElementById('ai-messages');
    const div  = document.createElement('div');
    div.className = `ai-msg ai-msg-${type}`;
    div.innerHTML = `<div class="ai-msg-bubble">${text.replace(/\n/g,'<br>')}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
    const msgs = document.getElementById('ai-messages');
    const div  = document.createElement('div');
    div.id = 'ai-typing';
    div.className = 'ai-msg ai-msg-bot';
    div.innerHTML = `<div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() {
    document.getElementById('ai-typing')?.remove();
}
