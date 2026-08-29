import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import ProductGrid from '../../components/products/ProductGrid';
import QuantityControl from '../../components/products/QuantityControl';
import VariantSelector from '../../components/products/VariantSelector';

import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';

import api from '../../services/api';
import { getProductImage } from '../../utils/productImage';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);

  const liked = wishlist.some(
    (item) => item.id === product?.id
  );

  /*
   * Expected delivery preview
   *
   * Product page has no delivery mode selected yet,
   * so we show Normal Delivery (+7 days).
   *
   * Checkout will calculate the final delivery mode/date.
   */
  const getExpectedDeliveryDate = (mode = 'NORMAL') => {
    const days = mode === 'SUPER_FAST' ? 4 : 7;

    const date = new Date();
    date.setDate(date.getDate() + days);

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setVariant(null);

    Promise.all([
      api.get(`/products/${productId}`),
      api.get('/products'),
    ])
      .then(([productResponse, productsResponse]) => {
        if (!alive) return;

        const currentProduct = productResponse.data;

        if (!currentProduct) {
          setNotFound(true);
          return;
        }

        setProduct(currentProduct);
        setVariant(
          currentProduct?.variants?.[0] || null
        );

        setAllProducts(
          Array.isArray(productsResponse.data)
            ? productsResponse.data
            : []
        );
      })
      .catch((error) => {
        if (!alive) return;

        if (error?.response?.status === 404) {
          setNotFound(true);
        } else {
          showToast(
            error?.response?.data?.message ||
              'Unable to load this product.',
            'error'
          );
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    window.scrollTo(0, 0);

    return () => {
      alive = false;
    };
  }, [productId, showToast]);

  const recommended = useMemo(() => {
    return allProducts
      .filter((item) => item.id !== product?.id)
      .slice(0, 6);
  }, [allProducts, product?.id]);

  function add() {
    if (!variant) return showToast('This pickle is unavailable.', 'error');
    addToCart(product, variant, qty);
    if (Number(variant.stock) < 1) return showToast(`${product.name} added to cart. It is currently out of stock and cannot be ordered.`, 'error');
    showToast(`${product.name} added to cart`);
  }

  function buyNow() {
    if (
      !variant ||
      Number(variant.stock) < 1
    ) {
      return showToast(
        'This pickle is unavailable.',
        'error'
      );
    }

    sessionStorage.setItem(
      'aab_buy_now_v1',
      JSON.stringify({
        productId: product.id,
        weight: variant.weight,
        quantity: Math.max(
          1,
          Math.min(
            qty,
            Number(variant.stock)
          )
        ),
      })
    );

    navigate('/checkout?mode=buy-now');
  }

  if (loading) {
    return (
      <section className="container-app py-12">
        <div className="account-loading py-16">
          <div className="loading-spinner" />
          Loading product…
        </div>
      </section>
    );
  }

  if (notFound || !product) {
    return (
      <section className="container-app py-10 sm:py-14">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="back-link"
        >
          <ArrowLeft size={17} />
          Products
        </button>

        <div className="empty-account mt-6">
          <ShoppingCart size={34} />

          <h2>Product unavailable</h2>

          <p>
            This product is no longer part of our
            live catalogue.
          </p>

          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => navigate('/products')}
          >
            Browse pickles
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container-app py-5 sm:py-8 lg:py-10">

      {/* BACK */}
      <button
        type="button"
        onClick={() =>
          window.history.length > 1
            ? navigate(-1)
            : navigate('/')
        }
        className="back-link mb-4"
      >
        <ArrowLeft size={17} />
        Back
      </button>

      <div className="product-detail-shell">

        {/* PRODUCT IMAGE */}
        <div className="product-gallery">
          <div className="product-main-image">
            <img
              src={getProductImage(product)}
              alt={product.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src =
                  '/placeholder-product.svg';
              }}
            />
          </div>
        </div>

        {/* PRODUCT INFORMATION */}
        <div className="product-info-panel">

          <p className="product-eyebrow">
            {product.category} pickle
          </p>

          {/* TITLE + WISHLIST */}
          <div className="product-title-row">
            <h1>{product.name}</h1>

            <button
              type="button"
              onClick={() =>
                toggleWishlist(product)
              }
              className="product-wishlist"
              aria-label={
                liked
                  ? 'Remove from wishlist'
                  : 'Add to wishlist'
              }
            >
              <Heart
                size={21}
                fill={
                  liked
                    ? 'currentColor'
                    : 'none'
                }
              />
            </button>
          </div>

          {/* RATING */}
          <div className="product-rating-row">
            <span className="product-rating-badge">
              ★{' '}
              {Number(
                product.rating || 0
              ).toFixed(1)}
            </span>

            <span>
              {product.reviewCount
                ? `${product.reviewCount} ratings & reviews`
                : 'New product'}
            </span>
          </div>

          {/* PRICE */}
          <div className="product-price-block">
            <div>
              <strong>
                ₹{Number(variant?.price || 0)}
              </strong>

              <span>
                for {variant?.weight || 'Standard'}
              </span>
            </div>

            <p>
              Inclusive of all applicable taxes
            </p>
          </div>

          {/* PRODUCT DETAILS */}
          <div className="product-details-inline">
            {product.description && (
              <p>{product.description}</p>
            )}

            <div className="product-detail-points">

              {product.ingredients && (
                <div>
                  <b>Ingredients</b>
                  <span>
                    {product.ingredients}
                  </span>
                </div>
              )}

              {product.storage && (
                <div>
                  <b>Storage</b>
                  <span>
                    {product.storage}
                  </span>
                </div>
              )}

              {product.shelfLife && (
                <div>
                  <b>Shelf life</b>
                  <span>
                    {product.shelfLife}
                  </span>
                </div>
              )}

            </div>
          </div>

          {/* PACK SIZE */}
          <div className="mt-5">
            <h3 className="product-option-heading">
              Choose pack size
            </h3>

            <VariantSelector
              variants={product.variants || []}
              selected={variant}
              onSelect={(selectedVariant) => {
                setVariant(selectedVariant);
                setQty(1);
              }}
            />
          </div>

          {/* QUANTITY */}
          <div className="mt-5">
            <h3 className="product-option-heading">
              Quantity
            </h3>

            <QuantityControl
              value={qty}
              max={Math.max(
                1,
                Number(variant?.stock || 1)
              )}
              onChange={setQty}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="product-action-grid">

            <button
              type="button"
              onClick={add}
              className="product-add-button"
            >
              <ShoppingCart size={19} />
              Add to Cart
            </button>

            <button
              type="button"
              onClick={buyNow}
              className="product-buy-button"
            >
              <Zap size={19} />
              Buy Now
            </button>

          </div>

          {/* TRUST FEATURES */}
          <div className="product-trust-row">

            <div>
              <Truck size={19} />
              <span>Safe delivery</span>
            </div>

            <div>
              <ShieldCheck size={19} />
              <span>Secure payment</span>
            </div>

            <div>
              <RotateCcw size={19} />
              <span>Support</span>
            </div>

          </div>

          {/* EXPECTED DELIVERY */}
          <div className="expected-delivery-card">

            <div className="expected-delivery-icon">
              <Truck size={20} />
            </div>

            <div className="expected-delivery-content">

              <span className="expected-delivery-label">
                Expected Delivery
              </span>

              <strong>
                {getExpectedDeliveryDate('NORMAL')}
              </strong>

              <p>
                Normal delivery • Usually within 7 days
              </p>

              <small>
                Delivery times may vary slightly for
                rural areas. Metropolitan locations
                may receive faster delivery.
              </small>

            </div>

          </div>

        </div>
      </div>

      {/* RECOMMENDED PRODUCTS */}
      {recommended.length > 0 && (
        <div className="mt-10 sm:mt-14">

          <p className="product-eyebrow">
            More from our kitchen
          </p>

          <h2 className="section-title mt-1">
            You May Also Like
          </h2>

          <div className="mt-5">
            <ProductGrid
              products={recommended}
            />
          </div>

        </div>
      )}

    </section>
  );
}