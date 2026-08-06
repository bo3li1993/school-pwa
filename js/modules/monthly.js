import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initMonthlyModule() {
    const container = document.getElementById('tab-monthly');
    if(!container) return;

    const months = [];
    const now = new Date();
    for(let i=0;i<6;i++) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        months.push({value:d.toISOString().slice(0,7), label:d.toLocaleDateString('ar-KW',{year:'numeric',month:'long'})});
    }

    container.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <h2 style="font-size:17px;font-weight:900;color:var(--navy);margin:0"><i class="bi bi-calendar-month" style="color:var(--sky)"></i> التقرير الشهري</h2>
            <div style="display:flex;gap:8px">
                <select id="monthly-month" style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700">
                    ${months.map(m=>`<option value="${m.value}">${m.label}</option>`).join('')}
                </select>
                <button onclick="window.loadMonthlyReport()" style="background:var(--sky);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer">عرض</button>
                <button onclick="window.printMonthlyReport()" style="background:var(--navy);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;cursor:pointer"><i class="bi bi-printer-fill"></i> طباعة</button>
            </div>
        </div>
        <div id="monthly-content"><div style="text-align:center;padding:40px;color:#aaa;font-weight:700">اختر الشهر واضغط "عرض"</div></div>
    </div>`;
}

window.loadMonthlyReport = async function() {
    const month = document.getElementById('monthly-month')?.value;
    if(!month) return;
    const content = document.getElementById('monthly-content');
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">⏳ جاري إعداد التقرير...</div>';

    try {
        const schoolId = getActiveSchoolId();
        const startDate = month + '-01';
        const endParts = month.split('-');
        const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]), 0);
        const endDateStr = endDate.toISOString().slice(0,10);

        // جلب كل الغياب للشهر
        const snap = await getDocs(query(collection(db,'attendance'), where('schoolId','==',schoolId), where('status','==','absent')));
        const records = snap.docs.map(d=>d.data()).filter(r => r.date >= startDate && r.date <= endDateStr);

        // إجمالي الطلاب
        const studSnap = await getDocs(query(collection(db,'students'), where('schoolId','==',schoolId)));
        const totalStudents = studSnap.size;
        const schoolDays = Math.min(new Date().getDate(), endDate.getDate());

        // إحصائيات
        const byStudent = {};
        const byClass = {};
        const byDay = {};
        records.forEach(r => {
            byStudent[r.studentName+'|'+r.classId] = (byStudent[r.studentName+'|'+r.classId]||0)+1;
            byClass[r.classId] = (byClass[r.classId]||0)+1;
            byDay[r.date] = (byDay[r.date]||0)+1;
        });

        const totalAbsent = records.length;
        const avgDaily = schoolDays > 0 ? Math.round(totalAbsent/schoolDays) : 0;
        const monthLabel = new Date(month+'-15').toLocaleDateString('ar-KW',{year:'numeric',month:'long'});

        // أكثر فصول غياباً
        const topClasses = Object.entries(byClass).sort((a,b)=>b[1]-a[1]).slice(0,5);
        // أكثر طلاب غياباً
        const topStudents = Object.entries(byStudent).sort((a,b)=>b[1]-a[1]).slice(0,10);

        content.innerHTML = `
        <div id="monthly-printable">
            <!-- KPI -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:var(--navy)">${totalStudents}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">إجمالي الطلاب</div>
                </div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#dc2626">${totalAbsent}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">إجمالي الغياب</div>
                </div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#d97706">${avgDaily}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">معدل يومي</div>
                </div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:var(--green)">${schoolDays}</div>
                    <div style="font-size:11px;color:var(--mid);font-weight:700">أيام دراسية</div>
                </div>
            </div>

            <!-- أكثر فصول غياباً -->
            <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:16px">
                <h3 style="font-size:14px;font-weight:900;margin-bottom:10px">📊 أكثر الفصول غياباً</h3>
                ${topClasses.map(([cls,count]) => {
                    const pct = totalAbsent>0 ? Math.round(count/totalAbsent*100) : 0;
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        <span style="font-weight:800;width:50px;font-size:13px">${cls}</span>
                        <div style="flex:1;background:#f0f4f8;border-radius:6px;height:22px;overflow:hidden">
                            <div style="background:#dc2626;height:100%;width:${pct}%;border-radius:6px;min-width:20px"></div>
                        </div>
                        <span style="font-weight:900;font-size:13px;color:#dc2626;width:40px;text-align:left">${count}</span>
                    </div>`;
                }).join('')}
            </div>

            <!-- أكثر طلاب غياباً -->
            <div style="background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden">
                <h3 style="font-size:14px;font-weight:900;padding:16px 16px 10px">🔴 أكثر الطلاب غياباً</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <tr style="background:#f0f4f8"><th style="padding:8px 12px;text-align:right">#</th><th style="padding:8px 12px;text-align:right">الطالب</th><th style="padding:8px 12px;text-align:center">الفصل</th><th style="padding:8px 12px;text-align:center">أيام الغياب</th></tr>
                    ${topStudents.map(([key,count],i) => {
                        const [name,cls] = key.split('|');
                        const color = count>=10?'#dc2626':count>=5?'#d97706':'#6b7280';
                        return `<tr style="border-bottom:1px solid #f0f2f5"><td style="padding:8px 12px;font-weight:700;color:var(--mid)">${i+1}</td><td style="padding:8px 12px;font-weight:800">${name}</td><td style="padding:8px 12px;text-align:center">${cls}</td><td style="padding:8px 12px;text-align:center"><span style="background:${color}22;color:${color};padding:3px 12px;border-radius:8px;font-weight:900">${count}</span></td></tr>`;
                    }).join('')}
                </table>
            </div>
        </div>`;

    } catch(e) { content.innerHTML = '<div style="color:#dc2626;padding:20px;text-align:center">❌ '+e.message+'</div>'; }
};

window.printMonthlyReport = function() {
    const month = document.getElementById('monthly-month')?.value || '';
    const content = document.getElementById('monthly-printable')?.innerHTML || '';
    const label = new Date(month+'-15').toLocaleDateString('ar-KW',{year:'numeric',month:'long'});
    if(window.ManzoumaReport) window.ManzoumaReport.printDirect(content, 'التقرير الشهري — '+label, '');
};