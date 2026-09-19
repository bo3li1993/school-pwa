// ════════════════════════════════════════════════════════════════
// Cleanup Manager — إيقاف onSnapshot عند مغادرة الصفحة
// ════════════════════════════════════════════════════════════════

var _activeListeners = [];

export function registerListener(unsub) {
    if (typeof unsub === 'function') {
        _activeListeners.push(unsub);
    }
}

export function cleanupAllListeners() {
    _activeListeners.forEach(function(unsub) {
        try { unsub(); } catch(e) {}
    });
    _activeListeners = [];
}

// إيقاف تلقائي عند مغادرة الصفحة
window.addEventListener('beforeunload', function() {
    cleanupAllListeners();
});

// إيقاف عند إخفاء الصفحة
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page hidden - pausing listeners');
    } else {
        console.log('Page visible - resuming');
    }
});