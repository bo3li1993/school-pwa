import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--accent-color);">
        <h2><i class="bi bi-person-bounding-box"></i> المحرك الذكي للاستعلام الشامل عن ملف الطالب</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">اكتب اسم الطالب للبحث في كامل الأرشيف السحابي (الغياب السلوكي، السلوك الإيجابي، والعيادة الصحية).</p>
        <div style="display:flex; gap:10px;">
            <input type="text" id="search-student-full-name" placeholder="أدخل اسم الطالب رباعي بدقة هنا..." style="margin-bottom:0;">
            <button onclick="window.triggerAdvancedStudentSearchLive()" style="width:120px; background:var(--accent-color);"><i class="bi bi-search"></i> فحص</button>
        </div>
    </div>
    <div id="student-profile-result-area"></div>`;
}

window.triggerAdvancedStudentSearchLive = async function() {
    const name = document.getElementById('search-student-full-name').value.trim();
    const area = document.getElementById('student-profile-result-area');
    if(!name) return;
    area.innerHTML = "<p style='text-align:center; font-weight:bold; padding:30px;'>⏳ جاري جرد الملف الرقمي والأرشيف السحابي للطالب لايف...</p>";
    try {
        const [att, rev, beh, cli] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('studentName', '==', name))),
            getDocs(query(collection(db, 'rewards'), where('studentName', '==', name))),
            getDocs(query(collection(db, 'behavior'), where('studentName', '==', name))),
            getDocs(query(collection(db, 'clinic'), where('studentName', '==', name)))
        ]);
        let totalPoints = 0; rev.forEach(d => totalPoints += parseInt(d.data().points || 0));
        area.innerHTML = `
        <div class="card" style="border-top-color:#27ae60;">
            <h3 style="font-size:18px; font-weight:900; color:var(--primary-color); margin-bottom:15px; text-align:center;">👤 السجل الموحد للطالب: ${name}</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:20px; text-align:center;">
                <div style="background:#f4f6f9; padding:10px; border-radius:8px;"><b>🪙 محفظة التميز</b><br><span style="color:green; font-weight:900; font-size:16px;">${totalPoints} نقطة</span></div>
                <div style="background:#fff0f0; padding:10px; border-radius:8px;"><b>🔴 أيام الغياب</b><br><span style="color:red; font-weight:900; font-size:16px;">${att.docs.filter(d=>d.data().status==='absent').length} أيام</span></div>
                <div style="background:#fff5e6; padding:10px; border-radius:8px;"><b>📑 بطاقات السلوك</b><br><span style="color:orange; font-weight:900; font-size:16px;">${beh.size} مخالفة</span></div>
                <div style="background:#eef7fc; padding:10px; border-radius:8px;"><b>🩺 زيارات العيادة</b><br><span style="color:blue; font-weight:900; font-size:16px;">${cli.size} زيارة</span></div>
            </div>
        </div>`;
    } catch(e) { area.innerHTML = `<div class="card" style="color:red;">❌ عطل بالبحث: ${e.message}</div>`; }
};