import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// دالة بناء واجهة رصد الغياب المتكرر وحساب التجاوزات تلقائياً
export async function initRepeatModule() {
    const container = document.getElementById('tab-repeat');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 5px solid var(--danger-color); text-align: right; background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <h2 style="font-size:16px; font-weight:800; color:var(--primary-color); margin-bottom:6px;"><i class="bi bi-exclamation-triangle-fill" style="color:var(--danger-color);"></i> نظام الرصد التلقائي للغياب المتكرر وتجاوز الإنذارات</h2>
            <p style="font-size:12px; color:#666; margin-bottom:20px; font-weight:bold;">يقوم النظام بفحص السجلات السحابية فوراً وحصر الطلاب الذين تجاوز إجمالي غيابهم 5 أيام أو أكثر لإصدار الإجراءات الإدارية.</p>
            
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:right;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px; border-bottom:2px solid #ddd;">اسم الطالب الدراسي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الفصل الدراسي</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">إجمالي أيام الغياب المرصودة</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">مستوى الإنذار الإداري</th>
                            <th style="padding:12px; border-bottom:2px solid #ddd;">الإجراء والمتابعة</th>
                        </tr>
                    </thead>
                    <tbody id="repeat-absent-tbody">
                        <tr><td colspan="5" style="text-align:center; color:#999; padding:15px; font-weight:bold;">جاري فحص وتجميع سجلات الغياب التراكمية من السيرفر...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    calculateRepeatAbsences();
}

// محرك ذكي يقوم بقراءة حركات الغياب وتجميعها بحسب كل طالب وتصفية المتجاوزين
async function calculateRepeatAbsences() {
    const tbody = document.getElementById('repeat-absent-tbody');
    if (!tbody) return;

    try {
        const snap = await getDocs(collection(db, 'attendance'));
        let studentAbsenceCount = {};

        snap.forEach(docSnap => {
            const att = docSnap.data();
            if (att.status === 'absent') {
                const sKey = att.studentId || att.studentName;
                if (!studentAbsenceCount[sKey]) {
                    studentAbsenceCount[sKey] = {
                        name: att.studentName,
                        classId: att.classId || '-',
                        count: 0
                    };
                }
                studentAbsenceCount[sKey].count += 1;
            }
        });

        let html = ''; let count = 0;
        
        for (let key in studentAbsenceCount) {
            const s = studentAbsenceCount[key];
            if (s.count >= 5) {
                count++;
                
                let warningBadge = `<span class="badge warning" style="background:#e67e22;">إنذار أول (أولي)</span>`;
                if(s.count >= 10) warningBadge = `<span class="badge danger" style="background:#c0392b;">إنذار ثانٍ (حرج)</span>`;
                if(s.count >= 15) warningBadge = `<span class="badge danger" style="background:#111; color:red; font-weight:900;">فصل / حرمان</span>`;

                html += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:12px;"><b>${s.name}</b></td>
                        <td style="padding:12px;"><span style="background:#1a1a2e; color:white; padding:3px 8px; border-radius:12px; font-size:11px;">${s.classId}</span></td>
                        <td style="padding:12px; font-weight:800; color:var(--danger-color); font-size:15px; text-align:center;">${s.count} أيام</td>
                        <td style="padding:12px;">${warningBadge}</td>
                        <td style="padding:12px;">
                            <button onclick="alert('جاري إعداد تقرير الإنذار الرسمي للطالب: ${s.name}')" style="padding:4px 10px; font-size:11px; background:#1a1a2e; color:white; border:none; border-radius:4px; cursor:pointer;"><i class="bi bi-file-earmark-pdf-fill"></i> طباعة كتاب الإنذار</button>
                        </td>
                    </tr>
                `;
            }
        }

        tbody.innerHTML = count === 0 ? '<tr><td colspan="5" style="text-align:center; color:#27ae60; font-weight:bold; padding:15px;">✓ مستقر: لا يوجد أي حالات تجاوزت 5 أيام غياب متكرر حالياً.</td></tr>' : html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:15px;">خطأ في معالجة وحساب التجاوزات السلوكية.</td></tr>';
    }
}