export default function QuantityControl({ value, onChange, max = 999 }) {
  const safeMax = Math.max(1, Number(max) || 1);

  return <div className="inline-flex h-10 shrink-0 items-center overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm">
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center text-lg font-bold text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={() => onChange(Math.max(1, value - 1))}
      disabled={value <= 1}
      aria-label="Decrease quantity"
    >−</button>

    <span className="flex h-10 w-11 shrink-0 items-center justify-center border-x border-stone-200 text-sm font-black" aria-live="polite">
      {value}
    </span>

    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center text-lg font-bold text-achar-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={() => onChange(Math.min(safeMax, value + 1))}
      disabled={value >= safeMax}
      aria-label="Increase quantity"
    >+
    </button>
  </div>;
}
