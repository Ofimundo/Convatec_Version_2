'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OfilabLogo } from '@/components/OfilabLogo';
import { SearchBar } from '@/components/SearchBar';
import { StatsOverview } from '@/components/StatsOverview';
import { DocumentTable } from '@/components/DocumentTable';
import { DocumentDetailModal } from '@/components/DocumentDetailModal';
import { UploadModal } from '@/components/UploadModal';
import { SettingsModal } from '@/components/SettingsModal';
import { LogsModal } from '@/components/LogsModal';
import { ServiceControlPanel } from '@/components/ServiceControlPanel';
import { ProcessedDocument } from '@/app/api/documents/route';
import { Plus, RefreshCw, FolderCog, Terminal } from 'lucide-react';

export default function HomePage() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);

  const fetchDocuments = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/documents?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
      if (data.pendingCount !== undefined) {
        setPendingCount(data.pendingCount);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Auto-actualizar automáticamente cada 2.5 segundos en segundo plano
    const interval = setInterval(() => {
      fetchDocuments(true);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleAddDocument = (newDoc: ProcessedDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

function parseToYYYYMMDD(dateStr: string): string {
  if (!dateStr) return '';
  const cleanStr = dateStr.replace('T', ' ').trim();

  const ymdMatch = cleanStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dmyMatch = cleanStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  return '';
}

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Filter by type
      if (activeFilter === 'FAC' && doc.prefijo !== 'FAC') return false;
      if (activeFilter === 'GD' && doc.prefijo !== 'GD') return false;

      // Filter by date
      if (dateFilter) {
        const normDocDate = parseToYYYYMMDD(doc.fechaProcesamiento);
        const normSelectedDate = parseToYYYYMMDD(dateFilter);
        if (normDocDate !== normSelectedDate) return false;
      }

      // Filter by search query
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        doc.nombreOriginal.toLowerCase().includes(q) ||
        doc.nombreFinalPdf.toLowerCase().includes(q) ||
        doc.nombreFinalXml.toLowerCase().includes(q) ||
        doc.folio.toLowerCase().includes(q) ||
        doc.tipoDocumento.toLowerCase().includes(q) ||
        doc.rutEmisor.toLowerCase().includes(q) ||
        doc.rutReceptor.toLowerCase().includes(q) ||
        doc.ordenCompra.toLowerCase().includes(q)
      );
    });
  }, [documents, searchQuery, activeFilter, dateFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Background Radial Gradient Effects */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/10 via-purple-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-400/10 via-pink-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-white/80 border-b border-pink-200/60 backdrop-blur-xl shadow-xs h-20 flex items-center">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo OFILAB con Colores Oficiales */}
          <OfilabLogo size="md" />

          {/* User & Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDocuments}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all"
              title="Actualizar lista de documentos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-600' : ''}`} />
            </button>

            <button
              onClick={() => setIsLogsOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all font-semibold text-xs flex items-center space-x-1.5 border border-slate-700 shadow-xs"
              title="Ver logs de ejecución del motor OCR y Robot Comidor"
            >
              <Terminal className="w-4 h-4 text-pink-400" />
              <span>Logs del Sistema</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all font-semibold text-xs flex items-center space-x-1.5"
              title="Configurar rutas del sistema"
            >
              <FolderCog className="w-4 h-4 text-pink-600" />
              <span>Configurar Rutas</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-pink-500/20 border border-pink-400/30 flex items-center space-x-2 transition-all scale-[1.01] hover:scale-[1.03]"
            >
              <Plus className="w-4 h-4" />
              <span>Procesar Documento</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 z-10">
        
        {/* Panel de Control del Servicio OCR 24/7 (Activar, Detener, Ejecución Manual) */}
        <ServiceControlPanel onRefreshData={fetchDocuments} />

        {/* Tarjetas de Estadísticas */}
        <StatsOverview documents={documents} pendingCount={pendingCount} />

        {/* Barra de Búsqueda y Filtros */}
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          totalResults={filteredDocuments.length}
        />

        {/* Tabla de Documentos Procesados */}
        {loading ? (
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center my-6 shadow-sm">
            <RefreshCw className="w-10 h-10 text-pink-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">Cargando documentos procesados...</p>
          </div>
        ) : (
          <DocumentTable
            documents={filteredDocuments}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
            onDeleteDocument={handleDeleteDocument}
          />
        )}
      </main>

      {/* Modales */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleAddDocument}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <OfilabLogo size="sm" />
            <span className="text-slate-500 font-medium">&copy; {new Date().getFullYear()} Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center text-emerald-600 font-mono text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Sistema Operativo Activo
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
