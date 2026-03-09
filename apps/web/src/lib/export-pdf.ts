import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export async function exportAnalyticsPdf(
  chartElements: HTMLElement[],
  teamName: string,
  range: string,
): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Title page
  pdf.setFontSize(24);
  pdf.text(`${teamName} - Analytics Report`, pageWidth / 2, 40, {
    align: 'center',
  });
  pdf.setFontSize(14);
  pdf.text(
    `Range: ${range} | Generated: ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    55,
    { align: 'center' },
  );

  // Each chart on its own page
  for (const element of chartElements) {
    pdf.addPage();
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 1.5,
    });

    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = pageHeight - margin * 2;
    pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight);
  }

  pdf.save(`${teamName}-analytics-${range}.pdf`);
}
