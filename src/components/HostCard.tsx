import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Host } from '@/types/podcast';

interface HostCardProps {
  host: Host;
  compact?: boolean;
}

export function HostCard({ host, compact = false }: HostCardProps) {
  const name = host.name_ar;
  const title = host.title_ar ? `${host.title_ar} ${name}` : name;

  if (compact) {
    return (
      <Link to={`/hosts/${host.slug}`} className="flex-shrink-0 w-32 group text-center">
        <div className="relative w-28 h-28 mx-auto mb-2">
          <div className="w-full h-full rounded-full p-[3px] bg-gradient-to-br from-primary-500 to-accent-500 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
              {host.photo_url ? (
                <OptimizedImage src={host.photo_url} alt={name} width={160} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-primary-600">
                  {name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          {host.is_verified && (
            <span className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center border-2 border-white dark:border-neutral-900">
              <BadgeCheck size={13} />
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{title}</p>
        {host.specialty_ar && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{host.specialty_ar}</p>
        )}
      </Link>
    );
  }

  return (
    <Link
      to={`/hosts/${host.slug}`}
      className="card-base p-5 card-hover group flex flex-col items-center text-center animate-fade-in-up"
    >
      <div className="relative mb-3">
        <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-primary-500 to-accent-500 group-hover:scale-105 transition-transform duration-300">
          <div className="w-full h-full rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
            {host.photo_url ? (
              <OptimizedImage src={host.photo_url} alt={name} width={160} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-primary-600">
                {name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        {host.is_verified && (
          <span className="absolute bottom-0 left-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center border-2 border-white dark:border-neutral-900">
            <BadgeCheck size={13} />
          </span>
        )}
      </div>

      <h3 className="font-bold text-neutral-900 dark:text-white leading-snug">{title}</h3>
      {host.specialty_ar && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
          {host.specialty_ar}
        </p>
      )}
      {host.country && (
        <p className="text-[11px] text-neutral-400 mt-0.5">{host.country}</p>
      )}
    </Link>
  );
}
