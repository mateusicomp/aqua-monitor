import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { HeaderCard } from '../components/HeaderCard';
import { Tabs } from '../components/Tabs';
import { MetricCard } from '../components/MetricCard';
import { TelemetryData } from '../types/telemetry';
import { subscribeToLatestTelemetry } from '../services/firestore';


type LoadingState = 'loading' | 'success' | 'error' | 'empty';

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'historico'>('monitor');
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setLoadingState('loading');

    const unsubscribe = subscribeToLatestTelemetry(
      (data) => {
        if (data) {
          setTelemetryData({
            site_id: data.site_id,
            device_id: data.device_id,
            sent_at: data.sent_at.toDate(),
            measurements: data.measurements
          });
          setLoadingState('success');
        } else {
          setLoadingState('empty');
        }
      },
      (error) => {
        console.error('Erro ao buscar dados:', error);
        setErrorMessage(error.message);
        setLoadingState('error');
      }
    );
    
    return () => unsubscribe();
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderCard
        siteId={telemetryData?.site_id || 'fazenda-x_rio-igarape'}
        lastUpdate={telemetryData?.sent_at || null}
      />

      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-4">
        {activeTab === 'monitor' && (
          <>
            {loadingState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent" />
                <p className="text-gray-500 mt-4">Carregando dados...</p>
              </div>
            )}

            {loadingState === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <AlertCircle className="text-red-500 w-10 h-10 mx-auto mb-3" />
                <h3 className="text-red-900 mb-2">Erro ao carregar dados</h3>
                <p className="text-red-700 text-sm mb-4">
                  {errorMessage || 'Não foi possível conectar ao servidor'}
                </p>
                <button
                  onClick={handleRetry}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-red-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  Tentar novamente
                </button>
              </div>
            )}

            {loadingState === 'empty' && (
              <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 text-center">
                <AlertCircle className="text-gray-400 w-10 h-10 mx-auto mb-3" />
                <h3 className="text-gray-700 mb-2">Nenhum dado encontrado</h3>
                <p className="text-gray-500 text-sm">
                  Aguardando primeira leitura dos sensores
                </p>
              </div>
            )}

            {loadingState === 'success' && telemetryData && (
              <>
                {/* Informações do dispositivo */}
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Device ID</p>
                      <p className="text-gray-700 text-sm">{telemetryData.device_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs mb-1">Site ID</p>
                      <p className="text-gray-700 text-sm">{telemetryData.site_id}</p>
                    </div>
                  </div>
                </div>

                {/* Cards de métricas */}
                <div className="space-y-4">
                  {telemetryData.measurements.map((measurement, index) => (
                    <MetricCard
                      key={`${measurement.parameter}-${index}`}
                      measurement={measurement}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'historico' && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500">Funcionalidade de histórico em desenvolvimento</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
