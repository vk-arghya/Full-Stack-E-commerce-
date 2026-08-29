import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const messages = [
  'Achar dekhte-dekhte dil bhi aa gaya? 😄 Login kar lo, jar ghar le jao!',
  'Aap bas achar ko stare kar rahe ho? 🥭 Google se login karo, phir order bhi kar do!'
];

const STORAGE_KEY = 'aab_login_popup_shown_count';

export function GuestLoginReminder() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) return;

    const shown = Number(
      sessionStorage.getItem(STORAGE_KEY) || '0'
    );

    if (shown >= 2) return;

    let firstTimer;
    let secondTimer;

    const show = (messageIndex) => {
      const current = Number(
        sessionStorage.getItem(STORAGE_KEY) || '0'
      );

      if (current >= 2) return;

      sessionStorage.setItem(
        STORAGE_KEY,
        String(current + 1)
      );

      setIndex(messageIndex);
      setOpen(true);
    };

    // First reminder after 10 seconds
    if (shown === 0) {
      firstTimer = window.setTimeout(() => {
        show(0);
      }, 10000);

      // Second reminder 30 seconds after first
      secondTimer = window.setTimeout(() => {
        show(1);
      }, 40000);

    } else if (shown === 1) {

      // If user refreshed after first reminder,
      // show second reminder after 30 seconds
      secondTimer = window.setTimeout(() => {
        show(1);
      }, 30000);
    }

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
    };
  }, [user]);

  if (
    user ||
    location.pathname === '/login' ||
    location.pathname.startsWith('/admin')
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

          {/* LOGIN POPUP */}
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
              fixed
              z-[100]

              /* MOBILE */
              bottom-3
              left-3
              right-3
              w-auto

              /* DESKTOP */
              sm:left-1/2
              sm:right-auto
              sm:bottom-auto
              sm:top-1/2
              sm:w-[410px]
              sm:-translate-x-1/2
              sm:-translate-y-1/2

              overflow-hidden
              rounded-[24px]
              sm:rounded-3xl

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
                from-achar-900
                via-achar-700
                to-[#a95c20]
                px-5
                py-4
                text-white
              "
            >
              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <p
                    className="
                      text-[9px]
                      sm:text-[10px]
                      font-extrabold
                      uppercase
                      tracking-[.18em]
                      text-amber-100/80
                    "
                  >
                    Acharjya's Achar Bari
                  </p>

                  <h3
                    className="
                      mt-1
                      text-[17px]
                      sm:text-lg
                      font-black
                    "
                  >
                    Login With Us 😋
                  </h3>
                </div>

                {/* MANUAL CLOSE */}
                <button
                  onClick={() => setOpen(false)}
                  className="
                    shrink-0
                    rounded-full
                    p-1.5
                    transition
                    hover:bg-white/10
                    active:scale-95
                  "
                  aria-label="Close"
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
                sm:p-6
              "
            >
              <p
                className="
                  text-[13px]
                  sm:text-sm
                  leading-5
                  sm:leading-6
                  text-stone-700
                "
              >
                {messages[index]}
              </p>

              <button
                onClick={() => navigate('/login')}
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
                Continue with Google
              </button>

              <p
                className="
                  mt-2
                  text-center
                  text-[10px]
                  sm:text-[11px]
                  text-stone-400
                "
              >
                You can keep browsing as a guest.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}