import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء واجهة محرك البحث الموحد لملف الطالب الشامل
export async function initStudentModule() {
    const container = document.getElementById('tab-student');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--primary-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2><i class="bi bi-person-badge-fill" style="color:var(--accent-color);"></i> نظام محرك البحث الموحد عن الملف الشامل للطالب</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يتيح هذا النظام استدعاء الأرشيف السلوكي والطبي والغياب التراكمي للطالب مباشرة من كافة السجلات السحابية المدمجة.</p>
            
            <div style="display:flex; gap:10px; margin-bottom: 20px; align-items: center;">
                <input type="text" id="std-search-input" placeholder="اكتب اسم الطالب المراد فحص ملفه (ثنائياً أو رباعياً)..." style="margin-bottom:0; flex:1;">
                <button onclick="window.searchStudentComprehensiveProfile()" style="background:var(--accent-color); padding:12px 25px;"><i class="bi bi-search"></i> فحص واستدعاء الملف</button>
            </div>

            <div id="student-profile-result-area"></div>
        </div>
    `;

    container.innerHTML = html;
}

// المحرك المركزي السحابي للبحث واستدعاء تاريخ الطالب من جميع الجداول
window.searchStudentComprehensiveProfile = async function() {
    const searchInput = document.getElementById('std-search-input').value.trim();
    const area = document.getElementById('student-profile-result-area');
    if(!searchInput) { alert('الرجاء إدخال اسم الطالب أولاً لبدء الفحص!'); return; }

    area.innerHTML = '<p style="text-align:center; font-size:13px; color:#666; font-weight:bold; padding:20px;">جاري تشغيل رادار الفحص السحابي واستدعاء ملفات الطالب المخزنة...</p>';

    try {
        // 1. جلب حركات الغياب والحضور للطالب
        const attSnap = await getDocs(collection(db, 'attendance'));
        let absDays = [];
        attSnap.forEach(d => {
            const att = d.data();
            if(att.studentName && att.studentName.includes(searchInput) && att.status === 'absent') {
                absDays.push(`${att.date} (${att.classId || ''})`);
            }
        });

        // 2. جلب الحركات السلوكية والبطاقات الملونة المرصودة بحقه
        const behSnap = await getDocs(collection(db, 'behavior'));
        let behaviorLogs = [];
        behSnap.forEach(d => {
            const b = d.data();
            if(b.studentName && b.studentName.includes(searchInput)) {
                behaviorLogs.push({ date: b.date, type: b.behaviorType, signed: b.parentAcknowledged });
            }
        });

        // 3. جلب سجل الزيارات الطبية للعيادة
        const clinicSnap = await getDocs(collection(db, 'clinic_logs'));
        let clinicLogs = [];
        clinicSnap.forEach(d => {
            const c = d.data();
            if(c.studentName && c.studentName.includes(searchInput)) {
                clinicLogs.push({ date: c.date, symptoms: c.symptoms, action: c.action });
            }
        });

        // 4. جلب تصاريح الخروج والاستئذانات
        const passSnap = await getDocs(collection(db, 'gatepasses'));
        let gatepasses = [];
        passSnap.forEach(d => {
            const p = d.data();
            if(p.studentName && p.studentName.includes(searchInput)) {
                gatepasses.push({ date: p.date, time: p.time, parent: p.parentName, reason: p.reason });
            }
        });

        // في حال لم يتم العثور على أي حركة للطالب في أي جدول
        if(absDays.length === 0 && behaviorLogs.length === 0 && clinicLogs.length === 0 && gatepasses.length === 0) {
            area.innerHTML = '<p style="text-align:center; color:var(--danger-color); font-weight:bold; padding:20px;">⚠️ لم يتم العثور على أي حركات مسجلة تحت هذا الاسم. يرجى التأكد من دقة الاسم المكتوب.</p>';
            return;
        }

        // بناء لوحة الملف الموحد الفاخرة للظهور أمام المدير
        let html = `
            <div style="background:var(--bg-light); border:2px solid #ddd; padding:20px; border-radius:10px; margin-top:15px; text-align:right;">
                <h3 style="color:var(--primary-color); font-size:16px; font-weight:900; margin-bottom:15px;"><i class="bi bi-folder-fill" style="color:var(--hover-color);"></i> الملف الرقمي الشامل الموحد المسترجع للطالب: <span style="color:var(--accent-color);">${searchInput}</span></h3>
                
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:15px;">
                    
                    <div style="background:#fff; padding:15px; border-radius:8px; border-top:4px solid var(--danger-color); box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                        <h4 style="font-size:13px; color:var(--danger-color); font-weight:800; margin-bottom:8px;"><i class="bi bi-calendar-x-fill"></i> مؤشر الغياب التراكمي (${absDays.length} أيام)</h4>
                        ${absDays.length === 0 ? '<p style="font-size:12px; color:green; font-weight:bold;">لا يوجد غياب مسجل (طالب مواظب) ✓</p>' : `<ul style="font-size:11px; padding-right:15px; color:#555;">${absDays.map(day => `<li>غائب بتاريخ: ${day}</li>`).join('')}</ul>`}
                    </div>

                    <div style="background:#fff; padding:15px; border-radius:8px; border-top:4px solid var(--accent-color); box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                        <h4 style="font-size:13px; color:var(--accent-color); font-weight:800; margin-bottom:8px;"><i class="bi bi-exclamation-octagon-fill"></i> بطاقات الانضباط السلوكي (${behaviorLogs.length})</h4>
                        ${behaviorLogs.length === 0 ? '<p style="font-size:12px; color:green; font-weight:bold;">السجل نظيف ومثالي سلوكياً ✓</p>' : behaviorLogs.map(b => `<div style="font-size:11px; margin-bottom:6px; background:#fffdf5; padding:4px; border-radius:4px;"><b>📅 ${b.date}:</b> ${b.type} <br> ${b.signed ? '<span style="color:green;font-weight:bold;">✓ وقع الأب</span>' : '<span style="color:red;font-weight:bold;">🛑 لم يوقع بعد</span>'}</div>`).join('')}
                    </div>

                    <div style="background:#fff; padding:15px; border-radius:8px; border-top:4px solid #3498db; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                        <h4 style="font-size:13px; color:#3498db; font-weight:800; margin-bottom:8px;"><i class="bi bi-heart-pulse-fill"></i> المراجعات الصحية والعيادة (${clinicLogs.length})</h4>
                        ${clinicLogs.length === 0 ? '<p style="font-size:12px; color:#666;">لم يسجل زيارات صحية للعيادة.</p>' : clinicLogs.map(c => `<div style="font-size:11px; margin-bottom:6px; background:#f0f9ff; padding:4px; border-radius:4px;"><b>📅 ${c.date}:</b> الشكوى: ${c.symptoms} <br> <small style="color:#555;">الإجراء: ${c.action}</small></div>`).join('')}
                    </div>

                    <div style="background:#fff; padding:15px; border-radius:8px; border-top:4px solid #27ae60; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                        <h4 style="font-size:13px; color:#27ae60; font-weight:800; margin-bottom:8px;"><i class="bi bi-ticket-perforated-fill"></i> حقيبة الاستئذانات وتصاريح المغادرة (${gatepasses.length})</h4>
                        ${gatepasses.length === 0 ? '<p style="font-size:12px; color:#666;">لم يسبق له الاستئذان أثناء الدوام.</p>' : gatepasses.map(g => `<div style="font-size:11px; margin-bottom:6px; background:#f4fff8; padding:4px; border-radius:4px;"><b>📅 ${g.date} - ${g.time}:</b> <br>المستلم: ${g.parent} <br><small style="color:#666;">السبب: ${g.reason}</small></div>`).join('')}
                    </div>

                </div>
            </div>
        `;
        area.innerHTML = html;

    } catch(e) {
        area.innerHTML = '<p style="text-align:center; color:red; padding:20px;">خطأ إداري أثناء تجميع ملف الطالب الموحد.</p>';
    }
};