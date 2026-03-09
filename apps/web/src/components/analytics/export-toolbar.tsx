'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAnalyticsPdf } from '@/lib/export-pdf';

interface ExportToolbarProps {
  getChartElements: () => HTMLDivElement[];
  teamName: string;
  range: string;
  onExportCsv: () => void;
}

export function ExportToolbar({
  getChartElements,
  teamName,
  range,
  onExportCsv,
}: ExportToolbarProps) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const elements = getChartElements();
      await exportAnalyticsPdf(elements, teamName, range);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={exportingPdf}
        onClick={handleExportPdf}
      >
        <FileDown className="h-4 w-4" />
        Export PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onExportCsv}>
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}
