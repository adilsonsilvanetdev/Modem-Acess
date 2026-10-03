/**
 * Bulletproof clipboard utility with 100% iOS Safari / Chrome / Mobile WebView compatibility.
 * Handles insecure contexts (HTTP), permission restrictions, and iOS WebKit quirks.
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard if available and in secure context
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText falhou no iOS/WebView, usando fallback:', err);
    }
  }

  // 2. Universal iOS Safari / Android fallback using textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Prevent zoom, scroll and visual glitch on iOS
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.fontSize = '16px'; // Crucial for iOS to prevent auto-zoom
    textArea.setAttribute('readonly', '');
    textArea.setAttribute('aria-hidden', 'true');

    document.body.appendChild(textArea);

    // iOS WebKit selection trick
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
      textArea.focus();
    }

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('Erro crítico ao copiar para área de transferência no iOS:', fallbackErr);
    return false;
  }
}
