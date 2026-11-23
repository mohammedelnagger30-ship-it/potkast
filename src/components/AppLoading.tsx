interface AppLoadingProps {
  label?: string;
  fullScreen?: boolean;
}

const DELAYS = ['-520ms', '-340ms', '-160ms', '-660ms', '-80ms'];

/** Small, theme-aware loading state that matches the instant boot shell. */
export function AppLoading({
  label = 'جارٍ التجهيز...',
  fullScreen = false,
}: AppLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullScreen
          ? 'min-h-screen bg-neutral-50 dark:bg-neutral-950'
          : 'min-h-[56vh]'
      }`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="app-loading-wave" aria-hidden="true">
        {DELAYS.map((delay) => (
          <span key={delay} style={{ animationDelay: delay }} />
        ))}
      </div>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
    </div>
  );
}
