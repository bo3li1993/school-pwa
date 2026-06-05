import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

export async function initRewardsModule() {
    const container = document.getElementById('tab-honors');
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="border-top: 5px solid #2ecc71; text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-coin" style="color:#2ecc71;"></i> نظام بنك التميز الرقمي - منح مكافآت ونقاط السلوك الإيجابي</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">اختر الفصل أولاً، ثم حدد اسم الطالب من القائمة المفرزة أبجدياً لمنحه النقاط التشجيعية فوراً.</p>
            
            <form id="rewards-grant-form" onsubmit="window.handleGrantPointsLive(event)">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                        <select id="reward-class-select" onchange="window.handleRewardClassChange(this.value)" required>
                            <option value="">-- اختر الفصل --</option>
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب (مرتب أبجدياً)</label>
                        <select id="reward-student-select" disabled required>
                            <option value="">-- بانتظار اختيار الفصل --</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">3. قيمة النقاط الممنوحة</label>
                        <select id="reward-points-value">
                            <option value="5">🪙 +5 نقاط (تميز يومي)</option>
                            <option value="10">🌟 +10 نقاط (مشاركة فعالة)</option>
                            <option value="20">🏆 +20 نقطة (تفوق باهر)</option>
                            <option value="50">👑 +50 نقطة (وسام الفائقين)</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top:12px;">
                    <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">سبب المكافأة والتعزيز</label>
                    <input type="text" id="reward-reason" placeholder="مثال: المشاركة الفعالة بالحصة والتميز الإيجابي" required>
                </div>
                
                <button type="submit" style="width:100%; background:#2ecc71; font-weight:700; margin-top:5px;"><i class="bi bi-plus-circle-fill"></i> إيداع النقاط في محفظة الطالب الرقمية</button>
            </form>
        </div>

        <div class="card" style="border-top: 5px solid var(--hover-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-trophy-fill" style="color:var(--hover-color);"></i> لوحة متصدري بنك التميز (أعلى الطلاب رصيداً بالمدرسة)</h2>
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="text-align:center; padding:10px;">الترتيب</th>
                            <th>اسم الطالب الدراسي</th>
                            <th style="text-align:center;">الفصل</th>
                            <th style="text-align:center;">إجمالي رصيد المحفظة</th>
                        </tr>
                    </thead>
                    <tbody id="rewards-leaderboard-tbody">
                        <tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري فحص رصيد المحافظ السحابية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadRewardsLeaderboardLive();
}

// دالة جلب أسامي الفصل وترتيبهم أبجدياً فوراً في بنك التميز
window.handleRewardClassChange = async function(classId) {
    const studentSelect = document.getElementById('reward-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري سحب أسامي الطلاب أبجدياً...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let studentsArray = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.name) studentsArray.push(data.name.trim());
        });

        // فرز أبجدي عربي نظيف للموبايل
        studentsArray.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب المستحق --</option>';
        studentsArray.forEach(name => {
            html += `<option value="${name}">${name}</option>`;
        });

        if (studentsArray.length === 0) {
            studentSelect.innerHTML = '<option value="">⚠️ لا يوجد طلاب مقيدين بهذا الفصل</option>';
        } else {
            studentSelect.innerHTML = html;
            studentSelect.disabled = false;
        }
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

window.handleGrantPointsLive = async function(e) {
    e.preventDefault();
    const sName = document.getElementById('reward-student-select').value;
    const cId = document.getElementById('reward-class-select').value;
    const pts = document.getElementById('reward-points-value').value;
    const reason = document.getElementById('reward-reason').value.trim();

    try {
        await addDoc(collection(db, 'rewards'), {
            studentName: sName,
            classId: cId,
            points: parseInt(pts),
            reason: reason,
            createdAt: serverTimestamp()
        });
        alert(`✓ تم بنجاح إيداع (+${pts}) نقطة في محفظة الطالب: ${sName}`);
        document.getElementById('rewards-grant-form').reset();
        // إعادة قفل قائمة الطلاب بعد الريسيت
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        loadRewardsLeaderboardLive();
    } catch(err) {
        alert('خطأ في إيداع النقاط السحابية: ' + err.message);
    }
};

async function loadRewardsLeaderboardLive() {
    const tbody = document.getElementById('rewards-leaderboard-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'rewards'));
        let leaderboard = {};

        snap.forEach(d => {
            const data = d.data();
            const name = data.studentName || 'طالب غير محدد';
            if(!leaderboard[name]) {
                leaderboard[name] = { name: name, classId: data.classId || '-', total: 0 };
            }
            leaderboard[name].total += parseInt(data.points || 0);
        });

        let sorted = Object.values(leaderboard).sort((a,b) => b.total - a.total);
        let html = '';
        
        sorted.forEach((s, idx) => {
            let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="text-align:center; font-weight:bold; padding:10px;">${medal}</td>
                    <td><b>👤 ${s.name}</b></td>
                    <td style="text-align:center;"><span class="badge info">${s.classId}</span></td>
                    <td style="text-align:center; font-weight:900; color:#2ecc71; font-size:15px;">${s.total} نقطة</td>
                </tr>
            `;
        });

        tbody.innerHTML = sorted.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px; font-weight:bold;">💡 البنك فارغ حالياً. ابدأ بإيداع أولى النقاط للطلاب أعلاه.</td></tr>' : html;
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666; padding:15px; font-weight:bold;">💡 بانتظار إضافة أولى النقاط لتفعيل قاعدة بيانات البنك.</td></tr>';
    }
}