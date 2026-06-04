import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء واجهة بنك التميز ومحفظة النقاط السلوكية للطلاب
export async function initRewardsModule() {
    // نربط الموديل بتبويب لوحة الشرف أو نسوي له حاوية مخصصة، هنا بنحقنه في تبويب الشرف ليكون مدمجاً فخماً
    const container = document.getElementById('tab-honors'); 
    if (!container) return;

    // إعادة بناء التبويب ليتسع لإضافة النقاط واستعراض المحفظة التراكمية
    let html = `
        <!-- فورم منح النقاط والتعزيز الإيجابي -->
        <div class="card" style="border-top: 5px solid #27ae60; text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-coin" style="color:#e1b12c;"></i> نظام بنك التميز الرقمي - منح مكافآت ونقاط السلوك الإيجابي</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">قم باختيار الطالب ومنحه رصيداً من النقاط الرقمية تعزيزاً لأدائه ومواظبته داخل المدرسة.</p>
            
            <form id="points-add-form" onsubmit="window.submitStudentPointsForm(event)">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px; text-align:right;">
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">اسم الطالب المستحق</label>
                        <input type="text" id="rw-student-name" placeholder="اكتب اسم الطالب" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">الفصل الدراسي</label>
                        <select id="rw-class-id" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:600;">
                            <option value="6/1">6/1</option><option value="6/2">6/2</option><option value="6/3">6/3</option><option value="6/4">6/4</option>
                            <option value="7/1">7/1</option><option value="7/2">7/2</option><option value="7/3">7/3</option><option value="7/4">7/4</option>
                            <option value="8/1">8/1</option><option value="8/2">8/2</option><option value="8/3">8/3</option><option value="8/4">8/4</option>
                            <option value="9/1">9/1</option><option value="9/2">9/2</option><option value="9/3">9/3</option><option value="9/4">9/4</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">عدد النقاط الممنوحة</label>
                        <select id="rw-points-value" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px; font-weight:800; color:#27ae60;">
                            <option value="5">🪙 +5 نقاط (تميز يومي)</option>
                            <option value="10">🪙 +10 نقاط (مشاركة ممتازة)</option>
                            <option value="20">🪙 +20 نقطة (سلوك مثالي أسبوعي)</option>
                            <option value="50">👑 +50 نقطة (فائق علمي / بطل مبادرة)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">سبب المكافأة والتعزيز</label>
                        <input type="text" id="rw-reason" placeholder="مثال: المشاركة الفعالة بالحصة" required style="width:100%; padding:11px; border:1px solid #dcdde1; border-radius:6px;">
                    </div>
                </div>

                <button type="submit" style="background:var(--primary-color); color:white; border:none; width:100%; font-size:15px; padding:13px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="bi bi-plus-circle-fill"></i> إيداع النقاط في محفظة الطالب الرقمية</button>
            </form>
        </div>

        <!-- لوحة المتصدرين وبنك رصيد فحص المحافظ -->
        <div class="card" style="margin-top:25px; text-align:right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-top:4px solid #e1b12c;">
            <h2><i class="bi bi-trophy-fill" style="color:#e1b12c;"></i> لوحة متصدري بنك التميز (أعلى الطلاب رصيداً بالمدرسة)</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center; width:60px;">الترتيب</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب الدراسي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">الفصل</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center;">آخر سبب إيداع</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd; text-align:center; color:#e67e22;">إجمالي رصيد المحفظة</th>
                        </tr>
                    </thead>
                    <tbody id="rewards-leaderboard-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري فحص وتجميع محافظ الطلاب التميزية...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    loadRewardsLeaderboard();
}

// دالة تسجيل وإيداع الحركات بالسيرفر السحابي
window.submitStudentPointsForm = async function(e) {
    e.preventDefault();
    const name = document.getElementById('rw-student-name').value.trim();
    const classId = document.getElementById('rw-class-id').value;
    const points = parseInt(document.getElementById('rw-points-value').value);
    const reason = document.getElementById('rw-reason').value.trim();
    const currentDate = new Date().toLocaleDateString('ar-KW');

    try {
        await addDoc(collection(db, 'students_rewards'), {
            studentName: name,
            classId: classId,
            points: points,
            reason: reason,
            date: currentDate,
            createdAt: serverTimestamp()
        });
        alert(`✓ نجاح رقمي: تم إيداع ${points} نقطة بنجاح في محفظة الطالب (${name}).`);
        document.getElementById('points-add-form').reset();
        loadRewardsLeaderboard();
    } catch (err) { alert('خطأ أثناء إيداع النقاط السحابية: ' + err.message); }
};

// دالة حساب وتجميع النقاط التراكمية وعرض المتصدرين
async function loadRewardsLeaderboard() {
    const tbody = document.getElementById('rewards-leaderboard-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'students_rewards'));
        let leaderboard = {};

        // تجميع الرصيد الإجمالي لكل طالب على حدة
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const sName = data.studentName;
            if (!leaderboard[sName]) {
                leaderboard[sName] = {
                    name: sName,
                    classId: data.classId || '-',
                    totalPoints: 0,
                    lastReason: data.reason || '-'
                };
            }
            leaderboard[sName].totalPoints += data.points || 0;
        });

        // تحويل الكائن إلى مصفوفة لفرز الطلاب من الأعلى رصيداً إلى الأقل
        let sortedArray = Object.values(leaderboard);
        sortedArray.sort((a, b) => b.totalPoints - a.totalPoints);

        let html = '';
        sortedArray.forEach((student, index) => {
            let rankBadge = `<span style="font-weight:800; color:#666;">${index + 1}</span>`;
            if (index === 0) rankBadge = '🥇';
            if (index === 1) rankBadge = '🥈';
            if (index === 2) rankBadge = '🥉';

            html += `
                <tr style="border-bottom:1px solid #eee; background: ${index < 3 ? '#fffdf4' : '#fff'};">
                    <td style="padding:12px; text-align:center; font-size:16px;">${rankBadge}</td>
                    <td style="padding:12px;"><b>${student.name}</b></td>
                    <td style="padding:12px; text-align:center;"><span class="badge info">${student.classId}</span></td>
                    <td style="padding:12px; text-align:center; color:#666; font-size:12px;">${student.lastReason}</td>
                    <td style="padding:12px; text-align:center; font-weight:900; color:#27ae60; font-size:16px;">🪙 ${student.totalPoints} نقطة</td>
                </tr>
            `;
        });

        tbody.innerHTML = sortedArray.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#999; padding:15px;">لا يوجد نقاط ممنوحة للطلاب حتى الآن.</td></tr>' : html;

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ في جلب بيانات بنك التميز.</td></tr>';
    }
}