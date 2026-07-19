import { db, getActiveSchoolId, auth } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initPromotionModule() {
    const container = document.getElementById('tab-promotion');
    if (!container) return;

    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const currentYearLabel = `${startYear}-${startYear + 1}`;

    container.innerHTML = `
    <div class="card" style="border-top: 5px solid var(--gold);">
        <h2><i class="bi bi-arrow-up-circle-fill" style="color:var(--gold);"></i> الترحيل السنوي للطلاب</h2>
        <p style="font-size:13px; color:#666; margin-bottom:15px; line-height:1.8;">
            هذا الإجراء ينقل <b>كل طالب صفاً واحداً للأعلى</b> (نفس الشعبة)، وينقل طلاب الصف التاسع لأرشيف "الخريجين".
            كل سجلات الغياب والسلوك والاستئذان والعيادة الحالية تُوسَم تلقائياً بالسنة الدراسية <b>${currentYearLabel}</b> قبل الترحيل، وتبقى محفوظة بالكامل قابلة للاطلاع من تبويب "الأرشيف".
        </p>
        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:14px; margin-bottom:16px;">
            <p style="font-size:12.5px; color:#92400e; font-weight:700;">
                <i class="bi bi-exclamation-triangle-fill"></i> تنبيه: هذا الإجراء يُفضَّل تنفيذه <b>مرة واحدة فقط</b> في بداية كل عام دراسي جديد. لا تكرره خلال نفس العام.
            </p>
        </div>
        <div id="promotion-preview" style="margin-bottom:16px;">
            <p style="text-align:center; color:#999; padding:15px;">⏳ جاري تحضير معاينة الترحيل...</p>
        </div>
        <button id="btn-start-promotion" onclick="window.openPromotionModal()"
            style="width:100%; background:var(--gold); color:#fff; border:none; padding:14px; border-radius:10px; font-weight:900; font-size:15px; cursor:pointer;">
            <i class="bi bi-arrow-up-circle-fill"></i> بدء الترحيل السنوي لعام ${currentYearLabel}
        </button>
    </div>

    <div class="card">
        <h3 style="font-size:14px; margin-bottom:10px;"><i class="bi bi-clock-history"></i> سجل عمليات الترحيل السابقة</h3>
        <div id="promotion-logs-list">
            <p style="text-align:center; color:#999; padding:15px;">⏳ جاري التحميل...</p>
        </div>
    </div>

    <!-- Modal تأكيد الترحيل -->
    <div id="promotion-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:9999; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#fff; border-radius:16px; padding:26px; max-width:440px; width:100%; direction:rtl;">
            <h3 style="color:var(--danger-color); font-weight:900; margin-bottom:10px;">
                <i class="bi bi-exclamation-octagon-fill"></i> تأكيد الترحيل السنوي
            </h3>
            <p style="font-size:13px; color:#666; margin-bottom:14px; line-height:1.8;">
                سيتم ترحيل <b id="pm-student-count">-</b> طالب، وأرشفة <b id="pm-grad-count">-</b> خريج من الصف التاسع.
                للمتابعة، اكتب اسم مدرستك بالضبط: <b id="pm-school-name" style="color:var(--danger-color);"></b>
            </p>
            <input type="text" id="pm-confirm-input" placeholder="اكتب اسم المدرسة هنا"
                style="width:100%; padding:11px; border:1.5px solid var(--line); border-radius:8px; margin-bottom:14px; box-sizing:border-box;">
            <div id="pm-progress" style="display:none; text-align:center; padding:15px; font-weight:700; color:var(--gold);">
                ⏳ جاري تنفيذ الترحيل، يرجى الانتظار ولا تغلق الصفحة...
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="window.executePromotion()" id="btn-confirm-promotion"
                    style="flex:1; background:var(--danger-color); color:#fff; border:none; padding:11px; border-radius:8px; font-weight:700; cursor:pointer;">
                    تأكيد الترحيل نهائياً
                </button>
                <button onclick="window.closePromotionModal()"
                    style="background:#fff; color:var(--mid); border:1.5px solid var(--line); padding:11px 18px; border-radius:8px; font-weight:700; cursor:pointer;">
                    إلغاء
                </button>
            </div>
        </div>
    </div>`;

    loadPromotionPreview();
    loadPromotionLogs();
}

async function loadPromotionPreview() {
    const previewEl = document.getElementById('promotion-preview');
    const schoolId = getActiveSchoolId();

    try {
        const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
        let promoted = 0, graduated = 0;
        const byGrade = {};

        snap.forEach(d => {
            const classId = d.data().classId || '';
            const parts = classId.split('/');
            if (parts.length !== 2) return;
            const grade = parseInt(parts[0]);
            if (isNaN(grade)) return;
            byGrade[grade] = (byGrade[grade] || 0) + 1;
            if (grade >= 9) graduated++; else promoted++;
        });

        window._promotionCounts = { promoted, graduated, total: snap.size };

        let html = `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px;">`;
        Object.keys(byGrade).sort().forEach(grade => {
            const isGrad = parseInt(grade) >= 9;
            html += `
            <div style="text-align:center; background:${isGrad?'#fef2f2':'#f0fdf4'}; padding:12px; border-radius:8px;">
                <div style="font-size:22px; font-weight:900; color:${isGrad?'var(--danger-color)':'var(--success-color)'};">${byGrade[grade]}</div>
                <div style="font-size:11px; color:#666; font-weight:700;">${isGrad ? 'صف '+grade+' (تخرّج)' : 'صف '+grade+' → '+(parseInt(grade)+1)}</div>
            </div>`;
        });
        html += `</div>`;
        previewEl.innerHTML = html;
    } catch (e) {
        previewEl.innerHTML = `<p style="color:red; text-align:center; padding:15px;">❌ خطأ: ${e.message}</p>`;
    }
}

async function loadPromotionLogs() {
    const listEl = document.getElementById('promotion-logs-list');
    const schoolId = getActiveSchoolId();

    try {
        const snap = await getDocs(query(collection(db, 'promotion_logs'), where('schoolId', '==', schoolId)));
        if (snap.empty) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; padding:15px;">لا توجد عمليات ترحيل سابقة</p>';
            return;
        }
        const docs = snap.docs.sort((a, b) => (b.data().performedAt?.seconds || 0) - (a.data().performedAt?.seconds || 0));
        let html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
        html += '<thead><tr style="background:#f8fafc;"><th style="padding:8px;">السنة الدراسية</th><th style="padding:8px;">مُرحَّل</th><th style="padding:8px;">خريجون</th><th style="padding:8px;">التاريخ</th></tr></thead><tbody>';
        docs.forEach(d => {
            const log = d.data();
            const dateStr = log.performedAt?.toDate ? log.performedAt.toDate().toLocaleDateString('ar-KW') : '-';
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; font-weight:700;">${log.yearLabel}</td>
                <td style="padding:8px; text-align:center; color:var(--success-color); font-weight:700;">${log.promoted}</td>
                <td style="padding:8px; text-align:center; color:var(--gold); font-weight:700;">${log.graduated}</td>
                <td style="padding:8px; color:#666;">${dateStr}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<p style="color:red; text-align:center; padding:15px;">❌ خطأ: ${e.message}</p>`;
    }
}

window.openPromotionModal = function() {
    const counts = window._promotionCounts || { promoted: 0, graduated: 0 };
    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');

    document.getElementById('pm-student-count').textContent = counts.promoted;
    document.getElementById('pm-grad-count').textContent = counts.graduated;
    document.getElementById('pm-school-name').textContent = currentUser.schoolName || getActiveSchoolId();
    document.getElementById('pm-confirm-input').value = '';
    document.getElementById('pm-progress').style.display = 'none';
    document.getElementById('btn-confirm-promotion').style.display = 'block';
    document.getElementById('promotion-modal').style.display = 'flex';
};

window.closePromotionModal = function() {
    document.getElementById('promotion-modal').style.display = 'none';
};

window.executePromotion = async function() {
    const currentUser = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const expectedName = (currentUser.schoolName || getActiveSchoolId() || '').trim();
    const typedName = document.getElementById('pm-confirm-input').value.trim();

    if (typedName !== expectedName) {
        window.showToast('❌ الاسم المكتوب غير مطابق — تم إلغاء العملية', 'error');
        return;
    }

    document.getElementById('pm-progress').style.display = 'block';
    document.getElementById('btn-confirm-promotion').style.display = 'none';

    try {
        const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
        const functions = getFunctions(auth.app);
        const promoteFn = httpsCallable(functions, 'promoteStudents');

        const schoolId = getActiveSchoolId();
        const result = await promoteFn({ schoolId });

        window.closePromotionModal();
        window.showToast(`✅ تم الترحيل بنجاح: ${result.data.promoted} طالب مُرحَّل، ${result.data.graduated} خريج`);
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
        window.showToast('❌ خطأ في الترحيل: ' + e.message, 'error');
        document.getElementById('pm-progress').style.display = 'none';
        document.getElementById('btn-confirm-promotion').style.display = 'block';
    }
};
