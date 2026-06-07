import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGuardModule() {
    const container = document.getElementById('tab-guard');
    if (!container) return;
    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--primary-color); text-align: right;">
        <h2><i class="bi bi-shield-lock-fill" style="color:var(--danger-color);"></i> بوابة حارس المنشأة والأمن المدرسي الذكية</h2>
        <p style="font-size:12px; color:#666; font-weight:bold; margin-bottom:15px;">شاشة حارس المدرسة المخصصة للتحقق الفوري من وجود تصريح استئذان رسمي سحابي قبل فتح بوابة المدرسة للطالب.</p>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-bottom:15px;">
            <div>
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">1. اختر الصف / الفصل</label>
                <select id="guard-class-select" onchange="window.handleGuardClassChange(this.value)">
                    <option value="">-- جاري تحميل الفصول... --</option>
                </select>
            </div>
            <div>
                <label style="font-weight:700; font-size:13px; display:block; margin-bottom:5px;">2. اختر اسم الطالب المغادر</label>
                <select id="guard-student-select" disabled>
                    <option value="">-- bانتظار اختيار الفصل --</option>
                </select>
            </div>
        </div>
        <button onclick="window.triggerGuardSecurityCheckLive()" style="width:100%; background:var(--primary-color); font-weight:bold; padding:12px;"><i class="bi bi-shield-shaded"></i> فحص ومطابقة التصريح السحابي الحين</button>
        
        <div id="guard-security-status-badge-area" style="margin-top:20px; text-align:center;"></div>
    </div>`;

    // جلب الصفوف المتاحة لايف من الطلاب
    try {
        const classSelect = document.getElementById('guard-class-select');
        const snap = await getDocs(collection(db, 'students'));
        let classesSet = new Set();
        snap.forEach(doc => { if(doc.data().classId) classesSet.add(doc.data().classId.trim()); });
        
        let htmlClasses = '<option value="">-- اختر الفصل --</option>';
        Array.from(classesSet).sort().forEach(c => { htmlClasses += `<option value="${c}">${c}</option>`; });
        classSelect.innerHTML = htmlClasses;
    } catch(e) { console.error(e); }
}

window.handleGuardClassChange = async function(classId) {
    const studentSelect = document.getElementById('guard-student-select');
    if (!studentSelect) return;

    if (!classId) {
        studentSelect.innerHTML = '<option value="">-- بانتظار اختيار الفصل --</option>';
        studentSelect.disabled = true;
        return;
    }

    studentSelect.innerHTML = '<option value="">⏳ جاري جلب أسماء الصف أبجدياً...</option>';
    studentSelect.disabled = true;

    try {
        const q = query(collection(db, 'students'), where('classId', '==', classId.trim()));
        const snap = await getDocs(q);
        
        let arr = [];
        snap.forEach(doc => { if(doc.data().name) arr.push(doc.data().name.trim()); });
        arr.sort((a, b) => a.localeCompare(b, 'ar'));

        let html = '<option value="">-- اختر اسم الطالب المغادر --</option>';
        arr.forEach(name => { html += `<option value="${name}">${name}</option>`; });

        studentSelect.innerHTML = arr.length === 0 ? '<option value="">⚠️ لا يوجد طلاب</option>' : html;
        studentSelect.disabled = arr.length === 0;
    } catch (e) {
        studentSelect.innerHTML = '<option value="">❌ خطأ في جلب الكشف</option>';
    }
};

window.triggerGuardSecurityCheckLive = async function() {
    const studentName = document.getElementById('guard-student-select').value;
    const badgeArea = document.getElementById('guard-security-status-badge-area');
    
    if(!studentName) { alert('⚠️ رجاءً حدد طالب الخروج أولاً للفحص الأمني!'); return; }
    
    badgeArea.innerHTML = "<p style='font-weight:bold;'>⏳ جاري مضاهاة تصاريح الإدارة والخروج المبكر لايف...</p>";
    try {
        const q = query(collection(db, 'gatepass'), where('studentName', '==', studentName.trim()));
        const snap = await getDocs(q);
        let activePass = null;
        snap.forEach(doc => activePass = doc.data());
        
        if(activePass) {
            badgeArea.innerHTML = `
            <div style="background:#e8f8f5; border:2px solid #2ecc71; padding:15px; border-radius:12px; color:green; font-weight:bold; text-align:right;">
               <h3 style="font-size:18px; margin-bottom:5px;"><i class="bi bi-check-circle-fill"></i> ✅ مصرح له بالخروج المبكر فوراً</h3>
               <p style="font-size:13px; color:#333;">المستلم: ${activePass.relative || '-'} | العذر المعتمد بالإدارة: ${activePass.reason || '-'}</p>
            </div>`;
        } else {
            badgeArea.innerHTML = `
            <div style="background:#fdebd0; border:2px solid #e67e22; padding:15px; border-radius:12px; color:#d35400; font-weight:bold; text-align:right;">
               <h3 style="font-size:18px; margin-bottom:5px;"><i class="bi bi-shield-slash-fill"></i> 🚨 تنبيه أمني: الطالب غير مصرح له بالخروج</h3>
               <p style="font-size:12px; color:#444;">لم يتم إصدار بطاقة استئذان إلكترونية من الأخصائي اليوم للحين؛ يرجى إرجاع الطالب لفصله فوراً رعايةً لسلامته.</p>
            </div>`;
        }
    } catch(e) { badgeArea.innerHTML = "<p style='color:red;'>عطل بالاتصال السحابي للبوابة.</p>"; }
};