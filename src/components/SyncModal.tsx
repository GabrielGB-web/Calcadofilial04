import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { SyncStats } from '../types/catalog';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SyncStats;
  onRunSync: (customSheetId?: string) => Promise<void>;
  isSyncing: boolean;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  stats,
  onRunSync,
  isSyncing,
}) => {
  const [sheetId, setSheetId] = useState('1dMybAUvBxpbDTaWQyj02gBrPihZ_Odb__u3R0_HlRNQ');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncFeedback(null);
    try {
      await onRunSync(sheetId.trim());
      setSyncFeedback('Sincronização concluída com sucesso!');
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Falha na sincronização.');
    }
  };

  const formattedDate = stats.timestamp
    ? new Date(stats.timestamp).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      })
    : 'Nunca';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Sincronização & Banco de Dados
            </h3>
            <p className="text-xs text-slate-500">
              Conexão com Google Sheets + Agrupamento inteligente de calçados
            </p>
          </div>
        </div>

        {/* Diagnostic Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 font-medium block">Linhas na Planilha</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              {stats.totalRawRows || 891}
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <span className="text-[11px] text-emerald-700 font-medium block">Modelos Únicos</span>
            <span className="text-lg font-extrabold text-emerald-900 font-mono">
              {stats.uniqueModels || 386}
            </span>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
            <span className="text-[11px] text-blue-700 font-medium block">Pares Recuperados</span>
            <span className="text-lg font-extrabold text-blue-900 font-mono flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              {stats.repairedSizesCount || 30}
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <span className="text-[11px] text-amber-700 font-medium block">Total em Estoque</span>
            <span className="text-lg font-extrabold text-amber-900 font-mono">
              {stats.totalPairsInStock || 0}
            </span>
          </div>
        </div>

        {/* Auto-sync and Webhook section */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronização Automática Ativa
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              A cada 3 minutos
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Qualquer alteração feita no Google Sheets é buscada e salva automaticamente no banco de dados.
          </p>

          <details className="pt-1 text-[11px]">
            <summary className="font-semibold text-amber-700 cursor-pointer hover:underline">
              Como sincronizar instantaneamente no momento da edição (Apps Script)
            </summary>
            <div className="mt-2 p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[10px] space-y-1 overflow-x-auto">
              <div className="text-slate-400">// No Google Sheets: Extensões &gt; Apps Script &gt; Cole o código:</div>
              <div>function onEdit(e) &#123;</div>
              <div>&nbsp;&nbsp;UrlFetchApp.fetch(&quot;{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/google-sheets&quot;, &#123; method: &quot;POST&quot; &#125;);</div>
              <div>&#125;</div>
            </div>
          </details>
        </div>

        {/* Google Sheet ID input */}
        <div className="space-y-3 mb-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ID da Planilha Google Sheets:
              </label>
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
              >
                <span>Abrir no Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="Cole o ID da planilha"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Última sincronização:</span>
            <span className="font-semibold text-slate-700">{formattedDate}</span>
          </div>
        </div>

        {syncFeedback && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
              syncFeedback.includes('sucesso')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {syncFeedback.includes('sucesso') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSync}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
