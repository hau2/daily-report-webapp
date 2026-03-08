'use client';

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SummaryCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  children?: ReactNode;
}

export function SummaryCard({
  title,
  value,
  trend,
  trendLabel,
  subtitle,
  children,
}: SummaryCardProps) {
  const trendColor =
    trend !== undefined && trend > 0
      ? 'text-green-600'
      : trend !== undefined && trend < 0
        ? 'text-red-600'
        : 'text-gray-400';

  const TrendIcon =
    trend !== undefined && trend > 0
      ? TrendingUp
      : trend !== undefined && trend < 0
        ? TrendingDown
        : Minus;

  const formattedTrend =
    trend !== undefined && trend !== 0
      ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`
      : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children ?? (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {(trend !== undefined || subtitle) && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend !== undefined && (
              <>
                <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                {formattedTrend && (
                  <span className={trendColor}>{formattedTrend}</span>
                )}
              </>
            )}
            {trendLabel && (
              <span className="text-muted-foreground">{trendLabel}</span>
            )}
            {subtitle && (
              <span className="text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
