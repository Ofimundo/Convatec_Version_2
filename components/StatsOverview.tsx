import React from 'react';
import { FileText, FileSpreadsheet, CheckCircle, Clock } from 'lucide-react';
import { ProcessedDocument } from '@/app/api/documents/route';

interface StatsOverviewProps {
  documents: ProcessedDocument[];
  pendingCount?: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ documents, pendingCount = 0 }) => {
  const total = documents.length;
  const facturas = documents.filter(d => d.prefijo === 'FAC').length;
  const guias = documents.filter(d => d.prefijo === 'GD').length;

  const statCards = [
    {
      title: 'Total Documentos',
      value: total,
      subtitle: 'Procesados exitosamente',
      icon: FileText,
      gradient: 'from-pink-500/10 to-purple-500/5',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200'
    },
    {
      title: 'Facturas (FAC)',
      value: facturas,
      subtitle: 'Prefijo FAC_folio.pdf',
      icon: FileSpreadsheet,
      gradient: 'from-purple-500/10 to-indigo-500/5',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Guías de Despacho (GD)',
      value: guias,
      subtitle: 'Prefijo GD_folio.pdf',
      icon: CheckCircle,
      gradient: 'from-fuchsia-500/10 to-pink-500/5',
      iconColor: 'text-fuchsia-600',
      borderColor: 'border-fuchsia-200'
    },
    {
      title: 'Doc. Pendientes',
      value: pendingCount,
      subtitle: pendingCount === 1 ? '1 archivo en doc_pendientes' : `${pendingCount} archivos en doc_pendientes`,
      icon: Clock,
      gradient: 'from-amber-500/10 to-orange-500/5',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl bg-white p-5 border ${card.borderColor} shadow-xs transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
          >
            {/* Background Accent Gradient */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none`} />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {card.subtitle}
                </p>
              </div>

              <div className={`p-3 rounded-xl bg-slate-50 border border-slate-200/60 ${card.iconColor}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
