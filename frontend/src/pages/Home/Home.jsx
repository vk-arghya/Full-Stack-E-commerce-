import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HeartHandshake,
  Leaf,
  MapPin,
  MessageCircle,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import ProductGrid from '../../components/products/ProductGrid';
import CustomPickleForm from '../../components/custom-pickle/CustomPickleForm';
import api from '../../services/api';

const demoProducts = [
  {
    id: 'mango',
    name: 'Traditional Mango Pickle',
    price: 399,
    rating: 4.8,
    reviewCount: 124,
    image: '/placeholder-product.svg',
    category: 'mango',
    variants: [
      { weight: '100g', price: 99, stock: 50 },
      { weight: '200g', price: 179, stock: 40 },
      { weight: '500g', price: 399, stock: 25 },
      { weight: '1kg', price: 699, stock: 10 },
    ],
  },
  {
    id: 'lemon',
    name: 'Homemade Lemon Pickle',
    price: 189,
    rating: 4.9,
    reviewCount: 88,
    image: '/placeholder-product.svg',
    category: 'lemon',
    variants: [
      { weight: '100g', price: 59, stock: 30 },
      { weight: '200g', price: 109, stock: 30 },
      { weight: '500g', price: 189, stock: 20 },
    ],
  },
  {
    id: 'chilli',
    name: 'Spicy Chilli Pickle',
    price: 179,
    rating: 4.7,
    reviewCount: 72,
    image: '/placeholder-product.svg',
    category: 'chilli',
    variants: [
      { weight: '100g', price: 69, stock: 20 },
      { weight: '200g', price: 109, stock: 20 },
      { weight: '500g', price: 179, stock: 10 },
    ],
  },
  {
    id: 'garlic',
    name: 'Homemade Garlic Pickle',
    price: 229,
    rating: 4.6,
    reviewCount: 49,
    image: '/placeholder-product.svg',
    category: 'garlic',
    variants: [
      { weight: '100g', price: 79, stock: 20 },
      { weight: '200g', price: 129, stock: 20 },
      { weight: '500g', price: 229, stock: 8 },
    ],
  },
];

const categories = [
  ['Mango', '🥭'],
  ['Lemon', '🍋'],
  ['Chilli', '🌶️'],
  ['Garlic', '🧄'],
  ['Mixed', '🥒'],
  ['Special', '🫙'],
];

const faqs = [
  [
    'How should I store the pickle?',
    'Store the pickle according to the storage instructions shown on the product page and keep the jar properly closed.',
  ],
  [
    'Can I request a customized pickle?',
    'Yes. Use our customized pickle form or contact us through WhatsApp with your preferred flavour, ingredients, spice level or quantity.',
  ],
  [
    'Can I browse without logging in?',
    'Yes. You can browse products without logging in. Authentication is required when you proceed with an order.',
  ],
  [
    'What payment gateway do you use?',
    'Payments are securely processed through Razorpay when online payment is enabled.',
  ],
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null);
  const [products, setProducts] = useState(demoProducts);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        const response = await api.get('/products');

        if (!mounted) return;

        if (Array.isArray(response.data)) {
          setProducts(response.data);
        }
      } catch (error) {
        console.error('Unable to load products:', error);

        /*
         * Keep the existing fallback only when the product API
         * itself cannot be reached.
         */
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const bestProducts = products.filter(
    (product) =>
      product.bestSeller === true ||
      product.featured === true
  );

  const mostLovedProducts = products.filter(
    (product) => product.mostLoved === true
  );

  const upcomingProducts = products.filter(
    (product) => product.upcoming === true
  );

  const displayedBestProducts =
    bestProducts.length > 0
      ? bestProducts.slice(0, 4)
      : products.slice(0, 4);

  const displayedLovedProducts =
    mostLovedProducts.length > 0
      ? mostLovedProducts.slice(0, 6)
      : products.slice(0, 6);

  return (
    <div className="w-full overflow-x-hidden">

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-red-50">
        <div className="container-app grid min-h-[500px] items-center gap-8 py-10 sm:py-14 md:grid-cols-2 md:py-16">

          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700 sm:text-sm">
              Homemade • Traditional • Delicious
            </p>

            <h1 className="mt-4 text-4xl font-black leading-[1.08] text-stone-900 sm:text-5xl md:text-6xl">
              A taste of tradition in every jar.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-stone-600 sm:text-base md:text-lg">
              Authentic homemade pickles prepared with traditional
              flavours and the warmth of home.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="btn-primary"
              >
                Shop Pickles
              </Link>

              <a
                href="#custom-pickle"
                className="btn-secondary"
              >
                Customize Your Pickle
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="aspect-square rounded-[2rem] bg-gradient-to-br from-amber-100 to-orange-50 p-6 shadow-xl shadow-amber-900/10 sm:rounded-[2.5rem] sm:p-10">
              <img
                src="/placeholder-product.svg"
                alt="Acharjya's Achar Bari"
                className="h-full w-full object-contain"
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* =====================================================
          CATEGORIES
      ====================================================== */}
      <section className="container-app py-9 sm:py-12">

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700">
              Our collection
            </p>

            <h2 className="section-title mt-1">
              Pick your favourite flavour
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Discover homemade favourites made for everyday meals.
            </p>
          </div>

          <Link
            to="/products"
            className="hidden text-sm font-bold text-achar-700 sm:block"
          >
            View all →
          </Link>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-3 md:grid-cols-6">

          {categories.map(([name, emoji]) => (
            <Link
              key={name}
              to={`/products?category=${encodeURIComponent(
                name.toLowerCase()
              )}`}
              className="flex min-w-[110px] shrink-0 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-achar-700 hover:shadow-md sm:min-w-0 sm:block sm:p-4 sm:text-center"
            >
              <span className="text-2xl sm:text-3xl">
                {emoji}
              </span>

              <span className="font-bold text-stone-800">
                {name}
              </span>
            </Link>
          ))}

        </div>
      </section>

      {/* =====================================================
          BEST PICKLES
      ====================================================== */}
      <section className="container-app py-9 sm:py-14">

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700">
              Popular now
            </p>

            <h2 className="section-title mt-1">
              Best Pickles
            </h2>
          </div>

          <Link
            to="/products"
            className="text-sm font-bold text-achar-700"
          >
            View all →
          </Link>
        </div>

        <ProductGrid
          products={displayedBestProducts}
        />

      </section>

      {/* =====================================================
          MOST LOVED
      ====================================================== */}
      <section className="bg-amber-50 py-9 sm:py-14">

        <div className="container-app">

          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700">
            Loved by customers
          </p>

          <h2 className="section-title mt-1">
            Most Loved
          </h2>

          <p className="mt-2 text-sm text-stone-600">
            The flavours customers keep coming back for.
          </p>

          <div className="mt-5">
            <ProductGrid
              products={displayedLovedProducts}
            />
          </div>

        </div>
      </section>

      {/* =====================================================
          UPCOMING PRODUCTS
      ====================================================== */}
      <section className="container-app py-9 sm:py-14">

        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700">
          Coming soon
        </p>

        <h2 className="section-title mt-1">
          Upcoming Pickles
        </h2>

        <div className="mt-5 flex gap-4 overflow-x-auto pb-2">

          {(upcomingProducts.length > 0
            ? upcomingProducts.slice(0, 6)
            : [
                {
                  id: 'coming-1',
                  name: 'Green Chilli Special',
                  image: '/placeholder-product.svg',
                },
                {
                  id: 'coming-2',
                  name: 'Sweet & Spicy Mixed',
                  image: '/placeholder-product.svg',
                },
                {
                  id: 'coming-3',
                  name: 'Family Recipe Special',
                  image: '/placeholder-product.svg',
                },
              ]
          ).map((product) => (
            <div
              key={product.id || product.name}
              className="min-w-[250px] max-w-[280px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >

              <div className="aspect-[4/3] bg-stone-100">
                <img
                  src={
                    product.image ||
                    '/placeholder-product.svg'
                  }
                  alt={product.name || 'Upcoming pickle'}
                  className="h-full w-full object-contain p-4"
                />
              </div>

              <div className="p-4">

                <div className="flex items-center gap-2">
                  <Sparkles
                    size={16}
                    className="shrink-0 text-achar-700"
                  />

                  <h3 className="font-bold text-stone-900">
                    {product.name}
                  </h3>
                </div>

                <p className="mt-1 text-sm text-stone-500">
                  Coming soon
                </p>

              </div>
            </div>
          ))}

        </div>
      </section>

      {/* =====================================================
          CUSTOM PICKLE
      ====================================================== */}
      <section
        id="custom-pickle"
        className="bg-gradient-to-br from-stone-950 to-achar-900 py-10 text-white sm:py-14"
      >

        <div className="container-app grid gap-7 md:grid-cols-2 md:items-center">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300 sm:text-sm">
              Made your way
            </p>

            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Want a customized pickle?
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300 sm:text-base">
              Tell us your preferred ingredients, spice level,
              quantity or special requirement.
            </p>

            <a
              href={`https://wa.me/${
                import.meta.env.VITE_WHATSAPP_NUMBER ||
                '919876543210'
              }?text=${encodeURIComponent(
                "Hello Acharjya's Achar Bari, I want a customized pickle."
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
            >
              <MessageCircle size={19} />
              Chat on WhatsApp
            </a>

          </div>

          <div className="rounded-3xl bg-white p-4 text-stone-900 shadow-2xl sm:p-6">
            <CustomPickleForm />
          </div>

        </div>
      </section>

      {/* =====================================================
          WHY CHOOSE US
      ====================================================== */}
      <section className="container-app py-9 sm:py-14">

        <div className="flex items-end justify-between gap-4">

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700">
              Our story
            </p>

            <h2 className="section-title mt-1">
              Why Choose Us?
            </h2>
          </div>

          <span className="hidden text-xs font-semibold text-stone-500 sm:block">
            Swipe on mobile →
          </span>

        </div>

        <div className="mt-5 flex gap-4 overflow-x-auto pb-2">

          {[
            [
              MapPin,
              'Go With Bengal',
              'Bengal-inspired flavours prepared to bring traditional taste to your everyday meals.',
            ],
            [
              HeartHandshake,
              "Ma'am's Hand Pickle",
              'Inspired by the warmth and familiarity of homemade achar made with a mother’s touch.',
            ],
            [
              Utensils,
              'Made for Every Meal',
              'Perfect with paratha, dal-rice, khichuri, snacks and everyday family meals.',
            ],
            [
              Leaf,
              'Homemade Goodness',
              'Thoughtful ingredients and traditional-style preparation with careful packing.',
            ],
          ].map(([Icon, heading, description]) => (
            <motion.div
              key={heading}
              whileHover={{ y: -3 }}
              className="min-w-[250px] flex-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:min-w-[270px] sm:p-6"
            >

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-achar-700">
                <Icon size={22} />
              </div>

              <h3 className="mt-4 text-lg font-black text-stone-900">
                {heading}
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                {description}
              </p>

            </motion.div>
          ))}

        </div>
      </section>

      {/* =====================================================
          FAQ
      ====================================================== */}
      <section
        id="faq"
        className="container-app scroll-mt-24 py-7 sm:py-10"
      >

        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-achar-700">
          Need to know?
        </p>

        <h2 className="section-title mt-1">
          Frequently Asked Questions
        </h2>

        <div className="mt-5 space-y-2.5">

          {faqs.map(([question, answer], index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={question}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              >

                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenFaq(
                      isOpen ? null : index
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                >

                  <span className="font-bold text-stone-900">
                    {question}
                  </span>

                  <span
                    className={`shrink-0 text-xl font-bold text-achar-700 transition-transform duration-200 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>

                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5">

                    <p className="text-sm leading-6 text-stone-600">
                      {answer}
                    </p>

                  </div>
                )}

              </div>
            );
          })}

        </div>
      </section>

    </div>
  );
}