import { db } from '../firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initTodayModule() {
    const container = document.getElementById('tab-index') || document.querySelector('.tab-content.active');
    if (!container) return;

    // 1. بناء واجهة المؤشرات اليومية والإجراءات السريعة
    container.innerHTML = `
        <div style="background:#fff; padding:25px; border-radius:12px; margin-bottom:20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="margin-top:0; color:#1e293b; font-weight:900;"><i class="bi bi-graph-up"></i> إحصائيات اليوم المباشرة</h2>
            <div style="display:flex; gap:20px; margin-top: 20px;">
                <div style="flex:1; background:#fff1f2; padding:20px; border-radius:10px; text-align:center; border: 1px solid #ffe4e6; border-bottom:5px solid #e74c3c;">
                    <h3 style="color:#475569; margin:0 0 10px 0;">إجمالي الغياب</h3>
                    <h1 id="today-absent-count" style="color:#e74c3c; font-size:48px; margin:0; font-weight:900;">0</h1>
                </div>
                <div style="flex:1; background:#fffbeb; padding:20px; border-radius:10px; text-align:center; border: 1px solid #fef3c7; border-bottom:5px solid #f59e0b;">
                    <h3 style="color:#475569; margin:0 0 10px 0;">إجمالي التأخير</h3>
                    <h1 id="today-late-count" style="color:#f59e0b; font-size:48px; margin:0; font-weight:900;">0</h1>
                </div>
            </div>
        </div>

        <div style="background:#fff; padding:25px; border-radius:12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-top:0; color:#1e293b;"><i class="bi bi-lightning-charge-fill" style="color:#f59e0b;"></i> إجراءات سريعة لليوم</h3>
            <div style="background:#1e293b; padding:20px; border-radius:10px; margin-top:15px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                <span style="color:#cbd5e1; font-weight:bold;">محرك بث الغياب لأولياء الأمور عبر الواتساب:</span>
                <select id="whatsapp-class-select" style="padding:10px; border-radius:6px; font-weight:bold; border:none; outline:none; font-family:'Cairo';">
                    <option value="6/1">الصف 6/1</option>
                    <option value="7/1">الصف 7/1</option>
                    <option value="8/1">الصف 8/1</option>
                    <option value="9/1">الصف 9/1</option>
                </select>
                <button onclick="window.triggerWhatsAppBroadcast()" style="background:#25d366; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-family:'Cairo'; font-size:15px; transition:0.3s;">
                    <i class="bi bi-whatsapp"></i> بث الإشعارات الآن
                </button>
            </div>
        </div>
    `;

    // 2. الفلترة السحابية الذكية (لجلب بيانات اليوم فقط)
    const user = JSON.parse(localStorage.getItem('hs_user'));
    const schoolId = user?.schoolId;
    if (!schoolId) return;

    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const todayISO = d.toISOString().split('T')[0];

    try {
        const q = query(
            collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('date', '==', todayISO)
        );

        const snap = await getDocs(q);
        
        let absent = 0, late = 0;
        snap.forEach(doc => {
            const status = doc.data().status;
            if(status === 'absent') absent++;
            if(status === 'late') late++;
        });

        document.getElementById('today-absent-count').innerText = absent;
        document.getElementById('today-late-count').innerText = late;

    } catch (error) {
        console.error("❌ خطأ في جلب بيانات اليوم:", error);
    }
}

// 3. محرك بث الواتساب المبرمج ليعمل بدون الحاجة لـ Indexes إضافية
window.triggerWhatsAppBroadcast = async function() {
    const classId = document.getElementById('whatsapp-class-select').value;
    const user = JSON.parse(localStorage.getItem('hs_user'));
    const schoolId = user?.schoolId;
    
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const todayISO = d.toISOString().split('T')[0];

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ جاري الحصر...';
    btn.disabled = true;

    try {
        // نسحب غياب المدرسة لليوم فقط (سريع جداً)
        const q = query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('date', '==', todayISO));
        const snap = await getDocs(q);
        
        const absentList = [];
        
        // نفلتر الفصل المطلوب داخل المتصفح (عشان نتجنب مشاكل الفايربيس)
        snap.forEach(doc => {
            const data = doc.data();
            if(data.classId === classId && data.status === 'absent') {
                if(!absentList.includes(data.studentName)) {
                    absentList.push(data.studentName);
                }
            }
        });

        btn.innerHTML = originalText;
        btn.disabled = false;

        if(absentList.length === 0) {
            alert(`✅ لا يوجد غياب مسجل في النظام للصف ${classId} هذا اليوم.`);
            return;
        }

        // إرسال البيانات لدالة الواتساب العالمية الموجودة في admin.html
        if(window.sendAbsenceViaWhatsApp) {
            window.sendAbsenceViaWhatsApp(classId, absentList, todayISO);
        } else {
             // دالة احتياطية لو تم مسح الكود الأساسي بالغلط
             const msg = `*إشعار غياب رسمي*\n*${user.schoolName || 'المدرسة'}*\n*الفصل:* ${classId} | *التاريخ:* ${todayISO}\n\n*الغائبون (${absentList.length}):*\n` +
                    absentList.map((n,i) => `${i+1}. ${n}`).join('\n') +
                    `\n\n_المنظومة الرقمية الشاملة_`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
    } catch(e) {
        console.error("❌ خطأ في البث:", e);
        alert("حدث خطأ في تجميع البيانات.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};