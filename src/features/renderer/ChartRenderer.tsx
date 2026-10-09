import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, Pie, PieChart, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartElement, Theme } from '@/types/model';
import type { ReactNode } from 'react';

export function ChartRenderer({ element, theme }: { element: ChartElement; theme: Theme }) {
  const { width, height, options, series } = element;
  const data = element.categories.map((name, index) => ({ name, ...Object.fromEntries(series.map(s => [s.id, s.values[index] ?? 0])) }));
  const chartHeight = Math.max(1, height - (options.title ? 60 : 0));
  const margin = { top: 24, right: 24, bottom: 20, left: 20 };
  const legend = options.showLegend ? <Legend wrapperStyle={{ fontSize: 24, paddingTop: 12 }} /> : null;
  const grid = options.showGrid ? <CartesianGrid stroke="#e7e8eb" strokeDasharray="6 6" vertical={false} /> : null;
  const axisStyle = { fill: theme.colors.text, fontSize: 22 };
  const axes = <><XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} height={44} /><YAxis tick={axisStyle} tickLine={false} axisLine={false} width={70} /></>;
  const tooltip = <Tooltip contentStyle={{ fontFamily: `${theme.fonts.body}, 'Geist Variable', sans-serif`, fontSize: 22, borderRadius: 12, border: '1px solid #eee' }} />;
  let chart: ReactNode;
  if (element.chart === 'pie' || element.chart === 'donut') {
    const slices = element.categories.map((name, i) => ({ name, value: series[0]?.values[i] ?? 0, fill: theme.colors.accent[i % theme.colors.accent.length] ?? theme.colors.primary }));
    chart = <PieChart width={width} height={chartHeight}>
      <Pie data={slices} dataKey="value" nameKey="name" innerRadius={element.chart === 'donut' ? '52%' : 0} outerRadius="78%" paddingAngle={2} isAnimationActive={false} label={options.showValues} />
      {tooltip}{legend}
    </PieChart>;
  } else if (element.chart === 'scatter') {
    chart = <ScatterChart width={width} height={chartHeight} margin={margin}>{grid}
      <XAxis type="number" dataKey="x" tick={axisStyle} name="Category" /><YAxis type="number" dataKey="y" tick={axisStyle} />{tooltip}{legend}
      {series.map(s => <Scatter key={s.id} name={s.name} data={s.values.map((y, x) => ({ x: x + 1, y }))} fill={s.color} isAnimationActive={false} />)}
    </ScatterChart>;
  } else if (element.chart === 'line') {
    chart = <LineChart width={width} height={chartHeight} data={data} margin={margin}>{grid}{axes}{tooltip}{legend}
      {series.map(s => <Line key={s.id} dataKey={s.id} name={s.name} stroke={s.color} strokeWidth={5} dot={{ r: 6 }} isAnimationActive={false}>{options.showValues && <LabelList dataKey={s.id} position="top" fontSize={22} />}</Line>)}
    </LineChart>;
  } else if (element.chart === 'area') {
    chart = <AreaChart width={width} height={chartHeight} data={data} margin={margin}>{grid}{axes}{tooltip}{legend}
      {series.map(s => <Area key={s.id} dataKey={s.id} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} strokeWidth={4} {...(options.stacked ? { stackId: 'stack' } : {})} isAnimationActive={false}>{options.showValues && <LabelList dataKey={s.id} position="top" fontSize={22} />}</Area>)}
    </AreaChart>;
  } else {
    const horizontal = element.chart === 'barHorizontal';
    chart = <BarChart width={width} height={chartHeight} data={data} margin={margin} layout={horizontal ? 'vertical' : 'horizontal'} barCategoryGap="24%">{grid}
      {horizontal ? <><XAxis type="number" tick={axisStyle} tickLine={false} /><YAxis type="category" dataKey="name" tick={axisStyle} tickLine={false} width={110} /></> : axes}{tooltip}{legend}
      {series.map(s => <Bar key={s.id} dataKey={s.id} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} {...(options.stacked ? { stackId: 'stack' } : {})} isAnimationActive={false}>{options.showValues && <LabelList dataKey={s.id} position={horizontal ? 'right' : 'top'} fontSize={22} />}</Bar>)}
    </BarChart>;
  }
  return <div className="renderer-chart" style={{ fontFamily: `${theme.fonts.body}, 'Geist Variable', sans-serif`, color: theme.colors.text }}>
    {options.title && <div className="renderer-chart-title">{options.title}</div>}{chart}
  </div>;
}
