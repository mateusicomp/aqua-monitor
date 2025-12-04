import React, { useState, useEffect } from 'react';
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
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500">{payload[0].payload.time}</p>
          <p className="font-semibold" style={{ color: config.color }}>
            {payload[0].value} {range.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Período */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="text-gray-700">Período</h3>
        </div>
        
        <div className="flex gap-2">
          {periods.map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`
                flex-1 px-4 py-2 rounded-xl transition-all
                ${selectedPeriod === period.value
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor de Parâmetro */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(PARAMETER_CONFIG).map(([param, cfg]) => {
          const isSelected = selectedParameter === param;
          const paramRange = IDEAL_RANGES[param as Measurement['parameter']];
          
          // Proteção: só renderiza se houver range configurado
          if (!paramRange) return null;
          
          return (
            <button
              key={param}
              onClick={() => setSelectedParameter(param as Measurement['parameter'])}
              className={`
                p-4 rounded-2xl transition-all border-2
                ${isSelected
                  ? 'border-current shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              style={{
                color: isSelected ? cfg.color : '#6B7280',
                borderColor: isSelected ? cfg.color : undefined
              }}
            >
              <p className="text-sm mb-1">{cfg.label}</p>
              <p className="text-xs opacity-70">{paramRange.unit}</p>
            </button>
          );
        })}
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-gray-700">{config.label}</h3>
            <p className="text-xs text-gray-400">
              Últimas {selectedPeriod === '24h' ? '24 horas' : selectedPeriod === '7d' ? '7 dias' : '30 dias'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
            {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
            {trend === 'stable' && <Minus className="w-5 h-5 text-gray-400" />}
            <span className={`text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' ? 'Crescente' : trend === 'down' ? 'Decrescente' : 'Estável'}
            </span>
          </div>
        </div>

        <div className="h-48">
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

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">Mínimo</p>
              <p className="font-semibold text-blue-600">
                {Math.min(...historyData.map(d => d.value)).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Média</p>
              <p className="font-semibold text-gray-700">
                {(historyData.reduce((acc, d) => acc + d.value, 0) / historyData.length).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Máximo</p>
              <p className="font-semibold text-orange-600">
                {Math.max(...historyData.map(d => d.value)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leituras Recentes */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-700">Leituras Recentes</h3>
          <button 
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
            onClick={() => alert('Funcionalidade de exportação em desenvolvimento')}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {historyData.slice(-10).reverse().map((item, index) => {
            const isInRange = item.value >= range.min && item.value <= range.max;
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="text-sm text-gray-700">{item.value} {range.unit}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                
                <div className={`
                  px-3 py-1 rounded-full text-xs
                  ${isInRange ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                `}>
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