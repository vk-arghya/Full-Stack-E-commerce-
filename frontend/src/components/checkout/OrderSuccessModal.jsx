import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, PackageOpen, ShoppingBag } from 'lucide-react';

const confetti = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${8 + ((i * 17) % 84)}%`,
  delay: `${(i % 6) * 0.08}s`,
  rotate: `${(i * 31) % 140 - 70}deg`,
}));

export default function OrderSuccessModal({ open, orderId, onContinue, onViewOrder }) {
  return <AnimatePresence>
    {open && <motion.div
      className="order-success-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-labelledby="order-success-title"
    >
      <div className="order-success-confetti" aria-hidden="true">
        {confetti.map((piece) => <i key={piece.id} style={{ left: piece.left, animationDelay: piece.delay, transform: `rotate(${piece.rotate})` }} />)}
      </div>
      <motion.div
        className="order-success-modal"
        initial={{ opacity: 0, y: 18, scale: .94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: .97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <div className="order-success-icon"><CheckCircle2 size={34} strokeWidth={2.5} /></div>
        <p className="account-kicker justify-center">Order confirmed</p>
        <h2 id="order-success-title">Your achar is on its way! 🎉</h2>
        <p className="order-success-quote">Your achar has officially left the kitchen! 😄</p>
        <p className="order-success-copy">Order placed successfully — now comes the hardest part: waiting for the first bite!</p>
        <div className="order-success-id"><span>Order ID</span><b>#{String(orderId || '').slice(-12).toUpperCase()}</b></div>
        <div className="order-success-actions">
          <button type="button" className="btn-secondary" onClick={onContinue}><ShoppingBag size={17}/> Continue shopping</button>
          <button type="button" className="btn-primary" onClick={onViewOrder}><PackageOpen size={17}/> View order</button>
        </div>
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}
