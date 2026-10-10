/**
 * Universal utility for cleaning, sanitizing, and formatting modem credentials.
 * Ensures passwords have NO dots, NO bullets, NO trailing punctuation,
 * while preserving the exact characters and case ("copie igual sem alteracao e sem pontos na senha").
 */

export function cleanModemPassword(raw: string | undefined | null): string {
  if (!raw) return 'admin';
  let pass = String(raw).trim();

  // Remove wrapping quotes or brackets: "pass", 'pass', [pass]
  pass = pass.replace(/^["'`([{<]+|["'`)\]}>]+$/g, '');

  // Strip label prefixes: "senha:", "password:", "pass:", "pwd:", "chave:"
  pass = pass.replace(/^(?:senha|password|pass|pwd|chave|key)\s*[:=-]?\s*/i, '');

  // Remove all dots/periods and bullet points completely ("sem pontos na senha")
  pass = pass.replace(/[•.·…]+/g, '');

  // Remove trailing and leading punctuation (periods, commas, colons, semicolons, exclamation, etc.)
  pass = pass.replace(/^[.,:;!?_~^`-]+|[.,:;!?_~^`-]+$/g, '');

  return pass.trim() || 'admin';
}

export function cleanModemUser(raw: string | undefined | null, knownPassword?: string): string {
  if (!raw) return 'admin';
  let user = String(raw).trim();

  // If user contains tab, newline, or separator, take only first part
  if (user.includes('\t')) user = user.split('\t')[0].trim();
  if (user.includes('\n')) user = user.split('\n')[0].trim();

  // Remove wrapping quotes or brackets
  user = user.replace(/^["'`([{<]+|["'`)\]}>]+$/g, '');

  // Strip label prefixes: "usuario:", "user:", "login:", "username:"
  user = user.replace(/^(?:usuario|usuário|user|login|username)\s*[:=-]?\s*/i, '');

  // If known password is provided, remove it from username if present
  if (knownPassword) {
    const p = String(knownPassword).trim();
    if (p && user.includes(p)) {
      user = user.replace(p, '').trim();
    }
  }

  // If user contains spaces (e.g. "admin 123456" in Chrome), take the first token
  if (user.includes(' ')) {
    const tokens = user.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      user = tokens[0].trim();
    }
  }

  // Remove trailing and leading punctuation
  user = user.replace(/^[.,:;!?_~^`-]+|[.,:;!?_~^`-]+$/g, '');

  return user.trim() || 'admin';
}

/**
 * Splits combined clipboard text (user + password) into separate clean components.
 * Supports \t (tab), \n (newline), : (colon), space, or prefix matching.
 */
export function splitCredentials(raw: string, defaultUser: string = 'admin', defaultPass: string = 'admin'): { user: string; pass: string } {
  if (!raw) {
    return { user: cleanModemUser(defaultUser, defaultPass), pass: cleanModemPassword(defaultPass) };
  }

  const str = String(raw).trim();
  const cleanP = cleanModemPassword(defaultPass);
  const cleanU = cleanModemUser(defaultUser, defaultPass);

  let user = '';
  let pass = '';

  if (str.includes('\t')) {
    const parts = str.split('\t');
    user = parts[0]?.trim() || '';
    pass = parts.slice(1).join('\t').trim();
  } else if (str.includes('\n')) {
    const parts = str.split('\n');
    user = parts[0]?.trim() || '';
    pass = parts.slice(1).join('\n').trim();
  } else if (str.includes(':') && !str.startsWith('http')) {
    const parts = str.split(':');
    user = parts[0]?.trim() || '';
    pass = parts.slice(1).join(':').trim();
  } else if (cleanP && str.endsWith(cleanP) && str.length > cleanP.length) {
    user = str.slice(0, str.length - cleanP.length).trim();
    pass = cleanP;
  } else if (cleanP && str.includes(cleanP) && str.length > cleanP.length) {
    user = str.replace(cleanP, '').trim();
    pass = cleanP;
  } else if (cleanU && str.toLowerCase().startsWith(cleanU.toLowerCase()) && str.length > cleanU.length) {
    user = cleanU;
    pass = str.slice(cleanU.length).trim();
  } else if (str.includes(' ')) {
    const parts = str.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      user = parts[0];
      pass = parts.slice(1).join(' ');
    } else {
      user = str;
    }
  } else {
    user = str;
  }

  // Ensure password is NEVER part of username
  if (pass && user.includes(pass)) {
    user = user.replace(pass, '').trim();
  }
  if (cleanP && user.includes(cleanP)) {
    user = user.replace(cleanP, '').trim();
  }

  return {
    user: cleanModemUser(user || defaultUser, pass || defaultPass),
    pass: cleanModemPassword(pass || defaultPass),
  };
}

/**
 * Triggers Google Chrome native Credential Manager / Touch-to-Fill bottom sheet
 * ("Usar a senha salva?"). When user taps "Continuar", returns the saved credentials.
 */
export async function triggerChromeCredentialPrompt(): Promise<{ user?: string; pass?: string } | null> {
  if (typeof window === 'undefined' || !navigator.credentials) return null;
  try {
    if (typeof navigator.credentials.get === 'function') {
      const cred: any = await navigator.credentials.get({
        password: true,
        mediation: 'optional',
      } as any);
      if (cred) {
        return {
          user: cred.id || cred.name || undefined,
          pass: cred.password || undefined,
        };
      }
    }
  } catch (err) {
    // Non-fatal: dismissed or not saved
    console.debug('Chrome credential prompt error:', err);
  }
  return null;
}

/**
 * Stores credentials into Chrome's Password Manager so Chrome
 * can suggest and auto-fill them via Google Password Manager on next visits.
 */
export async function storeChromeCredential(user: string, pass: string, name?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.credentials) return false;
  try {
    if ((window as any).PasswordCredential && typeof navigator.credentials.store === 'function') {
      const cred = new (window as any).PasswordCredential({
        id: cleanModemUser(user),
        password: cleanModemPassword(pass),
        name: name || 'Roteador Admin',
      });
      await navigator.credentials.store(cred);
      return true;
    }
  } catch (err) {
    console.debug('Chrome credential store error:', err);
  }
  return false;
}

/**
 * Detects whether the current browser is Google Chrome, Safari, or another browser.
 */
export function detectBrowserType(): 'chrome' | 'safari' | 'other' {
  if (typeof navigator === 'undefined') return 'chrome';
  const ua = navigator.userAgent.toLowerCase();
  // Chrome on iOS contains 'crios', Chrome on Android/Desktop contains 'chrome'
  const isChrome = (ua.includes('chrome') || ua.includes('crios')) && !ua.includes('edg') && !ua.includes('opr');
  if (isChrome) return 'chrome';
  const isSafari = (ua.includes('safari') || ua.includes('iphone') || ua.includes('ipad')) && !ua.includes('chrome') && !ua.includes('crios');
  if (isSafari) return 'safari';
  return 'other';
}

/**
 * Generates a one-touch Bookmarklet script to auto-fill router credentials
 * on Chrome (mobile and desktop) even before saving in Google Password Manager.
 */
export function generateRouterBookmarklet(user: string, pass: string): string {
  const cleanU = cleanModemUser(user, pass);
  const cleanP = cleanModemPassword(pass);
  return `javascript:(function(){var u=${JSON.stringify(cleanU)},p=${JSON.stringify(cleanP)};function setVal(el,v){if(!el)return false;try{el.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');if(s&&s.set){s.set.call(el,v);}else{el.value=v;}el.dispatchEvent(new Event('input',{bubbles:true,cancelable:true}));el.dispatchEvent(new Event('change',{bubbles:true,cancelable:true}));el.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,cancelable:true,key:v.slice(-1)}));el.blur();return true;}catch(e){el.value=v;return true;}}var uIn=document.querySelector('input[type="text"]:not([style*="display: none"]),input[name*="user" i],input[name*="login" i],input[id*="user" i],input[id*="login" i],#username,#login,#txt_Username');var pIn=document.querySelector('input[type="password"],input[name*="pass" i],input[name*="pwd" i],input[id*="pass" i],input[id*="pwd" i],#password,#txt_Password');if(uIn)setVal(uIn,u);if(pIn)setVal(pIn,p);var b=document.createElement('div');b.style='position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#15803d;color:#fff;padding:12px 20px;border-radius:12px;font-family:sans-serif;font-size:14px;font-weight:bold;z-index:9999999;box-shadow:0 8px 30px rgba(0,0,0,0.3);';b.innerText='✓ Login e Senha preenchidos com sucesso!';document.body.appendChild(b);setTimeout(function(){b.remove();},3500);})();`;
}

