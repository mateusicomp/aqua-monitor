import React from 'react';

interface TabsProps {
  activeTab: 'monitor' | 'historico';
  onTabChange: (tab: 'monitor' | 'historico') => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
      <button
        onClick={() => onTabChange('monitor')}
        className={`flex-1 py-5 px-6 transition-all relative ${
          activeTab === 'monitor'
            ? 'text-teal-600'
            : 'text-gray-400'
        }`}
        aria-label="Aba Monitor - Ver medições em tempo real"
        aria-current={activeTab === 'monitor' ? 'page' : undefined}
      >
        <span className="block mt-4 mb-4">Monitor</span>
        {activeTab === 'monitor' && (
          <div className="absolute bottom-2 left-0 right-0 h-1 bg-teal-600 rounded-t-lg" />
        )}
      </button>
      
      <button
        onClick={() => onTabChange('historico')}
        className={`flex-1 py-5 px-6 transition-all relative ${
          activeTab === 'historico'
            ? 'text-teal-600'
            : 'text-gray-400'
        }`}
        aria-label="Aba Histórico - Ver registros anteriores"
        aria-current={activeTab === 'historico' ? 'page' : undefined}
      >
        <span className="block mt-4 mb-4">Histórico</span>
        {activeTab === 'historico' && (
          <div className="absolute bottom-2 left-0 right-0 h-1 bg-teal-600 rounded-t-lg" />
        )}
      </button>
    </div>
  );
};