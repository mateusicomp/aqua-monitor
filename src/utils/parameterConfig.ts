import { Measurement } from '../types/telemetry';

export interface ParameterConfig {
  label: string;
  icon: string;
  color: string;
  barColor: string;
}

export const PARAMETER_CONFIG: Record<Measurement['parameter'], ParameterConfig> = {
  pH: {
    label: 'pH',
    icon: 'water-outline',
    color: '#06B6D4',
    barColor: '#06B6D4'
  },
  temperature: {
    label: 'Temperatura',
    icon: 'thermometer-outline',
    color: '#F97316',
    barColor: '#FB923C'
  },
  turbidity: {
    label: 'Turbidez',
    icon: 'beaker-outline',
    color: '#78716C',
    barColor: '#A8A29E'
  },
  tds: {
    label: 'Condutividade (TDS)',
    icon: 'water-outline',
    color: '#A855F7',
    barColor: '#C084FC'
  },
  od: {
    label: 'Oxigênio Dissolvido',
    icon: 'fish-outline',
    color: '#10B981',
    barColor: '#34D399'
  }
};