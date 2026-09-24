import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc: any) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docType, setDocType] = useState<'FAC' | 'GD'>('FAC');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    setTimeout(() => {
      const generatedFolio = Math.floor(10000 + Math.random() * 90000).toString();
      const prefijo = docType;
      const nombreOriginal = selectedFile.name;
      const nombreFinalPdf = `${prefijo}_${generatedFolio}.pdf`;
      const nombreFinalXml = `${prefijo}_${generatedFolio}.xml`;

      const newDoc = {
        id: generatedFolio,
        nombreOriginal,
        nombreFinalPdf,
        nombreFinalXml,
        prefijo,
        tipoDocumento: docType === 'FAC' ? 'FACTURA ELECTRONICA' : 'GUIA DE DESPACHO ELECTRONICA',
        folio: generatedFolio,
        fechaProcesamiento: new Date().toISOString().replace('T', ' ').substring(0, 19),
        rutEmisor: '77.888.999-1',
        rutReceptor: '61.608.102-0',
        total: `$${(Math.floor(100 + Math.random() * 900) * 1000).toLocaleString('es-CL')}`,
        ordenCompra: `OC-2026-${Math.floor(100 + Math.random() * 900)}`,
        estado: 'Procesado',
        confianza: 98,
        entitiesCount: 16,
        jsonPath: `${generatedFolio}.json`,
        entities: []
      };

      setIsProcessing(false);
      setSelectedFile(null);
      onUploadSuccess(newDoc);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-pink-100 border border-pink-200 text-pink-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Procesar Nuevo Documento</h3>
              <p className="text-xs text-slate-500">Simulación OCR Google Document AI OFILAB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tipo de Documento */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Tipo de Documento Esperado
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDocType('FAC')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                docType === 'FAC'
                  ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Factura (FAC)</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('GD')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                docType === 'GD'
                  ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guía Despacho (GD)</span>
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Seleccionar Archivo PDF
          </label>

          <label className="border-2 border-dashed border-pink-300 hover:border-pink-500 rounded-xl p-6 bg-pink-50/20 hover:bg-pink-50/50 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center group">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="hidden" 
            />

            {selectedFile ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-pink-100 text-pink-600 border border-pink-200">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-slate-900 font-mono">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB - Listo para procesar
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-slate-100 text-slate-500 group-hover:text-pink-600 group-hover:bg-pink-100 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Haz clic para examinar o arrastra un PDF aquí
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Formatos soportados: .pdf (Máx 25 MB)
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleProcess}
            disabled={!selectedFile || isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center space-x-2 transition-all shadow-md ${
              selectedFile && !isProcessing
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-pink-500/20 scale-[1.02]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ejecutando OCR Google AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Procesar y Asignar Nombre Final</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
