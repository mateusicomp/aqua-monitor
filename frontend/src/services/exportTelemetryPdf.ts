import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export interface ExportHistoryPoint {
  timestamp: number;
  value: number;
  time?: string;
}

export interface TelemetryPdfOptions {
  siteId?: string;
  deviceId?: string;
  parameterKey: string;
  parameterLabel: string;
  unit: string;
  periodLabel: string;
  min?: number | null;
  max?: number | null;
  avg?: number | null;
  idealMin: number;
  idealMax: number;
}

export function exportTelemetryPdf(
  points: ExportHistoryPoint[],
  options: TelemetryPdfOptions
) {
  if (!points.length) {
    alert('Não há dados para exportar neste período.');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const generatedAt = new Date();

  // Título
  doc.setFontSize(16);
  doc.setTextColor(23, 37, 84); // azul escuro
  doc.text('Relatório de Telemetria da Água', 105, 15, { align: 'center' });

  // Metadados
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81); // slate-700

  let y = 25;
  doc.text(`Parâmetro: ${options.parameterLabel} (${options.unit})`, 14, y);
  y += 6;
  doc.text(`Período: ${options.periodLabel}`, 14, y);
  y += 6;

  if (options.siteId) {
    doc.text(`Site: ${options.siteId}`, 14, y);
    y += 6;
  }

  if (options.deviceId) {
    doc.text(`Dispositivo: ${options.deviceId}`, 14, y);
    y += 6;
  }

  doc.text(
    `Geração: ${generatedAt.toLocaleString('pt-BR')}`,
    14,
    y
  );
  y += 8;

  // Resumo estatístico
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Resumo estatístico', 14, y);
  y += 6;

  const minStr =
    options.min != null ? `${options.min.toFixed(2)} ${options.unit}` : '--';
  const avgStr =
    options.avg != null ? `${options.avg.toFixed(2)} ${options.unit}` : '--';
  const maxStr =
    options.max != null ? `${options.max.toFixed(2)} ${options.unit}` : '--';
  const idealStr = `${options.idealMin.toFixed(2)} a ${options.idealMax.toFixed(
    2
  )} ${options.unit}`;

  doc.setFontSize(10);
  doc.text(`Mínimo: ${minStr}`, 14, y);
  doc.text(`Média: ${avgStr}`, 80, y);
  doc.text(`Máximo: ${maxStr}`, 150, y);
  y += 6;
  doc.text(`Faixa ideal: ${idealStr}`, 14, y);
  y += 8;

  // Tabela com leituras
  const body = points
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((p, idx) => {
      const d = new Date(p.timestamp);
      const status =
        p.value >= options.idealMin && p.value <= options.idealMax
          ? 'Ideal'
          : 'Atenção';

      return [
        String(idx + 1),
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        `${p.value.toFixed(2)} ${options.unit}`,
        status
      ];
    });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Data', 'Hora', 'Valor', 'Status']],
    body,
    styles: {
      fontSize: 9
    },
    headStyles: {
      fillColor: [13, 148, 136], // verde-água
      textColor: 255
    },
    alternateRowStyles: {
      fillColor: [243, 244, 246]
    },
    margin: { left: 14, right: 14 }
  });

  const fileNameSafeParam = options.parameterKey.replace(/\W+/g, '_').toLowerCase();
  const fileName = `relatorio_${fileNameSafeParam}_${generatedAt
    .toISOString()
    .slice(0, 10)}.pdf`;

  doc.save(fileName);
}
