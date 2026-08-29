import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';

const states = ['Andhra Pradesh','Assam','Bihar','Delhi','Gujarat','Haryana','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal','Other'];

export default function AddressForm({ initial = {}, onSave, onCancel, saving = false }) {
  const [form, setForm] = useState({ label: 'Home', name: '', phone: '', whatsapp: '', state: '', district: '', city: '', pincode: '', address: '', ...initial });
  const [error, setError] = useState('');

  function change(key, value) { setForm(current => ({ ...current, [key]: value })); }

  function submit(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pincode)) return setError('Please enter a valid 6 digit PIN code.');
    if (!/^[0-9+ -]{10,15}$/.test(form.phone.trim())) return setError('Please enter a valid phone number.');
    setError('');
    onSave(form);
  }

  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    {error && <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
    <label className="account-field"><span>Address name *</span><input className="input" required value={form.label} onChange={e => change('label', e.target.value)} placeholder="Home / Office / Parents" /></label>
    <label className="account-field"><span>Full name *</span><input className="input" required value={form.name} onChange={e => change('name', e.target.value)} placeholder="Name for delivery" /></label>
    <label className="account-field"><span>Phone number *</span><input className="input" required inputMode="tel" value={form.phone} onChange={e => change('phone', e.target.value.replace(/[^0-9+ -]/g, ''))} placeholder="10 digit number" /></label>
    <label className="account-field"><span>WhatsApp <em>Optional</em></span><input className="input" inputMode="tel" value={form.whatsapp} onChange={e => change('whatsapp', e.target.value.replace(/[^0-9+ -]/g, ''))} placeholder="Optional" /></label>
    <label className="account-field"><span>State *</span><select className="input" required value={form.state} onChange={e => change('state', e.target.value)}><option value="">Select state</option>{states.map(state => <option key={state} value={state}>{state}</option>)}</select></label>
    <label className="account-field"><span>District *</span><input className="input" required value={form.district} onChange={e => change('district', e.target.value)} placeholder="District" /></label>
    <label className="account-field"><span>City / Town *</span><input className="input" required value={form.city} onChange={e => change('city', e.target.value)} placeholder="City or town" /></label>
    <label className="account-field"><span>PIN code *</span><input className="input" required inputMode="numeric" maxLength="6" value={form.pincode} onChange={e => change('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit PIN" /></label>
    <label className="account-field sm:col-span-2"><span>Full address *</span><textarea className="input min-h-28 resize-y" required value={form.address} onChange={e => change('address', e.target.value)} placeholder="House / flat, street, locality, landmark..." /></label>
    <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2"><button className="btn-primary inline-flex min-w-40 items-center justify-center gap-2" type="submit" disabled={saving}>{saving ? <><Loader2 size={17} className="animate-spin"/> Saving...</> : <><Save size={17}/> Save Address</>}</button>{onCancel && <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>}</div>
  </form>;
}
