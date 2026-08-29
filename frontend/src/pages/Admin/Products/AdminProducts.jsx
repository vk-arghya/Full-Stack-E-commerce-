import { useEffect, useState } from 'react';
import { Edit3, ImagePlus, PackagePlus, RefreshCw, Save, Trash2, X } from 'lucide-react';

import AdminLayout from '../../../components/admin/AdminLayout';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/common/ConfirmModal';

const blank = {
  name: '', category: 'mango', description: '', ingredients: '', storage: '', shelfLife: '', image: '',
  featured: false, bestSeller: false, mostLoved: false, upcoming: false,
  variants: [
    { weight: '100g', price: 0, stock: 0 },
    { weight: '200g', price: 0, stock: 0 },
    { weight: '500g', price: 0, stock: 0 },
    { weight: '1kg', price: 0, stock: 0 },
  ],
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [image, setImage] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Unable to load products.', 'error');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function changeVariant(index, key, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => i === index
        ? { ...variant, [key]: key === 'weight' ? value : Math.max(0, Number(value)) }
        : variant),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      let imageUrl = form.image || '';
      const productPayload = { ...form, image: imageUrl };
      let savedProduct;
      if (editing) {
        savedProduct = (await api.patch(`/products/${editing}`, productPayload)).data;
      } else {
        savedProduct = (await api.post('/products', productPayload)).data;
      }

      if (image) {
        if (image.size > 5 * 1024 * 1024) throw new Error('Product image must be 5 MB or smaller.');
        if (!image.type.startsWith('image/')) throw new Error('Please choose a valid image file.');
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Could not read the selected image.'));
          reader.readAsDataURL(image);
        });
        const uploaded = await api.post(`/products/${savedProduct.id}/image`, { data: base64, contentType: image.type, fileName: image.name });
        imageUrl = uploaded.data.imageUrl;
      }

      if (editing) {
        showToast(image ? 'Product updated and image uploaded successfully.' : 'Product updated successfully.', 'success');
      } else {
        showToast('Product added successfully.', 'success');
      }
      setForm({ ...blank, variants: blank.variants.map((v) => ({ ...v })) });
      setEditing(null);
      setImage(null);
      await load();
    } catch (error) {
      console.error(error);
      showToast(error?.response?.data?.message || error.message || 'Unable to save product.', 'error');
    } finally { setSaving(false); }
  }

  function remove(id) { setDeleteId(id); }

  async function confirmRemove() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try { await api.delete(`/products/${id}`); showToast('Product deleted.', 'success'); await load(); }
    catch (error) { showToast(error?.response?.data?.message || 'Unable to delete product.', 'error'); }
  }

  function edit(product) {
    setEditing(product.id);
    setImage(null);
    setForm({ ...blank, ...product, variants: (product.variants?.length ? product.variants : blank.variants).map((v) => ({ ...v })) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setImage(null);
    setForm({ ...blank, variants: blank.variants.map((v) => ({ ...v })) });
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="account-kicker"><PackagePlus size={14}/> Store catalogue</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Add, edit, delete and publish pickle products, images, pack sizes, prices, stock and homepage badges.</p>
        </div>
        <button onClick={reset} className="btn-primary"><PackagePlus size={17}/> New Product</button>
      </div>

      <form onSubmit={save} className="card mt-7 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-black">{editing ? 'Edit product' : 'Add a product'}</h2><p className="mt-1 text-xs text-stone-500">All changes are protected by Firebase Admin authentication.</p></div>
          {editing && <button type="button" onClick={reset} className="btn-secondary !px-3 !py-2"><X size={16}/> Cancel edit</button>}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <input className="input" required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['mango','lemon','chilli','garlic','mixed','special'].map((x) => <option key={x}>{x}</option>)}</select>
          <textarea className="input min-h-28 sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
          <input className="input" placeholder="Ingredients" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })}/>
          <input className="input" placeholder="Shelf life" value={form.shelfLife} onChange={(e) => setForm({ ...form, shelfLife: e.target.value })}/>
          <input className="input" placeholder="Storage instructions" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })}/>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 text-sm font-bold"><ImagePlus size={18} className="text-achar-700"/><span className="min-w-0 flex-1 truncate">{image?.name || (form.image ? 'Replace current image' : 'Upload product image')}</span><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setImage(e.target.files?.[0] || null)}/></label><input className="input" placeholder="Image filename (e.g. mango.jpg)" value={String(form.image || '').replace(/^\/images\/products\//, '')} onChange={(e) => setForm({ ...form, image: e.target.value })}/>
        </div>

        <h3 className="mt-8 text-sm font-black uppercase tracking-wider text-stone-700">Pack sizes, price & stock</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-stone-50"><tr><th className="p-3">Pack</th><th className="p-3">Price ₹</th><th className="p-3">Stock</th></tr></thead>
            <tbody>{form.variants.map((variant, i) => <tr key={i} className="border-t"><td className="p-3"><input className="input" value={variant.weight} onChange={(e) => changeVariant(i, 'weight', e.target.value)}/></td><td className="p-3"><input className="input" type="number" min="0" value={variant.price} onChange={(e) => changeVariant(i, 'price', e.target.value)}/></td><td className="p-3"><input className="input" type="number" min="0" value={variant.stock} onChange={(e) => changeVariant(i, 'stock', e.target.value)}/></td></tr>)}</tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">{[['featured','Featured'],['bestSeller','Best Seller'],['mostLoved','Most Loved'],['upcoming','Upcoming']].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold"><input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })}/>{label}</label>)}</div>
        <button disabled={saving} className="btn-primary mt-6"><Save size={17}/>{saving ? 'Saving securely…' : editing ? 'Update Product' : 'Publish Product'}</button>
      </form>

      <div className="card mt-7 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 p-5"><div><h2 className="text-lg font-black">Live catalogue</h2><p className="text-xs text-stone-500">{products.length} product(s)</p></div><button onClick={load} className="btn-secondary !px-3 !py-2" disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-stone-50"><tr><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Pack / price / stock</th><th className="p-4">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t align-top"><td className="p-4"><div className="flex items-center gap-3"><img src={product.image || '/placeholder-product.svg'} alt="" className="h-14 w-14 rounded-xl border border-stone-200 bg-amber-50 object-contain"/><div><b className="block max-w-[250px]">{product.name}</b><span className="text-xs text-stone-400">{product.id}</span></div></div></td><td className="p-4 capitalize">{product.category}</td><td className="p-4">{product.variants?.map((v) => <div key={v.weight} className="whitespace-nowrap">{v.weight} · ₹{v.price} · <span className={Number(v.stock) > 0 ? 'text-emerald-700' : 'text-red-600'}>{v.stock} in stock</span></div>)}</td><td className="p-4"><div className="flex gap-2"><button onClick={() => edit(product)} className="btn-secondary !px-3 !py-2"><Edit3 size={15}/> Edit</button><button onClick={() => remove(product.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700"><Trash2 size={15}/> Delete</button></div></td></tr>)}</tbody></table></div>
      </div>
      <ConfirmModal open={Boolean(deleteId)} title="Delete this product?" message="This product will be removed from the live catalogue." confirmLabel="Yes, delete" cancelLabel="No, keep it" onConfirm={confirmRemove} onCancel={() => setDeleteId(null)} />
    </AdminLayout>
  );
}
