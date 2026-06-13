import { db, getActiveSchoolId } from '../firebase-config.js';
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGuardModule() {
    console.log("🚀 تم تشغيل منظومة الأمن والسلامة الذكية والمؤمنة سحابياً");
    
    let currentGuardName = "مسؤول الأمن والسلامة";
    const user = JSON.parse(localStorage.getItem('hs_user') || '{}');
    if (user) { currentGuardName = user.name || "حارس الأمن"; }
    
    const userRole = String(user.role || '').trim().toLowerCase();

    function getUnifiedDateString() {
        const d = new Date();
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }

    function getUnifiedTimeString() {
        const d = new Date();
        let hours = d.getHours();
        let minutes = d.getMinutes();
        let ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }

    // 🎯 اصطياد منطقة العرض الرئيسية بالصفحة لتبديلها
    let mainContainer = document.getElementById('tab-guard') || 
                        document.getElementById('view-guard') || 
                        document.getElementById('guard-content') ||
                        document.querySelector('.workspace-container');

    // 🚨 قوة النسف: إذا كان الداخل هو "الحارس"، نمسح كروت الغياب والمؤشرات فوراً ونستبدلها باللوحة الأمنية
    if (userRole === 'guard') {
        const fallbackContainer = document.querySelector('.workspace-container') || document.getElementById('main-content') || document.body.querySelector('main');
        if (fallbackContainer) mainContainer = fallbackContainer;
    }

    if (!mainContainer) return;

    // 🔥 حقن التصميم الأمني الجديد المطور بالكامل بالأزرار الكبيرة جداً للآيفون
    mainContainer.innerHTML = `
    <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; padding: 5px; width:100%;">
        
        <div id="box-live-gatepass" style="background: #fff; padding: 22px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border-top: 6px solid #ef4444; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
                <i class="bi bi-bell-fill" style="color: #ef4444;"></i> تصاريح خروج الطلاب المعتمدة الحين (لايف من الأخصائي)
            </h2>
            <p style="font-size: 11px; color: #555; font-weight: bold; margin-bottom: 15px;">⚠️ إجراء أمني: يرجى مطابقة هوية مستلم الطالب بالبطاقة المدنية قبل فتح البوابة الخارجية.</p>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #1e293b;">
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">الفصل</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">اسم الطالب رباعي مأذون له</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">اسم مستلم الطالب</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">الصلة</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">الرقم المدني للمستلم</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">رقم الهاتف</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">السبب / العذر</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; width: 160px;">إجراء حارس الباب</th>
                        </tr>
                    </thead>
                    <tbody id="guard-live-gatepass-tbody">
                        <tr><td colspan="8" style="text-align: center; color: #7f8c8d; padding: 25px; font-weight: bold;">⏳ جاري فحص رادار الأخصائي وبث تصاريح الاستئذان المعتمدة...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div style="background: #fff; padding: 22px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border-top: 6px solid #e67e22; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
                <i class="bi bi-pencil-square" style="color: #e67e22;"></i> دفتر تسجيل وتوثيق الزوار الموحد للمدرسة
            </h2>
            <p style="font-size: 11px; color: #666; font-weight: bold; margin-bottom: 15px;">تسجيل بيانات أي شخص يدخل حرم المدرسة لتوثيق التحركات الأمنية لحماية المنشأة.</p>
            
            <form id="guard-visitor-form" onsubmit="window.saveNewVisitorLogLive(event)">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: 700; font-size: 13px; color: #444; display:block; margin-bottom:6px;">اسم الزائر رباعي:</label>
                        <input type="text" id="vis-name" placeholder="اكتب اسم الزائر بالكامل" required style="width: 100%; padding: 15px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 13px; color: #444; display:block; margin-bottom:6px;">الرقم المدني للزائر (12 رقم):</label>
                        <input type="number" id="vis-civil" placeholder="أدخل الرقم المدني للزائر" required style="width: 100%; padding: 15px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 13px; color: #444; display:block; margin-bottom:6px;">رقم هاتف الزائر النقال:</label>
                        <input type="number" id="vis-phone" placeholder="رقم الهاتف للتواصل العاجل" required style="width: 100%; padding: 15px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 13px; color: #444; display:block; margin-bottom:6px;">غرض وسبب الزيارة للمدرسة:</label>
                        <select id="vis-reason" required style="width: 100%; padding: 15px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; background: #fff; direction:rtl; text-align:right;">
                            <option value="مراجعة الإدارة / المدير">👥 مراجعة الإدارة أو المدير العام</option>
                            <option value="مراجعة مكتب الأخصائي الاجتماعي">📋 مراجعة مكتب الخدمة الاجتماعية</option>
                            <option value="شؤون طلبة / تسليم مستندات">📑 شؤون الطلبة والتسجيل</option>
                            <option value="أمر آخر / صيانة / وزارات">⚙️ جهة خارجية / صيانة / وزارة التربية</option>
                        </select>
                    </div>
                </div>
                <button type="submit" style="width: 100%; background: #e67e22; color: #fff; border: none; padding: 16px; border-radius: 10px; font-weight: 900; cursor: pointer; font-size: 16px; box-shadow: 0 4px 6px rgba(230,126,34,0.2);"><i class="bi bi-shield-check"></i> 🗂️ حفظ وأرشفة بيانات الزائر الحين وتصفير الخانات</button>
            </form>
        </div>

        <div style="background: #fff; padding: 22px; border-radius: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border-top: 6px solid #1e293b; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 15px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
                <i class="bi bi-journal-text"></i> السجل المركزي لحركة الزوار اليوم (تحديث حي مباشر)
            </h2>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #1e293b;">
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">توقيت الدخول</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">اسم الزائر الكريم</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">الرقم المدني للزائر</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">رقم التلفون</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">سبب وهدف الزيارة الموثق</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900;">موقع هذه المدرسة</th>
                        </tr>
                    </thead>
                    <tbody id="guard-visitors-archive-tbody">
                        <tr><td colspan="6" style="text-align: center; color: #999; padding: 15px; font-weight: bold;">⏳ جاري جلب دفتر الزوار من السيرفر السحابي...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>`;

    // 📡 3️⃣ زر "تم المغادرة بنجاح" للطالب (تحديث لايف لخانه الاستئذان)
    window.markStudentExitedLive = async function(docId, studentName) {
        if (!confirm(`هل تؤكد مغادرة الطالب (${studentName}) أسوار المدرسة الآن برفقة ولي أمره؟`)) return;
        try {
            await updateDoc(doc(db, 'gatepass', docId), { 
                status: 'exited', 
                exitedAtStr: getUnifiedTimeString(), 
                guardName: currentGuardName 
            });
            alert(`✓ تم إثبات خروج الطالب (${studentName}) بنجاح وإشعار الأخصائي الإدارة.`);
        } catch (e) { alert("خطأ سحابي: " + e.message); }
    };

    // 💾 حفظ وأرشفة الزائر بالدفتر فورياً (مع حقن معرف المدرسة لحظر الاختراقات السحابية)
    window.saveNewVisitorLogLive = async function(e) {
        e.preventDefault();
        const name = document.getElementById('vis-name').value.trim();
        const civil = document.getElementById('vis-civil').value.trim();
        const phone = document.getElementById('vis-phone').value.trim();
        const reason = document.getElementById('vis-reason').value;
        const schoolId = getActiveSchoolId(); // ← عزل مجمع سحابي
        
        if (civil.length !== 12) { alert("⚠️ الرقم المدني الكويتي يجب أن يتكون من 12 رقم بالملي!"); return; }
        try {
            await addDoc(collection(db, 'visitors'), {
                schoolId: schoolId, // ← الحاق الكرت بالملف الموحد للمدرسة النشطة
                visitorName: name, civilId: civil, phone: phone, reason: reason,
                dateStr: getUnifiedDateString(), timeStr: getUnifiedTimeString(), guardName: currentGuardName, createdAt: serverTimestamp()
            });
            alert(`✓ تم حفظ وأرشفة الزائر [ ${name} ] بنجاح وتصفير الخانات.`);
            document.getElementById('guard-visitor-form').reset();
        } catch(err) { alert("خطأ: " + err.message); }
    };

    listenToTodayLiveGatepasses();
    listenToTodayVisitorsLogs();

    function listenToTodayLiveGatepasses() {
        const tbody = document.getElementById('guard-live-gatepass-tbody');
        if (!tbody) return;
        const schoolId = getActiveSchoolId();

        // ربط الفلترة بالـ schoolId لمنع تسريب استئذانات المدارس الأخرى
        const qPass = query(collection(db, 'gatepass'), where('schoolId', '==', schoolId));

        onSnapshot(qPass, (snapshot) => {
            let html = '';
            let hasActivePass = false;
            snapshot.forEach(d => {
                const data = d.data();
                if (data.dateStr === getUnifiedDateString() && data.status === 'approved') {
                    hasActivePass = true;
                    
                    // 4️⃣ القائمة الأمنية السوداء والتحذير الصارم (Blacklist Alert)
                    let rowStyle = 'border-bottom: 2px solid #fee2e2; background: #fffdfd;';
                    let nameStyle = 'color: #ef4444; font-size: 14px;';
                    let warningBadge = '';
                    
                    if (data.reason && (data.reason.includes('منع') || data.reason.includes('تحذير') || data.reason.includes('خلاف'))) {
                        rowStyle = 'border-bottom: 3px solid #ef4444; background: #fef2f2;';
                        nameStyle = 'color: #b91c1c; font-size: 15px; font-weight:900;';
                        warningBadge = `<br><span style="background:#b91c1c; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px;"><i class="bi bi-exclamation-octagon-fill"></i> مراجعة الإدارة فوراً</span>`;
                    }

                    html += `
                    <tr style="${rowStyle}">
                        <td style="text-align: center; padding: 12px 10px; border: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #fff; background: #ef4444;">${data.classId || '-'}</span></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><b style="${nameStyle}">👤 ${data.studentName || data.name || '-'}</b>${warningBadge}</td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #2c3e50;">${data.relative || '-'}</td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #fff; background: #10b981;">${data.relation || '-'}</span></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><code>${data.relativeCivilId || '-'}</code></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><a href="tel:${data.relativePhone}" style="text-decoration: none; color: #3b82f6; font-weight: 700;"><i class="bi bi-telephone"></i> ${data.relativePhone || '-'}</a></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0; color: #7f8c8d; font-size: 12px; font-weight:bold;">${data.reason || '-'}</td>
                        <td style="text-align: center; padding: 12px 10px; border: 1px solid #e2e8f0;">
                            <button style="background: #10b981; color: #fff; border: none; width: 100%; padding: 14px 10px; border-radius: 8px; font-weight: 900; font-size: 13px; cursor: pointer; box-shadow:0 4px 6px rgba(16,185,129,0.2);" onclick="window.markStudentExitedLive('${d.id}', '${data.studentName || data.name}')"><i class="bi bi-check-circle-fill"></i> تم المغادرة بنجاح ✅</button>
                        </td>
                    </tr>`;
                }
            });
            
            // تشغيل الوميض التنبيهي الوميضي (Live Flash Alert)
            const liveBox = document.getElementById('box-live-gatepass');
            if (liveBox) {
                if (hasActivePass) { liveBox.style.animation = 'blinker 1.5s linear infinite'; liveBox.style.background = '#fffdfd'; liveBox.style.border = '2px dashed #ef4444'; }
                else { liveBox.style.animation = 'none'; liveBox.style.background = '#fff'; liveBox.style.border = '1px solid #e2e8f0'; }
            }
            tbody.innerHTML = html || '<tr><td colspan="8" style="text-align: center; color: #10b981; padding: 25px; font-weight: bold;">✅ البوابة آمنة تماماً. لا توجد تصاريح خروج معلقة بانتظار أهالي الطلاب حالياً.</td></tr>';
        });
    }

    function listenToTodayVisitorsLogs() {
        const tbody = document.getElementById('guard-visitors-archive-tbody');
        if (!tbody) return;
        const schoolId = getActiveSchoolId();

        // عزل كشوف دفتر الزوار المباشر بناءً على معرف المدرسة
        const qVis = query(collection(db, 'visitors'), where('schoolId', '==', schoolId));

        onSnapshot(qVis, (snapshot) => {
            let html = '';
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.dateStr === getUnifiedDateString()) {
                    html += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="color: #7f8c8d; font-weight: bold; padding: 12px 10px; border: 1px solid #e2e8f0;">🕒 ${d.timeStr || '-'}</td>
                        <td style="color: #1e293b; padding: 12px 10px; border: 1px solid #e2e8f0;"><b>👤 ${d.visitorName || '-'}</b></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><code>${d.civilId || '-'}</code></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><a href="tel:${d.phone}" style="text-decoration: none; color: #2c3e50; font-weight: 700;"><i class="bi bi-telephone"></i> ${d.phone || '-'}</a></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #fff; background: #475569;">${d.reason || '-'}</span></td>
                        <td style="color: #e67e22; font-weight: bold; padding: 12px 10px; border: 1px solid #e2e8f0;">أ. ${d.guardName || 'الأمن'}</td>
                    </tr>`;
                }
            });
            tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center; color: #999; padding: 15px; font-weight: bold;">💡 لم يتم تسجيل دخول أي زوار للمدرسة لغاية الآن اليوم.</td></tr>';
        });
    }
}

// 🚀 نظام الحقن القسري الفوري لو رتبة المستخدم حارس أمن لمنع كروت الغياب من العرض
window.initGuardModule = initGuardModule;
setTimeout(() => {
    const u = JSON.parse(localStorage.getItem('hs_user') || '{}');
    const r = String(u.role || '').trim().toLowerCase();
    if (r === 'guard') { initGuardModule(); }
}, 200);

// مراقبة ذكية لإعادة الحقن الفوري لو تغيرت الواجهة بالحظر
setInterval(() => {
    const u = JSON.parse(localStorage.getItem('hs_user') || '{}');
    if (String(u.role || '').trim().toLowerCase() === 'guard') {
        if (!document.getElementById('guard-live-gatepass-tbody')) { initGuardModule(); }
    }
}, 1500);

const style = document.createElement('style');
style.innerHTML = `@keyframes blinker { 50% { opacity: 0.4; } }`;
document.head.appendChild(style);