import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• Cache Ø§Ù„Ø·Ù„Ø§Ø¨ â•â•
let _rewardStudentsCache = null;
let _rewardSchoolCache   = null;

async function getCachedStudents(schoolId) {
    if(_rewardStudentsCache && _rewardSchoolCache === schoolId) return _rewardStudentsCache;
    var snap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
    _rewardStudentsCache = snap;
    _rewardSchoolCache   = schoolId;
    return snap;
}


export async function initRewardsModule() {
    var container = document.getElementById('tab-rewards');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid #2ecc71; text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-coin" style="color:#2ecc71;"></i> Ù†Ø¸Ø§Ù… Ø¨Ù†Ùƒ Ø§Ù„ØªÙ…ÙŠØ² Ø§Ù„Ø±Ù‚Ù…ÙŠ</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ Ø£ÙˆÙ„Ø§Ù‹ØŒ Ø«Ù… Ø­Ø¯Ø¯ Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù…Ù†Ø­Ù‡ Ø§Ù„Ù†Ù‚Ø§Ø· Ø§Ù„ØªØ´Ø¬ÙŠØ¹ÙŠØ© ÙÙˆØ±Ø§Ù‹.</p>
            
            <form id="rewards-grant-form" onsubmit="window.handleGrantPointsLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. Ø§Ø®ØªØ± Ø§Ù„ØµÙ / Ø§Ù„ÙØµÙ„</label>
                        <select id="reward-class-select" onchange="window.handleRewardClassChange(this.value)" required style="width:100%; padding:8px;">
                            <option value="">-- Ø¬Ø§Ø±ÙŠ Ø³Ø­Ø¨ Ø§Ù„ÙØµÙˆÙ„... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</label>
                        <select id="reward-student-select" disabled required style="width:100%; padding:8px;">
                            <option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. Ù‚ÙŠÙ…Ø© Ø§Ù„Ù†Ù‚Ø§Ø·</label>
                        <select id="reward-points-value" style="width:100%; padding:8px;">
                            <option value="5">ðŸª™ +5 Ù†Ù‚Ø§Ø·</option>
                            <option value="10">ðŸŒŸ +10 Ù†Ù‚Ø§Ø·</option>
                            <option value="20">ðŸ† +20 Ù†Ù‚Ø·Ø©</option>
                            <option value="50">ðŸ‘‘ +50 Ù†Ù‚Ø·Ø©</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">Ø³Ø¨Ø¨ Ø§Ù„Ù…ÙƒØ§ÙØ£Ø©</label>
                    <input type="text" id="reward-reason" placeholder="Ù…Ø«Ø§Ù„: Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„ÙØ¹Ø§Ù„Ø© Ø¨Ø§Ù„Ø­ØµØ©" required style="width:100%; padding:8px;">
                </div>
                <button type="submit" style="width:100%; background:#2ecc71; color:#fff; border:none; padding:10px; font-weight:bold; margin-top:10px; cursor:pointer;"><i class="bi bi-plus-circle-fill"></i> Ø¥ÙŠØ¯Ø§Ø¹ Ø§Ù„Ù†Ù‚Ø§Ø· ÙÙŠ Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø·Ø§Ù„Ø¨</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--hover-color); margin-top:20px; padding:20px; border-radius:12px;">
            <h2>ðŸ† Ù„ÙˆØ­Ø© Ù…ØªØµØ¯Ø±ÙŠ Ø¨Ù†Ùƒ Ø§Ù„ØªÙ…ÙŠØ² (Ù…Ø¯Ø±Ø³ØªÙƒ)</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="text-align:center; padding:10px;">Ø§Ù„ØªØ±ØªÙŠØ¨</th>
                            <th>Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨</th>
                            <th style="text-align:center;">Ø§Ù„ÙØµÙ„</th>
                            <th style="text-align:center;">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø±ØµÙŠØ¯</th>
                        </tr>
                    </thead>
                    <tbody id="rewards-leaderboard-tbody">
                        <tr><td colspan="4" style="text-align:center; padding:15px;">Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ø§Ù„Ù…Ø­Ø§ÙØ¸ Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ©...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // ðŸ¢ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙØµÙˆÙ„ Ø§Ù„Ù…ØªØ§Ø­Ø© Ù„Ù„Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
        var classSelect = document.getElementById('reward-class-select');
        var schoolId = getActiveSchoolId();
        var snap = await getCachedStudents(schoolId);
        
        var classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        var html = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„ÙØµÙ„ --</option>';
        Array.from(classesSet).sort().forEach(c => html += `<option value="${c}">${c}</option>`);
        classSelect.innerHTML = html;

        loadRewardsLeaderboardLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">âš ï¸ Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù†Ø¸Ø§Ù…: ${e.message}</div>`;
    }
}

window.handleRewardClassChange = async function(classId) {
    var studentSelect = document.getElementById('reward-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØµÙ„ --</option>';
        studentSelect.disabled = true;
        return;
    }

    var schoolId = getActiveSchoolId();
    studentSelect.innerHTML = '<option value="">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ÙØ±Ø²...</option>';
    studentSelect.disabled = true;

    try {
        var q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        var snap = await getDocs(q);
        
        var arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        var html = '<option value="">-- Ø§Ø®ØªØ± Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ --</option>';
        arr.forEach(name => html += `<option value="${name}">${name}</option>`);

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">âš ï¸ Ø§Ù„ÙØµÙ„ Ø®Ø§Ù„ÙŠ</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">âŒ Ø®Ø·Ø£ Ø¨Ø§Ù„Ø´Ø¨ÙƒØ©</option>';
    }
};

window.handleGrantPointsLive = async function(e) {
    e.preventDefault();
    var schoolId = getActiveSchoolId();
    
    await addDoc(collection(db, 'rewards'), {
        schoolId: schoolId, // ðŸ”‘ Ø§Ù„Ø¨ØµÙ…Ø© Ø§Ù„Ø£Ù…Ù†ÙŠØ©
        studentName: document.getElementById('reward-student-select').value,
        classId: document.getElementById('reward-class-select').value,
        points: parseInt(document.getElementById('reward-points-value').value),
        reason: document.getElementById('reward-reason').value.trim(),
        createdAt: serverTimestamp()
    });
    window.showToast('âœ“ ØªÙ… Ø¥ÙŠØ¯Ø§Ø¹ Ø§Ù„Ù†Ù‚Ø§Ø· Ø¨Ù†Ø¬Ø§Ø­.');
    document.getElementById('rewards-grant-form').reset();
    loadRewardsLeaderboardLive();
};

async function loadRewardsLeaderboardLive() {
    var tbody = document.getElementById('rewards-leaderboard-tbody');
    if (!tbody) return;

    var schoolId = getActiveSchoolId();
    var snap = await getDocs(query(collection(db, 'rewards'), where('schoolId', '==', schoolId)));
    
    var leaderboard = {};
    snap.forEach(d => {
        var data = d.data();
        var name = data.studentName || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
        if(!leaderboard[name]) leaderboard[name] = { name: name, classId: data.classId || '-', total: 0 };
        leaderboard[name].total += parseInt(data.points || 0);
    });

    var sorted = Object.values(leaderboard).sort((a,b) => b.total - a.total);
    var html = '';
    
    sorted.forEach((s, idx) => {
        html += `<tr>
            <td style="text-align:center; padding:10px;">${idx + 1}</td>
            <td style="padding:10px;"><b>ðŸ‘¤ ${s.name}</b></td>
            <td style="text-align:center;"><span class="badge info">${s.classId}</span></td>
            <td style="text-align:center; color:#2ecc71; font-weight:bold;">${s.total}</td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:15px;">ðŸ’¡ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙƒØ§ÙØ¢Øª Ù…Ø±ØµÙˆØ¯Ø©.</td></tr>';
}