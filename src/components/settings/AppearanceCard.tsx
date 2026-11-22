import {
  Check, Moon, Palette, RotateCcw, Sparkles, Sun, WandSparkles,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { colorThemes, makeCustomTheme, type CustomColors } from '@/lib/colorThemes';

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 transition-colors cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="w-9 h-9 rounded-lg border-0 bg-transparent p-0 cursor-pointer flex-shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="block text-[11px] font-mono text-neutral-400" dir="ltr">
          {value.toUpperCase()}
        </span>
      </span>
    </label>
  );
}

export function AppearanceCard({ compact = false }: { compact?: boolean }) {
  const {
    theme, setTheme,
    colorTheme, setColorTheme,
    customColors, setCustomColors,
    activeTheme,
  } = useTheme();

  const options = [...colorThemes, makeCustomTheme(customColors)];
  const updateCustom = (patch: Partial<CustomColors>) => {
    setCustomColors({ ...customColors, ...patch });
  };

  return (
    <Card className="mb-6">
      <CardHeader
        title="المظهر والألوان"
        subtitle={compact
          ? undefined
          : 'اختار مظهر الواجهة ولونها — كل حاجة بتتحفظ تلقائياً على جهازك'}
        action={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[11px] font-bold">
            <Palette size={13} />
            {activeTheme.label}
          </span>
        }
      />

      {/* Light / dark mode */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {([
          { id: 'light' as const, label: 'نهاري', icon: Sun },
          { id: 'dark' as const, label: 'ليلي', icon: Moon },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-pressed={theme === id}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
              theme === id
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-primary-300'
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">ثيمات الألوان</span>
        <span className="text-[11px] text-neutral-400 mr-auto">{options.length} ثيمات</span>
      </div>

      {/* Presets + custom swatch */}
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-4 sm:grid-cols-7'}`}>
        {options.map((option) => {
          const selected = colorTheme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setColorTheme(option.id)}
              aria-label={`ثيم ${option.label}`}
              aria-pressed={selected}
              title={option.description}
              className={`group relative rounded-xl border-2 p-1.5 text-center transition-all ${
                selected
                  ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-900/20 scale-[1.03] shadow-sm'
                  : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'
              }`}
            >
              <span
                className="relative block h-10 rounded-lg overflow-hidden shadow-inner"
                style={{ background: option.swatch[0] }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-2.5"
                  style={{ background: option.swatch[1] }}
                />
                <span className="absolute bottom-1.5 left-1.5 w-6 h-1.5 rounded-full bg-white/80" />
                <span className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full bg-white/40" />
              </span>
              <span className="block mt-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 truncate">
                {option.label}
              </span>
              {selected && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary-600 text-primary-contrast flex items-center justify-center shadow">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active theme detail + reset */}
      <div className="flex items-center justify-between gap-2 mt-3 p-3 rounded-xl bg-primary-50/70 dark:bg-primary-900/20">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
            <strong className="font-extrabold">{activeTheme.label}</strong>
            {!compact && ` — ${activeTheme.description}`}
          </p>
        </div>
        {colorTheme !== 'emerald' && (
          <button
            type="button"
            onClick={() => setColorTheme('emerald')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-primary-600 flex-shrink-0"
          >
            <RotateCcw size={12} />
            إعادة ضبط
          </button>
        )}
      </div>

      {/* Custom palette builder */}
      {!compact && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <WandSparkles size={16} className="text-accent-600 dark:text-accent-400" />
              <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">لونك الخاص</span>
            </div>
            <button
              type="button"
              onClick={() => setColorTheme('custom')}
              className={`text-[11px] font-bold ${
                colorTheme === 'custom'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-neutral-400 hover:text-primary-600'
              }`}
            >
              {colorTheme === 'custom' ? 'مفعّل الآن' : 'تفعيل المخصص'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <ColorField
              label="اللون الأساسي"
              value={customColors.primary}
              onChange={(primary) => updateCustom({ primary })}
            />
            <ColorField
              label="لون التمييز"
              value={customColors.accent}
              onChange={(accent) => updateCustom({ accent })}
            />
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            اختار لونين وبنولّد منهم 11 درجة لونية لكل واحد، مع نص بلون متباين يقرأ بوضوح.
          </p>
        </div>
      )}

      {/* Live preview */}
      <div className="mt-5">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">معاينة حيّة</p>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900">
          <div className="h-9 bg-primary-600 text-primary-contrast flex items-center px-3 gap-1.5">
            <span className="w-2 h-2 rounded-full bg-current opacity-60" />
            <span className="w-2 h-2 rounded-full bg-current opacity-40" />
            <span className="mr-auto text-[10px] font-extrabold">Sada</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm flex-shrink-0">
                🎧
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-2/3 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-1.5 w-1/2 rounded-full bg-neutral-100 dark:bg-neutral-800" />
              </div>
              <span className="px-2 py-1 rounded-full bg-accent-100 text-accent-700 text-[9px] font-bold">
                جديد
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full w-2/3 bg-primary-600 rounded-full" />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-3 py-1.5 rounded-lg bg-primary-600 text-primary-contrast text-[10px] font-bold">
                استماع
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-accent-500 text-accent-contrast text-[10px] font-bold">
                تنزيل
              </span>
              <span className="px-2 py-1 rounded-md bg-success-100 text-success-700 text-[9px] font-bold">
                مكتمل
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
