import React, { useState, useEffect } from 'react';
import {
  Camera,
  Globe,
  Key,
  BookOpen,
  History,
  Wifi,
  Sparkles,
  ExternalLink,
  Signal,
  Battery,
  Maximize2,
  Minimize2,
  Smartphone,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ModemScanner } from './components/ModemScanner';
import { ModemBrowserSimulator } from './components/ModemBrowserSimulator';
import { ModemCredentialsCard } from './components/ModemCredentialsCard';
import { RouterIpGuide } from './components/RouterIpGuide';
import { ModemHistory } from './components/ModemHistory';
import { ScannedModem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'browser' | 'credentials' | 'guide' | 'history'>('scanner');
  const [activeModem, setActiveModem] = useState<ScannedModem | null>(null);
  const [history, setHistory] = useState<ScannedModem[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('09:41');
  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState<boolean>(true);
  const [privacyNotification, setPrivacyNotification] = useState<string | null>(null);

  // Dynamic Clock for Mobile Status Bar
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  // Load from localStorage on mount (only if single active modem from current session exists)
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('modem_scanner_history');
      if (savedHistory) {
        const parsed: ScannedModem[] = JSON.parse(savedHistory);
        const cleanHistory = parsed.filter((m) => m.id !== 'sample-vivo');
        setHistory(cleanHistory);
        if (cleanHistory.length > 0) {
          setActiveModem(cleanHistory[0]);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar histórico local:', e);
    }
  }, []);

  // A cada novo acesso em novos modelos de modens, limpar histórico de senhas e logins anteriores
  const handleScanSuccess = (newModem: ScannedModem) => {
    // Apaga senhas e histórico anteriores imediatamente para segurança
    try {
      localStorage.removeItem('modem_scanner_history');
    } catch (err) {
      console.warn('Falha ao limpar histórico anterior:', err);
    }

    setActiveModem(newModem);
    // Guarda estritamente o modem atual na sessão para evitar acúmulo de senhas de clientes
    const singleSession = [newModem];
    setHistory(singleSession);
    try {
      localStorage.setItem('modem_scanner_history', JSON.stringify(singleSession));
    } catch (err) {
      console.warn('Falha ao salvar sessão:', err);
    }

    setPrivacyNotification('Histórico anterior limpo! Senhas e logins anteriores foram apagados.');
    setTimeout(() => {
      setPrivacyNotification(null);
    }, 4500);

    // Switch to browser simulation view so user sees auto-fill immediately!
    setActiveTab('browser');
  };

  const handleUpdateModem = (updated: ScannedModem) => {
    setActiveModem(updated);
    setHistory([updated]);
    try {
      localStorage.setItem('modem_scanner_history', JSON.stringify([updated]));
    } catch (err) {
      console.warn('Falha ao salvar:', err);
    }
  };

  const handleClearHistory = () => {
    setActiveModem(null);
    setHistory([]);
    try {
      localStorage.removeItem('modem_scanner_history');
    } catch (err) {
      console.warn(err);
    }
    setPrivacyNotification('Histórico de senhas e logins foi completamente limpo.');
    setTimeout(() => {
      setPrivacyNotification(null);
    }, 4000);
  };

  const handleDeleteModem = (_id: string) => {
    handleClearHistory();
  };

  const handleFinishAccess = () => {
    setActiveModem(null);
    setHistory([]);
    try {
      localStorage.removeItem('modem_scanner_history');
    } catch (err) {
      console.warn(err);
    }
    setPrivacyNotification('Acesso finalizado. Senhas e logins apagados com sucesso.');
    setTimeout(() => {
      setPrivacyNotification(null);
    }, 4000);
    setActiveTab('scanner');
  };

  const handleSelectIpFromGuide = (ip: string, user: string, pass: string) => {
    const customModem: ScannedModem = {
      id: 'custom-' + Date.now(),
      ip,
      username: user,
      password: pass,
      brand: 'Roteador Selecionado',
      model: 'Configuração Padrão',
      scannedAt: new Date().toISOString(),
      confidence: 'alta',
    };
    handleScanSuccess(customModem);
  };

  return (
    <div className="min-h-screen bg-slate-900 sm:bg-gradient-to-tr sm:from-slate-950 sm:via-slate-900 sm:to-zinc-900 text-slate-900 flex flex-col items-center justify-center font-sans sm:py-6 selection:bg-red-500 selection:text-white">
      {/* Top Floating Controls on Desktop */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-[430px] mb-2 px-3 text-slate-400 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-red-500" />
          <span>Modo Celular</span>
        </div>
        <button
          type="button"
          onClick={() => setIsPhoneFrameMode(!isPhoneFrameMode)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px] border border-slate-700"
          title="Alternar moldura de celular"
        >
          {isPhoneFrameMode ? (
            <>
              <Maximize2 className="w-3 h-3 text-red-400" />
              <span>Expandir</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3 h-3 text-red-400" />
              <span>Enquadrar</span>
            </>
          )}
        </button>
      </div>

      {/* Realistic Mobile Smartphone Chassis / Screen */}
      <div
        className={`relative w-full transition-all duration-300 flex flex-col overflow-hidden bg-slate-100 ${
          isPhoneFrameMode
            ? 'sm:max-w-[430px] sm:h-[870px] sm:max-h-[94vh] sm:rounded-[52px] sm:border-[10px] sm:border-slate-800 sm:shadow-[0_25px_70px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12),inset_0_0_0_2px_rgba(0,0,0,0.8)] h-screen'
            : 'max-w-2xl min-h-screen sm:min-h-0 sm:rounded-3xl sm:border border-slate-200 shadow-xl'
        }`}
      >
        {/* Smartphone Hardware Side Buttons (Desktop Visual Accent) */}
        {isPhoneFrameMode && (
          <>
            <div className="hidden sm:block absolute -left-[14px] top-28 w-1 h-12 bg-slate-700 rounded-l-md pointer-events-none" />
            <div className="hidden sm:block absolute -left-[14px] top-44 w-1 h-12 bg-slate-700 rounded-l-md pointer-events-none" />
            <div className="hidden sm:block absolute -right-[14px] top-36 w-1 h-16 bg-slate-700 rounded-r-md pointer-events-none" />
          </>
        )}

        {/* 1. TOP MOBILE STATUS BAR (Clock, Dynamic Island, Wifi, Battery) */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-5 pt-3 pb-1 border-b border-slate-200/60 flex items-center justify-between text-xs font-semibold select-none">
          {/* Clock */}
          <span className="font-bold font-mono text-[13px] text-slate-800 tracking-tight w-12">
            {currentTime}
          </span>

          {/* Dynamic Island / Notch */}
          <div className="w-24 h-5 bg-slate-950 rounded-full flex items-center justify-center px-2 shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800/80 ml-auto mr-1" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
          </div>

          {/* Status Icons: Signal, Wi-Fi, Battery */}
          <div className="flex items-center gap-1.5 text-slate-700 w-12 justify-end">
            <Signal className="w-3.5 h-3.5 text-slate-800" />
            <Wifi className="w-3.5 h-3.5 text-slate-800" />
            <div className="flex items-center">
              <Battery className="w-4 h-4 text-slate-800" />
            </div>
          </div>
        </div>

        {/* 2. APP HEADER (Compact Mobile Brand & Active Gateway) */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/25">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-extrabold text-slate-900 tracking-tight">ModemScanner</span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-red-100 text-red-700 font-bold border border-red-200">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-none">
                Scanner & Acesso ao Roteador
              </p>
            </div>
          </div>

          {/* Quick Active Gateway Indicator Pill & Finish Access Button */}
          {activeModem ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('browser')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 hover:bg-red-100 text-[11px] font-mono transition-all cursor-pointer shadow-2xs"
                title="Acessar navegador do modem"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-red-700 font-bold">{activeModem.ip}</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAccess}
                title="Limpar senhas e dados para novo acesso"
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Limpar & Novo</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Privacidade Ativa</span>
            </span>
          )}
        </header>

        {/* Privacy Toast Notification */}
        {privacyNotification && (
          <div className="bg-emerald-600 text-white text-[11px] font-semibold py-1.5 px-3 flex items-center justify-between shadow-xs transition-all">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{privacyNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrivacyNotification(null)}
              className="text-white/80 hover:text-white text-xs font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3. SCROLLABLE SCREEN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4">
          {activeTab === 'scanner' && (
            <ModemScanner
              onScanSuccess={handleScanSuccess}
              activeModem={activeModem}
              onFinishAccess={handleFinishAccess}
            />
          )}

          {activeTab === 'browser' && activeModem && (
            <ModemBrowserSimulator
              modem={activeModem}
              onUpdateModem={handleUpdateModem}
              onFinishAccess={handleFinishAccess}
            />
          )}

          {activeTab === 'browser' && !activeModem && (
            <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl text-center max-w-sm mx-auto gap-3 my-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Nenhum modem escaneado ainda</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fotografe a etiqueta do seu modem na aba "Escanear" para extrair os dados e acessar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-600/25 cursor-pointer"
              >
                Ir para o Scanner
              </button>
            </div>
          )}

          {activeTab === 'credentials' && activeModem && (
            <ModemCredentialsCard
              modem={activeModem}
              onUpdate={handleUpdateModem}
              onOpenBrowser={() => setActiveTab('browser')}
              onFinishAccess={handleFinishAccess}
            />
          )}

          {activeTab === 'credentials' && !activeModem && (
            <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl text-center max-w-sm mx-auto gap-3 my-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Nenhuma credencial disponível</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Escaneie a etiqueta do seu modem primeiro para visualizar e editar as credenciais.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-600/25 cursor-pointer"
              >
                Escanear Etiqueta
              </button>
            </div>
          )}

          {activeTab === 'guide' && (
            <RouterIpGuide onSelectIp={handleSelectIpFromGuide} />
          )}

          {activeTab === 'history' && (
            <ModemHistory
              history={history}
              onSelectModem={(modem) => {
                setActiveModem(modem);
                setActiveTab('browser');
              }}
              onClearHistory={handleClearHistory}
              onDeleteModem={handleDeleteModem}
            />
          )}
        </main>

        {/* 4. DOCKED MOBILE BOTTOM TAB BAR (Navegação Nativa de Celular com Botões em Vermelho) */}
        <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-md">
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'scanner'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'scanner' ? 'bg-red-50 text-red-600' : ''}`}>
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Escanear</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browser')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
              activeTab === 'browser'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeTab === 'browser' ? 'bg-red-50 text-red-600' : ''}`}>
              <Globe className="w-4 h-4" />
              {activeModem && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-600" />
              )}
            </div>
            <span className="text-[10px]">Navegador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'credentials'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'credentials' ? 'bg-red-50 text-red-600' : ''}`}>
              <Key className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Dados</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'guide' ? 'bg-red-50 text-red-600' : ''}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Guia IPs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'history' ? 'bg-red-50 text-red-600' : ''}`}>
              <History className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Histórico</span>
          </button>
        </nav>

        {/* 5. SMARTPHONE HOME GESTURE BAR */}
        <div className="bg-white/95 pb-1 pt-0.5 select-none flex justify-center">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
}
