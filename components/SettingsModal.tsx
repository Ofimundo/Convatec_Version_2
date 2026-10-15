'use client';

import React, { useState, useEffect } from 'react';
import { X, Folder, Save, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SystemPaths } from '@/app/api/settings/route';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [paths, setPaths] = useState<SystemPaths>({
    rutaPendientes: '',
    rutaProcesados: '',
    rutaSubirComidor: '',
    rutaDocumentosComidor: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentPaths();
      setMessage(null);
    }
  }, [isOpen]);

  const fetchCurrentPaths = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.paths) {
        setPaths(data.paths);
      }
    } catch (err) {
      console.error('Error fetching paths:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SystemPaths, value: string) => {
    setPaths((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetDefaults = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings?defaults=true');
      const data = await res.json();
      if (data.success && data.paths) {
        setPaths(data.paths);
        setMessage({ type: 'success', text: 'Valores restablecidos a las rutas automáticas de esta PC.' });
      }
    } catch (err) {
      console.error('Error restableciendo rutas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paths),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar la configuración de rutas.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-pink-100 text-pink-600 rounded-xl">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Configuración de Rutas del Sistema</h2>
              <p className="text-xs text-slate-500">Define dónde se guardan, procesan y envían los documentos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {message && (
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-pink-600 animate-spin mb-2" />
              <p className="text-slate-500 font-medium">Cargando rutas actuales...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ruta 1: Pendientes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Carpeta de Documentos Pendientes (PDFs entrantes)
                </label>
                <input
                  type="text"
                  value={paths.rutaPendientes}
                  onChange={(e) => handleChange('rutaPendientes', e.target.value)}
                  placeholder="C:\Ruta\A\doc_pendientes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-800 bg-slate-50 font-mono text-[11px]"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Carpeta local de entrada donde se depositan los PDFs para procesar.</p>
              </div>

              {/* Ruta 2: Procesados */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Carpeta de Documentos Procesados (PDF + XML + JSON)
                </label>
                <input
                  type="text"
                  value={paths.rutaProcesados}
                  onChange={(e) => handleChange('rutaProcesados', e.target.value)}
                  placeholder="C:\Ruta\A\doc_procesados"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-800 bg-slate-50 font-mono text-[11px]"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Carpeta local donde se ordenan y clasifican por Folio.</p>
              </div>

              {/* Ruta 3: Subir Comidor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Carpeta de Envíos al Robot Comidor (SubirComidor)
                </label>
                <input
                  type="text"
                  value={paths.rutaSubirComidor}
                  onChange={(e) => handleChange('rutaSubirComidor', e.target.value)}
                  placeholder="C:\Users\usuario\Desktop\SubirComidor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-800 bg-slate-50 font-mono text-[11px]"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Carpeta donde se copian los archivos para que el Robot Comidor los suba a la plataforma web.</p>
              </div>

              {/* Ruta 4: Documentos Comidor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Carpeta de Archivo Robot Comidor (DocumentosComidor)
                </label>
                <input
                  type="text"
                  value={paths.rutaDocumentosComidor}
                  onChange={(e) => handleChange('rutaDocumentosComidor', e.target.value)}
                  placeholder="C:\Users\usuario\Desktop\DocumentosComidor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-800 bg-slate-50 font-mono text-[11px]"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Carpeta donde el Robot traslada los documentos tras subirlos con éxito a Comidor.</p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Por defecto</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold shadow-md shadow-pink-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Rutas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
