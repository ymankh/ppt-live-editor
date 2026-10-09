import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, Pie, PieChart, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartElement, Theme } from '@/types/model';
import type { ReactNode } from 'react';
import { strings } from "@/strings";


export function ChartRenderer({ element, theme }: { element: ChartElement; theme: Theme }) {
  const { width, height, options, series } = element;
  const data = element.categories.map((name, index) => ({ name, ...Object.fromEntries(series.map(s => [s.id, s.values[index] ?? 0])) }));
  const chartHeight = Math.max(1, height - (options.title ? 60 : 0));
  const margin = { top: 24, right: 24, bottom: 20, left: 20 };
  const legend = options.showLegend ? <Legend wrapperStyle={{ fontSize: 24, paddingTop: 12 }} /> : null;
  const grid = options.showGrid ? <CartesianGrid stroke={strings.renderer.colore7e8eb} strokeDasharray={strings.renderer.value66} vertical={false} /> : null;
  const axisStyle = { fill: theme.colors.text, fontSize: 22 };
  const axes = <><XAxis dataKey={strings.common.name} tick={axisStyle} tickLine={false} axisLine={false} height={44} /><YAxis tick={axisStyle} tickLine={false} axisLine={false} width={70} /></>;
  const tooltip = <Tooltip contentStyle={{ fontFamily: `${theme.fonts.body}${strings.renderer.geistVariableSansSerif}`, fontSize: 22, borderRadius: 12, border: strings.renderer.value1pxSolidEee }} />;
  let chart: ReactNode;
  if (element.chart === strings.common.pie || element.chart === strings.common.donut) {
    const slices = element.categories.map((name, i) => ({ name, value: series[0]?.values[i] ?? 0, fill: theme.colors.accent[i % theme.colors.accent.length] ?? theme.colors.primary }));
    chart = <PieChart width={width} height={chartHeight}>
      <Pie data={slices} dataKey={strings.renderer.value} nameKey={strings.common.name} innerRadius={element.chart === strings.common.donut ? strings.renderer.value52 : 0} outerRadius={strings.renderer.value78} paddingAngle={2} isAnimationActive={false} label={options.showValues} />
      {tooltip}{legend}
    </PieChart>;
  } else if (element.chart === strings.common.scatter) {
    chart = <ScatterChart width={width} height={chartHeight} margin={margin}>{grid}
      <XAxis type={strings.common.number} dataKey={strings.common.x} tick={axisStyle} name={strings.common.category} /><YAxis type={strings.common.number} dataKey={strings.common.y} tick={axisStyle} />{tooltip}{legend}
      {series.map(s => <Scatter key={s.id} name={s.name} data={s.values.map((y, x) => ({ x: x + 1, y }))} fill={s.color} isAnimationActive={false} />)}
    </ScatterChart>;
  } else if (element.chart === strings.common.line) {
    chart = <LineChart width={width} height={chartHeight} data={data} margin={margin}>{grid}{axes}{tooltip}{legend}
      {series.map(s => <Line key={s.id} dataKey={s.id} name={s.name} stroke={s.color} strokeWidth={5} dot={{ r: 6 }} isAnimationActive={false}>{options.showValues && <LabelList dataKey={s.id} position={strings.common.top} fontSize={22} />}</Line>)}
    </LineChart>;
  } else if (element.chart === strings.common.area) {
    chart = <AreaChart width={width} height={chartHeight} data={data} margin={margin}>{grid}{axes}{tooltip}{legend}
      {series.map(s => <Area key={s.id} dataKey={s.id} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} strokeWidth={4} {...(options.stacked ? { stackId: strings.renderer.stack } : {})} isAnimationActive={false}>{options.showValues && <LabelList dataKey={s.id} position={strings.common.top} fontSize={22} />}</Area>)}
    </AreaChart>;
  } else {
    const horizontal = element.chart === strings.common.barHorizontal;
    chart = <BarChart width={width} height={chartHeight} data={data} margin={margin} layout={horizontal ? strings.common.vertical : strings.common.horizontal} barCategoryGap={strings.renderer.value24}>{grid}
      {horizontal ? <><XAxis type={strings.common.number} tick={axisStyle} tickLine={false} /><YAxis type={strings.renderer.category} dataKey={strings.common.name} tick={axisStyle} tickLine={false} width={110} /></> : axes}{tooltip}{legend}
      {series.map(s => <Bar key={s.id} dataKey={s.id} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} {...(options.stacked ? { stackId: strings.renderer.stack } : {})} isAnimationActive={false}>{options.showValues && <LabelList dataKey={s.id} position={horizontal ? strings.common.right : strings.common.top} fontSize={22} />}</Bar>)}
    </BarChart>;
  }
  return <div className={strings.renderer.rendererChart} style={{ fontFamily: `${theme.fonts.body}${strings.renderer.geistVariableSansSerif}`, color: theme.colors.text }}>
    {options.title && <div className={strings.renderer.rendererChartTitle}>{options.title}</div>}{chart}
  </div>;
}
