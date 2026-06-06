import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGuardModule() {
    const container = document.getElementById('tab-guard');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--primary-color);">
        <h2><i class="bi bi-shield-lock-fill" style="color:var(--danger-color);"></i> بوابة حارس المنشأة والأمن المدرسي الذكية</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">شاشة حارس المدرسة المخصصة للتحقق الفوري من وجود تصريح استئذان رسمي سحابي قبل فتح بوابة المدرسة للطالب.</p>
        <div style="display:flex; gap:10px;">
            <input type="text" id="guard-search-student-name" placeholder="اكتب اسم الطالب المغادر للتأكد..." style="margin-bottom:0;">
            <button onclick="window.triggerGuardSecurityCheckLive()" style="width:140px; background:var(--primary-color); font-weight:bold;"><i class="bi bi-shield-shaded"></i> فحص التصريح</button>
        </div>
        <div id="guard-security-status-badge-area" style="margin-top:20px; text-align:center;"></div>
    </div>`;
}

window.triggerGuardSecurityCheckLive = async function() {
    const name = document.getElementById('guard-search-student-name').value.trim();
    const badgeArea = document.getElementById('guard-security-status-badge-area');
    if(!name) return;
    badgeArea.innerHTML = "<p style='font-weight:bold;'>⏳ جاري مضاهاة تصاريح الإدارة والخروج المبكر...</p>";
    try {
        const q = query(collection(db, 'gatepass'), where('studentName', '==', name));
        const snap = await getDocs(q);
        let activePass = null;
        snap.forEach(doc => activePass = doc.data());
        if(activePass) {
            badgeArea.innerHTML = `
            <div style="background:#e8f8f5; border:2px solid #2ecc71; padding:15px; border-radius:12px; color:green; font-weight:bold;">
               <h3 style="font-size:18px; margin-bottom:5px;">✅ مصرح له بالخروج المبكر فوراً</h3>
               <p style="font-size:13px; color:#333;">المستلم: ${activePass.relative} | العذر المعتمد بالإدارة: ${activePass.reason}</p>
            </div>`;
        } else {
            badgeArea.innerHTML = `
            <div style="background:#fdebd0; border:2px solid #e67e22; padding:15px; border-radius:12px; color:#d35400; font-weight:bold;">
               <h3 style="font-size:18px; margin-bottom:5px;">🚨 تنبيه أمني: الطالب غير مصرح له بالخروج</h3>
               <p style="font-size:12px;">لم يتم إصدار بطاقة استئذان إلكترونية من الأخصائي اليوم للحين؛ يرجى إرجاع الطالب للفصل فوراً.</p>
            </div>`;
        }
    } catch(e) { badgeArea.innerHTML = "<p style='color:red;'>عطل بالاتصال السحابي للبوابة.</p>"; }
};