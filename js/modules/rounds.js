import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initRoundsModule() {
    const container = document.getElementById('tab-rounds');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--accent-color);">
        <h2><i class="bi bi-clipboard-check-fill"></i> توثيق ورصد جولة تفقد الجناح المدرسي اليومية</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">نموذج المشرف الإداري لتوثيق استقرار الفصول وحصر النواقص الهندسية والتنظيمية بالأجنحة طقة واحدة.</p>
        <form id="wing-round-form" onsubmit="window.handleRegisterWingRoundLive(event)">
            <label>اسم المشرف الإداري / وكيل الجناح</label>
            <input type="text" id="round-officer-name" placeholder="أدخل اسم الوكيل المسؤول المفتش" required>
            <label>الملاحظة الإدارية المرصودة (حالة النظافة والاستقرار الإنشائي بالفصول)</label>
            <input type="text" id="round-wing-notes" placeholder="مثال: الجناح مستقر بالكامل، وتم التنبيه على عامل النظافة بتطهير ممرات الجناح الثاني" required>
            <button type="submit" style="background:var(--accent-color); width:100%; font-weight:bold; margin-top:5px;"><i class="bi bi-bookmark-plus-fill"></i> تقييد وحفظ الجولة الإدارية بالسيرفر</button>
        </form>
    </div>`;
}

window.handleRegisterWingRoundLive = async function(e) {
    e.preventDefault();
    const name = document.getElementById('round-officer-name').value.trim();
    const notes = document.getElementById('round-wing-notes').value.trim();
    try {
        await addDoc(collection(db, 'wing_rounds'), { officerName: name, notes: notes, createdAt: serverTimestamp() });
        alert('✓ تم بنجاح توثيق وقيد تقرير الجولة الجناحية في أرشيف الإدارة المدرسية الموحد.');
        document.getElementById('wing-round-form').reset();
    } catch(err) { alert('خطأ: ' + err.message); }
};