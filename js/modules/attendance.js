// 🔴 موديل جرد وحصر الطلاب الغائبين اليوم مفرزاً ومجمعاً بالفصول الدراسية
import { db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initAttendanceModule() {
    const container = document.getElementById('tab-absent');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px;">
            <h2><i class="bi bi-person-x-fill" style="color:var(--danger-color);"></i> كشف الحصر المجمع للطلاب الغائبين اليوم بالفصول</h2>
            <p style="font-size:12px; color:#666; margin-bottom:15px; font-weight:bold;">
                📈 يتم قراءة البيانات وتجميع الطلاب تلقائياً تحت فصولهم المعتمدة لتسهيل عمل وكلاء المراحل والأخصائيين.
            </p>
            
            <div id="live-absents-classes-container" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:15px; margin-top:10px;">
                <p style="color:#999; font-weight:bold; text-align:center; grid-column:1/-1; padding:20px;">⏳ جاري سحب وفرز كشوف الحصص لايف...</p>
            </div>
            
            <button onclick="window.exportAsManzoumaPDF('tab-absent', 'كشف_توزيع_الغياب_الفصلي')" style="background:var(--primary-color); margin-top:20px; font-size:12px; font-weight:bold;"><i class="bi bi-printer-fill"></i> طباعة كشف الغياب الحالي PDF</button>
        </div>`;

        loadTodayAbsentsGroupedByClass();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red; text-align:center; padding:20px;">⚠️ تعذر تحميل موديل الغائبين: ${e.message}</div>`;
    }
}

async function loadTodayAbsentsGroupedByClass() {
    const wrapper = document.getElementById('live-absents-classes-container');
    if (!wrapper) return;

    const todayStr = new Date().toLocaleDateString('ar-KW');

    try {
        const q = query(collection(db, 'attendance'), where('date', '==', todayStr), where('status', '==', 'absent'));
        const snap = await getDocs(q);
        
        // هيكل تجميع الطلاب تحت مفتاح الفصل
        let byClass = {};
        let count = 0;

        snap.forEach(doc => {
            const data = doc.data();
            const classId = data.classId ? data.classId.trim() : 'غير محدد';
            const sName = data.studentName || data.name || 'طالب غير معرف';
            const teacher = data.recordedBy || 'هيئة التعليم';

            if (!byClass[classId]) {
                byClass[classId] = { classId: classId, students: [], teacherName: teacher };
            }
            byClass[classId].students.push(sName);
            count++;
        });

        if (count === 0) {
            wrapper.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--success-color); padding:30px; font-weight:bold; background:#e8f8f5; border-radius:8px;"><i class="bi bi-emoji-sunglasses"></i>🥇 مبروك! لا توجد حالات غياب مرصودة لليوم حتى الآن بكافة فصول المدرسة.</div>`;
            return;
        }

        let html = '';
        // فرز الفصول أبجدياً وضخها بـ ستايل ملوكي
        Object.keys(byClass).sort().forEach(cId => {
            const group = byClass[cId];
            html += `
                <div style="background:#fff0f0; border:1px solid #ffcccc; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.01);">
                    <h4 style="color:var(--danger-color); font-size:15px; font-weight:900; margin-bottom:8px; border-bottom:1px dashed #ffcccc; padding-bottom:5px;">
                        📚 صف ${group.classId} (${group.students.length} غائبين)
                    </h4>
                    <ul style="list-style:none; padding-right:5px; margin-bottom:10px; display:flex; flex-direction:column; gap:5px;">
                        ${group.students.map(name => `<li style="font-size:13px; font-weight:700; color:#333;"><i class="bi bi-dash-circle-fill" style="color:var(--danger-color); font-size:11px;"></i> ${name}</li>`).join('')}
                    </ul>
                    <span style="font-size:11px; color:#666; font-weight:bold; background:#fff; padding:3px 8px; border-radius:4px; display:inline-block; border:1px solid #eee;">
                        <i class="bi bi-person-workspace"></i> الراصد: أ. ${group.teacherName}
                    </span>
                </div>
            `;
        });

        wrapper.innerHTML = html;
    } catch(err) {
        wrapper.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#999; padding:20px;">💡 قاعدة البيانات بانتظار حركة رصد الغياب الأولى لليوم.</div>`;
    }
}