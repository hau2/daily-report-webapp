import { toPng } from 'html-to-image';

export async function exportPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
