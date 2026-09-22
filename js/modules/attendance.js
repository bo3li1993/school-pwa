import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initAttendanceModule() {
    var container = document.getElementById('tab-attendance');
    if (!container) return;

    try {
        container.innerHTML = `
        <div class="card" style="border-top:5px solid var(--danger-color);text-align:right;background:#fff;padding:20px;border-radius:12px;">
            <h2><i class="bi bi-person-x-fill" style="color:var(--danger-color)"></i> كشف الحصر المجمع للطلاب الغائبين اليوم</h2>
            <p style="font-size:12px;color:#666;margin-bottom:15px;font-weight:bold;">📈 يتم قراءة البيانات وتجميع الطلاب تلقائياً تحت فصولهم المعتمدة للمدرسة الحالية.</p>

            <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
                <input type="date" id="att-date-filter" style="border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-family:Cairo,sans-serif;font-size:14px;outline:none" onchange="window.reloadAttendance()">
                <button onclick="window.printAttendancePDF()" style="background:#0b2545;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-family:Cairo,sans-serif;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="bi bi-printer-fill"></i> طباعة كشف PDF</button>
                <button onclick="window.reloadAttendance()" style="background:#e5e7eb;color:#374151;border:none;padding:10px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-weight:800;font-size:13px;cursor:pointer"><i class="bi bi-arrow-clockwise"></i> تحديث</button>
            </div>

            <div id="att-summary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px"></div>

            <div id="live-absents-classes-container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px;margin-top:10px;">
                <p style="color:#999;font-weight:bold;text-align:center;grid-column:1/-1;padding:20px;">⏳ جاري سحب وفرز كشوف الغياب...</p>
            </div>
        </div>`;

        // تعيين التاريخ الافتراضي
        document.getElementById('att-date-filter').value = getTodayISO();
        loadTodayAbsentsGroupedByClass();
    } catch(e) {
        container.innerHTML = `<div class="card" style="color:red;text-align:center;padding:20px;">⚠️ تعذر تحميل موديل الغائبين: ${e.message}</div>`;
    }
}

window.reloadAttendance = function() {
    loadTodayAbsentsGroupedByClass();
};

async function loadTodayAbsentsGroupedByClass() {
    var wrapper = document.getElementById('live-absents-classes-container');
    var summary = document.getElementById('att-summary');
    if (!wrapper) return;

    var schoolId = getActiveSchoolId();
    var dateEl = document.getElementById('att-date-filter');
    var targetDate = dateEl ? dateEl.value : getTodayISO();

    wrapper.innerHTML = '<p style="color:#999;font-weight:bold;text-align:center;grid-column:1/-1;padding:20px;">⏳ جاري التحميل...</p>';

    try {
        var q = query(
            collection(db, 'attendance'),
            where('schoolId', '==', schoolId),
            where('date', '==', targetDate),
            where('status', '==', 'absent')
        );
        var snap = await getDocs(q);

        if (snap.empty && schoolId === 'hosainan') {
            var fallbackQ = query(collection(db, 'attendance'), where('date', '==', targetDate), where('status', '==', 'absent'));
            snap = await getDocs(fallbackQ);
        }

        var byClass = {};
        var count = 0;

        snap.forEach(doc => {
            var d = doc.data();
            if (d.schoolId && d.schoolId !== schoolId) return;
            var classId = d.classId ? d.classId.trim() : 'غير محدد';
            var sName = d.studentName || d.name || 'طالب غير معرف';
            var teacher = d.recordedBy || 'هيئة التعليم';
            var period = d.period || '';
            if (!byClass[classId]) byClass[classId] = { classId, students: [], teacherName: teacher };
            byClass[classId].students.push({ name: sName, period });
            count++;
        });

        // إحصائيات سريعة
        var classCount = Object.keys(byClass).length;
        if (summary) {
            summary.innerHTML = `
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#dc2626">${count}</div>
                    <div style="font-size:11px;color:#6b7280">إجمالي الغائبين</div>
                </div>
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#0b2545">${classCount}</div>
                    <div style="font-size:11px;color:#6b7280">فصل متأثر</div>
                </div>
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#d97706">${targetDate}</div>
                    <div style="font-size:11px;color:#6b7280">التاريخ</div>
                </div>
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:24px;font-weight:900;color:#16a34a">${count > 0 ? Math.round(count/classCount) : 0}</div>
                    <div style="font-size:11px;color:#6b7280">متوسط/فصل</div>
                </div>
            `;
        }

        if (count === 0) {
            wrapper.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--success-color);padding:30px;font-weight:bold;background:#e8f8f5;border-radius:8px;"><i class="bi bi-emoji-sunglasses"></i> 🥇 مبروك! لا توجد حالات غياب مرصودة لهذا اليوم.</div>`;
            return;
        }

        var html = '';
        Object.keys(byClass).sort().forEach(cId => {
            var group = byClass[cId];
            html += `
                <div style="background:#fff0f0;border:1px solid #ffcccc;padding:15px;border-radius:10px">
                    <h4 style="color:#dc2626;font-size:15px;font-weight:900;margin-bottom:8px;border-bottom:1px dashed #ffcccc;padding-bottom:5px">
                        📚 صف ${group.classId} (${group.students.length} غائبين)
                    </h4>
                    <ul style="list-style:none;padding-right:5px;margin-bottom:10px;display:flex;flex-direction:column;gap:5px">
                        ${group.students.map((s,i) => `<li style="font-size:13px;font-weight:700;color:#333"><span style="color:#dc2626;margin-left:6px">${i+1}</span> ${s.name} ${s.period ? '<span style="font-size:11px;color:#888">('+s.period+')</span>' : ''}</li>`).join('')}
                    </ul>
                    <span style="font-size:11px;color:#666;font-weight:bold;background:#fff;padding:3px 8px;border-radius:4px;border:1px solid #eee">
                        <i class="bi bi-person-workspace"></i> الراصد: أ. ${group.teacherName}
                    </span>
                </div>`;
        });

        wrapper.innerHTML = html;

        // حفظ البيانات للطباعة
        window._attendanceData = { byClass, count, targetDate, schoolId };

    } catch(err) {
        wrapper.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#999;padding:20px;">💡 قاعدة البيانات بانتظار حركة رصد الغياب الأولى لليوم.</div>`;
    }
}

// ===== طباعة كشف الحضور PDF بصفحة واحدة =====
window.printAttendancePDF = function() {
    var data = window._attendanceData;
    if (!data || data.count === 0) {
        if (window.showToast) window.showToast('لا توجد بيانات للطباعة', 'warning');
        return;
    }

    var user = JSON.parse(localStorage.getItem('hs_user') || '{}');
    var schoolName = user.schoolName || '';
    var dateStr = data.targetDate;
    var byClass = data.byClass;

    // بناء صفوف الجدول
    var rows = '';
    var rowNum = 1;
    Object.keys(byClass).sort().forEach(cId => {
        var group = byClass[cId];
        var isFirst = true;
        group.students.forEach(s => {
            rows += `<tr>
                <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${rowNum++}</td>
                ${isFirst ? `<td style="padding:5px 8px;border:1px solid #ddd;font-weight:900;color:#0b2545;text-align:center" rowspan="${group.students.length}">${cId}</td>` : ''}
                <td style="padding:5px 8px;border:1px solid #ddd;font-weight:700">${s.name}</td>
                <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;color:#666">${s.period || '—'}</td>
                ${isFirst ? `<td style="padding:5px 8px;border:1px solid #ddd;text-align:center;color:#555;font-size:11px" rowspan="${group.students.length}">${group.teacherName}</td>` : ''}
            </tr>`;
            isFirst = false;
        });
    });

    var html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: Cairo, sans-serif; direction: rtl; font-size: 11px; color: #111; background: #fff }
  @page { size: A4; margin: 10mm }
  @media print { body { margin: 0 } .no-print { display: none } }

  .header { border-bottom: 3px double #0b2545; padding-bottom: 10px; margin-bottom: 14px }
  .header-inner { display: flex; justify-content: space-between; align-items: center }
  .header-center { text-align: center }
  .header-center h1 { font-size: 18px; font-weight: 900; color: #0b2545 }
  .header-center p { font-size: 12px; color: #555; margin-top: 3px }
  .header-side { font-size: 10px; color: #444; line-height: 1.7 }

  .stats-row { display: flex; gap: 10px; margin-bottom: 12px }
  .stat-box { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 8px; text-align: center }
  .stat-val { font-size: 20px; font-weight: 900; color: #0b2545 }
  .stat-lbl { font-size: 10px; color: #6b7280 }

  table { width: 100%; border-collapse: collapse; font-size: 11px }
  thead th { background: #0b2545; color: #fff; padding: 8px; text-align: right; font-weight: 700 }
  tbody tr:nth-child(even) { background: #f8fafc }
  tbody tr:hover { background: #eaf4fd }

  .footer { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #555 }
  .sign-box { text-align: center; border-top: 1px solid #333; padding-top: 4px; min-width: 120px; font-size: 10px }

  .print-btn { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #0b2545; color: #fff; border: none; padding: 12px 32px; border-radius: 10px; font-family: Cairo, sans-serif; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.3) }
</style>
</head>
<body>

<div class="no-print" style="text-align:center;padding:10px;background:#eaf4fd;margin-bottom:10px;border-radius:8px">
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
</div>

<div class="header">
  <div class="header-inner">
    <div class="header-side" style="text-align:right">
      <strong>دولة الكويت</strong><br>
      وزارة التربية<br>
      منطقة الفروانية التعليمية
    </div>
    <div class="header-center">
      <h1>كشف الغياب اليومي</h1>
      <p>${schoolName}</p>
      <p style="font-weight:900;color:#dc2626">📅 ${dateStr}</p>
    </div>
    <div class="header-side" style="text-align:left">
      <strong>المنظومة الرقمية</strong><br>
      وقت الطباعة: ${new Date().toLocaleTimeString('ar-KW')}<br>
      المستخدم: ${user.name || '—'}
    </div>
  </div>
</div>

<div class="stats-row">
  <div class="stat-box">
    <div class="stat-val" style="color:#dc2626">${data.count}</div>
    <div class="stat-lbl">إجمالي الغائبين</div>
  </div>
  <div class="stat-box">
    <div class="stat-val">${Object.keys(byClass).length}</div>
    <div class="stat-lbl">فصل متأثر</div>
  </div>
  <div class="stat-box">
    <div class="stat-val" style="color:#16a34a">${Object.keys(byClass).reduce((a,c) => a + byClass[c].students.length, 0) > 0 ? Math.round(data.count / Object.keys(byClass).length) : 0}</div>
    <div class="stat-lbl">متوسط غياب/فصل</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40px;text-align:center">#</th>
      <th style="width:80px;text-align:center">الفصل</th>
      <th>اسم الطالب</th>
      <th style="width:70px;text-align:center">الحصة</th>
      <th style="width:120px">الراصد</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="footer">
  <div class="sign-box">توقيع المشرف<br>______________</div>
  <div style="text-align:center;font-size:10px;color:#888;margin-top:10px">المنظومة الرقمية — نظام إدارة المدارس</div>
  <div class="sign-box">توقيع المدير<br>______________</div>
</div>

<script>setTimeout(() => window.print(), 600)<\/script>
</body>
</html>`;

    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
};
