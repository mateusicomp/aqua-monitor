import React, { useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TelemetryData, Measurement } from '../types/telemetry';
import { PARAMETER_CONFIG } from '../utils/parameterConfig';
import { IDEAL_RANGES } from '../utils/idealRanges';


type Period = '24h' | '7d' | '30d' | 'custom';

interface HistoryViewProps {
  currentData: TelemetryData | null;
}

// Mock de dados históricos - substituir por consulta real ao Firestore
const generateMockHistory = (parameter: string, hours: number = 24): any[] => {
  const now = Date.now();
  const data = [];
  const interval = (hours * 60 * 60 * 1000) / 20; // 20 pontos
  
  for (let i = 20; i >= 0; i--) {
    const timestamp = now - (i * interval);
    let value;
    
    // Gera valores baseados no parâmetro
    switch (parameter) {
      case 'pH':
        value = 7.0 + (Math.random() - 0.5) * 1.5;
        break;
      case 'temperature':
        value = 25 + (Math.random() - 0.5) * 5;
        break;
      case 'turbidity':
        value = 5 + (Math.random() - 0.5) * 4;
        break;
      case 'tds':
        value = 250 + (Math.random() - 0.5) * 150;
        break;
      default:
        value = 0;
    }
    
    data.push({
      timestamp,
      time: new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      value: parseFloat(value.toFixed(2))
    });
  }
  
  return data;
};

const getTrend = (data: any[]): 'up' | 'down' | 'stable' => {
  if (data.length < 2) return 'stable';
  
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const diff = ((last - first) / first) * 100;
  
  if (Math.abs(diff) < 5) return 'stable';
  return diff > 0 ? 'up' : 'down';
};

export const HistoryView: React.FC<HistoryViewProps> = ({ currentData }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('24h');
  const [selectedParameter, setSelectedParameter] = useState<Measurement['parameter']>('pH');

  const periods = [
    { value: '24h' as Period, label: '24h' },
    { value: '7d' as Period, label: '7 dias' },
    { value: '30d' as Period, label: '30 dias' }
  ];

  const getHoursFromPeriod = (period: Period): number => {
    switch (period) {
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  };

  const historyData = generateMockHistory(selectedParameter, getHoursFromPeriod(selectedPeriod));
  const trend = getTrend(historyData);
  const config = PARAMETER_CONFIG[selectedParameter];
  const range = IDEAL_RANGES[selectedParameter];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
            {payload[0].payload.time}
          </p>
          <p style={{ fontWeight: '600', color: config.color, margin: '4px 0 0 0' }}>
            {payload[0].value} {range.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      padding: '0 0 16px 0'
    }}>
      
      {/* Filtro de Período */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />
          <h3 style={{ color: '#374151', margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Período
          </h3>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '8px' 
        }}>
          {periods.map(period => {
            const isActive = selectedPeriod === period.value;
            return (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: isActive 
                    ? 'linear-gradient(to right, #0d9488, #0891b2)'
                    : '#F3F4F6',
                  color: isActive ? 'white' : '#4B5563',
                  boxShadow: isActive ? '0 4px 6px rgba(13, 148, 136, 0.3)' : 'none'
                }}
              >
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seletor de Parâmetro */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px' 
      }}>
        {Object.entries(PARAMETER_CONFIG).map(([param, cfg]) => {
          const isSelected = selectedParameter === param;
          const paramRange = IDEAL_RANGES[param as Measurement['parameter']];
          
          if (!paramRange) return null;
          
          return (
            <button
              key={param}
              onClick={() => setSelectedParameter(param as Measurement['parameter'])}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: isSelected ? `2px solid ${cfg.color}` : '2px solid #E5E7EB',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 10px 15px rgba(0,0,0,0.1)' : 'none',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <p style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: isSelected ? cfg.color : '#6B7280',
                margin: '0 0 4px 0'
              }}>
                {cfg.label}
              </p>
              <p style={{ 
                fontSize: '12px', 
                opacity: 0.7,
                color: isSelected ? cfg.color : '#6B7280',
                margin: 0
              }}>
                {paramRange.unit}
              </p>
            </button>
          );
        })}
      </div>

      {/* Gráfico */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '16px' 
        }}>
          <div>
            <h3 style={{ color: '#374151', margin: 0, fontSize: '16px', fontWeight: '600' }}>
              {config.label}
            </h3>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
              Últimas {selectedPeriod === '24h' ? '24 horas' : selectedPeriod === '7d' ? '7 dias' : '30 dias'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {trend === 'up' && <TrendingUp style={{ width: '20px', height: '20px', color: '#10B981' }} />}
            {trend === 'down' && <TrendingDown style={{ width: '20px', height: '20px', color: '#EF4444' }} />}
            {trend === 'stable' && <Minus style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />}
            <span style={{ 
              fontSize: '14px',
              color: trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : '#4B5563'
            }}>
              {trend === 'up' ? 'Crescente' : trend === 'down' ? 'Decrescente' : 'Estável'}
            </span>
          </div>
        </div>

        <div style={{ height: '192px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                stroke="#D1D5DB"
              />
              <YAxis 
                domain={[range.min, range.max]}
                tick={{ fontSize: 10 }}
                stroke="#D1D5DB"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={config.color}
                strokeWidth={2}
                dot={{ fill: config.color, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid #F3F4F6' 
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '16px', 
            textAlign: 'center' 
          }}>
            <div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                Mínimo
              </p>
              <p style={{ margin: 0, fontWeight: '600', color: '#2563EB', fontSize: '16px' }}>
                {Math.min(...historyData.map(d => d.value)).toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                Média
              </p>
              <p style={{ margin: 0, fontWeight: '600', color: '#374151', fontSize: '16px' }}>
                {(historyData.reduce((acc, d) => acc + d.value, 0) / historyData.length).toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                Máximo
              </p>
              <p style={{ margin: 0, fontWeight: '600', color: '#EA580C', fontSize: '16px' }}>
                {Math.max(...historyData.map(d => d.value)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leituras Recentes */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '12px' 
        }}>
          <h3 style={{ color: '#374151', margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Leituras Recentes
          </h3>
          <button 
            onClick={() => alert('Funcionalidade de exportação em desenvolvimento')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#0d9488',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            Exportar
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          maxHeight: '256px',
          overflowY: 'auto'
        }}>
          {historyData.slice(-10).reverse().map((item, index) => {
            const isInRange = item.value >= range.min && item.value <= range.max;
            return (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#F9FAFB',
                  transition: 'background 0.2s'
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                    {item.value} {range.unit}
                  </p>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: isInRange ? '#D1FAE5' : '#FEF3C7',
                  color: isInRange ? '#047857' : '#92400E'
                }}>
                  {isInRange ? 'Ideal' : 'Atenção'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
