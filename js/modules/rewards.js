import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRewardsModule() {
    const container = document.getElementById('tab-honors');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid #2ecc71; text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-coin" style="color:#2ecc71;"></i> نظام بنك التميز الرقمي</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">اختر الفصل أولاً، ثم حدد اسم الطالب لمنحه النقاط التشجيعية فوراً.</p>
            
            <form id="rewards-grant-form" onsubmit="window.handleGrantPointsLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="reward-class-select" onchange="window.handleRewardClassChange(this.value)" required style="width:100%; padding:8px;">
                            <option value="">-- جاري سحب الفصول... --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب</label>
                        <select id="reward-student-select" disabled required style="width:100%; padding:8px;">
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. قيمة النقاط</label>
                        <select id="reward-points-value" style="width:100%; padding:8px;">
                            <option value="5">🪙 +5 نقاط</option>
                            <option value="10">🌟 +10 نقاط</option>
                            <option value="20">🏆 +20 نقطة</option>
                            <option value="50">👑 +50 نقطة</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">سبب المكافأة</label>
                    <input type="text" id="reward-reason" placeholder="مثال: المشاركة الفعالة بالحصة" required style="width:100%; padding:8px;">
                </div>
                <button type="submit" style="width:100%; background:#2ecc71; color:#fff; border:none; padding:10px; font-weight:bold; margin-top:10px; cursor:pointer;"><i class="bi bi-plus-circle-fill"></i> إيداع النقاط في محفظة الطالب</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--hover-color); margin-top:20px; padding:20px; border-radius:12px;">
            <h2>🏆 لوحة متصدري بنك التميز (مدرستك)</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="text-align:center; padding:10px;">الترتيب</th>
                            <th>اسم الطالب</th>
                            <th style="text-align:center;">الفصل</th>
                            <th style="text-align:center;">إجمالي الرصيد</th>
                        </tr>
                    </thead>
                    <tbody id="rewards-leaderboard-tbody">
                        <tr><td colspan="4" style="text-align:center; padding:15px;">جاري فحص المحافظ السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

        // 🏢 تحميل الفصول المتاحة للمدرسة الحالية
        const classSelect = document.getElementById('reward-class-select');
        const schoolId = getActiveSchoolId();
        const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let html = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => html += `<option value="${c}">${c}</option>`);
        classSelect.innerHTML = html;

        loadRewardsLeaderboardLive();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ خطأ في تحميل النظام: ${e.message}</div>`;
    }
}

window.handleRewardClassChange = async function(classId) {
    const studentSelect = document.getElementById('reward-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    const schoolId = getActiveSchoolId();
    studentSelect.innerHTML = '<option value="">⏳ جاري الفرز...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()), where('schoolId', '==', schoolId));
        const snap = await getDocs(q);
        
        let arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب --</option>';
        arr.forEach(name => html += `<option value="${name}">${name}</option>`);

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ الفصل خالي</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ بالشبكة</option>';
    }
};

window.handleGrantPointsLive = async function(e) {
    e.preventDefault();
    const schoolId = getActiveSchoolId();
    
    await addDoc(collection(db, 'rewards'), {
        schoolId: schoolId, // 🔑 البصمة الأمنية
        studentName: document.getElementById('reward-student-select').value,
        classId: document.getElementById('reward-class-select').value,
        points: parseInt(document.getElementById('reward-points-value').value),
        reason: document.getElementById('reward-reason').value.trim(),
        createdAt: serverTimestamp()
    });
    alert('✓ تم إيداع النقاط بنجاح.');
    document.getElementById('rewards-grant-form').reset();
    loadRewardsLeaderboardLive();
};

async function loadRewardsLeaderboardLive() {
    const tbody = document.getElementById('rewards-leaderboard-tbody');
    if (!tbody) return;

    const schoolId = getActiveSchoolId();
    const snap = await getDocs(query(collection(db, 'rewards'), where('schoolId', '==', schoolId)));
    
    let leaderboard = {};
    snap.forEach(d => {
        const data = d.data();
        const name = data.studentName || 'غير محدد';
        if(!leaderboard[name]) leaderboard[name] = { name: name, classId: data.classId || '-', total: 0 };
        leaderboard[name].total += parseInt(data.points || 0);
    });

    let sorted = Object.values(leaderboard).sort((a,b) => b.total - a.total);
    let html = '';
    
    sorted.forEach((s, idx) => {
        html += `<tr>
            <td style="text-align:center; padding:10px;">${idx + 1}</td>
            <td style="padding:10px;"><b>👤 ${s.name}</b></td>
            <td style="text-align:center;"><span class="badge info">${s.classId}</span></td>
            <td style="text-align:center; color:#2ecc71; font-weight:bold;">${s.total}</td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:15px;">💡 لا يوجد مكافآت مرصودة.</td></tr>';
}