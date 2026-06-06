import { db } from '../firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDistributionModule() {
    const container = document.getElementById('tab-classes');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--success-color);">
        <h2><i class="bi bi-shuffle"></i> محرك تنظيم وتوزيع فصول غرف المنشأة والاحتياط</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">نظام الجدولة الفوري؛ لربط الفصول وتثبيت معلمات الاحتياط وتوزيع المهام اليومية بغرف المدرسة السيرفر.</p>
        <form id="class-dist-reg-form" onsubmit="window.handleRegisterDistributionLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                <div><label>الفصل المستهدف</label><input type="text" id="dist-class-id" placeholder="مثال: 7/2" required></div>
                <div><label>المعلم الموكل إليه الاحتياط / المهمة</label><input type="text" id="dist-teacher-assign" placeholder="اسم المعلم المسؤول" required></div>
                <div><label>الموقع / الغرفة المخصصة</label><input type="text" id="dist-room-id" placeholder="مثال: مختبر الحاسوب 1" required></div>
            </div>
            <button type="submit" style="background:var(--success-color); width:100%; font-weight:bold; margin-top:10px;"><i class="bi bi-cpu-fill"></i> بث وجدولة أمر التوزيع فورا للمنظومة</button>
        </form>
    </div>`;
}

window.handleRegisterDistributionLive = async function(e) {
    e.preventDefault();
    const cId = document.getElementById('dist-class-id').value.trim();
    const tName = document.getElementById('dist-teacher-assign').value.trim();
    const room = document.getElementById('dist-room-id').value.trim();
    try {
        await addDoc(collection(db, 'class_distribution'), { classId: cId, teacherName: tName, roomLocation: room, createdAt: serverTimestamp() });
        alert(`✓ تم بنجاح بث وتنشيط خطة توزيع الفصل: ${cId}\nالمعلم المكلف: أ. ${tName}`);
        document.getElementById('class-dist-reg-form').reset();
    } catch(err) { alert('خطأ سحابي: ' + err.message); }
};