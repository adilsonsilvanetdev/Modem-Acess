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

export function cleanModemUser(raw: string | undefined | null): string {
  if (!raw) return 'admin';
  let user = String(raw).trim();

  // Remove wrapping quotes or brackets
  user = user.replace(/^["'`([{<]+|["'`)\]}>]+$/g, '');

  // Strip label prefixes: "usuario:", "user:", "login:", "username:"
  user = user.replace(/^(?:usuario|usuário|user|login|username)\s*[:=-]?\s*/i, '');

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
    return { user: cleanModemUser(defaultUser), pass: cleanModemPassword(defaultPass) };
  }

  const str = String(raw).trim();
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
  } else {
    const normUser = cleanModemUser(defaultUser);
    if (normUser && str.toLowerCase().startsWith(normUser.toLowerCase()) && str.length > normUser.length) {
      user = normUser;
      pass = str.slice(normUser.length).trim();
    } else if (str.includes(' ') && !str.includes('\t')) {
      const parts = str.split(/\s+/);
      if (parts.length >= 2) {
        user = parts[0];
        pass = parts.slice(1).join(' ');
      } else {
        user = str;
      }
    } else {
      user = str;
    }
  }

  return {
    user: cleanModemUser(user || defaultUser),
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
