const fs = require("fs");

function fixDoubleEncoded(content) {
    // الملف UTF-8 لكن النصوص العربية double-encoded
    // نحتاج نحول كل sequence من UTF-8 bytes المقروءة كـ latin1 ثم encode مرة ثانية
    return content.replace(/[\xc2-\xdf][\x80-\xbf]|[\xe0-\xef][\x80-\xbf]{2}|[\xf0-\xf7][\x80-\xbf]{3}/g, function(m) {
        try {
            return Buffer.from(m, 'latin1').toString('utf8');
        } catch(e) { return m; }
    });
}

const files = fs.readdirSync(".").filter(f => f.endsWith(".html"));

files.forEach(file => {
    const raw = fs.readFileSync(file);
    // قرأ كـ latin1
    const latin1 = raw.toString("latin1");
    // حول للـ UTF-8 الصح
    const fixed = Buffer.from(latin1, 'latin1').toString('utf8');
    // تحقق إن فيه عربي
    const arabicCount = (fixed.match(/[\u0600-\u06ff]/g) || []).length;
    if (arabicCount > 50) {
        fs.writeFileSync(file, fixed, "utf8");
        console.log("Fixed: " + file + " (" + arabicCount + " arabic)");
    } else {
        console.log("Skip: " + file + " (" + arabicCount + " arabic)");
    }
});
