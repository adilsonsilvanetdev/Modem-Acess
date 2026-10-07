import React, { useState } from 'react';
import {
  Globe,
  User,
  Key,
  Wifi,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Save,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Hash,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { ScannedModem } from '../types';
import { copyToClipboardSafe } from '../utils/clipboard';

interface ModemCredentialsCardProps {
  modem: ScannedModem;
  onUpdate: (updated: ScannedModem) => void;
  onOpenBrowser: () => void;
  onFinishAccess?: () => void;
}

export const ModemCredentialsCard: React.FC<ModemCredentialsCardProps> = ({
  modem,
  onUpdate,
  onOpenBrowser,
  onFinishAccess,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [ip, setIp] = useState<string>(modem.ip);
  const [username, setUsername] = useState<string>(modem.username);
  const [password, setPassword] = useState<string>(modem.password);
  const [brand, setBrand] = useState<string>(modem.brand);
  const [model, setModel] = useState<string>(modem.model);
  const [wifiSsid, setWifiSsid] = useState<string>(modem.wifiSsid || '');
  const [wifiPassword, setWifiPassword] = useState<string>(modem.wifiPassword || '');

  const copyToClipboard = async (text: string, fieldName: string) => {
    await copyToClipboardSafe(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    const updated: ScannedModem = {
      ...modem,
      ip: ip.trim(),
      username: username.trim(),
      password: password.trim(),
      brand: brand.trim(),
      model: model.trim(),
      wifiSsid: wifiSsid.trim() || undefined,
      wifiPassword: wifiPassword.trim() || undefined,
    };
    onUpdate(updated);
    setIsEditing(false);
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-5 w-full max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>{modem.brand}</span>
              <span className="text-xs font-semibold text-slate-500">
                {modem.model}
              </span>
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Credenciais Extraídas da Etiqueta
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
            isEditing
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </>
          ) : (
            <>
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </>
          )}
        </button>
      </div>

      {/* Primary Credentials Grid */}
      <div className="grid grid-cols-1 gap-3">
        {/* IP Gateway */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 mr-2">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 border border-red-200">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold block">
                Endereço IP (Página do Navegador)
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono text-slate-900 w-full mt-1 focus:border-red-500 outline-none"
                />
              ) : (
                <span className="text-sm font-mono font-black text-red-700">
                  {modem.ip}
                </span>
              )}
            </div>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => copyToClipboard(modem.ip, 'ip')}
              className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Copiar IP"
            >
              {copiedField === 'ip' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Username */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 mr-2">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 border border-red-200">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold block">
                Nome de Usuário / Login
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono text-slate-900 w-full mt-1 focus:border-red-500 outline-none"
                />
              ) : (
                <span className="text-sm font-mono font-bold text-slate-900">
                  {modem.username}
                </span>
              )}
            </div>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => copyToClipboard(modem.username, 'user')}
              className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Copiar Usuário"
            >
              {copiedField === 'user' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Password */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 mr-2">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 border border-red-200">
              <Key className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold block">
                Senha de Acesso ao Painel
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono text-slate-900 w-full mt-1 focus:border-red-500 outline-none"
                />
              ) : (
                <span className="text-sm font-mono font-bold text-slate-900">
                  {showPassword ? modem.password : '••••••••••••'}
                </span>
              )}
            </div>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(modem.password, 'pass')}
                className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Copiar Senha"
              >
                {copiedField === 'pass' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Wi-Fi Details (if available) */}
        {(modem.wifiSsid || isEditing) && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 mr-2">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-700 border border-red-200">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold block">
                  Rede Wi-Fi (SSID & Senha)
                </span>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Nome do Wi-Fi"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Senha do Wi-Fi"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 outline-none"
                    />
                  </div>
                ) : (
                  <div className="text-xs font-mono mt-0.5">
                    <span className="text-slate-900 font-bold">{modem.wifiSsid || 'Não detectado'}</span>
                    {modem.wifiPassword && (
                      <span className="text-slate-500 ml-2">• Senha: <span className="text-red-700 font-bold">{modem.wifiPassword}</span></span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!isEditing && modem.wifiPassword && (
              <button
                type="button"
                onClick={() => copyToClipboard(modem.wifiPassword || '', 'wifiPass')}
                className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Copiar Senha do Wi-Fi"
              >
                {copiedField === 'wifiPass' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Botão Único: Copiar Login + Senha */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => copyToClipboard(`${modem.username}\t${modem.password}`, 'both')}
          className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border-2 border-red-200 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
        >
          {copiedField === 'both' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-red-600" />
          )}
          <span>{copiedField === 'both' ? 'Login + Senha Copiados!' : 'Copiar Login + Senha'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenBrowser}
          className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-red-600/25 active:scale-98 transition-all cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir Navegador no Modem</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>

        {onFinishAccess && (
          <button
            type="button"
            onClick={onFinishAccess}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-200 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-1"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>Finalizar Acesso e Limpar Dados</span>
          </button>
        )}
      </div>
    </div>
  );
};
