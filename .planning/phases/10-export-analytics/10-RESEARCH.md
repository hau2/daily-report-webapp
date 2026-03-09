# Phase 10: Export Analytics - Research

**Researched:** 2026-03-09
**Domain:** Client-side export (PNG/PDF/CSV) from Recharts analytics dashboard
**Confidence:** HIGH

## Summary

Phase 10 adds three export capabilities to the existing analytics dashboard (Phase 8): individual chart PNG download, full-page PDF report, and raw analytics CSV export. All three requirements are **purely frontend** -- the analytics data already flows through existing API endpoints (`GET /teams/:id/analytics/team` and `GET /teams/:id/analytics/member/:userId`), and chart rendering uses Recharts (v3.8.0) with `ResponsiveContainer` inside `Card` components.

The recommended approach uses `html-to-image` for PNG capture of individual chart Card elements, `jspdf` combined with `html-to-image` for multi-page PDF generation, and a simple client-side CSV builder (no library needed) that transforms the already-fetched analytics response data into downloadable files. No new backend endpoints are required.

**Primary recommendation:** Use `html-to-image` (toPng) for chart PNG export, `jspdf` + `html-to-image` for PDF, and a hand-written CSV utility for raw data export. Wrap each chart in a `ChartCard` component that adds a download button overlay.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPORT-01 | Owner can download any analytics chart as a PNG image | `html-to-image` toPng on chart Card ref; download via blob URL |
| EXPORT-02 | Owner can download a full analytics report as a PDF | `jspdf` with `html-to-image` capturing each chart as image, adding to PDF pages |
| EXPORT-03 | Owner can export raw analytics data as a CSV file | Client-side CSV builder from TeamAnalyticsResponse / MemberAnalyticsResponse data |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html-to-image | ^1.11 | Convert DOM nodes to PNG/JPEG data URLs | Lightweight (no html2canvas dep), handles SVG well (which Recharts uses), actively maintained |
| jspdf | ^2.5 | Client-side PDF generation | Industry standard, no server needed, supports addImage for chart snapshots |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-saver | ^2.0 | Cross-browser file download trigger | Only if `a.click()` blob download pattern proves unreliable; likely NOT needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html-to-image | recharts-to-png | recharts-to-png has Recharts v3 compatibility concerns; html-to-image works on any DOM node including the Card wrapper (title + chart together) |
| html-to-image | html2canvas | html2canvas is heavier (200KB+), html-to-image is lighter and handles SVG natively |
| jspdf | @react-pdf/renderer | react-pdf requires rebuilding layout in its own component model; jspdf can snapshot existing DOM |
| hand-rolled CSV | papaparse | Overkill for simple flat data serialization; analytics response shapes are known at compile time |

**Installation:**
```bash
cd apps/web && pnpm add html-to-image jspdf
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── lib/
│   ├── export-png.ts        # toPng wrapper with error handling
│   ├── export-pdf.ts        # PDF generation from multiple chart refs
│   └── export-csv.ts        # CSV builder for analytics data
├── components/analytics/
│   ├── chart-card.tsx        # NEW: Card wrapper with PNG download button
│   ├── export-toolbar.tsx    # NEW: PDF + CSV export buttons bar
│   ├── team-overview.tsx     # MODIFIED: use ChartCard instead of raw Card
│   ├── member-analytics.tsx  # MODIFIED: use ChartCard instead of raw Card
│   └── summary-card.tsx      # Unchanged
```

### Pattern 1: ChartCard Wrapper with Download Button
**What:** A reusable wrapper component that renders a Card with a chart title and an overlay download (PNG) button in the top-right corner of the CardHeader.
**When to use:** Every chart in both TeamOverview and MemberAnalytics tabs.
**Example:**
```typescript
// apps/web/src/components/analytics/chart-card.tsx
'use client';
import { useRef, useCallback, useState } from 'react';
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

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await exportPng(cardRef.current, filename);
    } finally {
      setExporting(false);
    }
  }, [filename]);

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDownload}
          disabled={exporting}
          title="Download as PNG"
        >
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

### Pattern 2: Export Utility Functions (Pure, No React)
**What:** Standalone async functions in `lib/` that handle the actual export logic.
**When to use:** Called from component click handlers.
**Example:**
```typescript
// apps/web/src/lib/export-png.ts
import { toPng } from 'html-to-image';

export async function exportPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2, // Retina quality
  });
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
```

### Pattern 3: CSV from Typed Analytics Data
**What:** Convert known TypeScript interfaces to CSV strings client-side.
**When to use:** For EXPORT-03, transforming already-fetched TeamAnalyticsResponse or MemberAnalyticsResponse.
**Example:**
```typescript
// apps/web/src/lib/export-csv.ts
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function teamAnalyticsToCsv(data: TeamAnalyticsResponse): string {
  // Submission rates
  let csv = 'Date,Submission Rate (%),Submitted,Total\n';
  for (const row of data.submissionRates) {
    csv += `${row.date},${row.rate.toFixed(1)},${row.submitted},${row.total}\n`;
  }
  csv += '\nMember,Task Count\n';
  for (const row of data.taskVolumeByMember) {
    csv += `"${row.displayName}",${row.taskCount}\n`;
  }
  // ... stress trend, heatmap sections
  return csv;
}
```

### Pattern 4: PDF Generation from Chart Refs
**What:** Collect refs to all visible chart cards, snapshot each to PNG, compose into a multi-page PDF.
**When to use:** EXPORT-02 "Download Full Report" button.
**Example:**
```typescript
// apps/web/src/lib/export-pdf.ts
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export async function exportAnalyticsPdf(
  chartElements: HTMLElement[],
  teamName: string,
  range: string,
): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  // Title page
  pdf.setFontSize(20);
  pdf.text(`${teamName} - Analytics Report`, margin, 20);
  pdf.setFontSize(12);
  pdf.text(`Range: ${range} | Generated: ${new Date().toLocaleDateString()}`, margin, 30);

  for (let i = 0; i < chartElements.length; i++) {
    pdf.addPage();
    const dataUrl = await toPng(chartElements[i], {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = pageHeight - margin * 2;
    pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight);
  }

  pdf.save(`${teamName}-analytics-${range}.pdf`);
}
```

### Anti-Patterns to Avoid
- **Server-side PDF generation:** No need for Puppeteer/Playwright on the backend. All data is already rendered client-side. Adds deployment complexity for zero benefit.
- **Wrapping every chart in recharts-to-png hooks:** The `useCurrentPng` hook from recharts-to-png requires attaching refs directly to Recharts components and has Recharts v3 compatibility issues. Using `html-to-image` on the wrapping Card element is simpler and captures the title too.
- **Building a custom CSV parser:** The data shapes are known TypeScript types. String concatenation with proper escaping is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM-to-image conversion | Custom SVG serializer + canvas | html-to-image `toPng()` | Handles CSS computed styles, SVG foreignObject, cross-origin, retina scaling |
| PDF document creation | Manual PDF binary format | jspdf | PDF spec is complex; jspdf handles fonts, pages, image embedding |
| File download trigger | Custom form submission or iframe hack | Blob URL + anchor click | Standard pattern, works in all modern browsers |

**Key insight:** Chart PNG export and PDF generation are solved problems. The complexity is in DOM rendering fidelity (CSS, SVG, fonts), not in the file format itself.

## Common Pitfalls

### Pitfall 1: ResponsiveContainer Creates 0-Height Captures
**What goes wrong:** `html-to-image` captures a 0-height image because `ResponsiveContainer` uses a resize observer and may not have explicit dimensions.
**Why it happens:** The chart container relies on parent CSS for sizing.
**How to avoid:** Capture the parent `Card` element (which has explicit height from CardContent), not the `ResponsiveContainer` directly. The ChartCard pattern handles this by using `cardRef` on the outer Card.
**Warning signs:** Exported PNG is a thin horizontal line or blank.

### Pitfall 2: White Text on White Background in PNG
**What goes wrong:** Tooltips or chart elements styled for dark mode appear invisible in exported PNG.
**Why it happens:** `html-to-image` captures current styles; if dark mode is active, background may be transparent.
**How to avoid:** Always pass `backgroundColor: '#ffffff'` to `toPng()` options. Current codebase uses hardcoded `bg-white` in tooltips, so this is mainly a defensive measure.
**Warning signs:** PNG looks blank or has floating text.

### Pitfall 3: Large PDF File Size
**What goes wrong:** PDF with 8+ charts at pixelRatio:2 exceeds 10MB.
**Why it happens:** Each chart image is ~500KB-1MB at 2x resolution.
**How to avoid:** Use JPEG format for PDF images (`toPng` -> convert to JPEG via canvas), or reduce pixelRatio to 1.5 for PDF while keeping 2 for standalone PNG.
**Warning signs:** PDF download takes very long or browser freezes.

### Pitfall 4: CSV Escaping
**What goes wrong:** Member names containing commas or quotes break CSV format.
**Why it happens:** CSV requires quoting fields that contain delimiters.
**How to avoid:** Wrap all string fields in double quotes and escape internal quotes by doubling them: `"John ""JD"" Doe"`.
**Warning signs:** CSV opens in Excel with misaligned columns.

### Pitfall 5: Heatmap Table Not Captured Correctly
**What goes wrong:** The workload heatmap (HTML table, not Recharts) may have overflow-x clipping in the PNG.
**Why it happens:** `overflow-x-auto` on the table wrapper clips content outside viewport.
**How to avoid:** Before capture, temporarily remove overflow clipping or capture the inner table element. Or accept that the captured PNG shows whatever is currently visible (simpler).
**Warning signs:** Heatmap PNG is truncated on the right side.

## Code Examples

### Existing Pattern: CSV Export (Phase 4 Manager Dashboard)
```typescript
// From apps/web/src/app/(dashboard)/manager/[teamId]/page.tsx
// This pattern fetches CSV from backend. Phase 10 CSV will be client-side instead.
const res = await fetch(`${API_URL}/teams/${teamId}/reports/export?date=${date}`, {
  credentials: 'include',
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `team-report-${date}.csv`;
a.click();
URL.revokeObjectURL(url);
```

### Existing Pattern: Chart Card Structure (Current)
```typescript
// From team-overview.tsx -- this Card+CardHeader+CardContent pattern
// will be replaced with ChartCard wrapper
<Card>
  <CardHeader>
    <CardTitle className="text-base">Submission Rate</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.submissionRates}>
        {/* ... */}
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

### Available Analytics Data (for CSV export)
```typescript
// TeamAnalyticsResponse contains:
// - summary: submissionRate, avgHoursPerDay, stressDistribution, taskCount + trends
// - submissionRates: [{date, rate, submitted, total}]
// - heatmap: [{userId, displayName, date, hours}]
// - stressTrend: [{date, low, medium, high}]
// - taskVolumeByMember: [{userId, displayName, taskCount}]

// MemberAnalyticsResponse contains:
// - summary: submissionStreak, avgHours, teamAvgHours, mostCommonStress, etc.
// - dailyHours: [{date, hours, teamAvg}]
// - stressTimeline: [{date, level}]
// - dailyTasks: [{date, count}]
// - submissionCalendar: [{date, submitted}]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas for DOM capture | html-to-image (SVG foreignObject) | 2022+ | Smaller bundle, better SVG support |
| Server-side PDF (Puppeteer) | Client-side jspdf + image | Ongoing | No server dependency, instant generation |
| recharts-to-png for Recharts | html-to-image on wrapper element | Recharts v3 | Avoids version-coupling to Recharts internals |

## Open Questions

1. **Heatmap table overflow in PNG**
   - What we know: The heatmap uses `overflow-x-auto` which may clip content
   - What's unclear: Whether `html-to-image` captures the full scrollable content or only visible portion
   - Recommendation: Test during implementation; if clipped, either remove overflow temporarily before capture or document as known limitation for very wide heatmaps

2. **PDF layout preference**
   - What we know: Requirements say "full analytics report as a PDF containing all charts and summary data"
   - What's unclear: Whether landscape or portrait is preferred, how many charts per page
   - Recommendation: Use landscape A4, one chart per page with title, plus a summary page at the start. This avoids complex layout calculations.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (backend), TypeScript type-check (frontend) |
| Config file | apps/api/vitest.config.ts, apps/web/tsconfig.json |
| Quick run command | `cd apps/web && pnpm exec tsc --noEmit` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPORT-01 | PNG download from chart card button | manual-only | Manual: click download icon on chart card, verify PNG saved | N/A - DOM capture requires browser |
| EXPORT-02 | PDF download with all charts | manual-only | Manual: click "Download PDF" button, verify PDF opens with charts | N/A - DOM capture requires browser |
| EXPORT-03 | CSV download of raw analytics data | unit | `cd apps/web && pnpm exec tsc --noEmit` (type safety only) | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/web && pnpm exec tsc --noEmit`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + manual browser verification of all 3 export types

### Wave 0 Gaps
None -- this phase is purely frontend with no new backend code. Type-checking via `tsc --noEmit` covers the export utility function signatures. Manual browser testing covers the actual DOM capture and file download behavior (which cannot be automated without a full E2E framework like Playwright).

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/web/src/components/analytics/team-overview.tsx`, `member-analytics.tsx` -- current chart structure using Recharts v3.8.0 with Card wrappers
- Codebase inspection: `packages/shared/src/types/analytics.ts` -- all analytics response types fully defined
- Codebase inspection: `apps/web/package.json` -- confirms recharts ^3.8.0, React 19, Next.js 15

### Secondary (MEDIUM confidence)
- [html-to-image npm](https://www.npmjs.com/package/html-to-image) -- API docs for toPng, options
- [jsPDF npm](https://www.npmjs.com/package/jspdf) -- API for addImage, save
- [recharts-to-png GitHub](https://github.com/brammitch/recharts-to-png) -- Recharts v3 compatibility issues documented
- [Recharts export discussion](https://github.com/recharts/recharts/issues/1321) -- community approaches for chart export

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - html-to-image and jspdf are well-established, no exotic requirements
- Architecture: HIGH - Pattern is straightforward (ChartCard wrapper + utility functions), follows existing codebase patterns
- Pitfalls: MEDIUM - ResponsiveContainer capture behavior and heatmap overflow need testing during implementation

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable libraries, low churn)
