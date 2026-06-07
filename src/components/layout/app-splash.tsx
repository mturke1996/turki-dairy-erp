import { BrandLogo } from './brand-logo';

/** شاشة تحميل خفيفة — تظهر لحظات أثناء إعادة بناء الحالة من التخزين المحلي. */
export function AppSplash() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-44 opacity-90">
          <BrandLogo variant="full" />
        </div>
        <div className="h-1 w-28 overflow-hidden rounded-full bg-canvas-sunken">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-meadow-500/70" />
        </div>
      </div>
    </div>
  );
}
