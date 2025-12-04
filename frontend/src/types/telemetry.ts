export interface Measurement {
  parameter: 'pH' | 'temperature' | 'turbidity' | 'tds';
  value: number;
  unit: string;
}

export interface TelemetryData {
  site_id: string;
  device_id: string;
  sent_at: Date;
  measurements: Measurement[];
}

export interface IdealRange {
  min: number;
  max: number;
  unit: string;
}

export type RangeMap = {
  [key in Measurement['parameter']]: IdealRange;
};
