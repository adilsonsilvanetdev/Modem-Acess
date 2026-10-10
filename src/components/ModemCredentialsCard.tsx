import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Cpu,
  ArrowRight,
  RotateCcw,
  User,
  Key,
} from 'lucide-react';
import { ScannedModem } from '../types';
import { copyToClipboardSafe } from '../utils/clipboard';
import {
  cleanModemPassword,
  cleanModemUser,
  storeChromeCredential,
} from '../utils/credentials';

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

  const cleanUser = cleanModemUser(modem.username, modem.password);
  const cleanPass = cleanModemPassword(modem.password);
  const defaultIp = modem.ip && modem.ip.trim() ? modem.ip.trim() : '192.168.0.1';

  // Copia Login + Senha
  const copyLoginAndPass = async () => {
    await copyToClipboardSafe(`${cleanUser}\t${cleanPass}`);
    storeChromeCredential(cleanUser, cleanPass, modem.brand);
    setCopiedField('both');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Copia apenas o Login
  const copyLoginOnly = async () => {
    await copyToClipboardSafe(cleanUser);
    setCopiedField('user');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Copia apenas a Senha
  const copyPasswordOnly = async () => {
    await copyToClipboardSafe(cleanPass);
    setCopiedField('pass');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Abre a página no Chrome/Safari (endereço padrão: 192.168.0.1) e copia credenciais
  const handleOpenPage = async () => {
    // 1. Copia credenciais para a área de transferência
    await copyToClipboardSafe(`${cleanUser}\t${cleanPass}`);
    storeChromeCredential(cleanUser, cleanPass, modem.brand);
    setCopiedField('both');

    // 2. Resolve o endereço IP com fallback para o padrão 192.168.0.1
    const cleanIp = defaultIp.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim() || '192.168.0.1';
    const targetUrl = `http://${cleanIp}/`;

    // 3. Abre em nova aba nativa do navegador (Chrome / Safari)
    try {
      window.open(targetUrl, '_blank');
    } catch (err) {
      console.warn('Falha ao abrir janela externa:', err);
    }

    // 4. Aciona a visualização do navegador no applet
    onOpenBrowser();
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 w-full max-w-xl mx-auto">
      {/* Header com Marca e Modelo do Modem */}
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

      {/* Caixa de Confirmação e Status */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="text-xs text-emerald-900">
          <span className="font-bold block">Tudo pronto para o acesso!</span>
          <span className="text-emerald-700 text-[11px]">
            Toque nos botões abaixo para copiar os dados ou abrir a página de configuração.
          </span>
        </div>
      </div>

      {/* Resumo visual dos dados */}
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

      {/* Ações */}
      <div className="pt-1 flex flex-col gap-2.5">
        {/* Botão 1: Copiar Login + Senha */}
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
          <span>{copiedField === 'both' ? 'Login + Senha Copiados!' : 'Copiar Login + Senha'}</span>
        </button>

        {/* Botões Individuais: Copiar Login e Copiar Senha */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyLoginOnly}
            className="py-3 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
          >
            {copiedField === 'user' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <User className="w-4 h-4 text-slate-600" />
            )}
            <span>{copiedField === 'user' ? 'Login Copiado!' : 'Copiar Login'}</span>
          </button>

          <button
            type="button"
            onClick={copyPasswordOnly}
            className="py-3 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
          >
            {copiedField === 'pass' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Key className="w-4 h-4 text-slate-600" />
            )}
            <span>{copiedField === 'pass' ? 'Senha Copiada!' : 'Copiar Senha'}</span>
          </button>
        </div>

        {/* Botão: Abrir Página (Chrome/Safari - Endereço padrão: 192.168.0.1) */}
        <button
          type="button"
          onClick={handleOpenPage}
          className="w-full py-4 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold rounded-2xl text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shadow-md shadow-red-600/25 active:scale-98 transition-all cursor-pointer text-center"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <span>Abrir Página</span>
          </div>
          <span className="text-xs sm:text-xs text-red-100 font-medium">
            (Chrome / Safari - endereço padrão: {defaultIp})
          </span>
          <ArrowRight className="w-4 h-4 hidden sm:inline ml-1" />
        </button>

        {/* Finalizar Acesso e Limpar Dados */}
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
    </div>
  );
};
