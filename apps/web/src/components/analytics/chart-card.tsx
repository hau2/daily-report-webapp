'use client';

import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportPng } from '@/lib/export-png';

interface ChartCardProps {
  title: string;
  filename: string;
  children: React.ReactNode;
}

export function ChartCard({ title, filename, children }: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await exportPng(cardRef.current, filename);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={exporting}
          title="Download as PNG"
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
