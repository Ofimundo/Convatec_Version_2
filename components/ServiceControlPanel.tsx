import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Calendar,
  FileCheck,
  Radio
} from 'lucide-react';

interface ServiceControlPanelProps {
  onRefreshData?: () => void;
}

export const ServiceControlPanel: React.FC<ServiceControlPanelProps> = ({ onRefreshData }) => {
  const [isAutoActive, setIsAutoActive] = useState<boolean>(true);
  const [isRunningNow, setIsRunningNow] = useState<boolean>(false);
  const [lastRun, setLastRun] = useState<string>('Cargando...');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(300); // 5 minutos = 300 seg

  const fetchServiceStatus = async () => {
    try {
      const res = await fetch('/api/service');
      const data = await res.json();
      if (data.success) {
        setIsAutoActive(data.isAutoActive);
        setIsRunningNow(data.isRunningNow);
        setLastRun(data.lastRun);
        setPendingCount(data.pendingCount);
      }
    } catch (e) {
      console.error('Error fetching service status:', e);
    }
  };

  useEffect(() => {
    fetchServiceStatus();
    const statusInterval = setInterval(fetchServiceStatus, 5000); // Poll status cada 5s
    return () => clearInterval(statusInterval);
  }, []);

  // Timer regresivo para la próxima ejecución automática (5 min)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoActive) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            fetchServiceStatus();
            if (onRefreshData) onRefreshData();
            return 300; // reiniciar a 5 minutos
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoActive, onRefreshData]);

  const handleAction = async (action: 'start_auto' | 'stop_auto' | 'run_now') => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();

      if (data.success) {
        if (action === 'start_auto') {
          setIsAutoActive(true);
          setCountdown(300);
        } else if (action === 'stop_auto') {
          setIsAutoActive(false);
        } else if (action === 'run_now') {
          if (data.lastRun) setLastRun(data.lastRun);
          if (onRefreshData) onRefreshData();
        }
      }
    } catch (err) {
      console.error('Error handling service action:', err);
    } finally {
      setLoadingAction(false);
      fetchServiceStatus();
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-pink-200/80 p-5 shadow-sm transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        
        {/* Lado Izquierdo: Estado del Servicio */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          
          {/* Indicador de Estado Activo / Inactivo */}
          <div className={`p-3.5 rounded-2xl flex items-center justify-center border transition-all ${
            isAutoActive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs'
              : 'bg-amber-50 border-amber-200 text-amber-600 shadow-xs'
          }`}>
            <Radio className={`w-6 h-6 ${isAutoActive ? 'animate-pulse text-emerald-600' : ''}`} />
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Control de Ejecución OCR (24/7)
              </h2>

              {/* Status Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border flex items-center space-x-1.5 ${
                isAutoActive
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isAutoActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                <span>{isAutoActive ? 'Automático Activo (Cada 5 Min)' : 'Automático Detenido'}</span>
              </span>
            </div>

            {/* Metadatos de ejecución */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
              <div className="flex items-center space-x-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-pink-600" />
                <span>Última ejecución: <strong className="text-slate-800 font-semibold">{lastRun}</strong></span>
              </div>

              {isAutoActive && (
                <div className="flex items-center space-x-1 font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  <RefreshCw className="w-3 h-3 text-purple-600 animate-spin" />
                  <span>Próxima ejecución en: <strong>{formatCountdown(countdown)}</strong></span>
                </div>
              )}

              {pendingCount > 0 && (
                <div className="flex items-center space-x-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{pendingCount} pdfs pendientes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Botones de Acción (Activar, Detener, Ejecutar Manual) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          
          {/* Botón: Activar Automático 24/7 */}
          <button
            onClick={() => handleAction('start_auto')}
            disabled={isAutoActive || loadingAction}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs border ${
              isAutoActive
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/30 shadow-md shadow-emerald-500/20 scale-[1.01]'
            }`}
            title="Activar ciclo automático continuo 24 horas cada 5 minutos"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Activar Automático (24/7)</span>
          </button>

          {/* Botón: Detener Automático */}
          <button
            onClick={() => handleAction('stop_auto')}
            disabled={!isAutoActive || loadingAction}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs border ${
              !isAutoActive
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300 hover:border-rose-400'
            }`}
            title="Pausar o detener la ejecución automática en segundo plano"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>Detener Automático</span>
          </button>

          {/* Botón: Ejecutar Proceso Manual Ahora */}
          <button
            onClick={() => handleAction('run_now')}
            disabled={loadingAction || isRunningNow}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-pink-500/20 border border-pink-400/30 flex items-center justify-center space-x-2 transition-all scale-[1.01] hover:scale-[1.03]"
            title="Ejecutar escaneo OCR de documentos pendientes inmediatamente"
          >
            <Zap className={`w-4 h-4 ${isRunningNow ? 'animate-bounce text-amber-300' : ''}`} />
            <span>{isRunningNow ? 'Ejecutando OCR...' : 'Ejecutar Ahora (Manual)'}</span>
          </button>

        </div>
      </div>
    </div>
  );
};
