import { db } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initStudentModule() {
    const container = document.getElementById('tab-student') || document.querySelector('.tab-content.active');
    if (!container) return;

    // 1. بناء واجهة البحث وملف الطالب
    container.innerHTML = `
        <div style="background:#fff; padding:25px; border-radius:12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px;">
            <h2 style="margin-top:0; color:#1e293b; font-weight:900;"><i class="bi bi-person-badge"></i> محرك البحث الذكي للطلاب</h2>
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <input type="text" id="search-student-input" placeholder="اكتب اسم الطالب للبحث..." 
                    style="flex:1; padding:12px; border-radius:8px; border:1px solid #cbd5e1; font-family:'Cairo'; font-size:16px; outline:none;">
                <button onclick="window.searchStudent()" style="background:#3b82f6; color:#fff; border:none; padding:12px 25px; border-radius:8px; font-weight:bold; cursor:pointer; font-family:'Cairo'; font-size:16px; transition:0.3s;">
                    <i class="bi bi-search"></i> بحث
                </button>
            </div>
        </div>

        <div id="student-results-container"></div>
    `;

    // التركيز التلقائي على مربع البحث لراحة المستخدم
    setTimeout(() => document.getElementById('search-student-input')?.focus(), 100);
}

// 2. محرك البحث السحابي المفلتر بهوية المدرسة
window.searchStudent = async function() {
    const searchVal = document.getElementById('search-student-input').value.trim();
    if (!searchVal) return;

    const user = JSON.parse(localStorage.getItem('hs_user'));
    const schoolId = user?.schoolId;
    if (!schoolId) return;

    const resultsDiv = document.getElementById('student-results-container');
    resultsDiv.innerHTML = '<div style="text-align:center; padding:20px; font-weight:bold; color:#64748b;">⏳ جاري البحث في سجلات المدرسة...</div>';

    try {
        // الفلترة الذكية (نجلب طلاب المدرسة ونفلتر الاسم في المتصفح لسرعة فائقة ومرونة بالبحث)
        const q = query(collection(db, 'students'), where('schoolId', '==', schoolId), where('status', '==', 'active'));
        const snap = await getDocs(q);
        
        let html = '';
        let foundCount = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            // بحث جزئي (يطلع النتيجة حتى لو كتب الاسم الأول فقط)
            if (data.name.includes(searchVal)) {
                foundCount++;
                html += `
                    <div style="background:#fff; padding:20px; border-radius:12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom:15px; border-right: 5px solid #3b82f6; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                        <div>
                            <h3 style="margin:0 0 5px 0; color:#0f172a; font-weight:900; font-size:18px;">${data.name}</h3>
                            <span style="background:#e2e8f0; color:#334155; padding:4px 10px; border-radius:6px; font-size:14px; font-weight:bold;">
                                فصل: <span id="class-display-${docSnap.id}">${data.classId}</span>
                            </span>
                            <span style="color:#64748b; font-size:14px; margin-right:10px;">
                                <i class="bi bi-telephone-fill"></i> ${data.parentPhone || 'غير مسجل'}
                            </span>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button onclick="window.contactParent('${data.parentPhone}', '${data.name}')" style="background:#25d366; color:#fff; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-family:'Cairo';">
                                <i class="bi bi-whatsapp"></i> مراسلة
                            </button>
                            
                            <div style="display:flex; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                                <input type="text" id="new-class-${docSnap.id}" placeholder="الفصل الجديد.." style="border:none; padding:8px; width:100px; outline:none; font-family:'Cairo'; text-align:center;">
                                <button onclick="window.transferStudent('${docSnap.id}')" style="background:#3b82f6; color:#fff; border:none; padding:8px 15px; font-weight:bold; cursor:pointer; font-family:'Cairo';">
                                    نقل
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        if (foundCount === 0) {
            resultsDiv.innerHTML = '<div style="text-align:center; padding:20px; background:#fff1f2; color:#e11d48; border-radius:8px; font-weight:bold;">❌ لم يتم العثور على طالب بهذا الاسم في مدرستك.</div>';
        } else {
            resultsDiv.innerHTML = `<div style="margin-bottom:15px; color:#64748b; font-weight:bold;">تم العثور على (${foundCount}) نتيجة:</div>` + html;
        }

    } catch (error) {
        console.error("❌ خطأ في محرك البحث:", error);
        resultsDiv.innerHTML = '<div style="text-align:center; padding:20px; background:#fff1f2; color:#e11d48; border-radius:8px; font-weight:bold;">حدث خطأ أثناء الاتصال بقاعدة البيانات.</div>';
    }
};

// 3. محرك النقل الداخلي (من صف لصف بضغطة زر)
window.transferStudent = async function(docId) {
    const newClassInput = document.getElementById(`new-class-${docId}`).value.trim();
    if (!newClassInput) return alert("⚠️ يرجى كتابة اسم الفصل الجديد (مثال: 9/3)");

    if (!confirm(`هل أنت متأكد من نقل الطالب إلى فصل ${newClassInput}؟`)) return;

    try {
        const studentRef = doc(db, 'students', docId);
        await updateDoc(studentRef, {
            classId: newClassInput
        });
        
        // تحديث الواجهة فوراً لراحة العين
        document.getElementById(`class-display-${docId}`).textContent = newClassInput;
        document.getElementById(`new-class-${docId}`).value = '';
        alert("✅ تم نقل الطالب بنجاح وتحديث كشوفات المعلمين تلقائياً.");
        
    } catch (error) {
        alert("❌ فشلت عملية النقل: " + error.message);
    }
};

// 4. دالة التواصل المباشر مع ولي الأمر
window.contactParent = function(phone, studentName) {
    if (!phone) return alert("⚠️ رقم هاتف ولي الأمر غير مسجل في النظام.");
    
    const user = JSON.parse(localStorage.getItem('hs_user'));
    const msg = `مرحباً ولي أمر الطالب *${studentName}*،\nتتواصل معكم إدارة *${user?.schoolName || 'المدرسة'}* بخصوص مستوى الطالب وحضوره.\n\n_المنظومة الرقمية الشاملة_`;
    
    // إضافة مفتاح الكويت تلقائياً إذا لم يكن موجوداً
    let formattedPhone = phone.startsWith('965') ? phone : '965' + phone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
};