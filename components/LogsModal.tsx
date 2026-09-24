import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  RefreshCw, 
  Download, 
  Search, 
  FileText, 
  Cpu, 
  Bot,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogData {
  ocr: {
    path: string;
    content: string;
  };
  comidor: {
    path: string;
    content: string;
  };
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'comidor'>('ocr');
  const [logData, setLogData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.logs) {
        setLogData(data.logs);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Error cargando logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentContent = activeTab === 'ocr' ? logData?.ocr?.content || '' : logData?.comidor?.content || '';
  const currentPath = activeTab === 'ocr' ? logData?.ocr?.path || '' : logData?.comidor?.path || '';

  const lines = currentContent.split('\n');
  const filteredLines = filter
    ? lines.filter(line => line.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log_${activeTab}_${new Date().toISOString().substring(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Logs del Sistema en Vivo</span>
                {lastUpdated && (
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                    Actualizado: {lastUpdated}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md" title={currentPath}>
                {currentPath}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation & Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'ocr'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Motor OCR (Python)</span>
            </button>

            <button
              onClick={() => setActiveTab('comidor')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'comidor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Robot Comidor (Java)</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Search Filter */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por 'ERROR', folio..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors border border-slate-700 shrink-0"
              title="Refrescar logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-pink-400' : ''}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors border border-pink-500/20 shrink-0"
              title="Descargar archivo de log en formato .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </button>
          </div>
        </div>

        {/* Console Viewport */}
        <div className="p-4 bg-slate-950 flex-1 overflow-auto font-mono text-xs text-slate-300 leading-relaxed select-text space-y-1 border-t border-slate-800/50 min-h-[350px]">
          {loading && lines.length <= 1 ? (
            <div className="flex items-center justify-center py-20 text-slate-500 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
              <span>Cargando registros del sistema...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <AlertCircle className="w-8 h-8 mb-2 text-slate-600" />
              <span>No hay resultados que coincidan con la búsqueda &quot;{filter}&quot;</span>
            </div>
          ) : (
            filteredLines.map((line, idx) => {
              const isError = /error|fail|exception|winerror/i.test(line);
              const isSuccess = /completado|exitosamente|enviados|ok|200/i.test(line);
              const isWarn = /warning|omitido|timeout/i.test(line);

              let textColor = 'text-slate-300';
              if (isError) textColor = 'text-rose-400 font-bold bg-rose-950/40 px-1 py-0.5 rounded';
              else if (isSuccess) textColor = 'text-emerald-400';
              else if (isWarn) textColor = 'text-amber-300';

              return (
                <div key={idx} className={`hover:bg-slate-900/60 px-2 py-0.5 rounded flex space-x-3 ${textColor}`}>
                  <span className="text-slate-600 select-none text-[10px] w-10 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span className="break-all whitespace-pre-wrap">{line}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Mostrando {filteredLines.length} de {lines.length} líneas</span>
          <span className="flex items-center space-x-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Monitoreo en vivo activo</span>
          </span>
        </div>
      </div>
    </div>
  );
};
