import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Cpu,
  ArrowRight,
  RotateCcw,
  HelpCircle,
  Sparkles,
  Smartphone,
  Globe,
  Compass,
  CheckCircle2,
  Lock,
  User,
  Key,
} from 'lucide-react';
import { ScannedModem } from '../types';
import { copyToClipboardSafe } from '../utils/clipboard';
import {
  cleanModemPassword,
  cleanModemUser,
  detectBrowserType,
  storeChromeCredential,
} from '../utils/credentials';
import { ChromeAutoFillGuideModal } from './ChromeAutoFillGuideModal';

interface ModemCredentialsCardProps {
  modem: ScannedModem;
  onUpdate?: (updated: ScannedModem) => void;
  onOpenBrowser: () => void;
  onFinishAccess?: () => void;
}

export const ModemCredentialsCard: React.FC<ModemCredentialsCardProps> = ({
  modem,
  onOpenBrowser,
  onFinishAccess,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [browserMode, setBrowserMode] = useState<'chrome' | 'safari'>(() => {
    const detected = detectBrowserType();
    return detected === 'safari' ? 'safari' : 'chrome';
  });
  const [sequentialStep, setSequentialStep] = useState<'login' | 'pass'>('login');
  const [showChromeGuide, setShowChromeGuide] = useState<boolean>(false);

  const cleanUser = cleanModemUser(modem.username, modem.password);
  const cleanPass = cleanModemPassword(modem.password);
  const defaultIp = modem.ip && modem.ip.trim() ? modem.ip.trim() : '192.168.0.1';

  // Copia apenas o Login
  const copyUserOnly = async () => {
    await copyToClipboardSafe(cleanUser);
    setCopiedField('user');
    setSequentialStep('pass');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Copia apenas a Senha
  const copyPassOnly = async () => {
    await copyToClipboardSafe(cleanPass);
    setCopiedField('pass');
    setSequentialStep('login');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Cópia sequencial inteligente (Passo 1: Login, Passo 2: Senha)
  const handleSequentialCopy = async () => {
    if (sequentialStep === 'login') {
      await copyUserOnly();
    } else {
      await copyPassOnly();
    }
  };

  // Copia Login + Senha com tab (\t) (Ideal para Safari ou quem já tem o fluxo pronto)
  const copyLoginAndPass = async () => {
    await copyToClipboardSafe(`${cleanUser}\t${cleanPass}`);
    storeChromeCredential(cleanUser, cleanPass, modem.brand);
    setCopiedField('both');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Abre a página no Chrome/Safari (endereço padrão: 192.168.0.1)
  const handleOpenPage = async () => {
    // No modo Chrome, copia preferencialmente o login primeiro se o usuário for colar no 1º campo
    if (browserMode === 'chrome') {
      await copyToClipboardSafe(cleanUser);
      setCopiedField('user');
      setSequentialStep('pass');
    } else {
      await copyToClipboardSafe(`${cleanUser}\t${cleanPass}`);
      setCopiedField('both');
    }
    storeChromeCredential(cleanUser, cleanPass, modem.brand);

    const cleanIp = defaultIp.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim() || '192.168.0.1';
    const targetUrl = `http://${cleanIp}/`;

    try {
      window.open(targetUrl, '_blank');
    } catch (err) {
      console.warn('Falha ao abrir janela externa:', err);
    }

    onOpenBrowser();
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 w-full max-w-xl mx-auto">
      {/* Header com Marca, Modelo e IP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>{modem.brand || 'Roteador Identificado'}</span>
              {modem.model && (
                <span className="text-xs font-semibold text-slate-500">
                  {modem.model}
                </span>
              )}
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Credenciais Extraídas com Sucesso
            </span>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200">
          {defaultIp}
        </span>
      </div>

      {/* Seletor de Navegador: Modo Google Chrome vs Modo Safari */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setBrowserMode('chrome')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            browserMode === 'chrome'
              ? 'bg-white text-red-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-red-600" />
          <span>Modo Google Chrome</span>
        </button>

        <button
          type="button"
          onClick={() => setBrowserMode('safari')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            browserMode === 'safari'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Modo Safari</span>
        </button>
      </div>

      {/* Caixa Explicativa Especial para Google Chrome */}
      {browserMode === 'chrome' ? (
        <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-red-950 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Dica para o Google Chrome Móvel:
            </span>
            <button
              type="button"
              onClick={() => setShowChromeGuide(true)}
              className="text-[11px] text-red-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Por que o Chrome cola junto?</span>
            </button>
          </div>
          <p className="text-[11px] text-red-800 leading-relaxed">
            No Chrome, colar <em>Login e Senha juntos</em> insere tudo no campo de Login. No 1º acesso (antes de salvar no Gerenciador de Senhas do Google), copie <strong>separado</strong> em 2 toques:
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-[11px]">
            No <strong>Safari</strong>, o preenchimento automático funciona com 1 toque no botão abaixo!
          </span>
        </div>
      )}

      {/* Resumo dos Valores para Conferência Visual */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
            Login
          </span>
          <span className="text-xs font-mono font-bold text-slate-900 break-all select-all">
            {cleanUser}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
            Senha
          </span>
          <span className="text-xs font-mono font-bold text-red-700 break-all select-all">
            {cleanPass}
          </span>
        </div>
      </div>

      {/* Ações Específicas por Modo */}
      <div className="flex flex-col gap-2.5 pt-1">
        {browserMode === 'chrome' ? (
          <>
            {/* Opção Principal Chrome: Botões Separados (1. Copiar Login / 2. Copiar Senha) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyUserOnly}
                className={`py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 border ${
                  copiedField === 'user'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                }`}
              >
                {copiedField === 'user' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-red-600" />
                )}
                <span>{copiedField === 'user' ? 'Login Copiado!' : '1. Copiar Login'}</span>
              </button>

              <button
                type="button"
                onClick={copyPassOnly}
                className={`py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 border ${
                  copiedField === 'pass'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                }`}
              >
                {copiedField === 'pass' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Key className="w-4 h-4 text-red-600" />
                )}
                <span>{copiedField === 'pass' ? 'Senha Copiada!' : '2. Copiar Senha'}</span>
              </button>
            </div>

            {/* Botão Sequencial Inteligente */}
            <button
              type="button"
              onClick={handleSequentialCopy}
              className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {sequentialStep === 'login'
                  ? 'Passo a Passo: Toque para Copiar Login'
                  : 'Passo a Passo: Toque para Copiar Senha'}
              </span>
            </button>
          </>
        ) : (
          /* Opção Principal Safari: Botão Único Login + Senha */
          <button
            type="button"
            onClick={copyLoginAndPass}
            className="w-full py-4 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border-2 border-red-300 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            {copiedField === 'both' ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <Copy className="w-5 h-5 text-red-600" />
            )}
            <span>{copiedField === 'both' ? 'Login + Senha Copiados!' : 'Copiar Login + Senha (Safari)'}</span>
          </button>
        )}

        {/* Botão Abrir Página do Modem (192.168.0.1) */}
        <button
          type="button"
          onClick={handleOpenPage}
          className="w-full py-4 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold rounded-2xl text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shadow-md shadow-red-600/25 active:scale-98 transition-all cursor-pointer text-center"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <span>Abrir Página do Modem</span>
          </div>
          <span className="text-xs text-red-100 font-medium">
            ({browserMode === 'chrome' ? 'Google Chrome' : 'Safari'} - {defaultIp})
          </span>
          <ArrowRight className="w-4 h-4 hidden sm:inline ml-1" />
        </button>

        {/* Botão Secundário: Copiar Ambos (disponível também no Chrome se o usuário preferir) */}
        {browserMode === 'chrome' && (
          <button
            type="button"
            onClick={copyLoginAndPass}
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>{copiedField === 'both' ? 'Copiados com Tab' : 'Copiar Ambos Juntos (Login + Senha)'}</span>
          </button>
        )}

        {/* Botão Finalizar Acesso e Limpar Dados */}
        {onFinishAccess && (
          <button
            type="button"
            onClick={onFinishAccess}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-1"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>Finalizar Acesso e Limpar Dados</span>
          </button>
        )}
      </div>

      {/* Modal Guia do Google Chrome */}
      <ChromeAutoFillGuideModal
        isOpen={showChromeGuide}
        onClose={() => setShowChromeGuide(false)}
        username={cleanUser}
        password={cleanPass}
        ip={defaultIp}
      />
    </div>
  );
};
