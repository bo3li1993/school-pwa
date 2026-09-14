import { db, getActiveSchoolId } from '../firebase-config.js';
import { doc, getDoc, updateDoc, collection, getDocs, query, where }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initSchoolSettingsModule() {
    var container = document.getElementById('tab-school-settings');
    if (!container) return;

    var schoolId = getActiveSchoolId();

    container.innerHTML = `
    <div class="card" style="border-top:5px solid var(--navy);">
        <h2><i class="bi bi-gear-fill" style="color:var(--navy);"></i> إعدادات المدرسة</h2>
        <p style="font-size:12px; color:var(--mid); margin-bottom:20px;">إدارة بيانات المدرسة والإعدادات العامة</p>
        <div id="ss-loading" style="text-align:center; padding:30px; color:var(--mid);">⏳ جاري التحميل...</div>
        <div id="ss-form" style="display:none;"></div>
    </div>

    <div class="card" style="border-top:5px solid var(--gold); margin-top:14px;">
        <h3 style="font-size:14px; font-weight:900; margin-bottom:14px;"><i class="bi bi-bar-chart-fill" style="color:var(--gold);"></i> إحصاءات المدرسة</h3>
        <div id="ss-stats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
            <div style="text-align:center; padding:20px; color:var(--mid);">⏳</div>
        </div>
    </div>`;

    await loadSchoolSettings();
    await loadSchoolStats();
}

async function loadSchoolSettings() {
    var schoolId = getActiveSchoolId();
    var formEl = document.getElementById('ss-form');
    var loadEl = document.getElementById('ss-loading');

    try {
        var snap = await getDoc(doc(db, 'schools', schoolId));
        var data = snap.exists() ? snap.data() : {};

        loadEl.style.display = 'none';
        formEl.style.display = 'block';

        formEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:16px;">
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">اسم المدرسة</label>
                <input type="text" id="ss-name" value="${data.name||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">المنطقة التعليمية</label>
                <select id="ss-region" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none; background:#fff;">
                    <option value="">-- اختر المنطقة --</option>
                    ${['العاصمة','حولي','الفروانية','الأحمدي','مبارك الكبير','الجهراء'].map(r =>
                        `<option value="${r}" ${data.region===r?'selected':''}>${r}</option>`
                    ).join('')}
                </select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">نوع المدرسة</label>
                <select id="ss-type" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none; background:#fff;">
                    <option value="متوسطة بنين" ${data.type==='متوسطة بنين'?'selected':''}>متوسطة بنين</option>
                    <option value="متوسطة بنات" ${data.type==='متوسطة بنات'?'selected':''}>متوسطة بنات</option>
                    <option value="ابتدائية بنين" ${data.type==='ابتدائية بنين'?'selected':''}>ابتدائية بنين</option>
                    <option value="ابتدائية بنات" ${data.type==='ابتدائية بنات'?'selected':''}>ابتدائية بنات</option>
                    <option value="ثانوية بنين" ${data.type==='ثانوية بنين'?'selected':''}>ثانوية بنين</option>
                    <option value="ثانوية بنات" ${data.type==='ثانوية بنات'?'selected':''}>ثانوية بنات</option>
                </select>
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">اللون الأساسي</label>
                <input type="color" id="ss-color" value="${data.primaryColor||'#0b2545'}"
                    style="width:100%; height:44px; border:1.5px solid var(--line); border-radius:8px; cursor:pointer; padding:2px;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">تاريخ انتهاء الاشتراك</label>
                <input type="date" id="ss-expiry" value="${data.subscriptionEnd||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">الخطة</label>
                <select id="ss-plan" style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none; background:#fff;">
                    <option value="basic" ${data.plan==='basic'?'selected':''}>أساسية</option>
                    <option value="pro" ${data.plan==='pro'?'selected':''}>احترافية</option>
                    <option value="enterprise" ${data.plan==='enterprise'?'selected':''}>مؤسسية</option>
                </select>
            </div>
        </div>

        <!-- حالة المدرسة -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:14px; background:var(--off); border-radius:10px;">
            <span style="font-weight:800; font-size:13px;">حالة المدرسة:</span>
            <select id="ss-status" style="padding:8px 14px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; outline:none; background:#fff;">
                <option value="active" ${data.status==='active'?'selected':''}>✅ نشطة</option>
                <option value="suspended" ${data.status==='suspended'?'selected':''}>⏸ موقوفة</option>
                <option value="expired" ${data.status==='expired'?'selected':''}>❌ منتهية</option>
            </select>
            <span style="font-size:12px; color:var(--mid);">معرّف المدرسة: <b>${schoolId}</b></span>
        </div>

        <!-- معلومات التواصل -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:16px;">
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">رقم هاتف المدرسة</label>
                <input type="text" id="ss-phone" value="${data.phone||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
            <div>
                <label style="font-size:12px; font-weight:800; color:var(--mid); display:block; margin-bottom:5px;">اسم المدير</label>
                <input type="text" id="ss-principal" value="${data.principalName||''}"
                    style="width:100%; padding:10px; border:1.5px solid var(--line); border-radius:8px; font-family:'Cairo',sans-serif; font-size:13px; font-weight:700; box-sizing:border-box; outline:none;">
            </div>
        </div>

        <button onclick="window.saveSchoolSettings()"
            style="background:var(--navy); color:#fff; border:none; padding:13px 28px; border-radius:8px; font-family:'Cairo',sans-serif; font-weight:900; font-size:14px; cursor:pointer;">
            <i class="bi bi-check-circle-fill"></i> حفظ الإعدادات
        </button>`;

    } catch(e) {
        loadEl.innerHTML = `<div style="color:red; padding:20px;">❌ ${e.message}</div>`;
    }
}

window.saveSchoolSettings = async function() {
    var schoolId = getActiveSchoolId();
    try {
        await updateDoc(doc(db, 'schools', schoolId), {
            name: document.getElementById('ss-name').value.trim(),
            region: document.getElementById('ss-region').value,
            type: document.getElementById('ss-type').value,
            primaryColor: document.getElementById('ss-color').value,
            subscriptionEnd: document.getElementById('ss-expiry').value,
            plan: document.getElementById('ss-plan').value,
            status: document.getElementById('ss-status').value,
            phone: document.getElementById('ss-phone').value.trim(),
            principalName: document.getElementById('ss-principal').value.trim(),
        });
        window.showToast?.('✅ تم حفظ إعدادات المدرسة');
    } catch(e) {
        window.showToast?.('❌ ' + e.message, 'error');
    }
};

async function loadSchoolStats() {
    var statsEl = document.getElementById('ss-stats');
    if (!statsEl) return;
    var schoolId = getActiveSchoolId();
    try {
        var [studentsSnap, usersSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db,'students'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'users'), where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'classes'), where('schoolId','==',schoolId))),
        ]);

        var stats = [
            { icon: '👥', num: studentsSnap.size, label: 'طالب' },
            { icon: '👤', num: usersSnap.size, label: 'موظف' },
            { icon: '🏫', num: classesSnap.size, label: 'فصل' },
        ];

        statsEl.innerHTML = stats.map(s => `
            <div style="background:#fff; border-radius:12px; padding:16px; border:1px solid var(--line); text-align:center;">
                <span style="font-size:28px; display:block; margin-bottom:6px;">${s.icon}</span>
                <span style="font-size:24px; font-weight:900; display:block; color:var(--navy);">${s.num}</span>
                <span style="font-size:12px; font-weight:700; color:var(--mid);">${s.label}</span>
            </div>`).join('');
    } catch(e) {
        statsEl.innerHTML = `<div style="color:red;">❌ ${e.message}</div>`;
    }
}
