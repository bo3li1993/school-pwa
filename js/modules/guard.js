<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بوابة الأمن والحراسة - المنظومة الرقمية</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        
        body { 
            font-family: 'Cairo', sans-serif; 
            background: #0f172a; 
            color: #f1f5f9; 
            margin: 0; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            min-height: 100vh;
            padding: 20px;
        }

        .header {
            width: 100%;
            max-width: 600px;
            background: #1e293b;
            padding: 20px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border: 1px solid #334155;
        }

        .header h2 { margin: 0; color: #25d366; font-weight: 900; font-size: 20px; }
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: 'Cairo'; }

        .search-box {
            width: 100%;
            max-width: 600px;
            background: #1e293b;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            border: 2px solid #3b82f6;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }

        .search-box input {
            width: 90%;
            padding: 15px;
            font-size: 18px;
            border-radius: 8px;
            border: 1px solid #334155;
            background: #0f172a;
            color: #fff;
            text-align: center;
            font-family: 'Cairo';
            margin-bottom: 20px;
        }

        .search-box button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 18px;
            border-radius: 8px;
            font-weight: 900;
            cursor: pointer;
            font-family: 'Cairo';
            width: 90%;
            transition: 0.3s;
        }
        .search-box button:hover { background: #2563eb; }

        #result-card {
            display: none;
            width: 100%;
            max-width: 600px;
            background: #fff;
            color: #0f172a;
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
            text-align: center;
            border-bottom: 6px solid #25d366;
        }

        .btn-exit-log {
            background: #25d366;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            font-family: 'Cairo';
            font-size: 16px;
            margin-top: 15px;
            width: 100%;
        }
    </style>
</head>
<body>

    <div class="header">
        <h2><i class="bi bi-shield-check"></i> بوابة الأمن - <span id="school-name"></span></h2>
        <button class="logout-btn" onclick="logout()"><i class="bi bi-box-arrow-left"></i> خروج</button>
    </div>

    <div class="search-box">
        <h3 style="margin-top: 0; color: #cbd5e1;"><i class="bi bi-upc-scan"></i> مسح أو إدخال هوية الطالب</h3>
        <input type="text" id="student-search" placeholder="اكتب اسم الطالب أو استخدم قارئ الباركود..." autofocus>
        <button onclick="verifyStudent()"><i class="bi bi-search"></i> تحقق من التصريح</button>
    </div>

    <div id="result-card">
        </div>

    <script type="module">
        import { db } from './js/firebase-config.js';
        import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

        // 1. حماية صفحة الحارس (يمنع دخول أي شخص غير الحارس)
        const user = JSON.parse(localStorage.getItem('hs_user'));
        if (!user || String(user.role).trim().toLowerCase() !== 'guard') {
            alert('🔒 الوصول مرفوض. هذه الصفحة مخصصة لرجال الأمن فقط.');
            window.location.replace('index.html');
        }

        document.getElementById('school-name').textContent = user.schoolName || 'المدرسة';

        window.logout = () => {
            localStorage.removeItem('hs_user');
            window.location.replace('index.html');
        };

        // 2. محرك البحث والتحقق من هوية الطالب عند البوابة
        window.verifyStudent = async () => {
            const searchVal = document.getElementById('student-search').value.trim();
            if(!searchVal) return;

            const resultCard = document.getElementById('result-card');
            resultCard.style.display = 'block';
            resultCard.innerHTML = '<h3>⏳ جاري التحقق من السجلات...</h3>';

            try {
                const q = query(collection(db, 'students'), where('schoolId', '==', user.schoolId), where('status', '==', 'active'));
                const snap = await getDocs(q);
                
                let foundStudent = null;
                
                // نبحث عن الطالب بالاسم المكتوب أو الممسوح بالباركود
                snap.forEach(doc => {
                    if (doc.data().name.includes(searchVal)) {
                        foundStudent = { id: doc.id, ...doc.data() };
                    }
                });

                if (foundStudent) {
                    resultCard.innerHTML = `
                        <i class="bi bi-person-check-fill" style="font-size: 50px; color: #25d366;"></i>
                        <h2 style="margin: 10px 0;">${foundStudent.name}</h2>
                        <h3 style="color: #64748b; margin: 0 0 20px 0;">فصل: ${foundStudent.classId}</h3>
                        <div style="background: #e2e8f0; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                            <i class="bi bi-telephone"></i> هاتف ولي الأمر: <b>${foundStudent.parentPhone || 'غير مسجل'}</b>
                        </div>
                        <button class="btn-exit-log" onclick="logStudentExit('${foundStudent.name}', '${foundStudent.classId}')">
                            <i class="bi bi-door-open-fill"></i> توثيق خروج الطالب
                        </button>
                    `;
                    resultCard.style.borderBottomColor = '#25d366'; // لون أخضر للمصرح لهم
                } else {
                    resultCard.innerHTML = `
                        <i class="bi bi-exclamation-triangle-fill" style="font-size: 50px; color: #e74c3c;"></i>
                        <h2 style="color: #e74c3c;">الطالب غير موجود</h2>
                        <p>يرجى التأكد من الاسم أو توجيه الطالب للإدارة.</p>
                    `;
                    resultCard.style.borderBottomColor = '#e74c3c'; // لون أحمر للخطأ
                }

            } catch (error) {
                resultCard.innerHTML = '<h3>❌ حدث خطأ في الاتصال بالسيرفر.</h3>';
            }
        };

        // 3. توثيق الخروج في السجلات السحابية
        window.logStudentExit = async (studentName, classId) => {
            try {
                const d = new Date();
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                const todayISO = d.toISOString().split('T')[0];

                await addDoc(collection(db, 'exit_logs'), {
                    schoolId: user.schoolId,
                    studentName: studentName,
                    classId: classId,
                    date: todayISO,
                    timestamp: serverTimestamp(),
                    recordedBy: user.name
                });
                
                alert(`✅ تم توثيق خروج الطالب: ${studentName} بنجاح.`);
                document.getElementById('student-search').value = '';
                document.getElementById('result-card').style.display = 'none';
                document.getElementById('student-search').focus();
            } catch (error) {
                alert("❌ فشل في تسجيل الخروج: " + error.message);
            }
        };

        // دعم الضغط على Enter للبحث السريع (مفيد لأجهزة قراءة الباركود اليدوية)
        document.getElementById('student-search').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                verifyStudent();
            }
        });
    </script>
</body>
</html>