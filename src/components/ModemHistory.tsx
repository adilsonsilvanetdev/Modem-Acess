import React from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  Wifi,
  Globe,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { ScannedModem } from '../types';

interface ModemHistoryProps {
  history: ScannedModem[];
  onSelectModem: (modem: ScannedModem) => void;
  onClearHistory: () => void;
  onDeleteModem: (id: string) => void;
}

export const ModemHistory: React.FC<ModemHistoryProps> = ({
  history,
  onSelectModem,
  onClearHistory,
  onDeleteModem,
}) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border-2 border-slate-200 rounded-3xl max-w-md mx-auto w-full gap-3 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
          <History className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Nenhum modem escaneado ainda</h3>
        <p className="text-xs text-slate-500">
          Use a câmera para escanear a etiqueta do seu primeiro modem ou selecione um modelo de teste.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Modems Salvos no Histórico</h3>
          <p className="text-xs text-slate-500">Acesse novamente sem precisar escanear a etiqueta</p>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {history.map((modem) => {
          const dateStr = new Date(modem.scannedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={modem.id}
              className="bg-white border border-slate-200 hover:border-red-300 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all shadow-xs"
            >
              <div
                onClick={() => onSelectModem(modem)}
                className="flex items-center gap-3.5 flex-1 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {modem.brand} {modem.model}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-red-700 font-semibold mt-0.5">
                    IP: {modem.ip} • User: {modem.username}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>Salvo em {dateStr}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectModem(modem)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20"
                >
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteModem(modem.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
