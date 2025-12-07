import React from 'react';
import { Measurement } from '../types/telemetry';
import { PARAMETER_CONFIG } from '../utils/parameterConfig';
import { IdealRangeBar } from './IdealRangeBar';
import { 
  Droplets, 
  Thermometer, 
  Beaker,  
} from 'lucide-react';


interface MetricCardProps {
  measurement: Measurement;
}

const IconComponent = ({ parameter }: { parameter: Measurement['parameter'] }) => {
  const config = PARAMETER_CONFIG[parameter];
  
  if (!config) {
    return <Droplets size={28} color="#6B7280" strokeWidth={2} />;
  }
  
  const iconProps = {
    size: 28,
    color: config.color,
    strokeWidth: 2
  };

  switch (parameter) {
    case 'pH':
      return <Droplets {...iconProps} />;
    case 'temperature':
      return <Thermometer {...iconProps} />;
    case 'turbidity':
      return <Beaker {...iconProps} />;
    case 'tds':
      return <Droplets {...iconProps} />;
    default:
      return <Droplets {...iconProps} />;
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({ measurement }) => {
  const config = PARAMETER_CONFIG[measurement.parameter];

  if (!config) {
    console.warn(`Parâmetro não configurado: ${measurement.parameter}`);
    return null;
  }

  return (
    <div 
      className="bg-white rounded-2xl p-5 shadow-md border border-gray-100"
      role="article"
      aria-label={`${config.label}: ${measurement.value} ${measurement.unit}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <IconComponent parameter={measurement.parameter} />
          </div>
          <div>
            <h3 className="text-gray-700">{config.label}</h3>
          </div>
        </div>
        
        <div className="text-right">
          <p 
            className="text-3xl"
            style={{ color: config.color }}
          >
            {measurement.value.toFixed(1)}
          </p>
          <p className="text-gray-500 text-sm mt-1">{measurement.unit}</p>
        </div>
      </div>
      
      <IdealRangeBar 
        parameter={measurement.parameter} 
        value={measurement.value} 
      />
    </div>
  );
};