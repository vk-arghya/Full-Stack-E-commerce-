export default function VariantSelector({ variants = [], selected, onSelect }) {
  return <div className="flex flex-wrap gap-2">
    {variants.map(v => <button key={v.weight} onClick={() => onSelect(v)} disabled={v.stock === 0}
      className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${selected?.weight === v.weight ? 'border-achar-700 bg-amber-50 text-achar-700' : 'bg-white hover:border-achar-700'} disabled:cursor-not-allowed disabled:opacity-40`}>
      {v.weight}<span className="ml-2">₹{v.price}</span>
    </button>)}
  </div>;
}
