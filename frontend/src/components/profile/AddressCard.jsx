export default function AddressCard({address,onEdit,onDelete,onSelect,selected=false}){
  return <article className={`rounded-2xl border p-5 ${selected?'border-achar-700 bg-amber-50':'bg-white'}`}>
    <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="font-black">{address.label}</span>{selected&&<span className="text-xs font-bold text-green-700">Selected</span>}</div>
      <p className="mt-2 font-semibold">{address.name}</p><p className="text-sm">{address.phone}</p><p className="mt-1 text-sm leading-6 text-stone-600">{address.address}, {address.city}, {address.district}, {address.state} - {address.pincode}</p>
    </div><div className="flex gap-2 text-xs font-bold"><button onClick={()=>onEdit?.(address)}>Edit</button><button onClick={()=>onDelete?.(address)} className="text-red-600">Delete</button></div></div>
    {onSelect&&<button onClick={()=>onSelect(address)} className="mt-4 text-sm font-bold text-achar-700">Use this address</button>}
  </article>
}
