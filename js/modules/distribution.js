import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initDistributionModule() {
    const container = document.getElementById('tab-classes-dist') || document.getElementById('tab-classes');
    if (!container) return;

    // 🔥 الحل المقترح: فحص وتحقق أمان وجود مكتبة الشيتات قبل الشروع في بناء الشاشة الإدارية
    if (typeof XLSX === 'undefined') {
        container.innerHTML = `
            <div class="card" style="border-top:5px solid var(--danger-color); text-align:center; padding:30px; direction:rtl;">
                <h3 style="color:var(--danger-color); font-weight:900;"><i class="bi bi-exclamation-octagon-fill"></i> مكتبة جداول Excel غير محملة</h3>
                <p style="color:#666; font-size:13px; font-weight:bold; margin-top:5px;">تنبيه فني: يرجى التحقق من تضمين سكربت XLSX في الصفحة الرئيسية لتمكين التصدير والجدولة الفورية.</p>
            </div>`;
        return;
    }

    // بناء الواجهة عند تخطي فحص الأمان بنجاح
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--success-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
        <h2><i class="bi bi-shuffle" style="color:var(--success-color);"></i> محرك تنظيم وتوزيع فصول غرف المنشأة وجدول الاحتياط</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">نظام الجدولة الإلكتروني الفوري؛ لربط الفصول وتثبيت معلمات الاحتياط وتوزيع المهام اليومية بغرف المدرسة.</p>
        
        <form id="class-dist-reg-form" onsubmit="window.handleRegisterDistributionLive(event)">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
                <div><label style="font-weight:700; font-size:13px;">الفصل المستهدف</label><input type="text" id="dist-class-id" placeholder="مثال: 7/2" required style="width:100%; padding:8px;"></div>
                <div><label style="font-weight:700; font-size:13px;">المعلم الموكل إليه الاحتياط / المهمة</label><input type="text" id="dist-teacher-assign" placeholder="اسم المعلم المسؤول" required style="width:100%; padding:8px;"></div>
                <div><label style="font-weight:700; font-size:13px;">الموقع / الغرفة المخصصة</label><input type="text" id="dist-room-id" placeholder="مثال: مختبر الحاسوب 1" required style="width:100%; padding:8px;"></div>
            </div>
            <button type="submit" style="background:var(--success-color); width:100%; font-weight:bold; margin-top:15px; border:none; padding:12px; color:#fff; cursor:pointer; border-radius:8px;"><i class="bi bi-cpu-fill"></i> بث وجدولة أمر التوزيع فورا للمنظومة</button>
        </form>
    </div>`;
}

window.handleRegisterDistributionLive = async function(e) {
    e.preventDefault();
    const cId = document.getElementById('dist-class-id').value.trim();
    const tName = document.getElementById('dist-teacher-assign').value.trim();
    const room = document.getElementById('dist-room-id').value.trim();
    const schoolId = getActiveSchoolId(); // 🏢 البصمة المدرسية للـ SaaS
    
    try {
        await addDoc(collection(db, 'class_distribution'), { 
            schoolId: schoolId, // 🔑 عزل البيانات للمدرسة الحالية
            classId: cId, 
            teacherName: tName, 
            roomLocation: room, 
            createdAt: serverTimestamp() 
        });
        alert(`✓ تم بنجاح بث ونشر خطة توزيع الفصل: ${cId}\nالمعلم المكلف بالاحتياط: أ. ${tName}`);
        document.getElementById('class-dist-reg-form').reset();
    } catch(err) { 
        alert('خطأ سحابي: ' + err.message); 
    }
};