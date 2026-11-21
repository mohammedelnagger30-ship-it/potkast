import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface CarouselSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function CarouselSection({ title, subtitle, children }: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 300;
    // RTL: "left" visually means scrolling forward
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('right')}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-primary-600 hover:border-primary-300 transition-all"
            aria-label="السابق"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => scroll('left')}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-primary-600 hover:border-primary-300 transition-all"
            aria-label="التالي"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-1"
      >
        {children}
      </div>
    </div>
  );
}
