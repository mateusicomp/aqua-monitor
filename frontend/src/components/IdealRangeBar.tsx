import React from 'react';
import { getPositionInRange, IDEAL_RANGES } from '../utils/idealRanges';
import { Measurement } from '../types/telemetry';
import { PARAMETER_CONFIG } from '../utils/parameterConfig';


interface IdealRangeBarProps {
  parameter: Measurement['parameter'];
  value: number;
}

export const IdealRangeBar: React.FC<IdealRangeBarProps> = ({ parameter, value }) => {
  const range = IDEAL_RANGES[parameter];
  const config = PARAMETER_CONFIG[parameter];
  
  if (!range || !config) {
    console.warn(`Range ou config não encontrado para parâmetro: ${parameter}`);
    return null;
  }
  
  const position = getPositionInRange(parameter, value);

  return (
    <div className="mt-3">
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* Barra preenchida até a porcentagem */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${position}%`,
            backgroundColor: config.barColor
          }}
          aria-label={`Valor atual: ${value} de ${range.max} ${range.unit}`}
        />
      </div>
      
      {/* Labels de range */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-gray-400 text-xs">{range.min} {range.unit}</span>
        <span className="text-emerald-600 text-xs">Ideal: {range.min}–{range.max}</span>
        <span className="text-gray-400 text-xs">{range.max} {range.unit}</span>
      </div>
    </div>
  );
};