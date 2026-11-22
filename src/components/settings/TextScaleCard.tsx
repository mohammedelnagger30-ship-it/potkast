import { Smartphone, Type } from 'lucide-react';
import { Badge, Card, CardHeader } from '@/components/ui';
import { useTextScale } from '@/context/TextScaleContext';

export function TextScaleCard() {
  const { fixedTextScale, toggleFixedTextScale } = useTextScale();

  return (
    <Card className="mb-6">
      <CardHeader
        title="حجم الخط"
        subtitle="تحكّم في تأثير إعدادات الخط بتاعة النظام على التطبيق"
        action={
          <Badge variant={fixedTextScale ? 'success' : 'neutral'}>
            {fixedTextScale ? 'ثابت' : 'متبع للنظام'}
          </Badge>
        }
      />

      <button
        type="button"
        onClick={toggleFixedTextScale}
        role="switch"
        aria-checked={fixedTextScale}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3.5 text-right transition-colors hover:border-primary-300 dark:hover:border-primary-700"
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          fixedTextScale
            ? 'bg-success-100 dark:bg-success-900/30 text-success-600'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
        }`}>
          <Type size={19} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-neutral-800 dark:text-neutral-200">
            حجم خط ثابت داخل التطبيق
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            يمنع الوضع البسيط في شاومي وتكبير خط النظام من تغيير خطوط Sada. التطبيق يفضل على الحجم العادي.
          </span>
        </span>

        <span className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
          fixedTextScale ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            fixedTextScale ? 'left-0.5' : 'left-[22px]'
          }`} />
        </span>
      </button>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-neutral-400">
        <Smartphone size={13} className="mt-0.5 flex-shrink-0" />
        <span>
          التغيير بيطبيق فوراً وبيتحفظ على جهازك. لمّا تطفيه، التطبيق يرجع يتبع إعدادات النظام العادية.
        </span>
      </div>
    </Card>
  );
}
