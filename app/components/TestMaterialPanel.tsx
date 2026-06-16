"use client";

import type { ChartMaterialData, TestMaterial } from "@/lib/test-material";
import { isChartMaterialData } from "@/lib/test-material";

const SERIES_COLORS = ["#2563eb", "#7c3aed", "#059669", "#ea580c"];

export function TestMaterialPanel({
  material,
  compact = false,
}: {
  material: TestMaterial;
  compact?: boolean;
}) {
  const chart = isChartMaterialData(material.data) ? material.data : null;
  const hasMaterial = Boolean(
    material.title ||
      material.content ||
      material.url ||
      chart,
  );
  if (!hasMaterial) return null;

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      {material.title ? (
        <h2 className="text-xl font-bold text-slate-950">
          {material.title}
        </h2>
      ) : null}

      {material.url && material.type === "IMAGE" ? (
        <img
          src={material.url}
          alt={material.title || "Tài liệu đề bài"}
          className="mt-4 max-h-[70vh] w-full rounded-xl border border-slate-200 object-contain"
        />
      ) : null}

      {material.url && material.type === "PDF" ? (
        <iframe
          src={material.url}
          title={material.title || "Tài liệu PDF"}
          className="mt-4 h-[70vh] w-full rounded-xl border border-slate-200"
        />
      ) : null}

      {chart ? <ChartView data={chart} /> : null}

      {material.content ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-800">
          {material.content}
        </div>
      ) : null}
    </section>
  );
}

function ChartView({ data }: { data: ChartMaterialData }) {
  if (data.chartType === "table") {
    return <ChartTable data={data} />;
  }

  const width = 720;
  const height = 390;
  const padding = { top: 40, right: 24, bottom: 80, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const allValues = data.series.flatMap((series) => series.values);
  const maxValue = Math.max(1, ...allValues);
  const yMax = Math.ceil(maxValue / 10) * 10 || maxValue;
  const groupWidth = plotWidth / data.categories.length;

  return (
    <div className="mt-4">
      <p className="text-center text-sm font-bold text-slate-900">
        {data.title}
      </p>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={data.title}
          className="min-w-[620px]"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#64748b"
                >
                  {Math.round(yMax * ratio)}
                </text>
              </g>
            );
          })}

          {data.chartType === "bar"
            ? data.categories.flatMap((category, categoryIndex) => {
                const barWidth =
                  Math.min(32, groupWidth * 0.7) / data.series.length;
                return data.series.map((series, seriesIndex) => {
                  const value = series.values[categoryIndex];
                  const barHeight = (value / yMax) * plotHeight;
                  const x =
                    padding.left +
                    categoryIndex * groupWidth +
                    groupWidth / 2 -
                    (barWidth * data.series.length) / 2 +
                    seriesIndex * barWidth;
                  const y = padding.top + plotHeight - barHeight;
                  return (
                    <rect
                      key={`${category}-${series.name}`}
                      x={x}
                      y={y}
                      width={Math.max(5, barWidth - 2)}
                      height={barHeight}
                      rx="2"
                      fill={SERIES_COLORS[seriesIndex % SERIES_COLORS.length]}
                    />
                  );
                });
              })
            : data.series.flatMap((series, seriesIndex) => {
                const points = series.values
                  .map((value, index) => {
                    const x =
                      padding.left + groupWidth * (index + 0.5);
                    const y =
                      padding.top +
                      plotHeight -
                      (value / yMax) * plotHeight;
                    return `${x},${y}`;
                  })
                  .join(" ");
                return [
                  <polyline
                    key={`${series.name}-line`}
                    points={points}
                    fill="none"
                    stroke={
                      SERIES_COLORS[seriesIndex % SERIES_COLORS.length]
                    }
                    strokeWidth="3"
                  />,
                  ...series.values.map((value, index) => {
                    const x =
                      padding.left + groupWidth * (index + 0.5);
                    const y =
                      padding.top +
                      plotHeight -
                      (value / yMax) * plotHeight;
                    return (
                      <circle
                        key={`${series.name}-${index}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill={
                          SERIES_COLORS[
                            seriesIndex % SERIES_COLORS.length
                          ]
                        }
                      />
                    );
                  }),
                ];
              })}

          {data.categories.map((category, index) => (
            <text
              key={category}
              x={padding.left + groupWidth * (index + 0.5)}
              y={height - padding.bottom + 24}
              textAnchor="middle"
              fontSize="12"
              fill="#475569"
            >
              {category}
            </text>
          ))}

          <text
            x={18}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#475569"
            transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}
          >
            {data.unit}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {data.series.map((series, index) => (
          <span
            key={series.name}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600"
          >
            <span
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor:
                  SERIES_COLORS[index % SERIES_COLORS.length],
              }}
            />
            {series.name}
          </span>
        ))}
      </div>
      {data.source ? (
        <p className="mt-3 text-center text-xs text-slate-500">
          Source: {data.source}
        </p>
      ) : null}
    </div>
  );
}

function ChartTable({ data }: { data: ChartMaterialData }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="mb-3 text-center text-sm font-bold text-slate-900">
        {data.title}
      </p>
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 p-2 text-left">
              Category
            </th>
            {data.series.map((series) => (
              <th
                key={series.name}
                className="border border-slate-300 bg-slate-100 p-2 text-right"
              >
                {series.name} ({data.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.categories.map((category, index) => (
            <tr key={category}>
              <td className="border border-slate-300 p-2 font-medium">
                {category}
              </td>
              {data.series.map((series) => (
                <td
                  key={series.name}
                  className="border border-slate-300 p-2 text-right"
                >
                  {series.values[index]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
