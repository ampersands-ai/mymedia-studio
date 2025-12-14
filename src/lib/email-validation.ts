/**
 * Email Validation Utilities (Frontend)
 * - Disposable email detection
 * - Gmail dot normalization
 */

// Common disposable email domains (comprehensive list)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Most common temporary email services
  '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.org',
  'mailinator.com', 'maildrop.cc', 'tempmail.com', 'tempmail.net', 'temp-mail.org',
  'throwaway.email', 'trashmail.com', 'trashmail.net', 'fakeinbox.com',
  'getnada.com', 'mohmal.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'spam4.me',
  'emailondeck.com', 'dispostable.com', 'mailcatch.com', 'mailslurp.com',
  'mintemail.com', 'mytemp.email', 'tempinbox.com', 'tempr.email',
  'throwawaymail.com', 'tmpmail.org', 'tmpmail.net', 'getairmail.com',
  'burnermail.io', 'mailsac.com', 'mailnesia.com', 'spamgourmet.com',
  'fakemailgenerator.com', '33mail.com', 'emailfake.com', 'crazymailing.com',
  'tempmailaddress.com', 'dropmail.me', 'mailforspam.com', 'spambox.us',
  'bobmail.info', 'clipmail.eu', 'discard.email', 'emailsensei.com',
  'emkei.cz', 'fakeinbox.net', 'fakemail.fr', 'filzmail.com',
  'inboxalias.com', 'jetable.org', 'kasmail.com', 'klassmaster.com',
  'mailexpire.com', 'mailnull.com', 'mailzilla.org', 'meltmail.com',
  'mezimages.net', 'mintemail.com', 'mt2015.com', 'nobulk.com',
  'nospam.ze.tc', 'notsharingmy.info', 'nowmymail.com', 'ownmail.net',
  'pookmail.com', 'proxymail.eu', 'putthisinyourspamdatabase.com',
  'rychl.email', 'safetymail.info', 'sendspamhere.com', 'shortmail.net',
  'sneakemail.com', 'sofort-mail.de', 'sogetthis.com', 'spam.la',
  'spamavert.com', 'spamcero.com', 'spamcon.org', 'spamday.com',
  'spamex.com', 'spamfighter.cf', 'spamfree.eu', 'spamfree24.com',
  'spamfree24.de', 'spamfree24.eu', 'spamfree24.info', 'spamfree24.net',
  'spamfree24.org', 'spamgoes.in', 'spamherelots.com', 'spamhole.com',
  'spamify.com', 'spaminator.de', 'spamkill.info', 'spaml.com',
  'spaml.de', 'spamlot.net', 'spammotel.com', 'spamobox.com',
  'spamslicer.com', 'spamspot.com', 'spamthis.co.uk', 'spamtroll.net',
  'super-auswahl.de', 'supergreatmail.com', 'superstachel.de',
  'teleworm.us', 'temp.emeraldwebmail.com', 'tempemail.biz', 'tempemail.co.za',
  'tempinbox.co.uk', 'temporaryemail.net', 'temporaryinbox.com',
  'thanksnospam.info', 'thismail.net', 'trash2009.com', 'trash2010.com',
  'trash2011.com', 'trashymail.com', 'trbvm.com', 'twinmail.de',
  'tyldd.com', 'uggsrock.com', 'upliftnow.com', 'webm4il.info',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'willselfdestruct.com',
  'winemaven.info', 'wronghead.com', 'xagloo.com', 'xemaps.com',
  'xents.com', 'xmaily.com', 'xoxy.net', 'yep.it', 'yuurok.com',
  'zehnminutenmail.de', 'zippymail.info', 'zoemail.org',
  // Additional common ones
  'mailnator.com', 'maildrop.io', 'tempmailbox.net', 'discard.email',
  'anonymbox.com', 'fakemail.net', 'mailscrap.com', 'mailtemp.net',
  'mail-temp.com', 'mytempemail.com', 'trashemail.de', 'emailisvalid.com',
  // Newer services
  'duck.com', 'relay.firefox.com', 'privaterelay.appleid.com',
]);

// Gmail and Google-related domains where dot normalization applies
const GMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
]);

/**
 * Checks if an email domain is a known disposable/temporary email service
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Normalizes Gmail addresses by removing dots from the local part.
 * Gmail ignores dots in the username portion, so:
 * - ppoli1290@gmail.com
 * - pp.oli1290@gmail.com
 * - p.p.o.l.i.1.2.9.0@gmail.com
 * All resolve to the same mailbox.
 * 
 * For non-Gmail domains, returns the email unchanged.
 */
export function normalizeGmailDots(email: string): string {
  const [localPart, domain] = email.toLowerCase().split('@');
  if (!localPart || !domain) return email.toLowerCase();
  
  // Only normalize for Gmail domains
  if (GMAIL_DOMAINS.has(domain)) {
    // Remove all dots from local part
    // Also handle + aliases (everything after + is ignored by Gmail)
    const normalizedLocal = localPart.split('+')[0].replace(/\./g, '');
    return `${normalizedLocal}@${domain}`;
  }
  
  return email.toLowerCase();
}

/**
 * Gets the canonical email for duplicate detection.
 * This is used during signup to prevent duplicate registrations with Gmail dot tricks.
 */
export function getCanonicalEmail(email: string): string {
  return normalizeGmailDots(email.toLowerCase().trim());
}

/**
 * Validates an email and returns any validation errors
 */
export function validateEmailAdvanced(email: string): { valid: boolean; error?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check basic format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check for disposable email
  if (isDisposableEmail(normalizedEmail)) {
    return { valid: false, error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.' };
  }
  
  return { valid: true };
}
