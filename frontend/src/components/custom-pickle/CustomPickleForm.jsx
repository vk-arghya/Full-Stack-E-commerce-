import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function CustomPickleForm() {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', mobile: '', requirement: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/custom-requests', form);
      setForm({ name: '', mobile: '', requirement: '' });
      setSuccess(true);
      showToast(data?.message || 'Thanks for connecting with us.', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'We could not send your request. Please try again.', 'error');
    } finally { setLoading(false); }
  }

  return <>
    <form onSubmit={submit} className="space-y-4">
      <input className="input" required placeholder="Name" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/>
      <input className="input" required placeholder="Mobile number" inputMode="tel" value={form.mobile} onChange={e => setForm({...form,mobile:e.target.value.replace(/[^0-9+ -]/g,'').slice(0,15)})}/>
      <textarea className="input min-h-32" required placeholder="What pickle do you need?" value={form.requirement} onChange={e => setForm({...form,requirement:e.target.value})}/>
      <button disabled={loading} className="btn-primary w-full">{loading ? 'Sending request...' : 'Send Request'}</button>
    </form>

    {success && <div className="unavailable-modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setSuccess(false)}><div className="unavailable-modal" role="dialog" aria-modal="true"><button className="unavailable-close" onClick={() => setSuccess(false)}><X size={18}/></button><div className="success-popup-icon"><CheckCircle2 size={30}/></div><h2>Thanks for connecting with us! 💛</h2><p>We have received your customized pickle request. We will get back to you soon.</p><button className="btn-primary mt-5 w-full" onClick={() => setSuccess(false)}>Continue</button></div></div>}
  </>;
}
