/** Shown while a server-rendered app page loads; the sidebar stays in place. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton mt-2 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
      <div className="skeleton mt-6 h-64 rounded-xl" />
    </div>
  );
}
