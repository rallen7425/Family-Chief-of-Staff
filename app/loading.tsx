/** Shown while a route segment's server data streams in. Renders inside the
 * app chrome (header/tabs/chat bar stay put). Light skeleton, not a spinner. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded-pill bg-border/60 animate-pulse" />
      <div className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col gap-4">
        <div className="h-4 w-1/3 rounded bg-border/60 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-border/60 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-border/60 animate-pulse" />
      </div>
      <div className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col gap-4">
        <div className="h-4 w-1/2 rounded bg-border/60 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-border/60 animate-pulse" />
      </div>
    </div>
  );
}
