import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  LockKeyhole,
  MapPin,
  Truck,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

import AddressSelector from '../../components/checkout/AddressSelector';
import PaymentButton from '../../components/checkout/PaymentButton';
import AddressForm from '../../components/profile/AddressForm';
import OrderSuccessModal from '../../components/checkout/OrderSuccessModal';
import ConfirmModal from '../../components/common/ConfirmModal';

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createFinalOrder,
} from '../../services/paymentService';

import api from '../../services/api';

import {
  expectedDeliveryDate,
  formatDate,
} from '../../utils/delivery';

const money = (n) =>
  Number(n || 0)
    .toFixed(2)
    .replace(/\.00$/, '');

export default function Checkout() {
  const { user, profile } = useAuth();
  const { items, clearCart } = useCart();
  const { showToast } = useToast();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isBuyNow = searchParams.get('mode') === 'buy-now';

  const [buyNowItem, setBuyNowItem] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  const [addressEditor, setAddressEditor] = useState(null);

  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [paying, setPaying] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  // Detect silent price / fee / stock changes while checkout is open.
  const [priceChanged, setPriceChanged] = useState(false);

  // Show the price-change warning for 10 seconds only.
  useEffect(() => {
    if (!priceChanged) return undefined;

    const timer = window.setTimeout(() => {
      setPriceChanged(false);
    }, 10000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [priceChanged]);

  const [deliveryMode, setDeliveryMode] = useState('NORMAL');

  const [successOrderId, setSuccessOrderId] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);

  const checkoutItems =
    isBuyNow && buyNowItem
      ? [buyNowItem]
      : items;

  const signature = checkoutItems
    .map(
      (i) =>
        `${i.productId}:${i.weight}:${i.quantity}`
    )
    .join('|');

  const selectedAddress = useMemo(
    () =>
      addresses.find(
        (a) => a.id === selectedId
      ) || null,
    [addresses, selectedId]
  );

  /* -------------------------------------------------
     BUY NOW
  ------------------------------------------------- */

  useEffect(() => {
    if (!isBuyNow) return;

    try {
      const raw = sessionStorage.getItem(
        'aab_buy_now_v1'
      );

      const x = raw ? JSON.parse(raw) : null;

      if (
        x?.productId &&
        x?.weight &&
        Number(x.quantity) > 0
      ) {
        setBuyNowItem(x);
      } else {
        navigate('/products', {
          replace: true,
        });
      }
    } catch {
      navigate('/products', {
        replace: true,
      });
    }
  }, [isBuyNow, navigate]);

  /* -------------------------------------------------
     ADDRESSES
  ------------------------------------------------- */

  async function loadAddresses(preferred = '') {
    if (!user) return;

    setLoadingAddresses(true);

    try {
      const { data } = await api.get(
        '/profile/addresses'
      );

      const list = Array.isArray(data)
        ? data
        : [];

      setAddresses(list);

      setSelectedId((current) => {
        const wanted =
          preferred || current;

        if (
          wanted &&
          list.some(
            (a) => a.id === wanted
          )
        ) {
          return wanted;
        }

        /*
         * Automatically select only when
         * there is exactly one address.
         */
        return list.length === 1
          ? list[0].id
          : '';
      });
    } finally {
      setLoadingAddresses(false);
    }
  }

  useEffect(() => {
    loadAddresses().catch((e) => {
      showToast(
        e?.response?.data?.message ||
          'Unable to load addresses.',
        'error'
      );
    });
  }, [user]);

  /* -------------------------------------------------
     QUOTE
  ------------------------------------------------- */

  async function refreshQuote(
    code = coupon?.code || '',
    mode = deliveryMode,
    addressId = selectedId
  ) {
    // This is an intentional refresh triggered by the user/UI.
    // The newly fetched quote becomes the current bill.
    setPriceChanged(false);

    if (!checkoutItems.length) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }

    setQuoteLoading(true);

    try {
      const { data } = await api.post(
        '/payments/quote',
        {
          code,
          deliveryMode: mode,
          addressId,
          items: checkoutItems.map((i) => ({
            productId: i.productId,
            weight: i.weight,
            quantity: i.quantity,
          })),
        }
      );

      setQuote(data);

      if (data.coupon) {
        setCoupon(data.coupon);
      }
    } finally {
      setQuoteLoading(false);
    }
  }

  useEffect(() => {
  if (!checkoutItems.length) {
    setQuote(null);
    setQuoteLoading(false);
    return;
  }

  refreshQuote().catch((e) => {
    setQuote(null);

    showToast(
      e?.response?.data?.message ||
        'Unable to refresh delivery charges.',
      'error'
    );
  });
}, [
  signature,
  selectedId,

  // IMPORTANT:
  // Recalculate delivery when the selected
  // address/state changes even if address ID
  // remains the same.
  selectedAddress?.state,
  selectedAddress?.district,
  selectedAddress?.city,
  selectedAddress?.pincode,

  deliveryMode,
]);

/* -------------------------------------------------
   SILENT LIVE QUOTE SYNC

   Checks the latest server-side quote every 2 seconds.
   This does NOT reload the page.
------------------------------------------------- */

useEffect(() => {
  if (!checkoutItems.length || !selectedId) {
    return undefined;
  }

  let cancelled = false;

  const checkLatestQuote = async () => {
    try {
      const { data } = await api.post('/payments/quote', {
        code: coupon?.code || '',
        deliveryMode,
        addressId: selectedId,
        items: checkoutItems.map((i) => ({
          productId: i.productId,
          weight: i.weight,
          quantity: i.quantity,
        })),
      });

      if (cancelled || !data) return;

      setQuote((current) => {
        if (!current) return data;

        const changed =
          Number(current.total || 0) !== Number(data.total || 0) ||
          Number(current.subtotal || 0) !== Number(data.subtotal || 0) ||
          Number(current.shipping || 0) !== Number(data.shipping || 0) ||
          Number(current.regularShipping || 0) !== Number(data.regularShipping || 0) ||
          Number(current.platformFee || 0) !== Number(data.platformFee || 0) ||
          Number(current.platformFeeDisplayed || 0) !== Number(data.platformFeeDisplayed || 0) ||
          Number(current.gst || 0) !== Number(data.gst || 0) ||
          Number(current.discount || 0) !== Number(data.discount || 0) ||
          Number(current.gstPercent || 0) !== Number(data.gstPercent || 0) ||
          Number(current.superFastFee || 0) !== Number(data.superFastFee || 0) ||
          current.platformFeeEnabled !== data.platformFeeEnabled ||
          current.superFastEnabled !== data.superFastEnabled ||
          JSON.stringify(current.items || []) !== JSON.stringify(data.items || []);

        if (changed) {
          setPriceChanged(true);
        }

        return data;
      });

      if (data.coupon) {
        setCoupon(data.coupon);
      }
    } catch (error) {
      // Background sync failures must not interrupt checkout.
      console.warn(
        'Silent checkout quote sync failed:',
        error?.message || error
      );
    }
  };

  // Run once immediately, then every 2 seconds.
  checkLatestQuote();

  const intervalId = window.setInterval(
    checkLatestQuote,
    2000
  );

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}, [
  signature,
  selectedId,
  selectedAddress?.state,
  selectedAddress?.district,
  selectedAddress?.city,
  selectedAddress?.pincode,
  deliveryMode,
  coupon?.code,
]);

  /* -------------------------------------------------
     COUPON
  ------------------------------------------------- */

  async function applyCoupon() {
    const code = couponCode
      .trim()
      .toUpperCase();

    if (!code) {
      return showToast(
        'Enter a coupon code.',
        'error'
      );
    }

    setCouponLoading(true);

    try {
      const { data } = await api.post(
        '/payments/quote',
        {
          code,
          deliveryMode,
          addressId: selectedId,
          items: checkoutItems.map((i) => ({
            productId: i.productId,
            weight: i.weight,
            quantity: i.quantity,
          })),
        }
      );

      setQuote(data);
      setCoupon(data.coupon || null);
      setCouponCode(
        data.coupon?.code || code
      );

      showToast(
        `Coupon applied. You save ₹${money(
          data.discount
        )}.`,
        'success'
      );
    } catch (e) {
      setCoupon(null);

      showToast(
        e?.response?.data?.message ||
          'Coupon could not be applied.',
        'error'
      );
    } finally {
      setCouponLoading(false);
    }
  }

  async function removeCoupon() {
    setCoupon(null);
    setCouponCode('');

    await refreshQuote('');
  }

  /* -------------------------------------------------
     ADDRESS
  ------------------------------------------------- */

  async function saveAddress(data) {
    setSavingAddress(true);

    try {
      const saved = addressEditor?.id
        ? (
            await api.patch(
              `/profile/addresses/${addressEditor.id}`,
              data
            )
          ).data
        : (
            await api.post(
              '/profile/addresses',
              data
            )
          ).data;

      setAddressEditor(null);

await loadAddresses(saved.id);

// Force the latest delivery calculation
// immediately after address changes.
await refreshQuote(
  coupon?.code || '',
  deliveryMode,
  saved.id
);

      showToast(
        addressEditor?.id
          ? 'Address updated successfully.'
          : 'Address saved successfully.',
        'success'
      );
    } catch (e) {
      showToast(
        e?.response?.data?.message ||
          'Unable to save address.',
        'error'
      );
    } finally {
      setSavingAddress(false);
    }
  }

  function deleteAddress(address) {
    setDeleteTarget(address);
  }

  async function confirmDeleteAddress() {
    if (!deleteTarget) return;

    const address = deleteTarget;

    setDeleteTarget(null);

    try {
      await api.delete(
        `/profile/addresses/${address.id}`
      );

      if (selectedId === address.id) {
        setSelectedId('');
      }

      await loadAddresses();

      showToast(
        'Address deleted.',
        'success'
      );
    } catch (e) {
      showToast(
        e?.response?.data?.message ||
          'Unable to delete address.',
        'error'
      );
    }
  }

  /* -------------------------------------------------
     PAYMENT
  ------------------------------------------------- */

  async function pay() {
    if (!checkoutItems.length) {
      return showToast(
        'There is nothing to purchase.',
        'error'
      );
    }

    if (!selectedId) {
      return showToast(
        'Select a delivery address.',
        'error'
      );
    }

    if (!quote || quoteLoading) {
      return showToast(
        'Please wait for the latest bill.',
        'error'
      );
    }

    if (priceChanged) {
      return showToast(
        'Your order price or billing details have changed. Please review the updated bill before continuing.',
        'error'
      );
    }

    if (paying) return;

    setPaying(true);

    try {
      // Final authoritative quote check immediately before payment.
      // This protects against a price/fee/stock change occurring
      // between the 2-second background checks and the Pay click.
      const { data: latestQuote } =
        await api.post('/payments/quote', {
          code: coupon?.code || '',
          deliveryMode,
          addressId: selectedId,
          items: checkoutItems.map((i) => ({
            productId: i.productId,
            weight: i.weight,
            quantity: i.quantity,
          })),
        });

      const billChanged =
        Number(quote?.total || 0) !== Number(latestQuote?.total || 0) ||
        Number(quote?.subtotal || 0) !== Number(latestQuote?.subtotal || 0) ||
        Number(quote?.shipping || 0) !== Number(latestQuote?.shipping || 0) ||
        Number(quote?.regularShipping || 0) !== Number(latestQuote?.regularShipping || 0) ||
        Number(quote?.platformFee || 0) !== Number(latestQuote?.platformFee || 0) ||
        Number(quote?.platformFeeDisplayed || 0) !== Number(latestQuote?.platformFeeDisplayed || 0) ||
        Number(quote?.gst || 0) !== Number(latestQuote?.gst || 0) ||
        Number(quote?.discount || 0) !== Number(latestQuote?.discount || 0) ||
        Number(quote?.gstPercent || 0) !== Number(latestQuote?.gstPercent || 0) ||
        Number(quote?.superFastFee || 0) !== Number(latestQuote?.superFastFee || 0) ||
        quote?.platformFeeEnabled !== latestQuote?.platformFeeEnabled ||
        quote?.superFastEnabled !== latestQuote?.superFastEnabled ||
        JSON.stringify(quote?.items || []) !== JSON.stringify(latestQuote?.items || []);

      if (billChanged) {
        setQuote(latestQuote);
        setPriceChanged(true);
        setPaying(false);

        showToast(
          'Your order price or billing details have changed. Please review the updated bill before continuing.',
          'error'
        );

        return;
      }

      setQuote(latestQuote);

      const order =
        await createRazorpayOrder({
          addressId: selectedId,
          deliveryMode,
          couponCode:
            coupon?.code || '',
          items: checkoutItems.map(
            (i) => ({
              productId: i.productId,
              weight: i.weight,
              quantity: i.quantity,
            })
          ),
        });

      const finishOrder =
        async (payment) => {
          await verifyRazorpayPayment({
            ...payment,
            paymentSessionId:
              order.paymentSessionId,
          });

          const final =
            await createFinalOrder({
              paymentSessionId:
                order.paymentSessionId,
              payment,
            });

          if (!isBuyNow) {
            clearCart();
          } else {
            sessionStorage.removeItem(
              'aab_buy_now_v1'
            );
          }

          setSuccessOrderId(
            final.orderId
          );

          setPaying(false);
        };

      if (order.testMode) {
        await finishOrder({
          razorpay_order_id:
            order.razorpayOrderId,
          razorpay_payment_id:
            `TEST_PAYMENT_${Date.now()}`,
          razorpay_signature:
            'TEST_MODE',
        });

        return;
      }

      if (!window.Razorpay) {
        throw new Error(
          'Razorpay checkout script is missing.'
        );
      }

      const razorpay =
        new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name:
            "Acharjya's Achar Bari",
          description:
            'Homemade Pickle Order',
          order_id:
            order.razorpayOrderId,

          prefill: {
            name:
              selectedAddress?.name ||
              profile?.name ||
              user?.displayName ||
              '',

            email:
              user?.email || '',

            contact:
              selectedAddress?.phone ||
              profile?.phone ||
              '',
          },

          theme: {
            color: '#8b2e2e',
          },

          handler: async (response) => {
            try {
              await finishOrder(
                response
              );
            } catch (e) {
              showToast(
                e?.response?.data
                  ?.message ||
                  e.message ||
                  'Payment verification failed. No order was confirmed.',
                'error'
              );

              setPaying(false);
            }
          },

          modal: {
            ondismiss: () => {
              setPaying(false);
            },
          },
        });

      razorpay.open();
    } catch (e) {
      showToast(
        e?.response?.data?.message ||
          e.message ||
          'Unable to start payment.',
        'error'
      );

      setPaying(false);
    }
  }

  /* -------------------------------------------------
     EMPTY CART
  ------------------------------------------------- */

  if (
    !checkoutItems.length &&
    !successOrderId
  ) {
    return (
      <section className="container-app py-20 text-center">
        <h1 className="text-3xl font-black">
          Your cart is empty
        </h1>

        <button
          className="btn-primary mt-4"
          onClick={() =>
            navigate('/products')
          }
        >
          Browse pickles
        </button>
      </section>
    );
  }

  const freeMessage =
    quote?.amountToFreeDelivery > 0 &&
    deliveryMode === 'NORMAL';

  /* -------------------------------------------------
     UI
  ------------------------------------------------- */

  return (
    <>
      <section className="container-app checkout-page py-5 sm:py-8 lg:py-10">

        {/* HEADER */}

        <div className="checkout-heading">
          <div>
            <p className="account-kicker">
              <LockKeyhole size={14} />
              Secure checkout
            </p>

            <h1>
              {isBuyNow
                ? 'Buy Now'
                : 'Checkout'}
            </h1>

            <p>
              Choose your address and
              delivery speed, then review
              the final bill.
            </p>
          </div>

          <div className="checkout-stepper">
            <span className="active">
              <CheckCircle2 size={15} />
              Address
            </span>

            <i />

            <span className="active">
              <CheckCircle2 size={15} />
              Order summary
            </span>

            <i />

            <span>
              <span className="checkout-step-number">
                3
              </span>
              Payment
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">

          {/* LEFT */}

          <div className="space-y-5">

            {/* ADDRESS */}

            <div className="card checkout-card p-4 sm:p-6">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h2>
                    Delivery Address
                  </h2>

                  <p>
                    Choose exactly where
                    this order should be
                    delivered.
                  </p>
                </div>

                <span className="account-section-icon">
                  <MapPin size={18} />
                </span>

              </div>

              <div className="mt-5">

                {loadingAddresses ? (
                  <div className="account-loading py-8">
                    <div className="loading-spinner" />
                    Loading addresses…
                  </div>
                ) : (
                  <AddressSelector
                    addresses={addresses}
                    selectedId={selectedId}
                    onSelect={(address) =>
                      setSelectedId(
                        address.id
                      )
                    }
                    onAdd={() =>
                      setAddressEditor({
                        mode: 'add',
                      })
                    }
                    onEdit={(address) =>
                      setAddressEditor(
                        address
                      )
                    }
                    onDelete={deleteAddress}
                  />
                )}

              </div>

              {addressEditor && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-6">

                  <div className="mb-4 flex items-center justify-between">

                    <div>
                      <h3 className="text-lg font-black">
                        {addressEditor.id
                          ? 'Edit address'
                          : 'Add delivery address'}
                      </h3>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-2"
                      onClick={() =>
                        setAddressEditor(
                          null
                        )
                      }
                    >
                      Cancel
                    </button>

                  </div>

                  <AddressForm
                    initial={
                      addressEditor.id
                        ? addressEditor
                        : {}
                    }
                    saving={savingAddress}
                    onSave={saveAddress}
                    onCancel={() =>
                      setAddressEditor(
                        null
                      )
                    }
                  />

                </div>
              )}

            </div>

            {/* DELIVERY MODE */}

            <div className="card checkout-card p-4 sm:p-6">

              <div className="delivery-mode-section w-full">

                <div className="delivery-mode-header flex items-start gap-3 sm:gap-4">

                  <div className="account-section-icon shrink-0">
                    <Truck size={18} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <h2 className="text-xl font-black leading-tight sm:text-2xl">
                      Choose delivery mode
                    </h2>

                    <p className="mt-1.5 text-sm leading-6 text-stone-500">
                      Choose one delivery option
                      for this order.
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid w-full gap-3">

                  {/* NORMAL */}

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryMode(
                        'NORMAL'
                      )
                    }
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                      deliveryMode ===
                      'NORMAL'
                        ? 'border-achar-700 bg-amber-50 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >

                    <div className="flex w-full items-start justify-between gap-3">

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <Truck
                            size={17}
                            className="shrink-0 text-achar-700"
                          />

                          <span className="text-base font-black sm:text-lg">
                            Normal Delivery
                          </span>

                        </div>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                          Free above ₹350.
                          Otherwise charges
                          depend on your delivery
                          address and total weight.
                        </p>

                      </div>

                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          deliveryMode ===
                          'NORMAL'
                            ? 'border-achar-700'
                            : 'border-stone-300'
                        }`}
                      >
                        {deliveryMode ===
                          'NORMAL' && (
                          <span className="h-2.5 w-2.5 rounded-full bg-achar-700" />
                        )}
                      </span>

                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-stone-200/80 pt-3 text-xs font-semibold text-stone-600 sm:text-sm">

                      <Truck
                        size={15}
                        className="shrink-0 text-achar-700"
                      />

                      <span>
                        Expected by{' '}
                        <b className="text-stone-900">
                          {formatDate(
                            expectedDeliveryDate(
                              'NORMAL'
                            )
                          )}
                        </b>
                      </span>

                    </div>

                  </button>

                  {/* SUPER FAST */}

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryMode(
                        'SUPERFAST'
                      )
                    }
                    disabled={
                      quote?.superFastEnabled ===
                      false
                    }
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                      deliveryMode ===
                      'SUPERFAST'
                        ? 'border-achar-700 bg-amber-50 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    } ${
                      quote?.superFastEnabled ===
                      false
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                  >

                    <div className="flex w-full items-start justify-between gap-3">

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <Zap
                            size={17}
                            className="shrink-0 text-achar-700"
                          />

                          <span className="text-base font-black sm:text-lg">
                            Super Fast Delivery
                          </span>

                        </div>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                          ₹
                          {money(
                            quote?.superFastFee ||
                              85
                          )}{' '}
                          · Priority delivery
                        </p>

                      </div>

                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          deliveryMode ===
                          'SUPERFAST'
                            ? 'border-achar-700'
                            : 'border-stone-300'
                        }`}
                      >
                        {deliveryMode ===
                          'SUPERFAST' && (
                          <span className="h-2.5 w-2.5 rounded-full bg-achar-700" />
                        )}
                      </span>

                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-stone-200/80 pt-3 text-xs font-semibold text-stone-600 sm:text-sm">

                      <Zap
                        size={15}
                        className="shrink-0 text-achar-700"
                      />

                      <span>
                        Expected by{' '}
                        <b className="text-stone-900">
                          {formatDate(
                            expectedDeliveryDate(
                              'SUPERFAST'
                            )
                          )}
                        </b>
                      </span>

                    </div>

                  </button>

                </div>

                {/* FREE DELIVERY */}

                {freeMessage && (
                  <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold leading-5 text-achar-700">
                    Add ₹
                    {money(
                      quote.amountToFreeDelivery
                    )}{' '}
                    more to get free
                    Normal Delivery.
                  </div>
                )}

                {!freeMessage &&
                  deliveryMode ===
                    'NORMAL' &&
                  Number(
                    quote?.amountToFreeDelivery ||
                      0
                  ) <= 0 && (
                    <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-5 text-emerald-700">
                      ✓ You unlocked free
                      Normal Delivery.
                    </div>
                  )}

                {/* STATE */}

                {selectedAddress && (
                  <p className="mt-3 px-1 text-xs font-semibold leading-5 text-stone-500 sm:text-sm">
                    Delivery calculated for{' '}
                    <b className="text-stone-800">
                      {selectedAddress.state}
                    </b>
                    .
                  </p>
                )}

                {/* EXPECTED DATE */}

                <div className="mt-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5">

                  <div className="flex items-start gap-3">

                    <Truck
                      size={17}
                      className="mt-0.5 shrink-0 text-achar-700"
                    />

                    <div className="min-w-0">

                      <div className="text-sm font-bold text-stone-700">
                        Expected delivery
                      </div>

                      <div className="mt-1 text-base font-black text-stone-900">
                        {formatDate(
                          expectedDeliveryDate(
                            deliveryMode
                          )
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        Rural areas may take
                        a little longer;
                        metropolitan
                        locations generally
                        receive faster service.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* RIGHT - ORDER SUMMARY */}

          <aside className="price-summary-card checkout-summary lg:sticky lg:top-24">

            <div className="flex items-center justify-between">

              <h2>
                Order Summary
              </h2>

              <span>
                {checkoutItems.reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.quantity || 0
                    ),
                  0
                )}{' '}
                item(s)
              </span>

            </div>

            {/* ITEMS */}

            {(quote?.items ||
              checkoutItems
            ).map((x, i) => (
              <div
                key={
                  x.key ||
                  `${x.productId}:${x.weight}:${i}`
                }
                className="mt-4 flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {x.name ||
                    x.productId}{' '}
                  · {x.weight} ×{' '}
                  {x.quantity}
                </span>

                <b>
                  ₹
                  {money(
                    Number(
                      x.price || 0
                    ) *
                      Number(
                        x.quantity || 0
                      )
                  )}
                </b>
              </div>
            ))}

            {/* COUPON */}

            <div className="coupon-box mt-5">

              <div className="flex items-center justify-between">

                <b>
                  Have a coupon?
                </b>

                {coupon && (
                  <button
                    type="button"
                    onClick={
                      removeCoupon
                    }
                    className="text-xs font-bold text-red-700"
                  >
                    Remove
                  </button>
                )}

              </div>

              <div className="mt-3 flex gap-2">

                <input
                  className="input !py-2.5"
                  value={couponCode}
                  onChange={(e) =>
                    setCouponCode(
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Enter coupon code"
                  disabled={!!coupon}
                />

                <button
                  type="button"
                  className="btn-secondary !px-4 !py-2.5"
                  onClick={
                    applyCoupon
                  }
                  disabled={
                    couponLoading ||
                    !!coupon
                  }
                >
                  {couponLoading
                    ? 'Checking…'
                    : 'Apply'}
                </button>

              </div>

              {coupon && (
                <p className="mt-2 text-xs font-bold text-emerald-700">
                  ✓ {coupon.code}{' '}
                  applied · You save ₹
                  {money(
                    quote?.discount
                  )}
                </p>
              )}

            </div>

            {/* BILL */}

            <div className="mt-5 space-y-3 border-t pt-5 text-sm">

              <div className="flex justify-between">
                <span>
                  Subtotal
                </span>

                <b>
                  ₹
                  {money(
                    quote?.subtotal
                  )}
                </b>
              </div>

              {Number(
                quote?.discount || 0
              ) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Coupon discount
                  </span>

                  <b>
                    -₹
                    {money(
                      quote.discount
                    )}
                  </b>
                </div>
              )}

              {/* DELIVERY */}

              <div className="flex justify-between gap-4">

                <span>
                  Delivery{' '}
                  <small className="text-stone-400">
                    (
                    {deliveryMode ===
                    'SUPERFAST'
                      ? 'Super Fast'
                      : 'Normal'}
                    )
                  </small>
                </span>

                <b
                  className={
                    quote?.shipping
                      ? 'text-stone-900'
                      : 'text-emerald-700'
                  }
                >
                  {quote?.shipping ? (
                    `₹${money(
                      quote.shipping
                    )}`
                  ) : (
                    <>
                      <s className="mr-1 text-stone-400">
                        ₹
                        {money(
                          quote?.regularShipping
                        )}
                      </s>
                      FREE
                    </>
                  )}
                </b>

              </div>

              {/* PLATFORM */}

              <div className="flex justify-between">

                <span>
                  Platform fee
                </span>

                <b>
                  {quote?.platformFeeEnabled ? (
                    `₹${money(
                      quote.platformFee
                    )}`
                  ) : (
                    <>
                      <s className="mr-1 text-stone-400">
                        ₹
                        {money(
                          quote?.platformFeeDisplayed
                        )}
                      </s>

                      <span className="text-emerald-700">
                        {/* ₹0 (waived) */}
                      </span>
                    </>
                  )}
                </b>

              </div>

              {/* GST */}

              <div className="flex justify-between">

                <span>
                  GST (
                  {money(
                    quote?.gstPercent ||
                      2.36
                  )}
                  %)
                </span>

                <b>
                  ₹
                  {money(
                    quote?.gst
                  )}
                </b>

              </div>

            </div>

            {/* TOTAL */}

            <div className="mt-5 flex items-center justify-between border-t pt-5 text-xl">

              <b>
                Total Amount
              </b>

              <b>
                ₹
                {money(
                  quote?.total
                )}
              </b>

            </div>

            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              ✓ Final bill includes
              delivery, platform fee
              status and GST.
            </div>
            
            

            {priceChanged && (
              <>
                <style>{`
                  @keyframes priceChangeBorderMove {
                    0% {
                      background-position: 0% 50%;
                    }
                    100% {
                      background-position: 300% 50%;
                    }
                  }

                  .price-change-alert-border {
                    background:
                      linear-gradient(
                        90deg,
                        #7f1d1d,
                        #ef4444,
                        #fca5a5,
                        #ef4444,
                        #7f1d1d
                      );
                    background-size: 300% 100%;
                    animation: priceChangeBorderMove 2s linear infinite;
                  }

                  @media (prefers-reduced-motion: reduce) {
                    .price-change-alert-border {
                      animation: none;
                    }
                  }
                `}</style>

                <div className="price-change-alert-border mt-4 rounded-2xl p-[2px]">
                  <div className="rounded-[14px] bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-lg">⚠️</div>

                      <div className="min-w-0">
                        <p className="font-black text-amber-900">
                          Price Details Are Changed
                        </p>

                        <p className="mt-2 font-black text-amber-900">
                          Please Check Before Payment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-2"></div>

            <PaymentButton
              onPay={pay}
              loading={
                paying ||
                quoteLoading
              }
            />

            <p className="mt-3 text-center text-[11px] font-semibold text-stone-400">
              🔒 Authenticated checkout
            </p>

          </aside>

        </div>
      </section>

      {/* SUCCESS */}

      <OrderSuccessModal
        open={Boolean(
          successOrderId
        )}
        orderId={successOrderId}
        onContinue={() =>
          navigate('/products')
        }
        onViewOrder={() =>
          navigate(
            `/orders/${successOrderId}`
          )
        }
      />

      {/* DELETE ADDRESS */}

      <ConfirmModal
        open={Boolean(
          deleteTarget
        )}
        title={`Delete ${
          deleteTarget?.label ||
          'address'
        }?`}
        message="This saved delivery address will be permanently removed from your account."
        confirmLabel="Yes, delete"
        cancelLabel="No, keep it"
        onConfirm={
          confirmDeleteAddress
        }
        onCancel={() =>
          setDeleteTarget(null)
        }
      />
    </>
  );
}