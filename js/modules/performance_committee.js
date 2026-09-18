import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â• Ø§Ù„Ø¨Ù†ÙˆØ¯ Ø§Ù„Ø­Ø±ÙÙŠØ© Ù…Ù† Ø§Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø±Ø³Ù…ÙŠØ© â•â•
var VISIT_CRITERIA = {
    "Ø¹Ø±Ø¨ÙŠ": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„ÙØµÙ„ / Ù…Ø®ØªØ¨Ø± Ù„ØºÙˆÙŠ / Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆØ¦ÙŠØ©",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø§Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©",
        "Ø§Ù„Ø¬Ù…Ù„Ø© Ø§Ù„Ø¥Ù…Ù„Ø§Ø¦ÙŠØ© Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ©",
        "Ø§Ù„ØªÙ‚ÙˆÙŠÙ… (Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„ÙÙ‚Ø±Ø© ÙˆØªØ­Ù‚ÙŠÙ‚Ù‡Ø§)"
    ],
    "Ø§Ù†Ø¬Ù„ÙŠØ²ÙŠ": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„ÙØµÙ„ / Ù…Ø®ØªØ¨Ø± Ù„ØºÙˆÙŠ / Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆØ¦ÙŠØ©",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø§Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©",
        "Ø¥Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© ÙÙ‰ Ø§Ù„Ø­ÙˆØ§Ø± Ø¯Ø§Ø®Ù„ Ø§Ù„ÙØµÙ„"
    ],
    "Ø±ÙŠØ§Ø¶ÙŠØ§Øª": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„ÙØµÙ„ / Ù‚Ø§Ø¹Ø© Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆØ¦ÙŠØ©",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø§Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©"
    ],
    "Ø¹Ù„ÙˆÙ…": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„ÙØµÙ„ / Ù…Ø®ØªØ¨Ø± Ø§Ù„Ø¹Ù„ÙˆÙ…",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø§Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©",
        "Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù„Ù‰ Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ø­ØµØ©"
    ],
    "Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ§Øª": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„ÙØµÙ„ / Ù‚Ø§Ø¹Ø© Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆØ¦ÙŠØ©",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø§Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©"
    ],
    "ØªØ±Ø¨ÙŠØ©_Ø§Ø³Ù„Ø§Ù…ÙŠØ©": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„ÙØµÙ„ / Ø§Ù„Ù…Ø³Ø¬Ø¯ / Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆØ¦ÙŠØ©",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙŠ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¥Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©",
        "Ø§Ù„Ø¯Ù‚Ø© ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¢ÙŠØ§Øª ÙˆØ§Ù„Ø£Ø­Ø§Ø¯ÙŠØ«"
    ],
    "Ø­Ø§Ø³ÙˆØ¨": [
        "Ù†Ø¸Ø§ÙØ© - Ø§Ù„ÙØµÙ„ - Ù…Ø®ØªØ¨Ø± Ø§Ù„Ø­Ø§Ø³ÙˆØ¨",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "ØªÙ†ÙÙŠØ° Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù„Ù…ÙŠ Ø¨Ø³Ù„Ø§Ø³Ø© Ø£Ù…Ø§Ù… Ø§Ù„Ø·Ù„Ø§Ø¨",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©"
    ],
    "ÙƒÙ‡Ø±Ø¨Ø§Ø¡": [
        "Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙˆØ±Ø´Ø© - ØªØ±ØªÙŠØ¨ Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ø®Ø§Ù…Ø§Øª",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "ØªÙ†ÙÙŠØ° Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù„Ù…ÙŠ Ø¨Ø³Ù„Ø§Ø³Ø© Ø£Ù…Ø§Ù… Ø§Ù„Ø·Ù„Ø§Ø¨",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©"
    ],
    "Ø¯ÙŠÙƒÙˆØ±": [
        "Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙˆØ±Ø´Ø© - ØªØ±ØªÙŠØ¨ Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ø®Ø§Ù…Ø§Øª",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "ØªÙ†ÙÙŠØ° Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù„Ù…ÙŠ Ø¨Ø³Ù„Ø§Ø³Ø© Ø£Ù…Ø§Ù… Ø§Ù„Ø·Ù„Ø§Ø¨",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©"
    ],
    "ÙÙ†ÙŠØ©": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„Ù…Ø±Ø³Ù… - ØªØ±ØªÙŠØ¨ Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ø®Ø§Ù…Ø§Øª",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© - Ø§Ù„Ø®Ø·",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ù…Ø±Ø³Ù… Ø¨Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ ÙˆØ§Ù„Ø®Ø§Ù…Ø§Øª",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ø§Ù„Ø®Ø§Ù…Ø§Øª",
        "Ù…ØªØ§Ø¨Ø¹Ø© Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ¥Ù†ØªØ§Ø¬Ù‡Ù…",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©"
    ],
    "ØªØ±Ø¨ÙŠØ©_Ø¨Ø¯Ù†ÙŠØ©": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ø§Ù„Ù…Ù„Ø§Ø¹Ø¨ Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠØ© / Ø§Ù„ØµØ§Ù„Ø© Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©",
        "Ø§Ù„ØªØ²Ø§Ù… Ø§Ù„Ø·Ù„Ø§Ø¨ Ø¨Ø§Ù„Ø²ÙŠ Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠ",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ Ø­Ø³Ø¨ Ø§Ù„Ø¨Ø±Ù†Ø§Ù…Ø¬ Ø§Ù„Ø²Ù…Ù†ÙŠ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "ØªØ³Ù„Ø³Ù„ Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø­Ø³Ø¨ Ø®Ø·Ø© Ø§Ù„ØªØ­Ø¶ÙŠØ±",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "ØªÙ…Ø±ÙŠÙ†Ø§Øª Ø§Ù„Ø¥Ø­Ù…Ø§Ø¡ ÙˆØªÙ†Ø§Ø³Ø¨Ù‡Ø§ Ù…Ø¹ Ø§Ù„Ù…Ù‡Ø§Ø±Ø©",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„",
        "ØªÙ†Ø§Ø³Ø¨ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø®Ø§Øµ Ù…Ø¹ Ø§Ù„Ù…Ù‡Ø§Ø±Ø© Ø§Ù„Ù…Ù‚Ø±Ø±Ø©",
        "Ø§Ù„ØªØ¯Ø±Ø¬ ÙÙ‰ Ø´Ø±Ø­ Ø§Ù„Ù…Ù‡Ø§Ø±Ø©",
        "Ù†Ø´Ø§Ø· Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª ÙÙ‰ ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…Ù‡Ø§Ø±Ø©",
        "ØªÙ†ÙÙŠØ° Ø§Ù„Ù„Ø¹Ø¨Ø© Ø§Ù„ØµØºÙŠØ±Ø© ÙˆØ£Ø«Ø±Ù‡Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ø·Ù„Ø§Ø¨",
        "ØªØ£Ø¯ÙŠØ© ØªÙ…Ø±ÙŠÙ† Ø§Ù„Ø®ØªØ§Ù… ÙˆØ§Ù„ØªÙ‡Ø¯Ø¦Ø©",
        "Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù†Ø¯Ø§Ø¡Ø§Øª Ø§Ù„ØµØ­ÙŠØ­Ø© ÙˆØ§Ù„Ø³Ù„Ø§Ù…Ø©",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙˆÙƒÙØ§ÙŠØªÙ‡Ø§"
    ],
    "Ù…ÙˆØ³ÙŠÙ‚Ù‰": [
        "Ù†Ø¸Ø§ÙØ© â€“ Ù‚Ø§Ø¹Ø© Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚Ù‰ / Ù‚Ø§Ø¹Ø© Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆØ¦ÙŠØ©",
        "ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€“ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª â€“ Ù…Ù‚Ø§Ø¹Ø¯)",
        "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø©",
        "Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ",
        "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª",
        "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­",
        "Ø§Ù„ØªØµØ±Ù ÙÙ‰ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ø¦Ø©",
        "Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©",
        "Ø§Ù„Ø£Ù‡ØªÙ…Ø§Ù… Ø¨Ù…ÙˆØ§Ù‡Ø¨ Ø§Ù„Ù…ØªØ¹Ù„Ù…ÙŠÙ† ÙˆØªÙ†Ù…ÙŠØªÙ‡Ø§",
        "Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¢Ù„Ø§Øª Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚ÙŠØ©",
        "Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡",
        "Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©",
        "ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©"
    ]
};

var RATINGS = ['Ù…Ù…ØªØ§Ø²', 'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹', 'Ø¬ÙŠØ¯', 'Ù…Ù‚Ø¨ÙˆÙ„', 'Ø¶Ø¹ÙŠÙ'];
var RATING_SCORES = { 'Ù…Ù…ØªØ§Ø²': 5, 'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹': 4, 'Ø¬ÙŠØ¯': 3, 'Ù…Ù‚Ø¨ÙˆÙ„': 2, 'Ø¶Ø¹ÙŠÙ': 1 };
var RATING_COLORS = { 'Ù…Ù…ØªØ§Ø²': '#16a34a', 'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹': '#2563eb', 'Ø¬ÙŠØ¯': '#0891b2', 'Ù…Ù‚Ø¨ÙˆÙ„': '#d97706', 'Ø¶Ø¹ÙŠÙ': '#dc2626' };


// â•â• Ø¨Ù†ÙˆØ¯ Ø²ÙŠØ§Ø±Ø© Ø§Ù„ÙØµÙ„ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ© â•â•
var DEFAULT_CLASSROOM_CRITERIA = [
    "Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨Ù‡",
    "Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆÙ‡Ø¯ÙˆØ¦Ù‡Ù…",
    "ØªÙØ§Ø¹Ù„ Ø§Ù„Ø·Ù„Ø§Ø¨ Ù…Ø¹ Ø§Ù„Ø¯Ø±Ø³",
    "ÙˆØ¬ÙˆØ¯ Ø§Ù„Ù…Ø¹Ù„Ù… ÙˆÙ…Ø¨Ø§Ø´Ø±ØªÙ‡ Ù„Ù„Ø­ØµØ©",
    "ØªÙˆÙØ± Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©",
    "ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ¸Ù‡ÙˆØ±Ù‡Ø§",
    "Ø§Ù„ØªØ²Ø§Ù… Ø§Ù„Ø·Ù„Ø§Ø¨ Ø¨Ø§Ù„Ø²ÙŠ Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠ",
    "Ø³Ù„ÙˆÙƒ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø®Ù„Ø§Ù‚ÙŠØ§ØªÙ‡Ù…",
    "Ø§Ø³ØªØºÙ„Ø§Ù„ Ø²Ù…Ù† Ø§Ù„Ø­ØµØ©",
    "Ù…Ø³ØªÙˆÙ‰ Ø§Ù„ØªÙØ§Ø¹Ù„ ÙˆØ§Ù„Ù…Ø´Ø§Ø±ÙƒØ©"
];
var classroomCriteriaCache = null;

var pcData = { visits: [], tasks: [], meetings: [], students: [], users: [] };
var currentVisitRatings = {};

export async function initPerformanceCommitteeModule() {
    var container = document.getElementById('tab-performance-committee');
    if (!container) return;

    container.innerHTML = `
    <style>
    .pc-wrap{font-family:'Cairo',sans-serif;direction:rtl;}
    .pc-hdr{background:linear-gradient(135deg,#0b2545,#1a78c2);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
    .pc-hdr h2{font-size:16px;font-weight:900;margin:0;}
    .pc-hdr p{font-size:11px;color:rgba(255,255,255,.7);margin:3px 0 0;}
    .pc-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none;}
    .pc-tabs::-webkit-scrollbar{display:none;}
    .pc-tab{flex-shrink:0;padding:8px 14px;border:2px solid var(--line);border-radius:10px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:#fff;color:var(--mid);transition:all .2s;}
    .pc-tab.active{border-color:var(--navy);background:var(--navy);color:#fff;}
    .pc-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px;}
    .pc-kpi{background:#fff;border-radius:12px;padding:14px;border:1px solid var(--line);text-align:center;}
    .pc-kpi-num{font-size:22px;font-weight:900;display:block;color:var(--navy);margin-bottom:3px;}
    .pc-kpi-label{font-size:11px;font-weight:700;color:var(--mid);}
    .pc-card{background:#fff;border-radius:12px;border:1px solid var(--line);margin-bottom:14px;overflow:hidden;}
    .pc-card-header{padding:12px 16px;background:var(--off);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
    .pc-card-title{font-weight:900;font-size:13px;color:var(--navy);display:flex;align-items:center;gap:8px;}
    .pc-card-body{padding:14px;}
    .pc-btn{background:var(--sky);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;}
    .pc-btn.sm{padding:5px 9px;font-size:11px;}
    .pc-btn.red{background:#dc2626;}
    .pc-btn.green{background:#16a34a;}
    .pc-tbl{width:100%;border-collapse:collapse;font-size:12px;}
    .pc-tbl th{padding:8px 10px;background:var(--navy);color:#fff;text-align:right;font-weight:700;}
    .pc-tbl td{padding:8px 10px;border-bottom:1px solid #f0f0f0;}
    .pc-tbl tr:last-child td{border-bottom:none;}
    .pc-badge{padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;}
    .pc-badge.done{background:#f0fdf4;color:#16a34a;}
    .pc-badge.prg{background:#eff6ff;color:#1a78c2;}
    .pc-badge.late{background:#fef2f2;color:#dc2626;}
    .pc-fld{margin-bottom:11px;}
    .pc-lbl{font-size:12px;font-weight:800;color:var(--mid);display:block;margin-bottom:4px;}
    .pc-inp,.pc-sel{width:100%;padding:10px 13px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700;outline:none;background:var(--off);box-sizing:border-box;}
    .pc-inp:focus,.pc-sel:focus{border-color:var(--sky);background:#fff;}
    .pc-ta{width:100%;padding:10px 13px;border:1.5px solid var(--line);border-radius:8px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:700;outline:none;background:var(--off);min-height:65px;resize:vertical;box-sizing:border-box;}
    .pc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:11px;margin-bottom:12px;}
    .pc-submit{width:100%;padding:12px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:900;cursor:pointer;}
    .pc-hidden{display:none;}
    .pc-empty{text-align:center;padding:25px;color:var(--mid);font-size:13px;font-weight:700;}
    .vt{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;}
    .vt th{background:var(--navy);color:#fff;padding:7px 9px;text-align:right;font-size:11px;}
    .vt td{padding:7px 9px;border-bottom:1px solid #eee;vertical-align:middle;}
    .vt tr:last-child td{border-bottom:none;}
    .rd{display:flex;gap:3px;justify-content:center;}
    .rd input{display:none;}
    .rd-dot{width:30px;height:30px;border-radius:50%;border:2px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#aaa;cursor:pointer;background:#f9f9f9;transition:all .15s;}
    .rd input:checked+.rd-dot{border-color:var(--sky);background:var(--sky);color:#fff;}
    .pc-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:16px;}
    .pc-modal.show{display:flex;}
    .pc-mbox{background:#fff;border-radius:16px;padding:22px;max-width:720px;width:100%;max-height:90vh;overflow-y:auto;direction:rtl;}
    .pc-mhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
    .pc-mtitle{font-size:15px;font-weight:900;color:var(--navy);margin:0;}
    </style>

    <div class="pc-wrap">
    <div class="pc-hdr">
        <div>
            <h2><i class="bi bi-clipboard2-data-fill"></i> Ù„ÙˆØ­Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠ</h2>
            <p>Ù„Ø¬Ù†Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ â€” ${new Date().toLocaleDateString('ar-KW',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <button class="pc-btn" onclick="window.pcExportReport()"><i class="bi bi-printer-fill"></i> ØªØµØ¯ÙŠØ±</button>
    </div>

    <div class="pc-tabs">
        <button class="pc-tab active" onclick="window.pcSwitchTab('overview',this)"><i class="bi bi-speedometer2"></i> Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('visits',this)"><i class="bi bi-person-check-fill"></i> ØªÙ‚ÙŠÙŠÙ… Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('classroom',this)"><i class="bi bi-door-open-fill"></i> Ø²ÙŠØ§Ø±Ø© Ø§Ù„ÙØµÙ„</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('tasks',this)"><i class="bi bi-list-check"></i> Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('meetings',this)"><i class="bi bi-people-fill"></i> Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹Ø§Øª</button>
        <button class="pc-tab" onclick="window.pcSwitchTab('students',this)"><i class="bi bi-person-lines-fill"></i> Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø§Ø¨</button>
    </div>

    <!-- Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø© -->
    <div id="pc-tab-overview">
        <div class="pc-kpi-grid">
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">ðŸ‘ï¸</span><span class="pc-kpi-num" id="kpi-v">-</span><span class="pc-kpi-label">Ø²ÙŠØ§Ø±Ø© ØµÙÙŠØ©</span></div>
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">âœ…</span><span class="pc-kpi-num" id="kpi-d">-</span><span class="pc-kpi-label">Ù‚Ø±Ø§Ø± Ù…Ù†Ø¬Ø²</span></div>
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">â³</span><span class="pc-kpi-num" id="kpi-p">-</span><span class="pc-kpi-label">Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°</span></div>
            <div class="pc-kpi"><span style="font-size:22px;display:block;margin-bottom:5px;">ðŸ“‹</span><span class="pc-kpi-num" id="kpi-m">-</span><span class="pc-kpi-label">Ø§Ø¬ØªÙ…Ø§Ø¹</span></div>
        </div>
        <div class="pc-card"><div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-list-check"></i> Ø¢Ø®Ø± Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª</span></div><div class="pc-card-body" style="overflow-x:auto;"><div id="pc-ov-tasks"><div class="pc-empty">â³</div></div></div></div>
        <div class="pc-card"><div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-eye-fill"></i> Ø¢Ø®Ø± Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª</span></div><div class="pc-card-body" style="overflow-x:auto;"><div id="pc-ov-visits"><div class="pc-empty">â³</div></div></div></div>
    </div>

    <!-- Ø²ÙŠØ§Ø±Ø© Ø§Ù„ÙØµÙ„ -->
    <div id="pc-tab-classroom" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-door-open-fill"></i> Ø³Ø¬Ù„ Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ÙØµÙˆÙ„</span>
                <div style="display:flex;gap:8px;">
                    <button class="pc-btn" style="background:#059669;" onclick="window.pcOpenCriteriaSettings()"><i class="bi bi-gear-fill"></i> Ø¶Ø¨Ø· Ø§Ù„Ø¨Ù†ÙˆØ¯</button>
                    <button class="pc-btn" onclick="window.pcOpenClassroomModal()"><i class="bi bi-plus-circle-fill"></i> Ø²ÙŠØ§Ø±Ø© Ø¬Ø¯ÙŠØ¯Ø©</button>
                </div>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-classroom-list"><div class="pc-empty">â³</div></div></div>
        </div>
    </div>

    <!-- Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª -->
    <div id="pc-tab-visits" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-clipboard2-check-fill"></i> Ø³Ø¬Ù„ Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ØµÙÙŠØ©</span>
                <button class="pc-btn" onclick="window.pcOpenVisitModal()"><i class="bi bi-plus-circle-fill"></i> Ø²ÙŠØ§Ø±Ø© Ø¬Ø¯ÙŠØ¯Ø©</button>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-visits-list"><div class="pc-empty">â³</div></div></div>
        </div>
    </div>

    <!-- Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª -->
    <div id="pc-tab-tasks" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> Ø¥Ø¶Ø§ÙØ© Ù‚Ø±Ø§Ø± / ØªÙƒÙ„ÙŠÙ</span></div>
            <div class="pc-card-body">
                <div class="pc-grid">
                    <div class="pc-fld"><label class="pc-lbl">Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ù‚Ø±Ø§Ø± *</label><input type="text" id="pc-task-title" class="pc-inp" placeholder="Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ù‚Ø±Ø§Ø±"></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„</label><select id="pc-task-owner" class="pc-sel"><option value="">-- Ø§Ø®ØªØ± --</option></select></div>
                    <div class="pc-fld"><label class="pc-lbl">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚ *</label><input type="date" id="pc-task-due" class="pc-inp"></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©</label><select id="pc-task-priority" class="pc-sel"><option value="Ø¹Ø§Ù„ÙŠØ©">ðŸ”´ Ø¹Ø§Ù„ÙŠØ©</option><option value="Ù…ØªÙˆØ³Ø·Ø©" selected>ðŸŸ¡ Ù…ØªÙˆØ³Ø·Ø©</option><option value="Ù…Ù†Ø®ÙØ¶Ø©">ðŸŸ¢ Ù…Ù†Ø®ÙØ¶Ø©</option></select></div>
                </div>
                <div class="pc-fld"><label class="pc-lbl">Ø§Ù„ØªÙØ§ØµÙŠÙ„</label><textarea id="pc-task-notes" class="pc-ta" placeholder="ØªÙØ§ØµÙŠÙ„..."></textarea></div>
                <button class="pc-submit" onclick="window.pcSaveTask()"><i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ø§Ù„Ù‚Ø±Ø§Ø±</button>
            </div>
        </div>
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-table"></i> Ø³Ø¬Ù„ Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª</span>
                <select id="pc-task-filter" onchange="window.pcFilterTasks()" class="pc-sel" style="padding:6px 10px;font-size:12px;width:auto;">
                    <option value="">Ø§Ù„ÙƒÙ„</option><option value="Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°">Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°</option><option value="Ù…Ù†Ø¬Ø²">Ù…Ù†Ø¬Ø²</option><option value="Ù…ØªØ£Ø®Ø±">Ù…ØªØ£Ø®Ø±</option>
                </select>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-tasks-list"><div class="pc-empty">â³</div></div></div>
        </div>
    </div>

    <!-- Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹Ø§Øª -->
    <div id="pc-tab-meetings" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-plus-circle-fill"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ø¬ØªÙ…Ø§Ø¹</span></div>
            <div class="pc-card-body">
                <div class="pc-grid">
                    <div class="pc-fld"><label class="pc-lbl">Ø±Ù‚Ù… Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹</label><input type="number" id="pc-m-num" class="pc-inp" placeholder="1"></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„ØªØ§Ø±ÙŠØ® *</label><input type="date" id="pc-m-date" class="pc-inp" value="${getTodayISO()}"></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ù†ÙˆØ¹</label><select id="pc-m-type" class="pc-sel"><option value="Ø¯ÙˆØ±ÙŠ">Ø¯ÙˆØ±ÙŠ</option><option value="Ø·Ø§Ø±Ø¦">Ø·Ø§Ø±Ø¦</option><option value="ØªÙ‚ÙŠÙŠÙ…ÙŠ">ØªÙ‚ÙŠÙŠÙ…ÙŠ</option></select></div>
                </div>
                <div class="pc-fld"><label class="pc-lbl">Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ *</label><textarea id="pc-m-agenda" class="pc-ta" placeholder="Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£Ø¹Ù…Ø§Ù„..."></textarea></div>
                <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„ØµØ§Ø¯Ø±Ø©</label><textarea id="pc-m-decisions" class="pc-ta" placeholder="Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª..."></textarea></div>
                <button class="pc-submit" onclick="window.pcSaveMeeting()"><i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ø§Ù„Ù…Ø­Ø¶Ø±</button>
            </div>
        </div>
        <div class="pc-card"><div class="pc-card-header"><span class="pc-card-title"><i class="bi bi-journal-text"></i> Ø³Ø¬Ù„ Ø§Ù„Ù…Ø­Ø§Ø¶Ø±</span></div><div class="pc-card-body" style="overflow-x:auto;"><div id="pc-meetings-list"><div class="pc-empty">â³</div></div></div></div>
    </div>

    <!-- Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ -->
    <div id="pc-tab-students" class="pc-hidden">
        <div class="pc-card">
            <div class="pc-card-header">
                <span class="pc-card-title"><i class="bi bi-people-fill"></i> Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø¨Ø­Ø§Ø¬Ø© Ù…ØªØ§Ø¨Ø¹Ø©</span>
                <button class="pc-btn" onclick="document.getElementById('pc-stu-modal').classList.add('show')"><i class="bi bi-plus-circle-fill"></i> Ø¥Ø¶Ø§ÙØ©</button>
            </div>
            <div class="pc-card-body" style="overflow-x:auto;"><div id="pc-students-list"><div class="pc-empty">â³</div></div></div>
        </div>
    </div>
    </div>

    <!-- Modal Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø§Ù„Ø±Ø³Ù…ÙŠ -->
    <div id="pc-visit-modal" class="pc-modal">
        <div class="pc-mbox">
            <div class="pc-mhdr">
                <h3 class="pc-mtitle"><i class="bi bi-clipboard2-check-fill"></i> Ù†Ù…ÙˆØ°Ø¬ Ø²ÙŠØ§Ø±Ø© ØµÙÙŠØ© Ø±Ø³Ù…ÙŠ</h3>
                <button onclick="document.getElementById('pc-visit-modal').classList.remove('show')" style="background:none;border:none;font-size:22px;cursor:pointer;">âœ•</button>
            </div>
            <div style="background:var(--off);border-radius:10px;padding:14px;margin-bottom:14px;">
                <div class="pc-grid">
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù… *</label><select id="pv-teacher" class="pc-sel"><option value="">-- Ø§Ø®ØªØ± --</option></select></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ù…Ø§Ø¯Ø© *</label>
                        <select id="pv-subject" class="pc-sel" onchange="window.pcLoadCriteria(this.value)">
                            <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø© --</option>
                            <option value="Ø¹Ø±Ø¨ÙŠ">Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©</option>
                            <option value="Ø§Ù†Ø¬Ù„ÙŠØ²ÙŠ">Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©</option>
                            <option value="Ø±ÙŠØ§Ø¶ÙŠØ§Øª">Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª</option>
                            <option value="Ø¹Ù„ÙˆÙ…">Ø§Ù„Ø¹Ù„ÙˆÙ…</option>
                            <option value="Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ§Øª">Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ§Øª</option>
                            <option value="ØªØ±Ø¨ÙŠØ©_Ø§Ø³Ù„Ø§Ù…ÙŠØ©">Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠØ©</option>
                            <option value="Ø­Ø§Ø³ÙˆØ¨">Ø§Ù„Ø­Ø§Ø³ÙˆØ¨</option>
                            <option value="ØªØ±Ø¨ÙŠØ©_Ø¨Ø¯Ù†ÙŠØ©">Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø¨Ø¯Ù†ÙŠØ©</option>
                            <option value="ÙÙ†ÙŠØ©">Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„ÙÙ†ÙŠØ©</option>
                            <option value="Ù…ÙˆØ³ÙŠÙ‚Ù‰">Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚ÙŠØ©</option>
                            <option value="Ø¯ÙŠÙƒÙˆØ±">Ø§Ù„Ø¯ÙŠÙƒÙˆØ±</option>
                            <option value="ÙƒÙ‡Ø±Ø¨Ø§Ø¡">Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Øª</option>
                        </select>
                    </div>
                    <div class="pc-fld"><label class="pc-lbl">Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³ *</label><input type="text" id="pv-topic" class="pc-inp" placeholder="Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³"></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„ØµÙ</label><input type="text" id="pv-class" class="pc-inp" placeholder="6/1"></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ø­ØµØ©</label><select id="pv-period" class="pc-sel">${[1,2,3,4,5,6,7].map(p=>`<option value="${p}">Ø§Ù„Ø­ØµØ© ${p}</option>`).join('')}</select></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„ØªØ§Ø±ÙŠØ®</label><input type="date" id="pv-date" class="pc-inp" value="${getTodayISO()}"></div>
                </div>
            </div>
            <div id="pv-criteria-wrap" style="display:none;">
                <h4 style="font-weight:900;color:var(--navy);margin-bottom:10px;font-size:13px;"><i class="bi bi-table"></i> Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</h4>
                <div style="overflow-x:auto;">
                    <table class="vt">
                        <thead><tr><th style="width:35px;">#</th><th>Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th><th style="text-align:center;width:55px;">Ù…Ù…ØªØ§Ø²</th><th style="text-align:center;width:55px;">Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹</th><th style="text-align:center;width:55px;">Ø¬ÙŠØ¯</th><th style="text-align:center;width:55px;">Ù…Ù‚Ø¨ÙˆÙ„</th><th style="text-align:center;width:55px;">Ø¶Ø¹ÙŠÙ</th></tr></thead>
                        <tbody id="pv-tbody"></tbody>
                    </table>
                </div>
                <div class="pc-grid" style="margin-top:12px;">
                    <div class="pc-fld"><label class="pc-lbl">Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚ÙˆØ©</label><textarea id="pv-str" class="pc-ta" placeholder="Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚ÙˆØ©..."></textarea></div>
                    <div class="pc-fld"><label class="pc-lbl">Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„ØªØºØ°ÙŠØ© Ø§Ù„Ø±Ø§Ø¬Ø¹Ø©</label><textarea id="pv-rec" class="pc-ta" placeholder="Ø§Ù„ØªÙˆØµÙŠØ§Øª..."></textarea></div>
                </div>
                <div style="background:var(--ice);border-radius:10px;padding:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:900;font-size:13px;color:var(--navy);">Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„ÙƒÙ„ÙŠ:</span>
                    <span id="pv-total" style="font-size:20px;font-weight:900;color:var(--sky);">-</span>
                </div>
                <button class="pc-submit" onclick="window.pcSaveVisit()"><i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø²ÙŠØ§Ø±Ø©</button>
            </div>
            <div id="pv-no-subject" style="text-align:center;padding:25px;color:var(--mid);font-weight:700;"><i class="bi bi-arrow-up-circle" style="font-size:28px;display:block;margin-bottom:8px;"></i>Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø© Ù„Ø¹Ø±Ø¶ Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</div>
        </div>
    </div>

    <!-- Modal Ø¥Ø¶Ø§ÙØ© Ø·Ø§Ù„Ø¨ -->
    <div id="pc-stu-modal" class="pc-modal">
        <div class="pc-mbox" style="max-width:460px;">
            <div class="pc-mhdr"><h3 class="pc-mtitle">Ø¥Ø¶Ø§ÙØ© Ø·Ø§Ù„Ø¨ Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©</h3><button onclick="document.getElementById('pc-stu-modal').classList.remove('show')" style="background:none;border:none;font-size:22px;cursor:pointer;">âœ•</button></div>
            <div class="pc-grid">
                <div class="pc-fld"><label class="pc-lbl">Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ *</label><input type="text" id="pc-stu-name" class="pc-inp" placeholder="Ø§Ù„Ø§Ø³Ù…"></div>
                <div class="pc-fld"><label class="pc-lbl">Ø§Ù„ØµÙ</label><input type="text" id="pc-stu-class" class="pc-inp" placeholder="6/1"></div>
                <div class="pc-fld"><label class="pc-lbl">Ù†ÙˆØ¹ Ø§Ù„Ø®Ø·Ø©</label><select id="pc-stu-plan" class="pc-sel"><option value="Ø¹Ù„Ø§Ø¬ÙŠØ©">Ø¹Ù„Ø§Ø¬ÙŠØ©</option><option value="Ø¥Ø«Ø±Ø§Ø¦ÙŠØ©">Ø¥Ø«Ø±Ø§Ø¦ÙŠØ©</option><option value="Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ù„ÙˆÙƒÙŠØ©">Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ù„ÙˆÙƒÙŠØ©</option></select></div>
                <div class="pc-fld"><label class="pc-lbl">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„</label><select id="pc-stu-teacher" class="pc-sel"><option value="">-- Ø§Ø®ØªØ± --</option></select></div>
            </div>
            <div class="pc-fld"><label class="pc-lbl">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label><textarea id="pc-stu-notes" class="pc-ta" placeholder="Ù…Ù„Ø§Ø­Ø¸Ø§Øª..."></textarea></div>
            <button class="pc-submit" onclick="window.pcSaveStudent()"><i class="bi bi-check-circle-fill"></i> Ø­ÙØ¸</button>
        </div>
    </div>`;

    await pcLoadAll();
}

async function pcLoadAll() {
    var schoolId = getActiveSchoolId();
    try {
        var usSnap = await getDocs(query(collection(db,'users'), where('schoolId','==',schoolId)));
        pcData.users = usSnap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>['teacher','department_head','admin','assistant_manager','wing_supervisor'].includes(u.role));
        var opts = pcData.users.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
        ['pv-teacher','pc-task-owner','pc-stu-teacher'].forEach(id=>{var el=document.getElementById(id);if(el)el.innerHTML+=opts;});

        var [vs,ts,ms,ss] = await Promise.all([
            getDocs(query(collection(db,'pc_visits'),where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'pc_tasks'),where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'pc_meetings'),where('schoolId','==',schoolId))),
            getDocs(query(collection(db,'pc_student_followup'),where('schoolId','==',schoolId))),
        ]);
        pcData.visits = vs.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
        pcData.tasks  = ts.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
        pcData.meetings = ms.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
        pcData.students = ss.docs.map(d=>({id:d.id,...d.data()}));
        var today = getTodayISO();
        pcData.tasks = pcData.tasks.map(t=>t.status!=='Ù…Ù†Ø¬Ø²'&&t.dueDate&&t.dueDate<today?{...t,status:'Ù…ØªØ£Ø®Ø±'}:t);
        pcRenderAll(); pcLoadClassroomVisits();
    } catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
}

function pcRenderAll() { pcRenderOverview(); pcRenderVisits(); pcRenderTasks(); pcRenderMeetings(); pcRenderStudents(); }

window.pcSwitchTab = function(tab, btn) {
    document.querySelectorAll('.pc-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['overview','visits','classroom','tasks','meetings','students'].forEach(t=>{
        var el=document.getElementById('pc-tab-'+t);
        if(el)el.classList.toggle('pc-hidden',t!==tab);
    });
};

function pcRenderOverview() {
    var done = pcData.tasks.filter(t=>t.status==='Ù…Ù†Ø¬Ø²').length;
    document.getElementById('kpi-v').textContent = pcData.visits.length;
    document.getElementById('kpi-d').textContent = done;
    document.getElementById('kpi-p').textContent = pcData.tasks.length-done;
    document.getElementById('kpi-m').textContent = pcData.meetings.length;
    var t5=pcData.tasks.slice(0,5);
    document.getElementById('pc-ov-tasks').innerHTML=t5.length?`<table class="pc-tbl"><thead><tr><th>Ø§Ù„Ù‚Ø±Ø§Ø±</th><th>Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„</th><th>Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th></tr></thead><tbody>${t5.map(t=>`<tr><td style="font-weight:700;">${t.title||'-'}</td><td>${t.owner||'-'}</td><td>${t.dueDate||'-'}</td><td><span class="pc-badge ${t.status==='Ù…Ù†Ø¬Ø²'?'done':t.status==='Ù…ØªØ£Ø®Ø±'?'late':'prg'}">${t.status||'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°'}</span></td></tr>`).join('')}</tbody></table>`:'<div class="pc-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø±Ø§Ø±Ø§Øª</div>';
    var v5=pcData.visits.slice(0,5);
    document.getElementById('pc-ov-visits').innerHTML=v5.length?`<table class="pc-tbl"><thead><tr><th>Ø§Ù„Ù…Ø¹Ù„Ù…</th><th>Ø§Ù„Ù…Ø§Ø¯Ø©</th><th>Ø§Ù„ØµÙ</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ù†Ø³Ø¨Ø©</th></tr></thead><tbody>${v5.map(v=>`<tr><td style="font-weight:700;">${v.teacher||'-'}</td><td>${v.subjectLabel||v.subject||'-'}</td><td>${v.classId||'-'}</td><td>${v.date||'-'}</td><td><span class="pc-badge done">${v.percentage||0}%</span></td></tr>`).join('')}</tbody></table>`:'<div class="pc-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª</div>';
}

window.pcOpenVisitModal = function() {
    currentVisitRatings={};
    document.getElementById('pv-subject').value='';
    document.getElementById('pv-criteria-wrap').style.display='none';
    document.getElementById('pv-no-subject').style.display='block';
    document.getElementById('pc-visit-modal').classList.add('show');
};

window.pcLoadCriteria = function(subject) {
    if (!subject||!VISIT_CRITERIA[subject]) {
        document.getElementById('pv-criteria-wrap').style.display='none';
        document.getElementById('pv-no-subject').style.display='block';
        return;
    }
    currentVisitRatings={};
    var criteria=VISIT_CRITERIA[subject];
    document.getElementById('pv-tbody').innerHTML=criteria.map((item,idx)=>`<tr>
        <td style="color:#aaa;font-weight:700;font-size:11px;">${idx+1}</td>
        <td style="font-weight:700;font-size:12px;">${item}</td>
        ${RATINGS.map(r=>`<td style="text-align:center;"><label class="rd"><input type="radio" name="r_${idx}" value="${r}" onchange="window.pcSetRating(${idx},'${r}')"><div class="rd-dot">${r.slice(0,1)}</div></label></td>`).join('')}
    </tr>`).join('');
    document.getElementById('pv-criteria-wrap').style.display='block';
    document.getElementById('pv-no-subject').style.display='none';
    pcUpdateScore();
};

window.pcSetRating = function(idx,r) { currentVisitRatings[idx]=r; pcUpdateScore(); };

function pcUpdateScore() {
    var subj=document.getElementById('pv-subject').value;
    if (!subj||!VISIT_CRITERIA[subj]) return;
    var max=VISIT_CRITERIA[subj].length*5;
    var total=Object.values(currentVisitRatings).reduce((s,r)=>s+(RATING_SCORES[r]||0),0);
    var pct=Math.round((total/max)*100);
    var el=document.getElementById('pv-total');
    el.textContent=total+' / '+max+' ('+pct+'%)';
    el.style.color=pct>=80?'#16a34a':pct>=60?'#d97706':'#dc2626';
}

window.pcSaveVisit = async function() {
    var teacher=document.getElementById('pv-teacher').value;
    var subject=document.getElementById('pv-subject').value;
    var subjEl=document.getElementById('pv-subject');
    var subjectLabel=subjEl.options[subjEl.selectedIndex]?.text||subject;
    var topic=document.getElementById('pv-topic').value.trim();
    var classId=document.getElementById('pv-class').value.trim();
    var period=document.getElementById('pv-period').value;
    var date=document.getElementById('pv-date').value;
    var strengths=document.getElementById('pv-str').value.trim();
    var recommendations=document.getElementById('pv-rec').value.trim();
    var me=JSON.parse(localStorage.getItem('hs_user')||'{}');
    if (!teacher||!subject||!topic) { window.showToast?.('Ø£ÙƒÙ…Ù„ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©','warning'); return; }
    var criteria=VISIT_CRITERIA[subject]||[];
    var maxScore=criteria.length*5;
    var totalScore=Object.values(currentVisitRatings).reduce((s,r)=>s+(RATING_SCORES[r]||0),0);
    var ratingsArr=criteria.map((item,idx)=>({item,rating:currentVisitRatings[idx]||'-',score:RATING_SCORES[currentVisitRatings[idx]]||0}));
    try {
        await addDoc(collection(db,'pc_visits'),{schoolId:getActiveSchoolId(),teacher,subject,subjectLabel,topic,classId,period:parseInt(period),date,strengths,recommendations,ratings:ratingsArr,totalScore,maxScore,percentage:Math.round((totalScore/maxScore)*100),visitedBy:me.name||me.userId,createdAt:serverTimestamp()});
        window.showToast?.('âœ… ØªÙ… Ø­ÙØ¸ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø²ÙŠØ§Ø±Ø©');
        document.getElementById('pc-visit-modal').classList.remove('show');
        currentVisitRatings={};
        await pcLoadAll();
    } catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
};

function pcRenderVisits() {
    var el=document.getElementById('pc-visits-list');
    if (!el) return;
    if (!pcData.visits.length) { el.innerHTML='<div class="pc-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª. Ø§Ø¶ØºØ· "Ø²ÙŠØ§Ø±Ø© Ø¬Ø¯ÙŠØ¯Ø©".</div>'; return; }
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>Ø§Ù„Ù…Ø¹Ù„Ù…</th><th>Ø§Ù„Ù…Ø§Ø¯Ø©</th><th>Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹</th><th>Ø§Ù„ØµÙ</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</th><th>Ø§Ù„Ù†Ø³Ø¨Ø©</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>${pcData.visits.map(v=>{
        var c=v.percentage>=80?'#16a34a':v.percentage>=60?'#d97706':'#dc2626';
        return `<tr><td style="font-weight:700;">${v.teacher||'-'}</td><td>${v.subjectLabel||v.subject||'-'}</td><td style="font-size:11px;color:#666;">${v.topic||'-'}</td><td>${v.classId||'-'}</td><td>${v.date||'-'}</td><td style="font-weight:700;color:${c};">${v.totalScore||0}/${v.maxScore||0}</td><td><span class="pc-badge" style="background:${c}22;color:${c};">${v.percentage||0}%</span></td><td style="display:flex;gap:4px;"><button onclick="window.pcPrintVisit('${v.id}')" class="pc-btn sm">Ø·Ø¨Ø§Ø¹Ø©</button><button onclick="window.pcDelVisit('${v.id}')" class="pc-btn sm red">ðŸ—‘</button></td></tr>`;
    }).join('')}</tbody></table>`;
}

window.pcPrintVisit = function(id) {
    var v=pcData.visits.find(x=>x.id===id);
    if (!v) return;
    var rows=(v.ratings||[]).map((r,i)=>`<tr><td style="padding:6px 10px;color:#666;text-align:center;">${i+1}</td><td style="padding:6px 10px;font-weight:600;">${r.item}</td>${RATINGS.map(rt=>`<td style="padding:6px 10px;text-align:center;">${r.rating===rt?'âœ“':''}</td>`).join('')}<td style="padding:6px 10px;text-align:center;font-weight:700;">${r.score||0}</td></tr>`).join('');
    var w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ù†Ù…ÙˆØ°Ø¬ Ø²ÙŠØ§Ø±Ø© ØµÙÙŠØ©</title>
    <style>
@media print {
    body { margin: 0; padding: 10px; font-size: 11px; }
    table { font-size: 10px; page-break-inside: avoid; }
    th, td { padding: 4px 6px !important; }
    .info-table td { padding: 4px 8px !important; }
    h1 { font-size: 13px; margin-bottom: 8px; }
    .sign { margin-top: 10px; }
}
</style>
    <style>
@media print {
    body { margin: 0; padding: 10px; font-size: 11px; }
    table { font-size: 10px; page-break-inside: avoid; }
    th, td { padding: 4px 6px !important; }
    .info-table td { padding: 4px 8px !important; }
    h1 { font-size: 13px; margin-bottom: 8px; }
    .sign { margin-top: 10px; }
}
</style>
    <style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl;font-size:13px;}
    .header{text-align:center;margin-bottom:16px;border-bottom:2px solid #0b2545;padding-bottom:10px;}
    .header h2{color:#0b2545;font-size:15px;margin:0 0 4px;}
    .info-table{width:100%;border-collapse:collapse;margin-bottom:14px;}
    .info-table td{border:1px solid #ddd;padding:7px 10px;font-size:12px;}
    .info-table td:first-child{font-weight:700;background:#f8fafc;width:30%;}
    table{width:100%;border-collapse:collapse;}
    th{background:#0b2545;color:#fff;padding:7px;text-align:right;font-size:11px;}
    td{border:1px solid #ddd;padding:6px;}
    .total-row{background:#e0f2fe;font-weight:700;}
    .sign{margin-top:20px;display:flex;justify-content:space-between;font-size:12px;color:#666;}
    </style></head><body>
    <div class="header" style="display:flex;align-items:center;justify-content:space-between;">
        <div style="flex:1;">
        <h2>ÙˆØ²Ø§Ø±Ø© Ø§Ù„ØªØ±Ø¨ÙŠØ© â€” Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ù„Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø¹Ø§ØµÙ…Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©</h2>
        <div>Ù…Ø¯Ø±Ø³Ø© Ø³Ø§Ù„Ù… Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù† Ø§Ù„Ù…ØªÙˆØ³Ø·Ø© â€” Ø¨Ù†ÙŠÙ†</div>
        <div style="font-weight:700;margin-top:4px;">Ù†Ù…ÙˆØ°Ø¬ Ø²ÙŠØ§Ø±Ø© ØµÙÙŠØ© â€” ${v.subjectLabel||v.subject}</div>
    </div></div>
        <img src="https://bo3li1993.github.io/school-pwa/logo.png" style="width:60px;height:60px;object-fit:contain;" onerror="this.style.display='none'">
        </div></div>
        <img src="https://bo3li1993.github.io/school-pwa/logo.png" style="width:60px;height:60px;object-fit:contain;" onerror="this.style.display='none'">
        </div>
    <table class="info-table">
        <tr><td>Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù…</td><td>${v.teacher}</td><td>Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ</td><td>2025 / 2026</td></tr>
        <tr><td>Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³</td><td>${v.topic||'-'}</td><td>Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ</td><td></td></tr>
        <tr><td>Ø§Ù„ØµÙ</td><td>${v.classId||'-'}</td><td>Ø§Ù„Ø­ØµØ©</td><td>${v.period||'-'}</td></tr>
        <tr><td>Ø§Ù„ÙŠÙˆÙ…</td><td></td><td>Ø§Ù„Ù…ÙˆØ§ÙÙ‚</td><td>${v.date||'-'}</td></tr>
    </table>
    <table>
        <thead><tr><th style="width:35px;">#</th><th>Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th><th style="text-align:center;width:55px;">Ù…Ù…ØªØ§Ø²</th><th style="text-align:center;width:60px;">Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹</th><th style="text-align:center;width:55px;">Ø¬ÙŠØ¯</th><th style="text-align:center;width:55px;">Ù…Ù‚Ø¨ÙˆÙ„</th><th style="text-align:center;width:55px;">Ø¶Ø¹ÙŠÙ</th><th style="text-align:center;width:50px;">Ø§Ù„Ø¯Ø±Ø¬Ø©</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row"><td colspan="7" style="padding:7px;text-align:center;">Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„ÙƒÙ„ÙŠ</td><td style="padding:7px;text-align:center;font-size:14px;">${v.totalScore}/${v.maxScore} (${v.percentage}%)</td></tr></tfoot>
    </table>
    ${v.strengths?`<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px;"><b>Ù†Ù‚Ø§Ø· Ø§Ù„Ù‚ÙˆØ©:</b> ${v.strengths}</div>`:''}
    ${v.recommendations?`<div style="margin-top:8px;padding:10px;background:#f8fafc;border-radius:6px;"><b>Ø§Ù„ØªÙˆØµÙŠØ§Øª:</b> ${v.recommendations}</div>`:''}
    <div class="sign"><span>Ø§Ù„Ø²Ø§Ø¦Ø±: ${v.visitedBy||'-'}</span><span>ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø¹Ù„Ù…: _______________</span><span>ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø²Ø§Ø¦Ø±: _______________</span></div>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),600);
};

window.pcDelVisit = async function(id) {
    if(!confirm('Ø­Ø°Ù Ø§Ù„Ø²ÙŠØ§Ø±Ø©ØŸ')) return;
    try { await deleteDoc(doc(db,'pc_visits',id)); window.showToast?.('âœ… ØªÙ…'); await pcLoadAll(); }
    catch(e) { window.showToast?.('âŒ '+e.message,'error'); }
};

function pcRenderTasks(filter) {
    var el=document.getElementById('pc-tasks-list');
    if(!el) return;
    var tasks=filter?pcData.tasks.filter(t=>t.status===filter):pcData.tasks;
    if(!tasks.length){el.innerHTML='<div class="pc-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø±Ø§Ø±Ø§Øª</div>';return;}
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>Ø§Ù„Ù‚Ø±Ø§Ø±</th><th>Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„</th><th>Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©</th><th>Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>${tasks.map(t=>`<tr><td style="font-weight:700;">${t.title||'-'}</td><td>${t.owner||'-'}</td><td>${t.priority||'-'}</td><td style="${t.status==='Ù…ØªØ£Ø®Ø±'?'color:#dc2626;font-weight:700;':''}">${t.dueDate||'-'}</td><td><span class="pc-badge ${t.status==='Ù…Ù†Ø¬Ø²'?'done':t.status==='Ù…ØªØ£Ø®Ø±'?'late':'prg'}">${t.status||'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°'}</span></td><td style="display:flex;gap:4px;">${t.status!=='Ù…Ù†Ø¬Ø²'?`<button onclick="window.pcMarkDone('${t.id}')" class="pc-btn sm green">âœ…</button>`:''}<button onclick="window.pcDelTask('${t.id}')" class="pc-btn sm red">ðŸ—‘</button></td></tr>`).join('')}</tbody></table>`;
}
window.pcFilterTasks=function(){pcRenderTasks(document.getElementById('pc-task-filter').value);};
window.pcSaveTask=async function(){
    var title=document.getElementById('pc-task-title').value.trim();
    var owner=document.getElementById('pc-task-owner').value;
    var dueDate=document.getElementById('pc-task-due').value;
    var priority=document.getElementById('pc-task-priority').value;
    var notes=document.getElementById('pc-task-notes').value.trim();
    var me=JSON.parse(localStorage.getItem('hs_user')||'{}');
    if(!title||!dueDate){window.showToast?.('Ø£ÙƒÙ…Ù„ Ø§Ù„Ø­Ù‚ÙˆÙ„','warning');return;}
    try{await addDoc(collection(db,'pc_tasks'),{schoolId:getActiveSchoolId(),title,owner,dueDate,priority,notes,status:'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°',createdBy:me.name||me.userId,createdAt:serverTimestamp()});window.showToast?.('âœ… ØªÙ…');['pc-task-title','pc-task-due','pc-task-notes'].forEach(id=>{var el=document.getElementById(id);if(el)el.value='';});await pcLoadAll();}
    catch(e){window.showToast?.('âŒ '+e.message,'error');}
};
window.pcMarkDone=async function(id){try{await updateDoc(doc(db,'pc_tasks',id),{status:'Ù…Ù†Ø¬Ø²',completedAt:serverTimestamp()});window.showToast?.('âœ… ØªÙ…');await pcLoadAll();}catch(e){window.showToast?.('âŒ '+e.message,'error');}};
window.pcDelTask=async function(id){if(!confirm('Ø­Ø°Ù Ø§Ù„Ù‚Ø±Ø§Ø±ØŸ'))return;try{await deleteDoc(doc(db,'pc_tasks',id));window.showToast?.('âœ… ØªÙ…');await pcLoadAll();}catch(e){window.showToast?.('âŒ '+e.message,'error');}};

function pcRenderMeetings(){
    var el=document.getElementById('pc-meetings-list');
    if(!el)return;
    if(!pcData.meetings.length){el.innerHTML='<div class="pc-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¶Ø±</div>';return;}
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>#</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ù†ÙˆØ¹</th><th>Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£Ø¹Ù…Ø§Ù„</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>${pcData.meetings.map((m,i)=>`<tr><td style="font-weight:700;">${m.meetingNum||i+1}</td><td>${m.date||'-'}</td><td><span class="pc-badge prg">${m.type||'Ø¯ÙˆØ±ÙŠ'}</span></td><td style="font-size:11px;color:#666;">${(m.agenda||'').slice(0,60)}...</td><td><button onclick="window.pcDelMeeting('${m.id}')" class="pc-btn sm red">ðŸ—‘</button></td></tr>`).join('')}</tbody></table>`;
}
window.pcSaveMeeting=async function(){
    var num=document.getElementById('pc-m-num').value;
    var date=document.getElementById('pc-m-date').value;
    var type=document.getElementById('pc-m-type').value;
    var agenda=document.getElementById('pc-m-agenda').value.trim();
    var decisions=document.getElementById('pc-m-decisions').value.trim();
    var me=JSON.parse(localStorage.getItem('hs_user')||'{}');
    if(!date||!agenda){window.showToast?.('Ø£ÙƒÙ…Ù„ Ø§Ù„Ø­Ù‚ÙˆÙ„','warning');return;}
    try{await addDoc(collection(db,'pc_meetings'),{schoolId:getActiveSchoolId(),meetingNum:parseInt(num)||1,date,type,agenda,decisions,recordedBy:me.name||me.userId,createdAt:serverTimestamp()});window.showToast?.('âœ… ØªÙ…');['pc-m-num','pc-m-agenda','pc-m-decisions'].forEach(id=>{var el=document.getElementById(id);if(el)el.value='';});await pcLoadAll();}
    catch(e){window.showToast?.('âŒ '+e.message,'error');}
};
window.pcDelMeeting=async function(id){if(!confirm('Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø¶Ø±ØŸ'))return;try{await deleteDoc(doc(db,'pc_meetings',id));window.showToast?.('âœ… ØªÙ…');await pcLoadAll();}catch(e){window.showToast?.('âŒ '+e.message,'error');}};

function pcRenderStudents(){
    var el=document.getElementById('pc-students-list');
    if(!el)return;
    if(!pcData.students.length){el.innerHTML='<div class="pc-empty">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø§Ø¨ ÙÙŠ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</div>';return;}
    el.innerHTML=`<table class="pc-tbl"><thead><tr><th>#</th><th>Ø§Ù„Ø·Ø§Ù„Ø¨</th><th>Ø§Ù„ØµÙ</th><th>Ù†ÙˆØ¹ Ø§Ù„Ø®Ø·Ø©</th><th>Ø§Ù„Ù…Ø¹Ù„Ù…</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>${pcData.students.map((s,i)=>`<tr><td style="color:#aaa;">${i+1}</td><td style="font-weight:700;">${s.name||'-'}</td><td>${s.classId||'-'}</td><td><span class="pc-badge ${s.planType==='Ø¥Ø«Ø±Ø§Ø¦ÙŠØ©'?'done':'prg'}">${s.planType||'-'}</span></td><td>${s.teacher||'-'}</td><td><button onclick="window.pcDelStudent('${s.id}')" class="pc-btn sm red">ðŸ—‘</button></td></tr>`).join('')}</tbody></table>`;
}
window.pcSaveStudent=async function(){
    var name=document.getElementById('pc-stu-name').value.trim();
    if(!name){window.showToast?.('Ø£Ø¯Ø®Ù„ Ø§Ù„Ø§Ø³Ù…','warning');return;}
    var classId=document.getElementById('pc-stu-class').value.trim();
    var planType=document.getElementById('pc-stu-plan').value;
    var teacher=document.getElementById('pc-stu-teacher').value;
    var notes=document.getElementById('pc-stu-notes').value.trim();
    try{await addDoc(collection(db,'pc_student_followup'),{schoolId:getActiveSchoolId(),name,classId,planType,teacher,notes,createdAt:serverTimestamp()});window.showToast?.('âœ… ØªÙ…');document.getElementById('pc-stu-modal').classList.remove('show');await pcLoadAll();}
    catch(e){window.showToast?.('âŒ '+e.message,'error');}
};
window.pcDelStudent=async function(id){if(!confirm('Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ØŸ'))return;try{await deleteDoc(doc(db,'pc_student_followup',id));window.showToast?.('âœ… ØªÙ…');await pcLoadAll();}catch(e){window.showToast?.('âŒ '+e.message,'error');}};

window.pcExportReport=function(){
    var today=new Date().toLocaleDateString('ar-KW');
    var done=pcData.tasks.filter(t=>t.status==='Ù…Ù†Ø¬Ø²').length;
    var w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ØªÙ‚Ø±ÙŠØ± Ù„Ø¬Ù†Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡</title><style>body{font-family:Arial;padding:20px;direction:rtl;}h1{color:#0b2545;border-bottom:2px solid #0b2545;padding-bottom:8px;}h2{color:#1a78c2;}table{width:100%;border-collapse:collapse;}th{background:#0b2545;color:#fff;padding:7px;}td{border:1px solid #ddd;padding:7px;}</style></head><body>
    <h1>ØªÙ‚Ø±ÙŠØ± Ù„Ø¬Ù†Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠ â€” ${today}</h1>
    <h2>Ø§Ù„Ø¥Ø­ØµØ§Ø¡Ø§Øª</h2><table><tr><th>Ø§Ù„Ø¨Ù†Ø¯</th><th>Ø§Ù„Ø¹Ø¯Ø¯</th></tr><tr><td>Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ØµÙÙŠØ©</td><td>${pcData.visits.length}</td></tr><tr><td>Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ù…Ù†Ø¬Ø²Ø©</td><td>${done}</td></tr><tr><td>Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°</td><td>${pcData.tasks.length-done}</td></tr><tr><td>Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹Ø§Øª</td><td>${pcData.meetings.length}</td></tr><tr><td>Ø§Ù„Ø·Ù„Ø§Ø¨ ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</td><td>${pcData.students.length}</td></tr></table>
    <h2>Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ØµÙÙŠØ©</h2><table><tr><th>Ø§Ù„Ù…Ø¹Ù„Ù…</th><th>Ø§Ù„Ù…Ø§Ø¯Ø©</th><th>Ø§Ù„ØµÙ</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</th><th>Ø§Ù„Ù†Ø³Ø¨Ø©</th></tr>${pcData.visits.map(v=>`<tr><td>${v.teacher}</td><td>${v.subjectLabel||v.subject||'-'}</td><td>${v.classId||'-'}</td><td>${v.date||'-'}</td><td>${v.totalScore}/${v.maxScore}</td><td>${v.percentage}%</td></tr>`).join('')}</table>
    <h2>Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª</h2><table><tr><th>Ø§Ù„Ù‚Ø±Ø§Ø±</th><th>Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„</th><th>Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th></tr>${pcData.tasks.map(t=>`<tr><td>${t.title}</td><td>${t.owner||'-'}</td><td>${t.dueDate||'-'}</td><td>${t.status||'-'}</td></tr>`).join('')}</table>
    </body></html>`);
    w.document.close();setTimeout(()=>w.print(),500);
};


// â•â• Modal Ø²ÙŠØ§Ø±Ø© Ø§Ù„ÙØµÙ„ + Ø¶Ø¨Ø· Ø§Ù„Ø¨Ù†ÙˆØ¯ â•â•
var classroomRatings = {};

window.pcOpenClassroomModal = async function() {
    classroomRatings = {};
    var criteria = await pcGetClassroomCriteria();
    document.getElementById("pcr-date").value = getTodayISO();
    
    // ØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†
    var teacherSel = document.getElementById("pcr-teacher");
    teacherSel.innerHTML = "<option value=''>-- Ø§Ø®ØªØ± --</option>" + 
        pcData.users.map(u => "<option value='" + u.name + "'>" + u.name + "</option>").join("");
    
    // Ø¨Ù†Ø§Ø¡ Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯
    document.getElementById("pcr-tbody").innerHTML = criteria.map((item, idx) =>
        "<tr><td style='color:#aaa;font-size:11px;font-weight:700;'>" + (idx+1) + "</td>" +
        "<td style='font-weight:700;font-size:12px;'>" + item + "</td>" +
        ["Ù…Ù…ØªØ§Ø²","Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹","Ø¬ÙŠØ¯","Ù…Ù‚Ø¨ÙˆÙ„","Ø¶Ø¹ÙŠÙ"].map(r =>
            "<td style='text-align:center;'><label class='rd'><input type='radio' name='cr_" + idx + "' value='" + r + "' onchange='window.pcrSetRating(" + idx + ",\"" + r + "\")''><div class='rd-dot'>" + r.slice(0,1) + "</div></label></td>"
        ).join("") + "</tr>"
    ).join("");
    
    document.getElementById("pc-classroom-modal").classList.add("show");
    pcrUpdateScore(criteria.length);
};

window.pcrSetRating = function(idx, r) {
    classroomRatings[idx] = r;
    pcGetClassroomCriteria().then(c => pcrUpdateScore(c.length));
};

function pcrUpdateScore(max) {
    var scores = {"Ù…Ù…ØªØ§Ø²":5,"Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹":4,"Ø¬ÙŠØ¯":3,"Ù…Ù‚Ø¨ÙˆÙ„":2,"Ø¶Ø¹ÙŠÙ":1};
    var total = Object.values(classroomRatings).reduce((s,r) => s+(scores[r]||0), 0);
    var maxScore = max * 5;
    var pct = maxScore > 0 ? Math.round((total/maxScore)*100) : 0;
    var el = document.getElementById("pcr-total");
    if (el) { el.textContent = total + " / " + maxScore + " (" + pct + "%)"; el.style.color = pct>=80?"#16a34a":pct>=60?"#d97706":"#dc2626"; }
}

async function pcGetClassroomCriteria() {
    if (classroomCriteriaCache) return classroomCriteriaCache;
    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(collection(db,"pc_classroom_criteria"), where("schoolId","==",schoolId)));
        if (!snap.empty) {
            classroomCriteriaCache = snap.docs[0].data().items || DEFAULT_CLASSROOM_CRITERIA;
        } else {
            classroomCriteriaCache = DEFAULT_CLASSROOM_CRITERIA;
        }
    } catch(e) { classroomCriteriaCache = DEFAULT_CLASSROOM_CRITERIA; }
    return classroomCriteriaCache;
}

window.pcSaveClassroomVisit = async function() {
    var classId = document.getElementById("pcr-class").value.trim();
    var teacher = document.getElementById("pcr-teacher").value;
    var subject = document.getElementById("pcr-subject").value.trim();
    var period = document.getElementById("pcr-period").value;
    var date = document.getElementById("pcr-date").value;
    var notes = document.getElementById("pcr-notes").value.trim();
    var me = JSON.parse(localStorage.getItem("hs_user")||"{}");
    if (!classId) { window.showToast?.("Ø£Ø¯Ø®Ù„ Ø§Ù„ØµÙ","warning"); return; }
    var criteria = await pcGetClassroomCriteria();
    var scores = {"Ù…Ù…ØªØ§Ø²":5,"Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹":4,"Ø¬ÙŠØ¯":3,"Ù…Ù‚Ø¨ÙˆÙ„":2,"Ø¶Ø¹ÙŠÙ":1};
    var maxScore = criteria.length * 5;
    var totalScore = Object.values(classroomRatings).reduce((s,r) => s+(scores[r]||0), 0);
    var ratingsArr = criteria.map((item,idx) => ({item, rating:classroomRatings[idx]||"-", score:scores[classroomRatings[idx]]||0}));
    try {
        await addDoc(collection(db,"pc_classroom_visits"), {
            schoolId:getActiveSchoolId(), classId, teacher, subject,
            period:parseInt(period), date, notes, ratings:ratingsArr,
            totalScore, maxScore, percentage:Math.round((totalScore/maxScore)*100),
            visitedBy:me.name||me.userId, createdAt:serverTimestamp()
        });
        window.showToast?.("âœ… ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø²ÙŠØ§Ø±Ø©");
        document.getElementById("pc-classroom-modal").classList.remove("show");
        classroomRatings = {};
        await pcLoadClassroomVisits();
    } catch(e) { window.showToast?.("âŒ "+e.message,"error"); }
};

async function pcLoadClassroomVisits() {
    var el = document.getElementById("pc-classroom-list");
    if (!el) return;
    var schoolId = getActiveSchoolId();
    try {
        var snap = await getDocs(query(collection(db,"pc_classroom_visits"), where("schoolId","==",schoolId)));
        var visits = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
        if (!visits.length) { el.innerHTML = "<div class='pc-empty'>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª ÙØµÙˆÙ„</div>"; return; }
        el.innerHTML = "<table class='pc-tbl'><thead><tr><th>Ø§Ù„ØµÙ</th><th>Ø§Ù„Ù…Ø¹Ù„Ù…</th><th>Ø§Ù„Ù…Ø§Ø¯Ø©</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</th><th>Ø§Ù„Ù†Ø³Ø¨Ø©</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>" +
            visits.map(v => {
                var c = v.percentage>=80?"#16a34a":v.percentage>=60?"#d97706":"#dc2626";
                return "<tr><td style='font-weight:700;'>" + (v.classId||"-") + "</td><td>" + (v.teacher||"-") + "</td><td>" + (v.subject||"-") + "</td><td>" + (v.date||"-") + "</td><td style='font-weight:700;color:" + c + ";'>" + (v.totalScore||0) + "/" + (v.maxScore||0) + "</td><td><span class='pc-badge' style='background:" + c + "22;color:" + c + ";'>" + (v.percentage||0) + "%</span></td><td><button onclick='window.pcDelClassroomVisit(\"" + v.id + "\")' class='pc-btn sm red'>ðŸ—‘</button></td></tr>";
            }).join("") + "</tbody></table>";
    } catch(e) { el.innerHTML = "<div class='pc-empty' style='color:red;'>âŒ " + e.message + "</div>"; }
}

window.pcDelClassroomVisit = async function(id) {
    if (!confirm("Ø­Ø°Ù Ø§Ù„Ø²ÙŠØ§Ø±Ø©ØŸ")) return;
    try { await deleteDoc(doc(db,"pc_classroom_visits",id)); window.showToast?.("âœ… ØªÙ…"); await pcLoadClassroomVisits(); }
    catch(e) { window.showToast?.("âŒ "+e.message,"error"); }
};

// â•â• Ø¶Ø¨Ø· Ø§Ù„Ø¨Ù†ÙˆØ¯ â•â•
window.pcOpenCriteriaSettings = async function() {
    var criteria = await pcGetClassroomCriteria();
    renderCriteriaList(criteria);
    document.getElementById("pc-criteria-modal").classList.add("show");
};

function renderCriteriaList(criteria) {
    document.getElementById("pcr-criteria-list").innerHTML = criteria.map((item, idx) =>
        "<div style='display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:var(--off);border-radius:8px;'>" +
        "<span style='font-size:11px;color:#aaa;font-weight:700;min-width:20px;'>" + (idx+1) + "</span>" +
        "<span style='flex:1;font-size:13px;font-weight:700;'>" + item + "</span>" +
        "<button onclick='window.pcRemoveCriterion(" + idx + ")' style='background:#fef2f2;color:#dc2626;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;'>Ø­Ø°Ù</button>" +
        "</div>"
    ).join("");
}

window.pcRemoveCriterion = async function(idx) {
    var criteria = await pcGetClassroomCriteria();
    criteria.splice(idx, 1);
    classroomCriteriaCache = criteria;
    renderCriteriaList(criteria);
};

window.pcAddCriterion = async function() {
    var input = document.getElementById("pcr-new-item");
    var text = input.value.trim();
    if (!text) return;
    var criteria = await pcGetClassroomCriteria();
    criteria.push(text);
    classroomCriteriaCache = criteria;
    renderCriteriaList(criteria);
    input.value = "";
};

window.pcSaveCriteria = async function() {
    var schoolId = getActiveSchoolId();
    var criteria = classroomCriteriaCache || DEFAULT_CLASSROOM_CRITERIA;
    try {
        var snap = await getDocs(query(collection(db,"pc_classroom_criteria"), where("schoolId","==",schoolId)));
        if (!snap.empty) {
            await updateDoc(doc(db,"pc_classroom_criteria",snap.docs[0].id), {items:criteria});
        } else {
            await addDoc(collection(db,"pc_classroom_criteria"), {schoolId, items:criteria});
        }
        window.showToast?.("âœ… ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¨Ù†ÙˆØ¯");
        document.getElementById("pc-criteria-modal").classList.remove("show");
    } catch(e) { window.showToast?.("âŒ "+e.message,"error"); }
};
