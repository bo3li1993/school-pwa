import { db, getActiveSchoolId, getTodayISO } from '../firebase-config.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot, doc, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Ø¨Ù†ÙˆØ¯ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ù„ÙƒÙ„ Ù…Ø§Ø¯Ø© â€” Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ù„ÙˆØ²Ø§Ø±Ø© Ø§Ù„ØªØ±Ø¨ÙŠØ©
// Ù…ØªÙˆØ³Ø·Ø© Ø³Ø§Ù„Ù… Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù† â€” Ø§Ù„ÙƒÙˆÙŠØª
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const DEPT_CRITERIA = {
    'Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©': [
        'Ù†Ø¸Ø§ÙØ© Ù€ Ø§Ù„ÙØµÙ„ / Ù…Ø®ØªØ¨Ø± Ù„ØºÙˆÙŠ / Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø¶ÙˆÙ†ÙŠØ©',
        'ØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ Ù€ ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù‚Ø§Ø¹Ø© (Ø·Ø§ÙˆÙ„Ø§Øª Ù€ Ù…Ù‚Ø§Ø¹Ø¯)',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© Ù€ Ø§Ù„Ø®Ø·',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ / Ø§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø°Ù‡Ù†ÙŠ',
        'Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… ÙˆØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¨Ø·Ø±ÙŠÙ‚Ø© ØªØ±Ø§Ø¹ÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª',
        'Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø®Ù„Ø§Ù„ Ø§Ù„Ù…Ù†Ø§Ù‚Ø´Ø© ÙˆØ§Ù„Ø´Ø±Ø­',
        'Ø§Ù„Ø¹Ù„Ø§Ù‚Ø© Ù…Ø¹ Ø§Ù„Ø·Ù„Ø§Ø¨ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø§Ù„ØªØ¹Ø§Ù…Ù„',
        'Ø§Ù„ØªØµØ±Ù ÙÙŠ Ø§Ù„Ù…ÙˆØ§Ù‚Ù Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ø·Ø§Ø±Ù†Ø©',
        'Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù„ØºÙˆÙŠØ© / Ø§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© / Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¬Ù‡Ø±ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙŠÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· ØªÙ‚ÙˆÙŠÙ… Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø¶Ø¹Ø§Ù',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø§Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¦Ù‚ÙŠÙ†',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©',
        'ØªÙ†Ø¸ÙŠÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø²Ù…Ù† Ø§Ù„Ø­ØµØ© Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©',
        'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠØ©',
        'Ø§Ù„Ø¬Ù…Ù„Ø© Ø§Ù„Ø¥Ù…Ù„Ø§Ø¦ÙŠØ© Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… ( Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„ÙÙ‚Ø±Ø© ÙˆØªØ­Ù‚ÙŠÙ‚Ù‡Ø§ Ù„Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„Ø³Ù„ÙˆÙƒÙŠØ© )'
    ],
    'Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ¬Ù…Ø§Ù„ÙŠØ© Ø§Ù„Ø¹Ø±Ø¶',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠ',
        'Ø§Ù„ØªØ¯Ø±Ø¬ Ø§Ù„Ù…Ù†Ø·Ù‚ÙŠ ÙÙŠ Ø¹Ø±Ø¶ Ø§Ù„Ø¯Ø±Ø³',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ ÙˆØ§Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©',
        'Ø­Ù„ Ø§Ù„ØªÙ…Ø§Ø±ÙŠÙ† Ø¨Ø£Ø³Ø§Ù„ÙŠØ¨ Ù…ØªÙ†ÙˆØ¹Ø©',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ ÙÙŠ Ø­Ù„ Ø§Ù„Ù…Ø³Ø§Ø¦Ù„',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± ÙˆØ§Ù„ØªØºØ°ÙŠØ© Ø§Ù„Ø±Ø§Ø¬Ø¹Ø©',
        'Ø±Ø¨Ø· Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§Øª Ø¨Ø§Ù„Ø­ÙŠØ§Ø© Ø§Ù„Ø¹Ù…Ù„ÙŠØ©',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø§Ù„ØµÙÙŠ',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ© Ø¨ÙŠÙ† Ø§Ù„Ø·Ù„Ø§Ø¨',
        'Ø§Ù„Ø¯Ù‚Ø© ÙÙŠ Ø§Ù„Ù…ØµØ·Ù„Ø­Ø§Øª Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©',
        'ØªØ¯Ø±ÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø¹Ù„Ù‰ Ø§Ù„ØªÙÙƒÙŠØ± Ø§Ù„Ù…Ù†Ø·Ù‚ÙŠ',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© Ù„Ù„Ø¶Ø¹Ø§Ù ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ© Ù„Ù„ÙØ§Ø¦Ù‚ÙŠÙ†',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ØªÙ‚Ù†ÙŠØ© ÙˆØ§Ù„Ø¢Ù„Ø© Ø§Ù„Ø­Ø§Ø³Ø¨Ø©',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„ØµÙÙŠ',
        'ØªÙ„Ø®ÙŠØµ ÙˆØ¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ©'
    ],
    'Ø§Ù„Ø¹Ù„ÙˆÙ…': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ / Ø§Ù„Ù…Ø®ØªØ¨Ø± ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ¹Ø±Ø¶ Ø§Ù„Ø¯Ø±Ø³',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¹Ù„Ù…ÙŠ',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ØªØ¬Ø§Ø±Ø¨ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©',
        'ØªØ·Ø¨ÙŠÙ‚ Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ø³Ù„Ø§Ù…Ø© ÙÙŠ Ø§Ù„Ù…Ø®ØªØ¨Ø±',
        'Ø±Ø¨Ø· Ø§Ù„Ø¹Ù„Ù… Ø¨Ø§Ù„ØªÙ‚Ù†ÙŠØ© ÙˆØ§Ù„Ø­ÙŠØ§Ø©',
        'ØªØ­ÙÙŠØ² Ø§Ù„ØªÙÙƒÙŠØ± Ø§Ù„Ø¹Ù„Ù…ÙŠ ÙˆØ§Ù„Ø§Ø³ØªÙ†ØªØ§Ø¬',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ ÙˆØ§Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø¹Ù„Ù…ÙŠØ©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø·Ù„Ø§Ø¨',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ ÙÙŠ Ø§Ù„Ø£Ù†Ø´Ø·Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©',
        'Ø§Ù„Ø¯Ù‚Ø© ÙÙŠ Ø§Ù„Ù…ØµØ·Ù„Ø­Ø§Øª Ø§Ù„Ø¹Ù„Ù…ÙŠØ©',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ØªÙ‚Ù†ÙŠØ© ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ø·',
        'ØªÙ†Ù…ÙŠØ© Ù…Ù‡Ø§Ø±Ø© Ø§Ù„Ø§Ø³ØªÙ‚ØµØ§Ø¡ Ø§Ù„Ø¹Ù„Ù…ÙŠ',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ],
    'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠØ©': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ§Ù„Ø¹Ø±Ø¶',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ØªØ±Ø¨ÙˆÙŠØ© ÙˆØ§Ù„Ø¹Ù„Ù…ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø´Ø±Ø¹ÙŠØ©',
        'Ø­Ø³Ù† Ø§Ù„ØªÙ„Ø§ÙˆØ© ÙˆØ§Ù„ØªØ¬ÙˆÙŠØ¯ Ø¥Ù† ÙˆØ¬Ø¯',
        'Ø±Ø¨Ø· Ø§Ù„Ø¯Ø±Ø³ Ø¨Ø§Ù„Ù‚ÙŠÙ… ÙˆØ§Ù„Ø³Ù„ÙˆÙƒ Ø§Ù„Ø¹Ù…Ù„ÙŠ',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø£Ø³Ù„ÙˆØ¨ Ø§Ù„Ù‚ØµØ© ÙˆØ§Ù„Ù…ÙˆØ¹Ø¸Ø©',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¹Ù„Ø©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø·Ù„Ø§Ø¨',
        'Ø§Ù„Ø¯Ù‚Ø© ÙÙŠ ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø£Ø¯Ù„Ø© Ø§Ù„Ø´Ø±Ø¹ÙŠØ©',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©',
        'ØªÙ†Ù…ÙŠØ© Ø§Ù„Ù‚ÙŠÙ… Ø§Ù„Ø£Ø®Ù„Ø§Ù‚ÙŠØ© Ù„Ø¯Ù‰ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ],
    'Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ§Øª': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ§Ù„Ø¹Ø±Ø¶',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¬ØºØ±Ø§ÙÙŠ ÙˆØ§Ù„ØªØ§Ø±ÙŠØ®ÙŠ',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø®Ø±Ø§Ø¦Ø· ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ù„',
        'Ø±Ø¨Ø· Ø§Ù„Ø¯Ø±Ø³ Ø¨Ø§Ù„ÙˆØ§Ù‚Ø¹ Ø§Ù„Ù…Ø­Ù„ÙŠ ÙˆØ§Ù„Ø¹Ø§Ù„Ù…ÙŠ',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¹Ù„Ø©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø·Ù„Ø§Ø¨',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'ØªÙ†Ù…ÙŠØ© Ø­Ø¨ Ø§Ù„ÙˆØ·Ù† ÙˆØ§Ù„Ø§Ù†ØªÙ…Ø§Ø¡',
        'ØªØ¯Ø±ÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ Ø¹Ù„Ù‰ Ø§Ù„ØªØ­Ù„ÙŠÙ„ ÙˆØ§Ù„Ø§Ø³ØªÙ†ØªØ§Ø¬',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ØªÙ‚Ù†ÙŠØ© ÙÙŠ Ø§Ù„Ø­ØµØ©',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ],
    'Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨ â€” Classroom cleanliness & student arrangement',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© â€” Board organization',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± â€” Lesson preparation',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ© â€” Clear lesson objectives',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© â€” Subject mastery',
        'Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù†Ø·Ù‚ ÙˆØ§Ù„Ø·Ù„Ø§Ù‚Ø© Ø§Ù„Ø´ÙÙ‡ÙŠØ© â€” Pronunciation accuracy & fluency',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³ â€” Variety of teaching methods',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ© â€” Use of teaching aids',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¹Ù„Ø© â€” Student participation',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± â€” Continuous assessment',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª â€” Time management',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ© â€” Differentiated instruction',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ© â€” Remedial & enrichment plans',
        'ØªÙ†Ù…ÙŠØ© Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø§Ù„Ù„ØºÙˆÙŠØ© Ø§Ù„Ø£Ø±Ø¨Ø¹ â€” Developing four language skills',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„ØµÙÙŠ â€” Classroom management',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ØªÙ‚Ù†ÙŠØ© â€” Use of technology',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… â€” Teacher appearance & personality',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© â€” Lesson closure'
    ],
    'Ø§Ù„Ø­Ø§Ø³ÙˆØ¨': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„Ù…Ø®ØªØ¨Ø± ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ§Ù„Ø¹Ø±Ø¶',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„ØªÙ‚Ù†ÙŠ',
        'ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¬Ø§Ù†Ø¨ Ø§Ù„Ø¹Ù…Ù„ÙŠ ÙˆØ§Ù„ØªØ·Ø¨ÙŠÙ‚ÙŠ',
        'Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ù„Ø§Ù…Ø© Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¹Ù„Ø©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø·Ù„Ø§Ø¨',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'Ø±Ø¨Ø· Ø§Ù„Ø¯Ø±Ø³ Ø¨Ø§Ù„ØªØ·Ø¨ÙŠÙ‚Ø§Øª Ø§Ù„Ø­Ø¯ÙŠØ«Ø©',
        'ØªÙ†Ù…ÙŠØ© Ù…Ù‡Ø§Ø±Ø§Øª Ø­Ù„ Ø§Ù„Ù…Ø´ÙƒÙ„Ø§Øª',
        'Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ø³ÙŠØ¨Ø±Ø§Ù†ÙŠ ÙˆØ§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¢Ù…Ù†',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ],
    'Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙˆØ±Ø´Ø© ÙˆØªØ±ØªÙŠØ¨Ù‡Ø§',
        'ØªÙˆÙÙŠØ± Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù…Ù‡Ù†ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù†Ø¸Ø±ÙŠ ÙˆØ§Ù„Ø¹Ù…Ù„ÙŠ',
        'ØªØ·Ø¨ÙŠÙ‚ Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù…Ù‡Ù†ÙŠØ©',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ù…Ø¹Ø¯Ø§Øª Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ ÙÙŠ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø·Ù„Ø§Ø¨',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„ÙˆØ±Ø´Ø©',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'ØªÙ†Ø¸ÙŠÙ… Ø§Ù„ÙˆØ±Ø´Ø© ÙˆØ§Ù„Ù…Ø¹Ø¯Ø§Øª',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø¯Ø§Ø®Ù„ Ø§Ù„ÙˆØ±Ø´Ø©',
        'Ø±Ø¨Ø· Ø§Ù„Ù†Ø¸Ø±ÙŠ Ø¨Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ],
    'Ø§Ù„Ø¯ÙŠÙƒÙˆØ±': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙˆØ±Ø´Ø© ÙˆØªØ±ØªÙŠØ¨Ù‡Ø§',
        'ØªÙˆÙÙŠØ± Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø³Ù„Ø§Ù…Ø©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø§Ù„ÙÙ†ÙŠØ©',
        'ØªØ·Ø¨ÙŠÙ‚ Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ø³Ù„Ø§Ù…Ø© ÙÙŠ Ø§Ù„ÙˆØ±Ø´Ø©',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø£Ø¯ÙˆØ§Øª Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ ÙÙŠ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„ÙˆØ±Ø´Ø©',
        'ØªÙ†Ø¸ÙŠÙ… Ø§Ù„ÙˆØ±Ø´Ø© ÙˆØ§Ù„Ù…ÙˆØ§Ø¯',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø¯Ø§Ø®Ù„ Ø§Ù„ÙˆØ±Ø´Ø©',
        'ØªÙ†Ù…ÙŠØ© Ø§Ù„Ø­Ø³ Ø§Ù„Ø¬Ù…Ø§Ù„ÙŠ ÙˆØ§Ù„Ø¥Ø¨Ø¯Ø§Ø¹ÙŠ',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø±Ø¨Ø· Ø§Ù„Ø¯Ø±Ø³ Ø¨Ø³ÙˆÙ‚ Ø§Ù„Ø¹Ù…Ù„'
    ],
    'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„ÙÙ†ÙŠØ©': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨Ù‡',
        'ØªÙˆÙÙŠØ± Ø§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ§Ù„Ù…Ø³ØªÙ„Ø²Ù…Ø§Øª Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø§Ù„ÙÙ†ÙŠØ© ÙˆØ§Ù„ØªÙ‚Ù†ÙŠØ§Øª',
        'ØªÙ†ÙˆÙŠØ¹ Ø§Ù„Ø®Ø§Ù…Ø§Øª ÙˆØ§Ù„Ø£Ø¯ÙˆØ§Øª',
        'ØªØ´Ø¬ÙŠØ¹ Ø§Ù„Ø¥Ø¨Ø¯Ø§Ø¹ ÙˆØ§Ù„Ø§Ø¨ØªÙƒØ§Ø±',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¹Ù„Ø©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'ØªÙ†Ù…ÙŠØ© Ø§Ù„Ø­Ø³ Ø§Ù„Ø¬Ù…Ø§Ù„ÙŠ',
        'Ø¹Ø±Ø¶ ÙˆÙ…Ù†Ø§Ù‚Ø´Ø© Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„ÙÙ†ÙŠØ©',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„ØµÙÙŠ Ø§Ù„Ø¹Ø§Ù…',
        'Ø±Ø¨Ø· Ø§Ù„ÙÙ† Ø¨Ø§Ù„ØªØ±Ø§Ø« ÙˆØ§Ù„Ù‡ÙˆÙŠØ©',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ],
    'Ø§Ù„ØªØ±Ø¨ÙŠØ© Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„Ù…Ù„Ø¹Ø¨ / Ø§Ù„ØµØ§Ù„Ø© ÙˆØªØ±ØªÙŠØ¨Ù‡Ø§',
        'ØªÙˆÙÙŠØ± Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø§Ù„Ø­Ø±ÙƒÙŠØ©',
        'ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¥Ø­Ù…Ø§Ø¡ ÙˆØ§Ù„ØªÙ‡ÙŠØ¦Ø© Ø§Ù„Ø¨Ø¯Ù†ÙŠØ©',
        'ØªØ·Ø¨ÙŠÙ‚ Ù…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©',
        'ØªÙ†ÙˆÙŠØ¹ Ø§Ù„Ø£Ù†Ø´Ø·Ø© ÙˆØ§Ù„ØªÙ…Ø§Ø±ÙŠÙ†',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ø­Ø±ÙƒÙŠ',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ù…Ù„Ø¹Ø¨ ÙˆØ§Ù„Ø£Ø¯ÙˆØ§Øª',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· ÙˆØ§Ù„Ø±ÙˆØ­ Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ©',
        'ØªÙ†Ù…ÙŠØ© Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„Ø¬Ù…Ø§Ø¹ÙŠ ÙˆØ§Ù„Ø±ÙˆØ­ Ø§Ù„ØªÙ†Ø§ÙØ³ÙŠØ© Ø§Ù„Ø¥ÙŠØ¬Ø§Ø¨ÙŠØ©',
        'Ø§Ù„Ø§Ù‡ØªÙ…Ø§Ù… Ø¨Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ø®Ø§ØµØ©',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ‡Ø¯Ø¦Ø© Ø¨Ø¯Ù†ÙŠØ©'
    ],
    'Ø¹Ø§Ù…': [
        'Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙØµÙ„ ÙˆØªØ±ØªÙŠØ¨ Ø§Ù„Ø·Ù„Ø§Ø¨',
        'ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø³Ø¨ÙˆØ±Ø© ÙˆØ§Ù„Ø¹Ø±Ø¶',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¯Ø±Ø³ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¬ÙŠØ¯',
        'ÙˆØ¶ÙˆØ­ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©',
        'Ø§Ù„ØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø¹Ù„Ù…ÙŠØ©',
        'ØªÙ†ÙˆÙŠØ¹ Ø·Ø±Ø§Ø¦Ù‚ Ø§Ù„ØªØ¯Ø±ÙŠØ³',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙˆØ³Ø§Ø¦Ù„ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ© Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø©',
        'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆÙ‚Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­ØµØ©',
        'Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„ÙØ§Ø¹Ù„Ø©',
        'Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ù…Ø³ØªÙ…Ø± Ù„Ù„Ø·Ù„Ø§Ø¨',
        'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ÙØ±ÙˆÙ‚ Ø§Ù„ÙØ±Ø¯ÙŠØ©',
        'Ø¥Ø¹Ø¯Ø§Ø¯ Ø®Ø·Ø· Ø¹Ù„Ø§Ø¬ÙŠØ© ÙˆØ¥Ø«Ø±Ø§Ø¦ÙŠØ©',
        'Ø§Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ù…Ø¹Ù„Ù… ÙˆØ´Ø®ØµÙŠØªÙ‡',
        'Ø§Ù„Ø§Ù†Ø¶Ø¨Ø§Ø· Ø§Ù„ØµÙÙŠ Ø§Ù„Ø¹Ø§Ù…',
        'Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ØªÙ‚Ù†ÙŠØ© ÙÙŠ Ø§Ù„Ø­ØµØ©',
        'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø­ØµØ© ÙˆØªÙ„Ø®ÙŠØµ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù'
    ]
};

const RATINGS = ['Ù…Ù…ØªØ§Ø²', 'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹', 'Ø¬ÙŠØ¯', 'Ù…Ù‚Ø¨ÙˆÙ„', 'Ø¶Ø¹ÙŠÙ'];
const RATING_COLORS = {
    'Ù…Ù…ØªØ§Ø²':   '#059669',
    'Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹':'#1a78c2',
    'Ø¬ÙŠØ¯':     '#d4920a',
    'Ù…Ù‚Ø¨ÙˆÙ„':   '#f59e0b',
    'Ø¶Ø¹ÙŠÙ':    '#dc2626'
};

export async function initVisitsModule() {
    var container = document.getElementById('tab-visits');
    if (!container) return;

    container.innerHTML = `
    <style>
        .v-label{font-weight:700;font-size:12.5px;color:var(--text);display:block;margin-bottom:5px}
        .v-input{width:100%;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;
            font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;text-align:right;
            outline:none;transition:border-color .2s;background:#fff}
        .v-input:focus{border-color:var(--sky)}
        .v-submit{width:100%;background:var(--navy);color:#fff;font-weight:800;margin-top:16px;
            border:none;padding:12px;border-radius:9px;cursor:pointer;
            font-family:'Cairo',sans-serif;font-size:14px;display:flex;align-items:center;
            justify-content:center;gap:8px}
        .v-submit:hover{background:#134074}
        .crit-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
        .crit-table th{background:#0b2545;color:#fff;padding:9px 12px;text-align:center;font-weight:800;font-size:12px}
        .crit-table th:first-child{text-align:right;width:50px}
        .crit-table th:nth-child(2){text-align:right}
        .crit-table td{padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:middle}
        .crit-table td:nth-child(2){text-align:right;font-weight:600;font-size:12.5px}
        .crit-table tr:nth-child(even) td{background:#f8f9fc}
        .crit-table tr:hover td{background:#eaf4fd}
        .rating-radio{display:none}
        .rating-label{display:inline-block;width:28px;height:28px;border:2px solid #e5e7eb;
            border-radius:50%;cursor:pointer;transition:all .2s;font-size:10px;
            line-height:26px;text-align:center;font-weight:800}
        .rating-radio:checked + .rating-label{color:#fff;border-color:transparent}
        .r-mmtaz:checked + .rating-label{background:#059669}
        .r-jayyid-jiddan:checked + .rating-label{background:#1a78c2}
        .r-jayyid:checked + .rating-label{background:#d4920a}
        .r-maqbool:checked + .rating-label{background:#f59e0b}
        .r-daif:checked + .rating-label{background:#dc2626}
        .v-th-sm{padding:6px 4px;font-size:11px}
        .archive-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:800;color:#fff}
        .v-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
        .v-card-title{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:16px;
            display:flex;align-items:center;gap:8px;border-bottom:2px solid #f0f4f8;padding-bottom:10px}
    </style>

    <!-- â•â•â• Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø²ÙŠØ§Ø±Ø© â•â•â• -->
    <div class="v-card" style="border-top:4px solid var(--sky)">
        <div class="v-card-title">
            <i class="bi bi-journal-check" style="color:var(--sky)"></i>
            ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø§Ù„ØµÙÙŠØ© Ø§Ù„ÙÙ†ÙŠØ© â€” ÙˆØ²Ø§Ø±Ø© Ø§Ù„ØªØ±Ø¨ÙŠØ©
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">
            <div>
                <label class="v-label">Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…Ø²Ø§Ø±</label>
                <select id="visit-teacher-name" class="v-input" required>
                    <option value="">â³ Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ†...</option>
                </select>
            </div>
            <div>
                <label class="v-label">Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³</label>
                <input type="text" id="visit-lesson-topic" class="v-input" placeholder="Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³..." required>
            </div>
            <div>
                <label class="v-label">Ø§Ù„Ù…Ø§Ø¯Ø© / Ø§Ù„Ù‚Ø³Ù…</label>
                <select id="visit-subject" class="v-input" required onchange="window.renderVisitCriteria(this.value)">
                    <option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø© --</option>
                    ${Object.keys(DEPT_CRITERIA).map(d=>`<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="v-label">Ø§Ù„ØµÙ</label>
                <input type="text" id="visit-class" class="v-input" placeholder="Ù…Ø«Ø§Ù„: 7/2">
            </div>
            <div>
                <label class="v-label">Ø§Ù„Ø­ØµØ©</label>
                <select id="visit-period" class="v-input">
                    <option value="Ø§Ù„Ø£ÙˆÙ„Ù‰">Ø§Ù„Ø£ÙˆÙ„Ù‰</option>
                    <option value="Ø§Ù„Ø«Ø§Ù†ÙŠØ©">Ø§Ù„Ø«Ø§Ù†ÙŠØ©</option>
                    <option value="Ø§Ù„Ø«Ø§Ù„Ø«Ø©">Ø§Ù„Ø«Ø§Ù„Ø«Ø©</option>
                    <option value="Ø§Ù„Ø±Ø§Ø¨Ø¹Ø©">Ø§Ù„Ø±Ø§Ø¨Ø¹Ø©</option>
                    <option value="Ø§Ù„Ø®Ø§Ù…Ø³Ø©">Ø§Ù„Ø®Ø§Ù…Ø³Ø©</option>
                    <option value="Ø§Ù„Ø³Ø§Ø¯Ø³Ø©">Ø§Ù„Ø³Ø§Ø¯Ø³Ø©</option>
                    <option value="Ø§Ù„Ø³Ø§Ø¨Ø¹Ø©">Ø§Ù„Ø³Ø§Ø¨Ø¹Ø©</option>
                </select>
            </div>
            <div>
                <label class="v-label">Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¬Ù‡ / Ø§Ù„Ø²Ø§Ø¦Ø±</label>
                <input type="text" id="visit-visitor-name" class="v-input"
                    value="${(JSON.parse(localStorage.getItem('hs_user')||'{}').name)||''}" readonly
                    style="background:var(--off);color:var(--mid);font-weight:700">
            </div>
            <div>
                <label class="v-label">Ø§Ù„ÙØµÙ„ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ</label>
                <input type="text" id="visit-semester" class="v-input" placeholder="Ù…Ø«Ø§Ù„: Ø§Ù„Ø£ÙˆÙ„ 2025/2026">
            </div>
            <div>
                <label class="v-label">Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
                <input type="date" id="visit-date" class="v-input" value="${getTodayISO()}">
            </div>
        </div>

        <!-- Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯ -->
        <div id="visit-criteria-area"></div>

        <!-- Ù…Ù„Ø§Ø­Ø¸Ø§Øª -->
        <div style="margin-top:14px">
            <label class="v-label">Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø²ÙŠØ§Ø±Ø© ÙˆØ£Ø¨Ø±Ø² Ø§Ù„ØªÙˆØµÙŠØ§Øª</label>
            <textarea id="visit-notes" class="v-input" rows="3"
                placeholder="Ø§ÙƒØªØ¨ Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„ÙÙ†ÙŠ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª..."></textarea>
        </div>

        <button class="v-submit" onclick="window.handleRegisterTechVisitLive()">
            <i class="bi bi-cloud-plus-fill"></i> ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø³Ø­Ø§Ø¨ÙŠØ§Ù‹
        </button>
    </div>

    <!-- â•â•â• Ø§Ù„Ø£Ø±Ø´ÙŠÙ â•â•â• -->
    <div class="v-card" style="border-top:4px solid var(--navy)">
        <div class="v-card-title">
            <i class="bi bi-archive-fill"></i>
            Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ÙÙ†ÙŠØ©
            <div style="margin-right:auto;display:flex;gap:8px">
                <button onclick="window.printVisitsPDF()"
                    style="background:var(--red);color:#fff;border:none;padding:7px 14px;border-radius:8px;
                    font-family:'Cairo',sans-serif;font-weight:700;font-size:12px;cursor:pointer;
                    display:flex;align-items:center;gap:6px">
                    <i class="bi bi-file-earmark-pdf-fill"></i> ØªØµØ¯ÙŠØ± PDF
                </button>
            </div>
        </div>

        <!-- ÙÙ„ØªØ± -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <select id="archive-filter-subject" class="v-input" style="max-width:180px"
                onchange="window.filterVisitsArchive()">
                <option value="">ÙƒÙ„ Ø§Ù„Ù…ÙˆØ§Ø¯</option>
                ${Object.keys(DEPT_CRITERIA).map(d=>`<option value="${d}">${d}</option>`).join('')}
            </select>
            <input type="text" id="archive-search" class="v-input" style="max-width:200px"
                placeholder="ðŸ” Ø§Ø¨Ø­Ø« Ø¨Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù…..."
                oninput="window.filterVisitsArchive()">
        </div>

        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:var(--off)">
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„Ù…Ø¹Ù„Ù… Ø§Ù„Ù…Ø²Ø§Ø±</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„Ù…Ø§Ø¯Ø©</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„ØµÙ</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„Ù…ÙˆØ¬Ù‡</th>
                        <th style="padding:10px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø¹Ø§Ù…</th>
                        <th style="padding:10px 12px;text-align:right;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                        <th style="padding:10px 12px;text-align:center;font-weight:800;font-size:12px;color:var(--mid);border-bottom:1px solid var(--line)">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
                    </tr>
                </thead>
                <tbody id="tech-visits-tbody">
                    <tr><td colspan="7" style="text-align:center;padding:30px;color:var(--mid)">â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    loadTechVisitsLive();
    loadTeacherDirectoryForVisits();
}

// â•â• ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† â•â•
async function loadTeacherDirectoryForVisits() {
    var sel = document.getElementById('visit-teacher-name');
    if(!sel) return;
    try {
        var schoolId = getActiveSchoolId();
        var snap = await getDocs(query(collection(db,'users'),
            where('schoolId','==',schoolId), where('role','==','teacher')));
        var names = [];
        snap.forEach(d => { if(d.data().name) names.push(d.data().name.trim()); });
        names.sort((a,b)=>a.localeCompare(b,'ar'));
        sel.innerHTML = names.length
            ? '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¹Ù„Ù… --</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('')
            : '<option value="">âš ï¸ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø¹Ù„Ù…ÙˆÙ† Ù…Ø³Ø¬Ù„ÙˆÙ†</option>';
    } catch(e) { sel.innerHTML = '<option value="">âŒ Ø®Ø·Ø£</option>'; }
}

// â•â• Ø±Ø³Ù… Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯ â•â•
window.renderVisitCriteria = function(subject) {
    var area = document.getElementById('visit-criteria-area');
    if(!subject || !DEPT_CRITERIA[subject]) { area.innerHTML = ''; return; }
    var items = DEPT_CRITERIA[subject];

    area.innerHTML = `
    <div style="background:var(--off);border-radius:10px;padding:14px;border:1px solid var(--line)">
        <div style="font-weight:800;font-size:13px;color:var(--navy);margin-bottom:10px">
            ðŸ“‹ Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø© â€” ${subject} (${items.length} Ø¨Ù†Ø¯)
        </div>
        <div style="overflow-x:auto">
        <table class="crit-table">
            <thead>
                <tr>
                    <th class="v-th-sm" style="text-align:center;width:40px">Ù…</th>
                    <th style="text-align:right">Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ€Ù… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th>
                    <th class="v-th-sm" style="color:#059669">Ù…Ù…ØªØ§Ø²</th>
                    <th class="v-th-sm" style="color:#1a78c2">Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹</th>
                    <th class="v-th-sm" style="color:#d4920a">Ø¬ÙŠØ¯</th>
                    <th class="v-th-sm" style="color:#f59e0b">Ù…Ù‚Ø¨ÙˆÙ„</th>
                    <th class="v-th-sm" style="color:#dc2626">Ø¶Ø¹ÙŠÙ</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, i) => `
                <tr>
                    <td style="text-align:center;font-weight:800;color:var(--mid)">${i+1}</td>
                    <td style="text-align:right;font-weight:600;font-size:12.5px">${item}</td>
                    ${['Ù…Ù…ØªØ§Ø²','Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹','Ø¬ÙŠØ¯','Ù…Ù‚Ø¨ÙˆÙ„','Ø¶Ø¹ÙŠÙ'].map((r,ri) => {
                        var cls = ['r-mmtaz','r-jayyid-jiddan','r-jayyid','r-maqbool','r-daif'][ri];
                        return `<td>
                            <input type="radio" class="rating-radio ${cls}" name="crit_${i}" id="crit_${i}_${ri}" value="${r}" data-item="${item}" ${r==='Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹'?'checked':''}>
                            <label class="rating-label" for="crit_${i}_${ri}">âœ“</label>
                        </td>`;
                    }).join('')}
                </tr>`).join('')}
            </tbody>
        </table>
        </div>
    </div>`;
};

// â•â• Ø­ÙØ¸ Ø§Ù„Ø²ÙŠØ§Ø±Ø© â•â•
window.handleRegisterTechVisitLive = async function() {
    var teacherName   = document.getElementById('visit-teacher-name').value.trim();
    var lessonTopic   = document.getElementById('visit-lesson-topic').value.trim();
    var subject       = document.getElementById('visit-subject').value;
    var classRoom     = document.getElementById('visit-class').value.trim();
    var period        = document.getElementById('visit-period').value;
    var visitorName   = document.getElementById('visit-visitor-name').value.trim();
    var semester      = document.getElementById('visit-semester').value.trim();
    var visitDate     = document.getElementById('visit-date').value || getTodayISO();
    var notes         = document.getElementById('visit-notes').value.trim();

    if(!teacherName || !subject) {
        window.showToast('âš ï¸ Ø§Ø®ØªØ± Ø§Ù„Ù…Ø¹Ù„Ù… ÙˆØ§Ù„Ù…Ø§Ø¯Ø©', 'warning'); return;
    }

    // Ø¬Ù…Ø¹ Ø§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª
    var criteriaResults = [];
    var radios = document.querySelectorAll('.rating-radio:checked');
    radios.forEach(r => {
        criteriaResults.push({ item: r.getAttribute('data-item'), rating: r.value });
    });

    if(criteriaResults.length === 0) {
        window.showToast('âš ï¸ Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø© Ø£ÙˆÙ„Ø§Ù‹ Ù„ØªØ¸Ù‡Ø± Ø§Ù„Ø¨Ù†ÙˆØ¯', 'warning'); return;
    }

    // Ø­Ø³Ø§Ø¨ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø¹Ø§Ù… (Ø§Ù„Ø£ÙƒØ«Ø± ØªÙƒØ±Ø§Ø±Ø§Ù‹)
    var counts = {};
    criteriaResults.forEach(c => counts[c.rating] = (counts[c.rating]||0)+1);
    var overallRating = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'â€”';

    // Ø­Ø³Ø§Ø¨ Ù†Ø³Ø¨Ø© Ø§Ù„Ù…Ù…ØªØ§Ø²
    var excellentCount = counts['Ù…Ù…ØªØ§Ø²']||0;
    var goodCount = (counts['Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹']||0) + (counts['Ø¬ÙŠØ¯']||0);
    var weakCount = (counts['Ù…Ù‚Ø¨ÙˆÙ„']||0) + (counts['Ø¶Ø¹ÙŠÙ']||0);

    var btn = document.querySelector('.v-submit');
    if(btn) { btn.disabled=true; btn.innerHTML='â³ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...'; }

    try {
        await addDoc(collection(db, 'technical_visits'), {
            schoolId:      getActiveSchoolId(),
            teacherName,
            lessonTopic,
            subject,
            classRoom,
            period,
            visitorName,
            semester,
            notes,
            criteria:      criteriaResults,
            overallRating,
            excellentCount,
            goodCount,
            weakCount,
            date:          visitDate,
            createdAt:     serverTimestamp()
        });

        window.showToast('âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø¨Ù†Ø¬Ø§Ø­');

        // ØªÙØ±ÙŠØº Ø§Ù„Ù†Ù…ÙˆØ°Ø¬
        ['visit-teacher-name','visit-subject','visit-class','visit-notes','visit-lesson-topic','visit-semester'].forEach(id => {
            var el = document.getElementById(id);
            if(el) el.value = el.tagName==='SELECT' ? '' : '';
        });
        document.getElementById('visit-date').value = getTodayISO();
        document.getElementById('visit-criteria-area').innerHTML = '';

        // Ø¹Ø±Ø¶ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©
        if(confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø·Ø¨Ø§Ø¹Ø© Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø§Ù„Ø±Ø³Ù…ÙŠØŸ')) {
            window.printOfficialVisitForm({
                teacherName, lessonTopic, subject, classRoom, period,
                visitorName, semester, notes, visitDate, criteriaResults, overallRating
            });
        }

    } catch(err) {
        window.showToast('âŒ Ø®Ø·Ø£: ' + err.message, 'error');
    } finally {
        if(btn) { btn.disabled=false; btn.innerHTML='<i class="bi bi-cloud-plus-fill"></i> ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø³Ø­Ø§Ø¨ÙŠØ§Ù‹'; }
    }
};

// â•â• Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø±Ø³Ù…ÙŠ â•â•
window.printOfficialVisitForm = function(data) {
    var { teacherName, lessonTopic, subject, classRoom, period,
            visitorName, semester, notes, visitDate, criteriaResults } = data;

    var today = new Date(visitDate + 'T00:00:00').toLocaleDateString('ar-KW', {
        year:'numeric', month:'long', day:'numeric'
    });

    var tableRows = criteriaResults.map((c, i) => `
        <tr>
            <td style="text-align:center;font-weight:700;border:1px solid #999">${i+1}</td>
            <td style="text-align:right;padding:6px 10px;border:1px solid #999;font-size:12px">${c.item}</td>
            ${['Ù…Ù…ØªØ§Ø²','Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹','Ø¬ÙŠØ¯','Ù…Ù‚Ø¨ÙˆÙ„','Ø¶Ø¹ÙŠÙ'].map(r =>
                `<td style="text-align:center;border:1px solid #999;font-size:14px">
                    ${c.rating===r?'<span style="font-size:18px;color:#0b2545">âœ“</span>':''}
                </td>`
            ).join('')}
        </tr>`).join('');

    var schoolUser = JSON.parse(localStorage.getItem('hs_user')||'{}');
    var schoolName = schoolUser.schoolName || 'Ù…Ø¯Ø±Ø³Ø© Ø³Ø§Ù„Ù… Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù† Ø§Ù„Ù…ØªÙˆØ³Ø·Ø© â€” Ø¨Ù†ÙŠÙ†';

    // â•â• Ø·Ø¨Ø§Ø¹Ø© Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ iOS â•â•
    var htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>Ù†Ù…ÙˆØ°Ø¬ Ø²ÙŠØ§Ø±Ø© ÙÙ†ÙŠØ© â€” ${teacherName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Cairo',sans-serif; direction:rtl; padding:20px; color:#000; font-size:13px; }
  .header { text-align:center; margin-bottom:16px; }
  .header h1 { font-size:15px; font-weight:900; margin-bottom:4px; }
  .header p  { font-size:12px; color:#333; }
  .title-box {
    border:2px solid #000; padding:10px 24px; display:inline-block;
    font-size:18px; font-weight:900; margin:12px auto; border-radius:4px;
  }
  .logos { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .logos img { height:70px; }
  .info-table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:12.5px; }
  .info-table td { border:1px solid #999; padding:6px 10px; }
  .info-table .lbl { background:#dce6f0; font-weight:800; width:100px; }
  .info-table .val { min-width:120px; }
  .crit-table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:12px; }
  .crit-table th { background:#0b2545; color:#fff; padding:7px 8px; text-align:center; font-size:11.5px; }
  .crit-table th:nth-child(2) { text-align:right; }
  .crit-table td { border:1px solid #999; padding:5px 8px; text-align:center; }
  .crit-table td:nth-child(2) { text-align:right; }
  .crit-table tr:nth-child(even) td { background:#f8f8f8; }
  .notes-box { border:1px solid #999; padding:10px; min-height:60px; margin-bottom:14px; border-radius:4px; font-size:12.5px; }
  .notes-label { font-weight:800; margin-bottom:6px; font-size:13px; }
  .sig-table { width:100%; border-collapse:collapse; }
  .sig-table th { background:#dce6f0; padding:8px; border:1px solid #999; font-weight:800; text-align:center; font-size:12px; }
  .sig-table td { border:1px solid #999; padding:24px 10px; text-align:center; font-size:12px; }
  @media print {
    body { padding:10px; }
    @page { margin:1cm; }
  }
</style>
</head>
<body>
<div class="logos">
  <div style="text-align:center;font-size:11px;font-weight:700;color:#555">
    <div style="font-size:24px">ðŸŒ¿</div>
    Ù…Ø¯Ø±Ø³Ø© Ø³Ø§Ù„Ù… Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù†
  </div>
  <div style="text-align:center">
    <div style="font-size:14px;font-weight:900">ÙˆØ²Ø§Ø±Ø© Ø§Ù„ØªØ±Ø¨ÙŠØ©</div>
    <div style="font-size:12px;color:#555">Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ù„Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø¹Ø§ØµÙ…Ø© Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©</div>
    <div style="font-size:12px;font-weight:700">${schoolName}</div>
  </div>
  <div style="text-align:center;font-size:11px;font-weight:700;color:#555">
    <div style="font-size:24px">ðŸ›ï¸</div>
    ÙˆØ²Ø§Ø±Ø© Ø§Ù„ØªØ±Ø¨ÙŠØ©
  </div>
</div>

<div style="text-align:center;margin-bottom:14px">
  <span class="title-box">Ø²ÙŠØ§Ø±Ø© Ù…Ø¹Ù„Ù… ${subject}</span>
</div>

<table class="info-table">
  <tr>
    <td class="lbl">Ø§Ø³Ù… Ø§Ù„Ù…Ø¹Ù„Ù…</td><td class="val">${teacherName}</td>
    <td class="lbl">Ù…Ø¹Ø§Ø¯ Ø§Ø¸Ø¨ÙŠÙ‡</td><td class="val"></td>
  </tr>
  <tr>
    <td class="lbl">Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³</td><td class="val">${lessonTopic||'â€”'}</td>
    <td class="lbl">Ø§Ù„Ø¹Ø§Ù… Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠ</td><td class="val">${semester||'â€”'}</td>
  </tr>
  <tr>
    <td class="lbl">Ø§Ù„ØµÙ</td><td class="val">${classRoom||'â€”'}</td>
    <td class="lbl">Ø§Ù„Ø­ØµØ©</td><td class="val">${period||'â€”'}</td>
  </tr>
  <tr>
    <td class="lbl">Ø§Ù„ÙŠÙˆÙ…</td><td class="val">${today}</td>
    <td class="lbl">Ø§Ù„Ù…ÙˆØ§ÙÙ‚</td><td class="val"></td>
  </tr>
</table>

<table class="crit-table">
  <thead>
    <tr>
      <th style="width:40px">Ù…</th>
      <th style="text-align:right">Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙ‚ÙŠÙŠÙ€Ù… ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</th>
      <th style="background:#059669">Ù…Ù…ØªØ§Ø²</th>
      <th style="background:#1a78c2">Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹</th>
      <th style="background:#d4920a">Ø¬ÙŠØ¯</th>
      <th style="background:#f59e0b">Ù…Ù‚Ø¨ÙˆÙ„</th>
      <th style="background:#dc2626">Ø¶Ø¹ÙŠÙ</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<div class="notes-label">Ù…Ù„Ø§Ø­Ø¸Ø§Øª :</div>
<div class="notes-box">${notes||''}</div>

<table class="sig-table">
  <thead>
    <tr>
      <th>Ù…Ø¯ÙŠØ± Ø§Ù„Ù…Ø¯Ø±Ø³Ø©</th>
      <th>Ø±Ø¦ÙŠØ³ Ø§Ù„Ù‚Ø³Ù…</th>
      <th>Ø§Ù„ÙˆØ¸ÙŠÙØ©</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td></td>
      <td>${visitorName||''}</td>
      <td style="text-align:right;font-weight:700">Ø§Ù„Ø§Ø³Ù…</td>
    </tr>
    <tr>
      <td style="height:40px"></td>
      <td style="height:40px"></td>
      <td style="text-align:right;font-weight:700">Ø§Ù„ØªÙˆÙ‚ÙŠØ¹<br>Ø¨Ø§Ù„Ø¹Ù„Ù…</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
    var blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    var blobUrl = URL.createObjectURL(blob);
    var printWin = window.open(blobUrl, '_blank');
    if(!printWin) {
        // iOS Safari ÙŠÙ…Ù†Ø¹ window.open â€” Ù†Ø³ØªØ®Ø¯Ù… iframe
        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;border:none;background:#fff';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => iframe.remove(), 2000);
            }, 500);
        };
    } else {
        setTimeout(() => { printWin.print(); URL.revokeObjectURL(blobUrl); }, 600);
    }
};


// â•â• Ø¯Ø§Ù„Ø© Ø·Ø¨Ø§Ø¹Ø© Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ iOS Safari â•â•
function printHtmlIos(htmlContent) {
    var blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    var blobUrl = URL.createObjectURL(blob);

    // Ù…Ø­Ø§ÙˆÙ„Ø© window.open Ø£ÙˆÙ„Ø§Ù‹
    var printWin = window.open(blobUrl, '_blank');

    if (!printWin || printWin.closed || typeof printWin.closed === 'undefined') {
        // iOS Safari ÙŠØ­Ø¬Ø¨ window.open â€” Ù†Ø³ØªØ®Ø¯Ù… iframe
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column';
        overlay.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#0b2545;color:#fff;font-family:Cairo,sans-serif">
                <span style="font-weight:800;font-size:14px">Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©</span>
                <div style="display:flex;gap:8px">
                    <button id="_print-btn" style="background:#25d366;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-family:Cairo,sans-serif;font-weight:800;cursor:pointer">ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø©</button>
                    <button id="_close-btn" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer">âœ• Ø¥ØºÙ„Ø§Ù‚</button>
                </div>
            </div>
            <iframe id="_print-frame" src="${blobUrl}" style="flex:1;border:none;width:100%"></iframe>`;
        document.body.appendChild(overlay);

        document.getElementById('_print-btn').onclick = () => {
            document.getElementById('_print-frame').contentWindow?.print();
        };
        document.getElementById('_close-btn').onclick = () => {
            overlay.remove();
            URL.revokeObjectURL(blobUrl);
        };
    } else {
        setTimeout(() => {
            try { printWin.print(); } catch(e) {}
            setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        }, 700);
    }
}

// â•â• Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª â•â•
let allVisitsDocs = [];
let _visitsUnsub  = null;

function cleanupVisitsListeners() {
    if(_visitsUnsub) { try { _visitsUnsub(); } catch(e) {} _visitsUnsub = null; }
}

function loadTechVisitsLive() {
    var tbody = document.getElementById('tech-visits-tbody');
    var schoolId = getActiveSchoolId();
    var q = query(collection(db,'technical_visits'), where('schoolId','==',schoolId));

    cleanupVisitsListeners();
    _visitsUnsub = onSnapshot(q, snap => {
        allVisitsDocs = [];
        snap.forEach(d => allVisitsDocs.push({ id:d.id, ...d.data() }));
        allVisitsDocs.sort((a,b) => (b.date||'').localeCompare(a.date||''));
        window.filterVisitsArchive();
    });
}

window.filterVisitsArchive = function() {
    var tbody   = document.getElementById('tech-visits-tbody');
    var subject = document.getElementById('archive-filter-subject')?.value || '';
    var search  = (document.getElementById('archive-search')?.value || '').toLowerCase();

    var filtered = allVisitsDocs.filter(d => {
        var matchSubject = !subject || d.subject === subject;
        var matchSearch  = !search  || (d.teacherName||'').toLowerCase().includes(search);
        return matchSubject && matchSearch;
    });

    if(!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--mid)">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø²ÙŠØ§Ø±Ø§Øª Ù…Ø³Ø¬Ù„Ø©</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(data => {
        var color = RATING_COLORS[data.overallRating] || '#6b7280';
        return `<tr style="border-bottom:1px solid var(--line)">
            <td style="padding:10px 12px;font-weight:700">${data.teacherName||'â€”'}</td>
            <td style="padding:10px 12px">${data.subject||'â€”'}</td>
            <td style="padding:10px 12px">${data.classRoom||'â€”'}</td>
            <td style="padding:10px 12px">${data.visitorName||'â€”'}</td>
            <td style="padding:10px 12px;text-align:center">
                <span class="archive-badge" style="background:${color}">${data.overallRating||'â€”'}</span>
            </td>
            <td style="padding:10px 12px;color:var(--mid)">${data.date||'â€”'}</td>
            <td style="padding:10px 12px;text-align:center">
                <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
                    <button onclick='window.showVisitDetails(${JSON.stringify(data).replace(/'/g,"&apos;")})'
                        style="background:var(--sky);color:#fff;border:none;border-radius:6px;
                        padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">
                        Ø¹Ø±Ø¶
                    </button>
                    <button onclick='window.printOfficialVisitForm(${JSON.stringify({
                        teacherName: data.teacherName,
                        lessonTopic: data.lessonTopic||"",
                        subject: data.subject,
                        classRoom: data.classRoom||"",
                        period: data.period||"",
                        visitorName: data.visitorName||"",
                        semester: data.semester||"",
                        notes: data.notes||"",
                        visitDate: data.date||"",
                        criteriaResults: data.criteria||[]
                    }).replace(/'/g,"&apos;")})'
                        style="background:var(--red);color:#fff;border:none;border-radius:6px;
                        padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">
                        ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø©
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

// â•â• ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø²ÙŠØ§Ø±Ø© â•â•
window.showVisitDetails = function(data) {
    var existing = document.getElementById('visit-detail-modal');
    if(existing) existing.remove();

    var criteriaHTML = (data.criteria||[]).map((c,i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
            padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px">
            <span style="font-weight:600;color:#374151">${i+1}. ${c.item}</span>
            <span style="font-weight:800;color:${RATING_COLORS[c.rating]||'#6b7280'};
                padding:2px 10px;border-radius:8px;background:${RATING_COLORS[c.rating]||'#6b7280'}22">
                ${c.rating}
            </span>
        </div>`).join('');

    var modal = document.createElement('div');
    modal.id = 'visit-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:580px;width:100%;
        max-height:85vh;overflow-y:auto;direction:rtl;font-family:'Cairo',sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:15px;font-weight:900;color:#0b2545;margin:0">
                ðŸ“‹ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø§Ù„ÙÙ†ÙŠØ©
            </h3>
            <button onclick="document.getElementById('visit-detail-modal').remove()"
                style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">âœ•</button>
        </div>
        <div style="background:#f8f9fc;border-radius:10px;padding:14px;margin-bottom:14px;font-size:13px;line-height:2">
            <div>ðŸ‘¤ <b>Ø§Ù„Ù…Ø¹Ù„Ù…:</b> ${data.teacherName||'â€”'}</div>
            <div>ðŸ“š <b>Ø§Ù„Ù…Ø§Ø¯Ø©:</b> ${data.subject||'â€”'} | <b>Ø§Ù„ØµÙ:</b> ${data.classRoom||'â€”'} | <b>Ø§Ù„Ø­ØµØ©:</b> ${data.period||'â€”'}</div>
            <div>ðŸ“ <b>Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ø±Ø³:</b> ${data.lessonTopic||'â€”'}</div>
            <div>ðŸ§‘â€ðŸ’¼ <b>Ø§Ù„Ù…ÙˆØ¬Ù‡:</b> ${data.visitorName||'â€”'}</div>
            <div>ðŸ“… <b>Ø§Ù„ØªØ§Ø±ÙŠØ®:</b> ${data.date||'â€”'}</div>
            <div>â­ <b>Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø¹Ø§Ù…:</b>
                <span style="color:${RATING_COLORS[data.overallRating]||'#6b7280'};font-weight:800">
                    ${data.overallRating||'â€”'}
                </span>
                | âœ… Ù…Ù…ØªØ§Ø²: ${data.excellentCount||0} | ðŸŸ¡ Ø¬ÙŠØ¯: ${data.goodCount||0} | ðŸ”´ ÙŠØ­ØªØ§Ø¬ ØªØ·ÙˆÙŠØ±: ${data.weakCount||0}
            </div>
        </div>
        <div style="margin-bottom:14px">
            <div style="font-weight:800;font-size:13px;color:#0b2545;margin-bottom:8px">
                ðŸ“Š Ø¨Ù†ÙˆØ¯ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… (${(data.criteria||[]).length})
            </div>
            ${criteriaHTML}
        </div>
        ${data.notes?`<div style="background:#eaf4fd;border-radius:8px;padding:12px;font-size:13px;color:#0b2545">
            <b>ðŸ’¬ Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…ÙˆØ¬Ù‡:</b><br>${data.notes}</div>`:''}
        <div style="display:flex;gap:8px;margin-top:16px">
            <button onclick='window.printOfficialVisitForm(${JSON.stringify({
                teacherName: data.teacherName||"",
                lessonTopic: data.lessonTopic||"",
                subject: data.subject||"",
                classRoom: data.classRoom||"",
                period: data.period||"",
                visitorName: data.visitorName||"",
                semester: data.semester||"",
                notes: data.notes||"",
                visitDate: data.date||"",
                criteriaResults: data.criteria||[]
            }).replace(/'/g,"&apos;")})'
                style="flex:1;padding:11px;background:var(--red);color:#fff;border:none;
                border-radius:8px;font-family:'Cairo',sans-serif;font-weight:700;cursor:pointer">
                ðŸ–¨ï¸ Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø±Ø³Ù…ÙŠ
            </button>
            <button onclick="document.getElementById('visit-detail-modal').remove()"
                style="flex:1;padding:11px;background:#f0f4f8;color:var(--mid);border:none;
                border-radius:8px;font-family:'Cairo',sans-serif;font-weight:700;cursor:pointer">
                Ø¥ØºÙ„Ø§Ù‚
            </button>
        </div>
    </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
};

// â•â• ØªØµØ¯ÙŠØ± PDF Ø§Ù„Ø£Ø±Ø´ÙŠÙ â•â•
window.printVisitsPDF = async function() {
    if(!allVisitsDocs.length) {
        window.showToast('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±','warning'); return;
    }
    var contentHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
            <tr style="background:#0b2545;color:#fff">
                <th style="padding:8px">Ø§Ù„Ù…Ø¹Ù„Ù…</th>
                <th style="padding:8px">Ø§Ù„Ù…Ø§Ø¯Ø©</th>
                <th style="padding:8px">Ø§Ù„ØµÙ</th>
                <th style="padding:8px">Ø§Ù„Ù…ÙˆØ¬Ù‡</th>
                <th style="padding:8px">Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</th>
                <th style="padding:8px">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
            </tr>
        </thead>
        <tbody>
            ${allVisitsDocs.map(d=>`<tr>
                <td style="padding:7px;border-bottom:1px solid #eee;font-weight:700">${d.teacherName||'â€”'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee">${d.subject||'â€”'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee">${d.classRoom||'â€”'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee">${d.visitorName||'â€”'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee;font-weight:800;color:${RATING_COLORS[d.overallRating]||'#000'}">${d.overallRating||'â€”'}</td>
                <td style="padding:7px;border-bottom:1px solid #eee;color:#666">${d.date||'â€”'}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
    if(window.ManzoumaReport?.exportPDF) {
        await window.ManzoumaReport.exportPDF(contentHTML,'Ø³Ø¬Ù„_Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª_Ø§Ù„ÙÙ†ÙŠØ©','Ø³Ø¬Ù„ Ø§Ù„Ø²ÙŠØ§Ø±Ø§Øª Ø§Ù„ÙÙ†ÙŠØ© Ø§Ù„ØµÙÙŠØ©','Ù…ØªÙˆØ³Ø·Ø© Ø³Ø§Ù„Ù… Ø§Ù„Ø­Ø³ÙŠÙ†Ø§Ù†');
    }
};
