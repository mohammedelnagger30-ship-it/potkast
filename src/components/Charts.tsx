import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface RadarDataItem {
  category: string;
  value: number;
}

export function CategoryRadarChart({ data }: { data: RadarDataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-neutral-600 dark:text-neutral-400"
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: 'currentColor' }}
          className="text-neutral-400"
          tickCount={5}
        />
        <Radar
          name="التقدّم"
          dataKey="value"
          stroke="#0F766E"
          fill="#0F766E"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#fff',
          }}
          labelStyle={{ color: '#94A3B8' }}
          formatter={(value) => [`${value}%`, 'التقدّم']}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}

interface WeeklyDataItem {
  day: string;
  missions: number;
  xp: number;
  listening: number;
}

export function WeeklyBarChart({ data }: { data: WeeklyDataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-neutral-500 dark:text-neutral-400"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'currentColor' }}
          className="text-neutral-400"
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#fff',
          }}
          labelStyle={{ color: '#94A3B8' }}
          cursor={{ fill: 'rgba(15, 118, 110, 0.05)' }}
        />
        <Bar dataKey="missions" name="مهام" radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill="#0F766E" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
}

export function CalendarHeatmap({ days }: { days: HeatmapDay[] }) {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const levelColors = [
    'bg-neutral-100 dark:bg-neutral-800/50',
    'bg-primary-200 dark:bg-primary-900/40',
    'bg-primary-400 dark:bg-primary-700/60',
    'bg-primary-600 dark:bg-primary-600',
    'bg-primary-700 dark:bg-primary-500',
  ];

  const monthLabels: { label: string; weekIndex: number }[] = [];
  weeks.forEach((week, wi) => {
    if (week.length > 0) {
      const date = new Date(week[0].date);
      const monthName = date.toLocaleDateString('ar-EG', { month: 'short' });
      const prevMonth = wi > 0 ? new Date(weeks[wi - 1][0]?.date).toLocaleDateString('ar-EG', { month: 'short' }) : '';
      if (monthName !== prevMonth) {
        monthLabels.push({ label: monthName, weekIndex: wi });
      }
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        <div className="flex gap-1 mb-1">
          {weeks.map((_, wi) => {
            const label = monthLabels.find((m) => m.weekIndex === wi);
            return (
              <div key={wi} className="w-5 text-[9px] text-neutral-400 text-center">
                {label?.label || ''}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-5 h-5 rounded-sm transition-all hover:scale-110 cursor-default ${levelColors[day.level]}`}
                  title={`${day.date}: ${day.count} نشاط`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-neutral-400">
          <span>أقل</span>
          {levelColors.map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>أكثر</span>
        </div>
      </div>
    </div>
  );
}
