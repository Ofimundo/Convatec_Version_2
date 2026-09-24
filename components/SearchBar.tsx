import React from 'react';
import { Search, X, Filter, FileText, CheckCircle2, FileCode, Calendar, Clock } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  totalResults: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  dateFilter,
  setDateFilter,
  totalResults
}) => {
  const filterOptions = [
    { id: 'ALL', label: 'Todos los Tipos', icon: FileText },
    { id: 'FAC', label: 'Facturas (FAC)', icon: FileCode },
    { id: 'GD', label: 'Guías (GD)', icon: CheckCircle2 },
  ];

  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="w-full flex flex-col space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Input de Búsqueda con Barra de Resaltado OFILAB */}
        <div className="relative w-full md:w-2/3 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-pink-500 group-focus-within:text-pink-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre original, nombre final (FAC_97283), folio, RUT emisor/receptor..."
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 shadow-xs"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4 bg-slate-200/80 rounded-full p-0.5" />
            </button>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 text-xs text-slate-600 px-1">
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-700 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-pink-500 mr-2 animate-pulse" />
            {totalResults} {totalResults === 1 ? 'documento encontrado' : 'documentos encontrados'}
          </span>
        </div>
      </div>

      {/* Chips de Filtrado por Tipo y Fecha */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-3 border-t border-slate-200/80">
        
        {/* Filtro por Tipo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center mr-1 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 mr-1 text-pink-600" />
            Tipo:
          </span>
          
          {filterOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setActiveFilter(opt.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/20 border border-pink-400/30 scale-[1.02]'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-xs'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filtro por Fecha con Atajos y Calendario */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center mr-1 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 mr-1 text-purple-600" />
            Fecha:
          </span>

          {/* Atajo: Hoy */}
          <button
            onClick={() => setDateFilter(getTodayString())}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dateFilter === getTodayString()
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Hoy
          </button>

          {/* Input de Fecha Especifica */}
          <div className="flex items-center space-x-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs font-mono font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200"
                title="Limpiar filtro de fecha"
              >
                Ver Todas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
