import React from 'react';


interface HeaderCardProps {
  siteId: string;
  lastUpdate: Date | null;
}

export const HeaderCard: React.FC<HeaderCardProps> = ({ siteId, lastUpdate }) => {
  const formatLastUpdate = (date: Date | null): string => {
    if (!date) return '--:--';
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-teal-500 p-6 pb-8">
      <div className="mb-6">
        <h1 className="text-white">Monitor Viveiro</h1>
        <p className="text-white/90 text-sm mt-1">Aquicultura</p>
      </div>
      
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
        <p className="text-white/80 text-xs mb-2">Local</p>
        <p className="text-white mb-3">{siteId || 'Carregando...'}</p>
        <p className="text-white/80 text-xs">
          Última atualização: {formatLastUpdate(lastUpdate)}
        </p>
      </div>
    </div>
  );
};