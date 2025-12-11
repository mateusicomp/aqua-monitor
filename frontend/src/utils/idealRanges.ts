import { RangeMap, Measurement } from '../types/telemetry';

export const IDEAL_RANGES: RangeMap = {
  pH: { min: 6.5, max: 8.5, unit: 'pH' },
  temperature: { min: 20, max: 30, unit: '°C' },
  turbidity: { min: 5, max: 100, unit: 'NTU' },
  tds: { min: 10, max: 300, unit: 'ppm' }
};

export const getIdealRange = (parameter: Measurement['parameter']): string => {
  const range = IDEAL_RANGES[parameter];
  return `${range.min}–${range.max}`;
};

export const getPositionInRange = (
  parameter: Measurement['parameter'],
  value: number
): number => {
  const range = IDEAL_RANGES[parameter];
  const total = range.max - range.min;
  const position = ((value - range.min) / total) * 100;
  return Math.max(0, Math.min(100, position));
};

export const isInIdealRange = (
  parameter: Measurement['parameter'],
  value: number
): boolean => {
  const range = IDEAL_RANGES[parameter];
  return value >= range.min && value <= range.max;
};