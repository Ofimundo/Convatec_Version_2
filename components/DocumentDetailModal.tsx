import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  FileCode, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  Calendar, 
  ShoppingBag,
  Download,
  Database,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ProcessedDocument } from '@/app/api/documents/route';

interface DocumentDetailModalProps {
  document: ProcessedDocument | null;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'xml'>('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!document) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
  };

  const generateMockXml = () => {
    return `<?xml version="1.0" encoding="utf-8"?>
<data>
  <tipo_doc>${document.prefijo}</tipo_doc>
  <rut_emisor>${document.rutEmisor}</rut_emisor>
  <rut_destino>${document.rutReceptor}</rut_destino>
  <folio>${document.folio}</folio>
  <orden_compra>${document.ordenCompra}</orden_compra>
  <total>${document.total.replace(/[^0-9]/g, '')}</total>
  <fecha_doc>${document.fechaProcesamiento.split(' ')[0]}</fecha_doc>
</data>`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente OFILAB */}
        <div className="relative p-6 bg-gradient-to-r from-pink-50 via-slate-50 to-purple-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-pink-100 border border-pink-200 text-pink-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">Detalle de Documento Procesado</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-pink-100 text-pink-700 border border-pink-200">
                  {document.prefijo} #{document.folio}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {document.nombreOriginal}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mapeo de Nombres Destacado */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 w-full md:w-auto shadow-xs">
            <span className="text-slate-500 uppercase font-bold text-[10px]">Ingreso Original:</span>
            <span className="font-semibold text-slate-800 font-mono truncate max-w-[200px]">{document.nombreOriginal}</span>
          </div>

          <ArrowRight className="w-4 h-4 text-pink-600 hidden md:block" />

          <div className="flex items-center space-x-2 bg-pink-50 px-3.5 py-2 rounded-xl border border-pink-200 w-full md:w-auto shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span className="text-pink-700 font-bold uppercase text-[10px]">Nombre Guardado Final:</span>
            <span className="font-extrabold text-slate-900 font-mono">{document.nombreFinalPdf}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-4 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-white text-pink-600 border-t-2 border-pink-500 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Resumen de Datos</span>
          </button>
          
          <button
            onClick={() => setActiveTab('entities')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-2 ${
              activeTab === 'entities'
                ? 'bg-white text-pink-600 border-t-2 border-pink-500 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Entidades Extraídas ({document.entitiesCount || 6})</span>
          </button>

          <button
            onClick={() => setActiveTab('xml')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-2 ${
              activeTab === 'xml'
                ? 'bg-white text-pink-600 border-t-2 border-pink-500 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Estructura XML ({document.nombreFinalXml})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta Tipo & Folio */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-pink-100 text-pink-600 mt-1">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo & Folio</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{document.tipoDocumento}</p>
                  <p className="text-xs text-pink-600 font-mono mt-0.5">Folio Extraído: #{document.folio}</p>
                </div>
              </div>

              {/* Tarjeta RUT Emisor */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-purple-100 text-purple-600 mt-1">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RUT Emisor / Empresa</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">{document.rutEmisor || 'Sin especificar'}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">Receptor: {document.rutReceptor || 'Consumidor Final'}</p>
                </div>
              </div>

              {/* Tarjeta Valor Total */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 mt-1">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monto Total Documento</span>
                  <p className="text-xl font-black text-emerald-600 mt-0.5 font-mono">{document.total || '$0'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Validado con OCR Google Document AI</p>
                </div>
              </div>

              {/* Tarjeta Orden de Compra */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600 mt-1">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Orden de Compra / Ref</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">{document.ordenCompra || 'N/A'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Procesado: {document.fechaProcesamiento}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'entities' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Campo extraído (Document AI)</span>
                <span>Valor detectado</span>
              </div>
              
              {[
                { field: 'id_folio', label: 'Número de Folio / ID', val: document.folio },
                { field: 'tipo_folio', label: 'Tipo de Documento', val: document.tipoDocumento },
                { field: 'rut_emp', label: 'RUT Empresa Emisora', val: document.rutEmisor },
                { field: 'rut_dest', label: 'RUT Empresa Receptora', val: document.rutReceptor },
                { field: 'valor_total', label: 'Monto Valor Total', val: document.total },
                { field: 'orden_compra_detalle', label: 'Orden de Compra Detalle', val: document.ordenCompra },
                { field: 'fecha_emision_folio', label: 'Fecha de Emisión Folio', val: document.fechaProcesamiento.split(' ')[0] },
              ].map((ent, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{ent.label}</p>
                    <p className="text-[10px] font-mono text-pink-600">{ent.field}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-lg bg-white text-xs font-mono font-bold text-emerald-700 border border-slate-200 shadow-xs">
                      {ent.val || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'xml' && (
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{document.nombreFinalXml}</span>
                <span className="text-pink-400">UTF-8 XML</span>
              </div>
              <pre className="p-4 text-xs font-mono text-pink-300 overflow-x-auto">
                {generateMockXml()}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Documento guardado en carpeta <code className="text-pink-700 font-mono bg-pink-50 px-1 py-0.5 rounded border border-pink-200">SubirComidor</code></span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700 transition-colors"
            >
              Cerrar
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-bold text-white shadow-md shadow-pink-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-75"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Descargando...' : `Descargar ${document.nombreFinalPdf}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
