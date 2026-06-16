export type ChartSeries = {
  name: string;
  values: number[];
};

export type ChartMaterialData = {
  chartType: "bar" | "line" | "table";
  title: string;
  unit: string;
  categories: string[];
  series: ChartSeries[];
  source?: string;
};

export type TestMaterial = {
  title?: string | null;
  content?: string | null;
  url?: string | null;
  type?: string | null;
  data?: ChartMaterialData | null;
};

export function isChartMaterialData(
  value: unknown,
): value is ChartMaterialData {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<ChartMaterialData>;
  return (
    (source.chartType === "bar" ||
      source.chartType === "line" ||
      source.chartType === "table") &&
    typeof source.title === "string" &&
    typeof source.unit === "string" &&
    Array.isArray(source.categories) &&
    source.categories.length > 0 &&
    Array.isArray(source.series) &&
    source.series.length > 0 &&
    source.series.every(
      (series) =>
        typeof series?.name === "string" &&
        Array.isArray(series.values) &&
        series.values.length === source.categories?.length &&
        series.values.every((item) => Number.isFinite(Number(item))),
    )
  );
}

export function describeChartData(data: ChartMaterialData) {
  const rows = data.categories.map((category, index) => {
    const values = data.series
      .map((series) => `${series.name}: ${series.values[index]} ${data.unit}`)
      .join("; ");
    return `${category}: ${values}`;
  });
  return [
    data.title,
    `Unit: ${data.unit}`,
    ...rows,
    data.source ? `Source: ${data.source}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
