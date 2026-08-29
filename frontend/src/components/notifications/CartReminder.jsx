import { useEffect, useRef, useState } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

export function CartReminder() {
  const { items, lastAddedAt, lastAddedItem } = useCart();

  const [open, setOpen] = useState(false);
  const [shownFor, setShownFor] = useState(null);

  const timer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!lastAddedAt || !lastAddedItem) return;

    setOpen(false);

    clearTimeout(timer.current);

    // Show reminder 20 seconds after adding to cart
    timer.current = setTimeout(() => {
      setShownFor(lastAddedAt);
      setOpen(true);
    }, 20000);

    return () => {
      clearTimeout(timer.current);
    };
  }, [lastAddedAt, lastAddedItem]);

  if (
    !items.length ||
    !lastAddedItem ||
    shownFor !== lastAddedAt
  ) {
    return null;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            className="
              fixed
              inset-0
              z-[99]
              bg-black/35
              backdrop-blur-[5px]
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />

          {/* CART REMINDER */}
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
              scale: 0.96
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.97
            }}
            transition={{
              duration: 0.25,
              ease: 'easeOut'
            }}
            className="
              cart-reminder-shell

              fixed
              z-[100]

              /* MOBILE */
              bottom-[calc(0.75rem+env(safe-area-inset-bottom))]
              left-3
              right-3
              w-auto

              /* DESKTOP */
              sm:left-auto
              sm:right-6
              sm:bottom-6
              sm:w-[390px]

              overflow-hidden
              rounded-[24px]
              sm:rounded-2xl

              border
              border-white/70
              bg-white

              shadow-[0_24px_90px_rgba(40,20,10,.30)]
            "
          >
            {/* HEADER */}
            <div
              className="
                bg-gradient-to-r
                from-amber-700
                via-achar-700
                to-achar-900
                px-5
                py-4
                text-white
              "
            >
              <div className="flex items-start justify-between gap-3">

                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-white/15
                    "
                  >
                    <ShoppingCart size={19} />
                  </div>

                  <strong
                    className="
                      text-[14px]
                      sm:text-[15px]
                      font-extrabold
                      leading-5
                    "
                  >
                    Oho! Cart mein kuch tasty hai 😋
                  </strong>
                </div>

                {/* MANUAL CLOSE */}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="
                    shrink-0
                    rounded-full
                    p-1.5
                    transition
                    hover:bg-white/10
                    active:scale-95
                  "
                >
                  <X size={19} />
                </button>

              </div>
            </div>

            {/* CONTENT */}
            <div
              className="
                px-5
                py-5
                sm:p-5
              "
            >
              <p
                className="
                  text-[15px]
                  sm:text-base
                  font-bold
                  leading-6
                  text-stone-800
                "
              >
                “{lastAddedItem.name}” abhi bhi wait kar raha hai!
              </p>

              <p
                className="
                  mt-2
                  text-[13px]
                  sm:text-sm
                  leading-5
                  sm:leading-6
                  text-stone-600
                "
              >
                Itna pyaar se cart mein dala tha… ab order bhi
                kar do. Achar ko suspense mein mat rakho. 🥭
              </p>

              <button
                onClick={() => navigate('/checkout')}
                className="
                  btn-primary
                  mt-4
                  min-h-[46px]
                  w-full
                  rounded-xl
                  text-sm
                  font-bold
                  transition
                  active:scale-[0.98]
                "
              >
                Order Now
              </button>

              <p className="mt-2 text-center text-[10px] text-stone-400">
                You can close this reminder anytime.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}