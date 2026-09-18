// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Cleanup Manager â€” Ø¥ÙŠÙ‚Ø§Ù onSnapshot Ø¹Ù†Ø¯ Ù…ØºØ§Ø¯Ø±Ø© Ø§Ù„ØµÙØ­Ø©
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// Ø¥ÙŠÙ‚Ø§Ù ØªÙ„Ù‚Ø§Ø¦ÙŠ Ø¹Ù†Ø¯ Ù…ØºØ§Ø¯Ø±Ø© Ø§Ù„ØµÙØ­Ø©
window.addEventListener('beforeunload', function() {
    cleanupAllListeners();
});

// Ø¥ÙŠÙ‚Ø§Ù Ø¹Ù†Ø¯ Ø¥Ø®ÙØ§Ø¡ Ø§Ù„ØµÙØ­Ø©
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page hidden - pausing listeners');
    } else {
        console.log('Page visible - resuming');
    }
});