import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ExternalLink,
  Info,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Wifi,
  ShieldAlert,
  ArrowRight,
  Check,
} from 'lucide-react';
import { ROUTER_IP_REFERENCES } from '../data/routerGuide';
import { copyToClipboardSafe } from '../utils/clipboard';

interface RouterIpGuideProps {
  onSelectIp?: (ip: string, user: string, pass: string) => void;
}

export const RouterIpGuide: React.FC<RouterIpGuideProps> = ({ onSelectIp }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const filteredGuides = ROUTER_IP_REFERENCES.filter(
    (item) =>
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.commonIps.some((ip) => ip.includes(searchTerm)) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboardSafe(text);
    setCopiedValue(id);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto">
      {/* Title */}
      <div className="text-center px-2">
        <h3 className="text-xl font-extrabold text-slate-900">
          Guia de IPs & Senhas de Fábrica
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          Consulte o IP padrão e credenciais originais de roteadores das operadoras e marcas no Brasil.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar operadora, marca ou IP (ex: Vivo, Claro, 192.168.1.1)..."
          className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none shadow-2xs"
        />
      </div>

      {/* List of Providers in Light Theme */}
      <div className="flex flex-col gap-2.5">
        {filteredGuides.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.brand}</h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {item.commonIps.map((ip) => (
                      <span
                        key={ip}
                        className="text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md"
                      >
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-slate-400 p-1">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-red-600" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs flex flex-col gap-2.5 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold block">
                          Usuário Padrão
                        </span>
                        <span className="text-slate-900 font-mono font-bold">
                          {item.defaultUser}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.defaultUser, `user-${idx}`)}
                        className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                      >
                        {copiedValue === `user-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold block">
                          Senha Padrão
                        </span>
                        <span className="text-slate-900 font-mono font-bold">
                          {item.defaultPass}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.defaultPass, `pass-${idx}`)}
                        className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                      >
                        {copiedValue === `pass-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                    <strong className="text-slate-800">Dica: </strong>
                    {item.notes}
                  </p>

                  {onSelectIp && (
                    <button
                      type="button"
                      onClick={() => onSelectIp(item.commonIps[0], item.defaultUser, item.defaultPass)}
                      className="mt-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <span>Acessar Este Modem no Navegador</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
