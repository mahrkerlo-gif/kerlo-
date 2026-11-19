import { useState } from 'react';
import { CandlestickPoint } from '../types/catalog';

interface CandlestickChartProps {
  title: string;
  subtitle: string;
  data: CandlestickPoint[];
  unitLabel: string;
}

export function CandlestickChart({
  title,
  subtitle,
  data,
  unitLabel,
}: CandlestickChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 680;
  const height = 250;
  const padTop = 20;
  const padBottom = 34;
  const padLeft = 16;
  const padRight = 46;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const rawMax = data.reduce((acc, item) => Math.max(acc, item.high, item.close, item.open), 0);
  const maxVal = Math.max(4, Math.ceil(rawMax * 1.15));
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  const toY = (val: number) => padTop + plotH - (val / maxVal) * plotH;
  const count = Math.max(1, data.length);
  const stepX = plotW / count;
  const candleWidth = Math.max(8, Math.min(24, stepX * 0.56));

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 text-right">
        <div className="space-y-1">
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-950">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            <span>صعود</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
            <span>هبوط</span>
          </span>
        </div>
      </div>

      {/* Live Hover Detail Strip */}
      <div className="min-h-[28px] bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        {hovered ? (
          <>
            <span className="font-semibold text-slate-900 tabular-nums">
              التاريخ: {hovered.dateKey}
            </span>
            <div className="flex flex-wrap items-center gap-4 tabular-nums">
              <span>الافتتاح: {hovered.open}</span>
              <span>الأعلى: {hovered.high}</span>
              <span>الأدنى: {hovered.low}</span>
              <span className="font-bold text-slate-950">
                الإغلاق ({unitLabel}): {hovered.close}
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-500">
            مرر المؤشر على أي شمعة لعرض تفاصيل الفتح والذروة والإغلاق اليومي ({unitLabel}).
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[460px] h-auto select-none"
          role="img"
          aria-label={title}
        >
          {/* Horizontal gridlines & Y-axis ticks */}
          {yTicks.map((tick, idx) => {
            const y = toY(tick);
            return (
              <g key={`${tick}-${idx}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                  strokeWidth={1}
                />
                <text
                  x={width - padRight + 8}
                  y={y + 4}
                  fontSize="10"
                  fill="#64748B"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {data.map((pt, idx) => {
            const cx = padLeft + idx * stepX + stepX / 2;
            const isBullish = pt.close >= pt.open;
            const color = pt.total === 0 && pt.open === 0 ? '#94A3B8' : isBullish ? '#16A34A' : '#DC2626';

            const highY = toY(pt.high);
            const lowY = toY(pt.low);
            const openY = toY(pt.open);
            const closeY = toY(pt.close);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(3, Math.abs(closeY - openY));
            const isHovered = hoveredIdx === idx;

            const showLabel =
              data.length <= 14 || idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1;

            return (
              <g
                key={pt.dateKey}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <rect
                    x={cx - stepX / 2 + 2}
                    y={padTop}
                    width={Math.max(8, stepX - 4)}
                    height={plotH}
                    fill="#F1F5F9"
                    rx={4}
                  />
                )}

                {/* High-Low Wick */}
                <line
                  x1={cx}
                  y1={highY}
                  x2={cx}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={1.75}
                />

                {/* Candle Body */}
                <rect
                  x={cx - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  rx={2}
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Date label */}
                {showLabel && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHovered ? '#0F172A' : '#64748B'}
                    fontWeight={isHovered ? '600' : '400'}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
