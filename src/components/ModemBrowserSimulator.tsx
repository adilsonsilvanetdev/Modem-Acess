import React, { useState, useEffect } from 'react';
import {
  Globe,
  Lock,
  RotateCw,
  ExternalLink,
  Wifi,
  Shield,
  Smartphone,
  Tv,
  Laptop,
  Gamepad2,
  Cpu,
  Power,
  Activity,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Zap,
  Bookmark,
  AlertTriangle,
  Info,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  User,
} from 'lucide-react';
import { ScannedModem, ConnectedDevice } from '../types';
import { copyToClipboardSafe } from '../utils/clipboard';

interface ModemBrowserSimulatorProps {
  modem: ScannedModem;
  onUpdateModem?: (updated: ScannedModem) => void;
  onFinishAccess?: () => void;
}

interface BrandTheme {
  name: string;
  badgeBg: string;
  accentText: string;
  headerBar: string;
  themeTitle: string;
}

const getBrandTheme = (brand: string): BrandTheme => {
  const b = (brand || '').toLowerCase();
  if (b.includes('intelbras')) {
    return {
      name: 'Intelbras',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      accentText: 'text-emerald-700',
      headerBar: 'bg-emerald-700 text-white',
      themeTitle: 'Interface Intelbras RouterOS / Wi-Fi',
    };
  }
  if (b.includes('tp-link') || b.includes('tplink')) {
    return {
      name: 'TP-Link',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-300',
      accentText: 'text-teal-700',
      headerBar: 'bg-teal-700 text-white',
      themeTitle: 'TP-Link Tether Web Gateway',
    };
  }
  if (b.includes('huawei')) {
    return {
      name: 'Huawei',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
      accentText: 'text-rose-700',
      headerBar: 'bg-slate-950 text-white border-b-2 border-rose-600',
      themeTitle: 'Huawei EchoLife GPON Terminal',
    };
  }
  if (b.includes('zte')) {
    return {
      name: 'ZTE',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-300',
      accentText: 'text-blue-700',
      headerBar: 'bg-blue-800 text-white',
      themeTitle: 'ZTE ZXHN Broadband Gateway',
    };
  }
  if (b.includes('vivo') || b.includes('mitrastar') || b.includes('askey')) {
    return {
      name: 'Vivo Fibra',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-300',
      accentText: 'text-purple-700',
      headerBar: 'bg-purple-900 text-white',
      themeTitle: 'Vivo Smart Wi-Fi / MitraStar HGU',
    };
  }
  if (b.includes('claro') || b.includes('net') || b.includes('humax') || b.includes('sagemcom')) {
    return {
      name: 'Claro Fibra',
      badgeBg: 'bg-red-50 text-red-800 border-red-300',
      accentText: 'text-red-700',
      headerBar: 'bg-red-700 text-white',
      themeTitle: 'Claro Gateway Residencial Docsis/GPON',
    };
  }
  if (b.includes('d-link') || b.includes('dlink')) {
    return {
      name: 'D-Link',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
      accentText: 'text-amber-700',
      headerBar: 'bg-amber-700 text-white',
      themeTitle: 'D-Link Router Web Setup',
    };
  }
  return {
    name: brand || 'Roteador',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    accentText: 'text-red-700',
    headerBar: 'bg-slate-900 text-white',
    themeTitle: `${brand || 'Modem'} Web Console`,
  };
};

export const ModemBrowserSimulator: React.FC<ModemBrowserSimulatorProps> = ({
  modem,
  onUpdateModem,
  onFinishAccess,
}) => {
  const brandTheme = getBrandTheme(modem.brand);

  // Browser States
  const [currentUrl, setCurrentUrl] = useState<string>(`http://${modem.ip}/`);
  const [authStep, setAuthStep] = useState<'idle' | 'typing_user' | 'typing_pass' | 'submitting' | 'logged_in'>('idle');
  const [typedUser, setTypedUser] = useState<string>('');
  const [typedPass, setTypedPass] = useState<string>('');
  const [isCopiedBoth, setIsCopiedBoth] = useState<boolean>(false);
  const [isCopiedPass, setIsCopiedPass] = useState<boolean>(false);
  const [isCopiedUser, setIsCopiedUser] = useState<boolean>(false);
  const [isCopiedBookmarklet, setIsCopiedBookmarklet] = useState<boolean>(false);
  const [showPass, setShowPass] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wifi' | 'devices' | 'tools'>('dashboard');

  // Router interactive state
  const [wifiSsid, setWifiSsid] = useState<string>(modem.wifiSsid || `${modem.brand.split(' ')[0]}_Home_5G`);
  const [wifiPass, setWifiPass] = useState<string>(modem.wifiPassword || 'wifi123456');
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [isRebooting, setIsRebooting] = useState<boolean>(false);
  const [rebootProgress, setRebootProgress] = useState<number>(0);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [showHelperModal, setShowHelperModal] = useState<boolean>(false);

  // Connected Devices Mock
  const [devices, setDevices] = useState<ConnectedDevice[]>([
    {
      id: 'dev-1',
      name: 'iPhone 15 Pro Max',
      ip: `${modem.ip.split('.').slice(0, 3).join('.')}.102`,
      mac: '4A:2B:1C:89:FE:12',
      type: 'phone',
      band: '5GHz',
      signal: 92,
      downloadSpeed: '184 Mbps',
      uploadSpeed: '42 Mbps',
    },
    {
      id: 'dev-2',
      name: 'Samsung Smart TV QLED 4K',
      ip: `${modem.ip.split('.').slice(0, 3).join('.')}.105`,
      mac: '88:75:56:B2:A1:99',
      type: 'tv',
      band: '5GHz',
      signal: 85,
      downloadSpeed: '28 Mbps',
      uploadSpeed: '2 Mbps',
    },
    {
      id: 'dev-3',
      name: 'Notebook Dell XPS 15',
      ip: `${modem.ip.split('.').slice(0, 3).join('.')}.110`,
      mac: 'BC:D0:74:11:44:8A',
      type: 'pc',
      band: 'Ethernet',
      signal: 100,
      downloadSpeed: '450 Mbps',
      uploadSpeed: '290 Mbps',
    },
    {
      id: 'dev-4',
      name: 'PlayStation 5 Console',
      ip: `${modem.ip.split('.').slice(0, 3).join('.')}.115`,
      mac: '00:D9:D1:55:EE:71',
      type: 'console',
      band: '5GHz',
      signal: 78,
      downloadSpeed: '82 Mbps',
      uploadSpeed: '19 Mbps',
    },
    {
      id: 'dev-5',
      name: 'Echo Dot Alexa Quarto',
      ip: `${modem.ip.split('.').slice(0, 3).join('.')}.120`,
      mac: 'CC:B8:A8:90:31:02',
      type: 'iot',
      band: '2.4GHz',
      signal: 65,
      downloadSpeed: '4 Mbps',
      uploadSpeed: '1 Mbps',
    },
  ]);

  // Automated Typing & Login Sequence Effect inside App Simulator
  const triggerAutoLogin = () => {
    setAuthStep('typing_user');
    setTypedUser('');
    setTypedPass('');

    // Step 1: Type Username
    let userCharIndex = 0;
    const targetUser = modem.username;
    const userInterval = setInterval(() => {
      if (userCharIndex <= targetUser.length) {
        setTypedUser(targetUser.slice(0, userCharIndex));
        userCharIndex++;
      } else {
        clearInterval(userInterval);
        setAuthStep('typing_pass');

        // Step 2: Type Password
        let passCharIndex = 0;
        const targetPass = modem.password;
        const passInterval = setInterval(() => {
          if (passCharIndex <= targetPass.length) {
            setTypedPass(targetPass.slice(0, passCharIndex));
            passCharIndex++;
          } else {
            clearInterval(passInterval);
            setAuthStep('submitting');

            // Step 3: Click Submit / Enter
            setTimeout(() => {
              setAuthStep('logged_in');
              setCurrentUrl(`http://${modem.ip}/main_dashboard.asp`);
            }, 800);
          }
        }, 60);
      }
    }, 50);
  };

  useEffect(() => {
    setCurrentUrl(`http://${modem.ip}/`);
    setWifiSsid(modem.wifiSsid || (modem.brand ? `${modem.brand} Wi-Fi` : 'Rede Wi-Fi'));
    setWifiPass(modem.wifiPassword || '');
    const subnet = modem.ip.split('.').slice(0, 3).join('.');
    setDevices((prev) =>
      prev.map((d, i) => ({
        ...d,
        ip: `${subnet}.${102 + i * 4}`,
      }))
    );
    triggerAutoLogin();
  }, [modem.id, modem.ip, modem.username, modem.password, modem.wifiSsid, modem.wifiPassword, modem.brand]);

  // Copy to clipboard helper with iOS Safari fallback
  const copyText = async (text: string, type: 'pass' | 'user' | 'both' | 'bookmarklet') => {
    await copyToClipboardSafe(text);
    if (type === 'pass') {
      setIsCopiedPass(true);
      setTimeout(() => setIsCopiedPass(false), 2200);
    } else if (type === 'user') {
      setIsCopiedUser(true);
      setTimeout(() => setIsCopiedUser(false), 2200);
    } else if (type === 'both') {
      setIsCopiedBoth(true);
      setTimeout(() => setIsCopiedBoth(false), 2200);
    } else {
      setIsCopiedBookmarklet(true);
      setTimeout(() => setIsCopiedBookmarklet(false), 2200);
    }
  };

  // Open in Real External Native Browser (Chrome/Safari)
  const openInExternalBrowser = async (forceNoCache: boolean = false) => {
    const rawIp = modem.ip.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    const target = forceNoCache ? `http://${rawIp}/?_nocache=${Date.now()}` : `http://${rawIp}/`;

    // Auto copy login + password together (como era na versão anterior)
    await copyToClipboardSafe(`${modem.username}\n${modem.password}`);
    setIsCopiedBoth(true);
    setTimeout(() => setIsCopiedBoth(false), 3000);

    window.open(target, '_blank');
  };

  // Bulletproof Universal Auto-Fill Script for any router/modem
  const bookmarkletCode = `javascript:(function(){
  var u = ${JSON.stringify(modem.username)};
  var p = ${JSON.stringify(modem.password)};
  
  function getDocs() {
    var docs = [document];
    try {
      var frames = document.querySelectorAll('iframe, frame');
      for (var i = 0; i < frames.length; i++) {
        try {
          var d = frames[i].contentDocument || frames[i].contentWindow.document;
          if (d) docs.push(d);
        } catch(e) {}
      }
    } catch(e) {}
    return docs;
  }

  function setVal(el, val) {
    if (!el) return false;
    try {
      el.focus();
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (setter && setter.set) {
        setter.set.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: val.slice(-1) }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: val.slice(-1) }));
      el.blur();
      return true;
    } catch(e) {
      el.value = val;
      return true;
    }
  }

  var filledUser = false;
  var filledPass = false;
  var allDocs = getDocs();

  for (var i = 0; i < allDocs.length; i++) {
    var doc = allDocs[i];
    
    // 1. Password field (TP-Link, Huawei, Intelbras, ZTE, Vivo, Claro, D-Link, etc.)
    var pInput = doc.querySelector('input[type="password"]') ||
                 doc.querySelector('input[name*="pass" i], input[id*="pass" i], input[name*="pwd" i], input[id*="pwd" i], #txt_Password, #Frm_Password, #pc-login-password, #login-password, #loginPassword, #password, #pass, #pwd');
    if (pInput && !filledPass) {
      filledPass = setVal(pInput, p);
    }

    // 2. Username field (some routers only ask for password)
    var uInput = doc.querySelector('input[type="text"]:not([style*="display: none"]):not([type="hidden"]), input[name*="user" i], input[id*="user" i], input[name*="login" i], input[id*="login" i], #txt_Username, #Frm_Username, #username, #user, #admin_user, #login_username, #login_user');
    if (uInput && !filledUser) {
      filledUser = setVal(uInput, u);
    }

    // 3. Auto click Login / Submit button
    var btn = doc.querySelector('button[type="submit"], input[type="submit"], #login_btn, #login-btn, #sub_btn, #submit, #loginBtn, #btn_login, .login-btn, .btn-login, #button_login, input[value*="Login" i], input[value*="Entrar" i], button.login-btn, a[id*="login" i]');
    if (btn && (filledPass || filledUser)) {
      setTimeout(function(){
        try { btn.click(); } catch(e){}
      }, 350);
    }
  }

  // Floating notification on router page
  var banner = document.createElement('div');
  banner.style = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#dc2626;color:#ffffff;padding:12px 20px;border-radius:14px;font-family:-apple-system,sans-serif;font-size:13px;font-weight:bold;z-index:9999999;box-shadow:0 8px 30px rgba(0,0,0,0.3);border:2px solid #ef4444;text-align:center;';
  if (filledPass || filledUser) {
    banner.innerHTML = '⚡ ModemScanner: Usuário e Senha preenchidos com sucesso!';
  } else {
    banner.style.background = '#e11d48';
    banner.innerHTML = '⚠️ Campos não encontrados. Cole o usuário ou senha com a barra rápida!';
  }
  document.body.appendChild(banner);
  setTimeout(function(){ banner.remove(); }, 3500);
})();`.replace(/\n\s*/g, '');

  // Simulate Modem Reboot
  const handleReboot = () => {
    setIsRebooting(true);
    setRebootProgress(0);
    const interval = setInterval(() => {
      setRebootProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRebooting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  // Simulate Ping Test
  const handlePingTest = () => {
    setIsPinging(true);
    setPingLatency(null);
    setTimeout(() => {
      const simulatedMs = Math.floor(Math.random() * 8) + 1; // 1-9ms
      setPingLatency(simulatedMs);
      setIsPinging(false);
    }, 900);
  };

  // Toggle device block
  const toggleBlockDevice = (devId: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === devId ? { ...d, blocked: !d.blocked } : d))
    );
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto">
      {/* Real Browser Quick Launch Banner - VISUAL CLARO COM BOTÕES VERMELHOS */}
      <div className="bg-white border-2 border-red-200 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0 shadow-xs">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                  IP: {modem.ip}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  • {modem.brand}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                Acessar Página do Modem
              </h3>
              <p className="text-xs text-slate-600">
                Usuário: <span className="text-red-700 font-mono font-bold">{modem.username}</span> | Senha:{' '}
                <span className="text-red-700 font-mono font-bold">
                  {showPass ? modem.password : '••••••••'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHelperModal(true)}
            className="self-end sm:self-center text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Como preencher no navegador?</span>
          </button>
        </div>

        {/* Primary Action Button in VIBRANT RED & Anti-Cache Button */}
        <div className="pt-1 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => openInExternalBrowser(false)}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-red-600/25 transition-all cursor-pointer active:scale-98"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir no Chrome / Safari</span>
            </button>

            <button
              type="button"
              onClick={() => openInExternalBrowser(true)}
              className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Carrega sem cache se o Chrome estiver mostrando o modem anterior"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Abrir sem Cache</span>
            </button>
          </div>

          {/* Quick Copy Action Bar - Somente UM botão para Copiar Login + Senha */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(`${modem.username}\n${modem.password}`, 'both')}
              className="flex-1 py-3.5 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border-2 border-red-200 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              {isCopiedBoth ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-red-600" />
              )}
              <span>{isCopiedBoth ? 'Login e Senha Copiados Juntos!' : 'Copiar Login + Senha'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              title={showPass ? 'Ocultar Senha' : 'Ver Senha'}
              className="p-3 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Botão Finalizar Acesso e Limpar Dados para Novo Acesso */}
        {onFinishAccess && (
          <button
            type="button"
            onClick={onFinishAccess}
            className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border border-red-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>Finalizar Acesso e Limpar Dados (Novo Acesso)</span>
          </button>
        )}
      </div>

      {/* CLARIFICAÇÃO TÉCNICA E GUIA DE PREENCHIMENTO */}
      <div className="bg-red-50/60 border border-red-200 rounded-3xl p-4 flex flex-col gap-2.5">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Por que o Chrome/Safari não preenche sozinho ao abrir outra aba?
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Por motivo de <strong className="text-slate-900">segurança contra invasões de rede (SOP / PNA)</strong>, os navegadores modernos não permitem que nenhuma página web acesse ou digite diretamente dentro de outra aba em <code className="text-red-700 font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200">{modem.ip}</code>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          <div className="bg-white p-3.5 rounded-2xl border border-red-100 flex flex-col justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-red-600 font-mono block">Opção 1 (Recomendada)</span>
              <p className="text-xs text-slate-800 font-bold mt-0.5">Copiar Separadamente com 1 Toque</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Copia o login e depois a senha individualmente para não misturar os campos.</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => copyText(modem.username, 'user')}
                className="py-2 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
              >
                <Copy className="w-3 h-3" />
                <span>{isCopiedUser ? 'Copiado!' : '1º Usuário'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText(modem.password, 'pass')}
                className="py-2 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
              >
                <Key className="w-3 h-3" />
                <span>{isCopiedPass ? 'Copiada!' : '2º Senha'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-red-100 flex flex-col justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-red-600 font-mono block">Opção 2 (1-Clique)</span>
              <p className="text-xs text-slate-800 font-bold mt-0.5">Script / Bookmarklet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Preenche qualquer roteador colando o comando na barra de endereços do navegador.</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(bookmarkletCode, 'bookmarklet')}
              className="mt-2.5 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isCopiedBookmarklet ? 'Script Copiado!' : 'Copiar Script'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Claro: Janela do Navegador / Simulador Interativo */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-md flex flex-col">
        {/* Barra Superior do Navegador (Estilo Light) */}
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>

          {/* Barra de Endereço URL Clara */}
          <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-400 font-mono text-[11px] select-none">http://</span>
            <span className="text-slate-900 font-mono font-bold text-xs tracking-wide">
              {modem.ip}
            </span>
            <span className="text-slate-500 font-mono text-[11px] truncate">
              {authStep === 'logged_in' ? '/main_dashboard.asp' : '/login.html'}
            </span>
            <span className="ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-bold">
              LAN
            </span>
          </div>

          {/* Botão Reiniciar Auto-Preenchimento em VERMELHO */}
          <button
            type="button"
            onClick={triggerAutoLogin}
            title="Reiniciar Auto-Preenchimento"
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-barra de Status Clara */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {authStep !== 'logged_in' ? (
              <span className="flex items-center gap-1.5 text-red-600 font-bold animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulação: Preenchendo credenciais automaticamente...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Página do Modem Autenticada com Sucesso</span>
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Porta: 80 (HTTP)
          </span>
        </div>

        {/* Viewport Claro do Navegador */}
        <div className="p-4 sm:p-6 min-h-[460px] bg-slate-50/70 flex flex-col">
          {/* STEP 1 & 2: FORMULÁRIO DE LOGIN COM ANIMAÇÃO DE PREENCHIMENTO */}
          {authStep !== 'logged_in' && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full my-auto">
              <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-md relative overflow-hidden">
                {/* Brand Banner */}
                <div className="flex flex-col items-center mb-6">
                  <div className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider mb-2 border ${brandTheme.badgeBg}`}>
                    {brandTheme.name} {modem.model ? `• ${modem.model}` : ''}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight text-center">
                    {brandTheme.themeTitle}
                  </h3>
                  <p className="text-xs text-slate-500 text-center mt-1">
                    Interface e credenciais lidas para este equipamento.
                  </p>
                </div>

                {/* Auto-fill visual indicator */}
                <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium animate-pulse">
                  <Sparkles className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>Preenchendo automaticamente IP, Usuário e Senha...</span>
                </div>

                {/* Login Inputs em Tema Claro */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nome de Usuário / Login
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={typedUser}
                        placeholder="admin"
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 transition-all outline-none ${
                          authStep === 'typing_user'
                            ? 'border-red-500 ring-2 ring-red-500/20 bg-white font-bold'
                            : 'border-slate-300'
                        }`}
                      />
                      {authStep === 'typing_user' && (
                        <span className="absolute right-3 top-2.5 text-xs text-red-600 font-bold animate-ping">
                          |
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Senha de Gerenciamento Web
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        readOnly
                        value={typedPass}
                        placeholder="••••••••"
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 transition-all outline-none ${
                          authStep === 'typing_pass'
                            ? 'border-red-500 ring-2 ring-red-500/20 bg-white font-bold'
                            : 'border-slate-300'
                        }`}
                      />
                      {authStep === 'typing_pass' && (
                        <span className="absolute right-3 top-2.5 text-xs text-red-600 font-bold animate-ping">
                          |
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submit Button em VERMELHO */}
                  <button
                    type="button"
                    disabled
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      authStep === 'submitting'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[0.98]'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25'
                    }`}
                  >
                    {authStep === 'submitting' ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Autenticando no Modem...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar no Modem</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Gateway IP: {modem.ip} : 80
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAINEL PRINCIPAL DO MODEM (TEMA CLARO COM BOTÕES VERMELHOS) */}
          {authStep === 'logged_in' && (
            <div className="flex-1 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
              {/* Modem Dashboard Header Claro */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono border shadow-2xs ${brandTheme.badgeBg}`}>
                    {brandTheme.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{brandTheme.name} {modem.model}</span>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        ONLINE • {modem.ip}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {brandTheme.themeTitle} • Gateway: {modem.ip}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                  {onFinishAccess && (
                    <button
                      type="button"
                      onClick={onFinishAccess}
                      className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                      title="Finalizar este acesso e limpar os dados"
                    >
                      <RotateCcw className="w-3 h-3 text-red-600" />
                      <span>Sair / Novo</span>
                    </button>
                  )}

                  {/* Dashboard Tabs com Botões em VERMELHO */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'dashboard'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    Painel
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wifi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'wifi'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    Rede Wi-Fi
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('devices')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'devices'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    Aparelhos ({devices.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tools')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'tools'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    Ferramentas
                  </button>
                </div>
              </div>
            </div>

            {/* TAB 1: PAINEL GERAL */}
              {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Link de Internet</span>
                    <span className="text-base font-extrabold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      Conectado (GPON FTTH)
                    </span>
                    <span className="text-xs text-slate-600 font-mono mt-1">
                      Download: 600 Mbps • Upload: 300 Mbps
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Rede Wi-Fi 2.4 & 5 GHz</span>
                    <span className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Wifi className="w-4 h-4 text-red-600" />
                      {wifiSsid}
                    </span>
                    <span className="text-xs text-slate-600 font-mono mt-1">
                      Segurança: WPA2-PSK (AES)
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1 shadow-xs">
                    <span className="text-xs text-slate-500 font-semibold">Dispositivos Conectados</span>
                    <span className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-red-600" />
                      {devices.length} equipamentos ativos
                    </span>
                    <span className="text-xs text-slate-600 font-mono mt-1">
                      Uso de Banda: 42%
                    </span>
                  </div>

                  {/* Painel de Ações Rápidas com Botões em VERMELHO */}
                  <div className="sm:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ações Rápidas no Roteador
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={openInExternalBrowser}
                        className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir Roteador Real</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePingTest}
                        disabled={isPinging}
                        className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Activity className="w-4 h-4 text-red-600" />
                        <span>{isPinging ? 'Testando Ping...' : pingLatency ? `Ping: ${pingLatency} ms (Ótimo)` : 'Testar Latência'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReboot}
                        disabled={isRebooting}
                        className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Power className="w-4 h-4 text-red-600" />
                        <span>{isRebooting ? `Reiniciando (${rebootProgress}%)...` : 'Reiniciar Modem'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONFIGURAÇÕES DE WI-FI */}
              {activeTab === 'wifi' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Configuração das Redes Sem Fio</h4>
                      <p className="text-xs text-slate-500">Altere o nome (SSID) e senha de acesso à rede Wi-Fi</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWifiEnabled(!wifiEnabled)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                        wifiEnabled ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {wifiEnabled ? 'Wi-Fi Ativado' : 'Wi-Fi Desativado'}
                    </button>
                  </div>

                  <div className="space-y-3.5 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome da Rede Wi-Fi (SSID)
                      </label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:border-red-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Senha de Conexão do Wi-Fi
                      </label>
                      <input
                        type="text"
                        value={wifiPass}
                        onChange={(e) => setWifiPass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:border-red-500 focus:bg-white outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateModem) {
                          onUpdateModem({
                            ...modem,
                            wifiSsid,
                            wifiPassword: wifiPass,
                          });
                        }
                        alert('Configurações de Wi-Fi salvas com sucesso no modem!');
                      }}
                      className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Salvar Alterações de Wi-Fi</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: APARELHOS CONECTADOS */}
              {activeTab === 'devices' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Dispositivos Conectados na Rede
                    </h4>
                    <span className="text-xs text-red-600 font-bold font-mono">
                      {devices.length} conectados
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {devices.map((dev) => (
                      <div key={dev.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                            {dev.type === 'phone' && <Smartphone className="w-4 h-4" />}
                            {dev.type === 'tv' && <Tv className="w-4 h-4" />}
                            {dev.type === 'pc' && <Laptop className="w-4 h-4" />}
                            {dev.type === 'console' && <Gamepad2 className="w-4 h-4" />}
                            {dev.type === 'iot' && <Wifi className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{dev.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">
                              IP: {dev.ip} • Banda: {dev.band} • MAC: {dev.mac}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleBlockDevice(dev.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            dev.blocked
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {dev.blocked ? 'Liberar' : 'Bloquear'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: FERRAMENTAS DO MODEM */}
              {activeTab === 'tools' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-xs">
                  <h4 className="text-sm font-bold text-slate-900">Manutenção e Diagnóstico</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Reiniciar Equipamento</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Recarrega o sistema operacional do modem sem perder as configurações.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleReboot}
                        disabled={isRebooting}
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Reiniciar</span>
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Abrir Roteador no Navegador</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Acesse diretamente no Chrome/Safari com todas as abas nativas.</p>
                      </div>
                      <button
                        type="button"
                        onClick={openInExternalBrowser}
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Chrome/Safari</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal / Tutorial: Como Preencher no Navegador Real */}
      {showHelperModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Como funciona o Auto-Preenchimento?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-slate-700">
                <strong className="text-red-700 block mb-1">Por que nenhuma página web externa consegue digitar na aba do roteador?</strong>
                A política de segurança dos navegadores (Google Chrome, Safari no iPhone, Firefox) proíbe que um site acesse ou injete texto em outra aba de IP local (<code className="font-mono font-bold text-red-700">{modem.ip}</code>) para proteger seu roteador contra invasões da internet.
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800">Escolha a forma mais prática para você:</p>
                
                <div className="border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Copiar Login e Senha em 1 Toque (Recomendado)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(`${modem.username}\n${modem.password}`, 'both')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shadow-xs"
                    >
                      {isCopiedBoth ? 'Copiados!' : 'Copiar Login e Senha'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ao tocar em <strong>"Abrir no Chrome / Safari"</strong> ou em <strong>"Copiar Login e Senha"</strong>, seus dados já vão para a memória do celular. Basta colar na página de login!
                  </p>
                </div>

                <div className="border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">2</span>
                      Script Automático (Bookmarklet)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(bookmarkletCode, 'bookmarklet')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shadow-xs"
                    >
                      {isCopiedBookmarklet ? 'Copiado!' : 'Copiar Código'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cole o código copiado na barra de endereços da aba do seu roteador e aperte Enter. Ele preenche e clica no login sozinho!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="py-2 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-red-600/25"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
