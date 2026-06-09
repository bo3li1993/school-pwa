// 🛡️ منظومة الأمن والسلامة المدرسية ودفتر الزوار الرقمي - مدرسة سالم الحسينان ٢٠٢٦
// كود ذكي مطور خصيصاً لنسف كروت الغياب القديمة واحتلال الشاشة للحارس
import { db } from '../firebase-config.js';
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export async function initGuardModule() {
    console.log("🚀 تم إطلاق موديول الحارس المطور بنظام النسف التلقائي للكروت القديمة");
    
    let currentGuardName = "مسؤول الأمن والسلامة";
    const user = JSON.parse(localStorage.getItem('hs_user'));
    if (user) { currentGuardName = user.name || "حارس الأمن"; }

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

    // 🕵️‍♂️ خطة النسف الذكية: البحث عن الحاوية مالت كروت الغياب ومسحها بالكامل
    let mainContainer = document.getElementById('tab-guard') || 
                        document.getElementById('view-guard') || 
                        document.getElementById('main-content');

    // 🎯 إذا ما لقى الحاوية بالأسماء التقليدية، يفتش بالمتصفح عن كروت الغياب وينسف الحاوية مالتهم فوراً
    if (!mainContainer) {
        const allElements = document.querySelectorAll('div, section, main');
        for (let el of allElements) {
            if (el.textContent.includes('مؤشر الغياب والحضور') || el.textContent.includes('لم يتم تسجيل الغياب')) {
                mainContainer = el.closest('.workspace-container') || el.closest('.container') || el.parentElement;
                if (mainContainer) break;
            }
        }
    }

    // إذا مالقاها، ياخذ جسم الصفحة الرئيسي لضمان الحقن
    if (!mainContainer) { mainContainer = document.querySelector('.workspace-container') || document.body.querySelector('main') || document.getElementById('app'); }

    if (!mainContainer) {
        console.error("❌ تعذر العثور على منطقة الحقن بالصفحة");
        return;
    }

    // 🔥 نسف كروت الغياب القديمة تماماً وحقن لوحة الحارس الأمنية ودفتر الزوار الجديد
    mainContainer.innerHTML = `
    <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; padding: 5px; width:100%;">
        
        <div id="box-live-gatepass" style="background: #fff; padding: 22px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border-top: 6px solid #ef4444; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 15px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
                <i class="bi bi-bell-fill" style="color: #ef4444;"></i> تصاريح خروج الطلاب المعتمدة الحين (لايف من الأخصائي)
            </h2>
            <p style="font-size: 11px; color: #555; font-weight: bold; margin-bottom: 15px;">يرجى مطابقة هوية مستلم الطالب بالبطاقة المدنية قبل فتح البوابة الخارجية وتأكيد المغادرة الكلية.</p>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #1e293b;">
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">الفصل</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">اسم الطالب رباعي مأذون له</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">اسم مستلم الطالب</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">الصلة</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">الالقم المدني للمستلم</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">رقم الهاتف</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">السبب / العذر</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: center; width: 150px;">إجراء حارس الباب</th>
                        </tr>
                    </thead>
                    <tbody id="guard-live-gatepass-tbody">
                        <tr><td colspan="8" style="text-align: center; color: #7f8c8d; padding: 25px; font-weight: bold;">⏳ جاري فحص رادار الأخصائي وبث تصاريح الاستئذان المعتمدة...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div style="background: #fff; padding: 22px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border-top: 6px solid #e67e22; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 15px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
                <i class="bi bi-pencil-square" style="color: #e67e22;"></i> دفتر تسجيل وتوثيق الزوار الموحد للمدرسة
            </h2>
            <p style="font-size: 11px; color: #666; font-weight: bold; margin-bottom: 15px;">تسجيل بيانات أي شخص يدخل حرم المدرسة لتوثيق التحركات الأمنية لحماية المنشأة.</p>
            
            <form id="guard-visitor-form" onsubmit="window.saveNewVisitorLogLive(event)">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 10px;">
                    <div>
                        <label style="font-weight: 700; font-size: 12px; color: #444; display:block; margin-bottom:5px;">اسم الزائر رباعي:</label>
                        <input type="text" id="vis-name" placeholder="اكتب اسم الزائر بالكامل" required style="width: 100%; padding: 14px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 12px; color: #444; display:block; margin-bottom:5px;">الرقم المدني للزائر (12 رقم):</label>
                        <input type="number" id="vis-civil" placeholder="أدخل الرقم المدني للزائر" required style="width: 100%; padding: 14px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 12px; color: #444; display:block; margin-bottom:5px;">رقم هاتف الزائر النقال:</label>
                        <input type="number" id="vis-phone" placeholder="رقم الهاتف للتواصل العاجل" required style="width: 100%; padding: 14px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; text-align:right;">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 12px; color: #444; display:block; margin-bottom:5px;">غرض وسبب الزيارة للمدرسة:</label>
                        <select id="vis-reason" required style="width: 100%; padding: 14px; border: 2px solid #cbd5e1; border-radius: 10px; outline: none; font-weight: 700; font-size: 14px; background: #fff; direction:rtl; text-align:right;">
                            <option value="مراجعة الإدارة / المدير">👥 مراجعة الإدارة أو المدير العام</option>
                            <option value="مراجعة مكتب الأخصائي الاجتماعي">📋 مراجعة مكتب الخدمة الاجتماعية</option>
                            <option value="شؤون طلبة / تسليم مستندات">📑 شؤون الطلبة والتسجيل</option>
                            <option value="أمر آخر / صيانة / وزارات">⚙️ جهة خارجية / صيانة / وزارة التربية</option>
                        </select>
                    </div>
                </div>
                <button type="submit" style="width: 100%; background: #e67e22; color: #fff; border: none; padding: 14px; border-radius: 10px; font-weight: 900; cursor: pointer; font-size: 15px;"><i class="bi bi-shield-check"></i> حفظ وأرشفة بيانات الزائر بدفتر المنشأة السحابي</button>
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
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">توقيت الدخول</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">اسم الزائر الكريم</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">الرقم المدني للزائر</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">رقم التلفون</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">سبب وهدف الزيارة الموثق</th>
                            <th style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: 900; text-align: right;">مسؤول الأمن الراصد</th>
                        </tr>
                    </thead>
                    <tbody id="guard-visitors-archive-tbody">
                        <tr><td colspan="6" style="text-align: center; color: #999; padding: 15px; font-weight: bold;">⏳ جاري جلب دفتر الزوار من السيرفر السحابي...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>`;

    // 📡 ربط الدوال بالـ window عشان تشتغل الكليكات فورا
    window.markStudentExitedLive = async function(docId, studentName) {
        if (!confirm(`هل تؤكد مغادرة الطالب (${studentName}) أسوار المدرسة الآن؟`)) return;
        try {
            await updateDoc(doc(db, 'gatepass', docId), { status: 'exited', exitedAtStr: getUnifiedTimeString(), guardName: currentGuardName });
            alert(`✓ تم إثبات خروج الطالب (${studentName}) بنجاح.`);
        } catch (e) { alert("خطأ: " + e.message); }
    };

    window.saveNewVisitorLogLive = async function(e) {
        e.preventDefault();
        const name = document.getElementById('vis-name').value.trim();
        const civil = document.getElementById('vis-civil').value.trim();
        const phone = document.getElementById('vis-phone').value.trim();
        const reason = document.getElementById('vis-reason').value;
        if (civil.length !== 12) { alert("⚠️ الرقم المدني يجب أن يكون 12 رقم!"); return; }
        try {
            await addDoc(collection(db, 'visitors'), {
                visitorName: name, civilId: civil, phone: phone, reason: reason,
                dateStr: getUnifiedDateString(), timeStr: getUnifiedTimeString(), guardName: currentGuardName, createdAt: serverTimestamp()
            });
            alert(`✓ تم تسجيل الزائر [ ${name} ] بالدفتر السحابي.`);
            document.getElementById('guard-visitor-form').reset();
        } catch(err) { alert("خطأ: " + err.message); }
    };

    // تشغيل بث الـ Live
    listenToTodayLiveGatepasses();
    listenToTodayVisitorsLogs();

    function listenToTodayLiveGatepasses() {
        const tbody = document.getElementById('guard-live-gatepass-tbody');
        if (!tbody) return;
        onSnapshot(collection(db, 'gatepass'), (snapshot) => {
            let html = '';
            let hasActivePass = false;
            snapshot.forEach(d => {
                const data = d.data();
                if (data.dateStr === getUnifiedDateString() && data.status === 'approved') {
                    hasActivePass = true;
                    html += `
                    <tr style="border-bottom: 2px solid #fee2e2; background: #fffdfd;">
                        <td style="text-align: center; padding: 12px 10px; border: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #fff; background: #ef4444;">${data.classId || '-'}</span></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><b style="color: #ef4444; font-size: 14px;">👤 ${data.studentName || data.name || '-'}</b></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #2c3e50;">${data.relative || '-'}</td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; color: #fff; background: #10b981;">${data.relation || '-'}</span></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><code>${data.relativeCivilId || '-'}</code></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0;"><a href="tel:${data.relativePhone}" style="text-decoration: none; color: #3b82f6; font-weight: 700;"><i class="bi bi-telephone"></i> ${data.relativePhone || '-'}</a></td>
                        <td style="padding: 12px 10px; border: 1px solid #e2e8f0; color: #7f8c8d; font-size: 12px;">${data.reason || '-'}</td>
                        <td style="text-align: center; padding: 12px 10px; border: 1px solid #e2e8f0;">
                            <button style="background: #10b981; color: #fff; border: none; width: 100%; padding: 10px; border-radius: 8px; font-weight: 900; font-size: 12px; cursor: pointer;" onclick="window.markStudentExitedLive('${d.id}', '${data.studentName || data.name}')"><i class="bi bi-check-circle-fill"></i> تم المغادرة الكلية ✅</button>
                        </td>
                    </tr>`;
                }
            });
            tbody.innerHTML = html || '<tr><td colspan="8" style="text-align: center; color: #10b981; padding: 25px; font-weight: bold;">✅ البوابة آمنة. لا توجد تصاريح خروج معلقة حالياً.</td></tr>';
        });
    }

    function listenToTodayVisitorsLogs() {
        const tbody = document.getElementById('guard-visitors-archive-tbody');
        if (!tbody) return;
        onSnapshot(collection(db, 'visitors'), (snapshot) => {
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
            tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center; color: #999; padding: 15px; font-weight: bold;">💡 لم يتم تسجيل دخول أي زوار للمدرسة اليوم بعد.</td></tr>';
        });
    }
}

// تشغيل ذاتي قسري فوري لنسف أي كروت غياب معروضة حالاً بالصفحة
window.initGuardModule = initGuardModule;
setTimeout(() => { initGuardModule(); }, 200);
setInterval(() => { 
    const isGuardActive = document.getElementById('guard-live-gatepass-tbody');
    if (!isGuardActive) { initGuardModule(); }
}, 2000);