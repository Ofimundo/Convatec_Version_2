import React from 'react';
import { 
  FileText, 
  FileCode, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Calendar, 
  Building2, 
  Download,
  Eye,
  Copy,
  Check,
  Trash2,
  Loader2
} from 'lucide-react';
import { ProcessedDocument } from '@/app/api/documents/route';
import { ConfirmModal } from '@/components/ConfirmModal';

interface ComidorStatusCellProps {
  isSubido: boolean;
}

const ComidorStatusCell: React.FC<ComidorStatusCellProps> = ({ isSubido }) => {
  const [progress, setProgress] = React.useState(25);
  const [completed, setCompleted] = React.useState(isSubido);

  React.useEffect(() => {
    if (isSubido) {
      setProgress(100);
      const timer = setTimeout(() => {
        setCompleted(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCompleted(false);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95;
          const inc = Math.floor(Math.random() * 8) + 4;
          return Math.min(prev + inc, 95);
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isSubido]);

  if (completed || isSubido) {
    return (
      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs animate-in fade-in duration-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Subido OK</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-1 w-36 mx-auto">
      <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-600 px-0.5">
        <span className="flex items-center space-x-1 text-pink-600">
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span>Subiendo...</span>
        </span>
        <span className="font-mono text-purple-700 font-extrabold">{progress}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
        <div 
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface DocumentTableProps {
  documents: ProcessedDocument[];
  onSelectDocument: (doc: ProcessedDocument) => void;
  onDeleteDocument?: (id: string) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({ 
  documents,
  onSelectDocument,
  onDeleteDocument
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [docToDelete, setDocToDelete] = React.useState<ProcessedDocument | null>(null);

  const handleCopyName = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (documents.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No se encontraron documentos</h3>
        <p className="text-sm text-slate-500 max-w-md">
          No hay resultados coincidentes con la búsqueda o filtro aplicado. Intenta cambiar los criterios de búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="py-4 px-5">Documento Original</th>
              <th className="py-4 px-4">
                <div className="flex items-center space-x-1.5 text-pink-600">
                  <span>Nombre Final (Salida)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-4 px-4">Tipo / Folio</th>
              <th className="py-4 px-4">RUT Emisor / Destino</th>
              <th className="py-4 px-4">Fecha Procesamiento</th>
              <th className="py-4 px-4 text-center">Estado Comidor</th>
              <th className="py-4 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {documents.map((doc) => {
              const isFac = doc.prefijo === 'FAC';
              const isGd = doc.prefijo === 'GD';

              return (
                <tr 
                  key={doc.id}
                  className="hover:bg-pink-50/40 transition-colors duration-150 group"
                >
                  {/* Documento Original */}
                  <td className="py-4 px-5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 group-hover:text-pink-600 group-hover:border-pink-300 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors truncate max-w-[200px]" title={doc.nombreOriginal}>
                          {doc.nombreOriginal}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Entrada preliminar
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Nombre Final (Resultado) */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col space-y-1">
                      {/* PDF Output Badge */}
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-pink-50 border border-pink-200 text-pink-700 font-mono text-xs w-fit">
                        <FileText className="w-3.5 h-3.5 text-pink-600" />
                        <span className="font-bold">{doc.nombreFinalPdf}</span>
                        <button
                          onClick={() => handleCopyName(doc.nombreFinalPdf, `${doc.id}-pdf`)}
                          className="ml-1 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copiar nombre PDF"
                        >
                          {copiedId === `${doc.id}-pdf` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* XML Output Badge */}
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-mono text-[11px] w-fit">
                        <FileCode className="w-3 h-3 text-purple-600" />
                        <span>{doc.nombreFinalXml}</span>
                      </div>
                    </div>
                  </td>

                  {/* Tipo / Folio */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isFac 
                            ? 'bg-pink-100 text-pink-700 border border-pink-200' 
                            : isGd 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {doc.prefijo}
                        </span>
                        <span className="font-extrabold text-slate-900 font-mono text-sm">
                          #{doc.folio}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 truncate max-w-[170px]" title={doc.tipoDocumento}>
                        {doc.tipoDocumento}
                      </span>
                    </div>
                  </td>

                  {/* RUT Emisor / Receptor */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col space-y-0.5 text-xs">
                      <div className="flex items-center space-x-1 text-slate-700">
                        <Building2 className="w-3 h-3 text-pink-600 flex-shrink-0" />
                        <span className="font-mono text-slate-800 font-medium">{doc.rutEmisor || 'N/A'}</span>
                      </div>
                      {doc.rutReceptor && (
                        <div className="text-[10px] text-slate-500 pl-4 font-mono">
                          Destino: {doc.rutReceptor}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Fecha Procesamiento */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span className="font-mono text-slate-700">{doc.fechaProcesamiento}</span>
                    </div>
                  </td>

                  {/* Estado Comidor */}
                  <td className="py-4 px-4 text-center">
                    <ComidorStatusCell isSubido={doc.subidoComidor !== false} />
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onSelectDocument(doc)}
                        className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
                        title="Ver detalles del documento y entidades OCR"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalles</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocToDelete(doc);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center space-x-1 transition-all shadow-xs"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!docToDelete}
        title="Confirmar eliminación"
        message={`¿Estás seguro de eliminar el documento #${docToDelete?.folio} (${docToDelete?.nombreOriginal})?`}
        confirmText="Aceptar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (docToDelete && onDeleteDocument) {
            onDeleteDocument(docToDelete.id);
          }
        }}
        onClose={() => setDocToDelete(null)}
      />
    </div>
  );
};
