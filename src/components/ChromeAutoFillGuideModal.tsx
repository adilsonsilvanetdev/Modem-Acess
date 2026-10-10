import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Lock,
  Bookmark,
  Sparkles,
  Info,
} from 'lucide-react';
import { copyToClipboardSafe } from '../utils/clipboard';
import { generateRouterBookmarklet } from '../utils/credentials';

interface ChromeAutoFillGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  password: string;
  ip: string;
}

export const ChromeAutoFillGuideModal: React.FC<ChromeAutoFillGuideModalProps> = ({
  isOpen,
  onClose,
  username,
  password,
  ip,
}) => {
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  if (!isOpen) return null;

  const bookmarkletCode = generateRouterBookmarklet(username, password);

  const handleCopyBookmarklet = async () => {
    await copyToClipboardSafe(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  const handleCopyUser = async () => {
    await copyToClipboardSafe(username);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const handleCopyPass = async () => {
    await copyToClipboardSafe(password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-tight">
                Preenchimento no Google Chrome
              </h3>
              <p className="text-xs text-red-100">
                Por que o Chrome cola junto e como resolver
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {/* O Que Acontece (Problema Identificado) */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>O que acontece no Google Chrome móvel:</span>
            </div>
            <p className="text-amber-800 text-[11px]">
              No <strong>Safari</strong> (iPhone), o navegador avança automaticamente para o campo Senha quando um par é colado.
            </p>
            <p className="text-amber-800 text-[11px]">
              Já no <strong>Google Chrome</strong> (Android/celular), colar ambos juntos insere o Login e a Senha com espaços no <em>mesmo campo de Login</em> (ex: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">{username} {password}</code>), deixando o campo Senha em branco.
            </p>
          </div>

          {/* Como o Gerenciador de Senhas do Google Funciona */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Como o Gerenciador de Senhas do Google resolve:</span>
            </div>
            <p className="text-emerald-800 text-[11px]">
              Assim que você entra no roteador a primeira vez e clica em <strong>"Salvar Senha no Google"</strong>, o Google grava o IP <code className="font-mono bg-white px-1 py-0.5 rounded text-[10px]">{ip}</code>.
            </p>
            <p className="text-emerald-800 text-[11px]">
              Nas <strong>próximas vezes</strong> que você acessar a página do modem, o próprio Google Chrome preenche sozinho: <em>Login no campo de login</em> e <em>Senha no campo de senha</em>!
            </p>
          </div>

          {/* Soluções Práticas para o 1º Acesso */}
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>3 Formas de Acessar no Google Chrome:</span>
            </h4>

            {/* Opção 1: Cópia em 2 Toques (Mais fácil) */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">1. Cópia em 2 Toques (Recomendado)</span>
                <span className="text-[10px] font-mono bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  Mais Prático
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Copie o Login primeiro e cole no campo de Login. Depois, copie a Senha e cole no campo de Senha:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyUser}
                  className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiedUser ? 'Login Copiado!' : '1. Copiar Login'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPass}
                  className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiedPass ? 'Senha Copiada!' : '2. Copiar Senha'}</span>
                </button>
              </div>
            </div>

            {/* Opção 2: Salvar no Gerenciador Google */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">2. Salvar no Google Password Manager</span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                  Definitivo
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Ao entrar no modem pela 1ª vez, aceite o aviso do Chrome para <strong>"Salvar senha no Google"</strong>. Todos os acessos seguintes serão 100% automáticos!
              </p>
            </div>

            {/* Opção 3: Atalho Favorito (Bookmarklet) */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">3. Atalho de 1-Toque no Chrome (Favorito)</span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  Avançado
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Você pode salvar este script nos Favoritos do Chrome. Na página do roteador, basta tocar no favorito para preencher ambos os campos instantaneamente:
              </p>
              <button
                type="button"
                onClick={handleCopyBookmarklet}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedBookmarklet ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{copiedBookmarklet ? 'Código Copiado!' : 'Copiar Código do Atalho'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-red-600/25 transition-all"
          >
            Entendi, Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
