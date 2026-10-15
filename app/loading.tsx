export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 animate-pulse">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="size-16 rounded-full bg-neutral-800" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-neutral-800 mx-auto" />
          <div className="h-4 w-32 rounded bg-neutral-800 mx-auto" />
        </div>
      </div>
      <div className="h-7 w-36 rounded bg-neutral-800 mb-4" />
      <div className="h-11 w-full rounded-xl bg-neutral-800 mb-6" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-2.5">
            <div className="aspect-[9/16] w-16 rounded-xl bg-neutral-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-neutral-800" />
              <div className="h-3 w-1/2 rounded bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
