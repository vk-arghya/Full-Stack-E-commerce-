import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import api from '../services/api';
import { getProductImage } from '../utils/productImage';

const CartContext = createContext(null);

const STORAGE_KEY = 'aab_cart_v1';

// Silent background synchronization.
// The page itself NEVER reloads.
const SYNC_INTERVAL = 5000;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      return Array.isArray(stored)
        ? stored
        : [];
    } catch {
      return [];
    }
  });

  const [lastAddedAt, setLastAddedAt] =
    useState(null);

  const [lastAddedItem, setLastAddedItem] =
    useState(null);

  const mountedRef = useRef(true);

  /*
   * ---------------------------------------------------------
   * SAVE CART LOCALLY
   * ---------------------------------------------------------
   */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch {
      // Ignore localStorage failures.
    }
  }, [items]);


  /*
   * ---------------------------------------------------------
   * FETCH CURRENT PRODUCTS
   *
   * This silently checks:
   * - price
   * - stock
   * - product name
   * - product image
   * - availability
   *
   * It does NOT reload the website.
   * ---------------------------------------------------------
   */

  async function syncCartWithProducts() {
    try {
      const response =
        await api.get('/products');

      const products =
        response?.data;

      if (
        !mountedRef.current ||
        !Array.isArray(products)
      ) {
        return;
      }

      const variantMap =
        new Map();

      for (const product of products) {
        if (
          !product ||
          !product.id
        ) {
          continue;
        }

        const variants =
          Array.isArray(
            product.variants
          )
            ? product.variants
            : [];

        for (const variant of variants) {
          if (!variant?.weight) {
            continue;
          }

          variantMap.set(
            `${product.id}:${variant.weight}`,
            {
              product,
              variant,
            }
          );
        }
      }

      setItems((currentItems) => {
        let changed = false;

        const updatedItems =
          currentItems.map((item) => {
            const found =
              variantMap.get(
                `${item.productId}:${item.weight}`
              );

            /*
             * Product/variant was removed by admin.
             */
            if (!found) {
              if (
                item.unavailable !== true ||
                Number(item.maxStock) !== 0 ||
                Number(item.stock) !== 0
              ) {
                changed = true;
              }

              return {
                ...item,
                unavailable: true,
                maxStock: 0,
                stock: 0,
              };
            }

            const product =
              found.product;

            const variant =
              found.variant;

            const stock = Math.max(
              0,
              Math.floor(
                Number(
                  variant.stock
                ) || 0
              )
            );

            const price =
              Number(
                variant.price
              ) || 0;

            /*
             * IMPORTANT:
             *
             * If admin changes price,
             * the cart automatically gets
             * the latest price.
             */
            if (
              Number(item.price) !==
                price ||
              Number(item.stock) !==
                stock ||
              Number(item.maxStock) !==
                stock ||
              item.unavailable === true ||
              item.name !==
                product.name
            ) {
              changed = true;
            }

            /*
             * If stock decreases below the
             * quantity already in cart,
             * keep the quantity but mark it
             * unavailable/invalid for checkout.
             *
             * This allows your UI to show:
             * "Only X left" / "Out of stock".
             */
            const quantity =
              Math.max(
                1,
                Number(
                  item.quantity
                ) || 1
              );

            const unavailable =
              stock < 1 ||
              quantity > stock;

            return {
              ...item,

              name:
                product.name ||
                item.name,

              image:
                getProductImage(
                  product
                ),

              price,

              stock,

              maxStock:
                stock,

              unavailable,
            };
          });

        return changed
          ? updatedItems
          : currentItems;
      });
    } catch (error) {
      /*
       * Never break the cart if the
       * background synchronization fails.
       *
       * The existing cart remains usable.
       */
      console.warn(
        'Cart background sync failed:',
        error?.message || error
      );
    }
  }


  /*
   * ---------------------------------------------------------
   * INITIAL SYNC
   * ---------------------------------------------------------
   */

  useEffect(() => {
    mountedRef.current = true;

    syncCartWithProducts();

    return () => {
      mountedRef.current = false;
    };
  }, []);


  /*
   * ---------------------------------------------------------
   * SILENT 5-SECOND SYNC
   *
   * NO PAGE REFRESH.
   * NO window.location.reload().
   * NO navigation.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          syncCartWithProducts();
        },
        SYNC_INTERVAL
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);


  /*
   * ---------------------------------------------------------
   * ADD TO CART
   * ---------------------------------------------------------
   */

  function addToCart(
    product,
    variant = product?.variants?.[0],
    quantity = 1
  ) {
    if (
      !product ||
      !variant
    ) {
      return false;
    }

    const stock =
      Math.max(
        0,
        Math.floor(
          Number(
            variant?.stock ?? 0
          ) || 0
        )
      );

    const key =
      `${product.id}:${variant?.weight || 'default'}`;

    const requested =
      Math.max(
        1,
        Math.floor(
          Number(quantity) || 1
        )
      );

    /*
     * Existing behavior:
     * if stock exists, don't allow adding
     * more than available stock.
     */
    const safe =
      stock > 0
        ? Math.min(
            requested,
            stock
          )
        : 1;

    setItems((current) => {
      const existing =
        current.find(
          (item) =>
            item.key === key
        );

      if (existing) {
        const nextQuantity =
          stock > 0
            ? Math.min(
                Number(
                  existing.quantity
                ) + safe,
                stock
              )
            : existing.quantity;

        return current.map(
          (item) =>
            item.key === key
              ? {
                  ...item,

                  name:
                    product.name,

                  image:
                    getProductImage(
                      product
                    ),

                  price:
                    Number(
                      variant.price
                    ) || 0,

                  maxStock:
                    stock,

                  stock,

                  unavailable:
                    stock < 1,

                  quantity:
                    nextQuantity,
                }
              : item
        );
      }

      return [
        ...current,

        {
          key,

          productId:
            product.id,

          name:
            product.name,

          image:
            getProductImage(
              product
            ),

          weight:
            variant?.weight ||
            '',

          price:
            Number(
              variant?.price || 0
            ),

          quantity:
            safe,

          maxStock:
            stock,

          stock,

          unavailable:
            stock < 1,
        },
      ];
    });

    setLastAddedAt(
      Date.now()
    );

    setLastAddedItem({
      key,

      productId:
        product.id,

      name:
        product.name,

      image:
        getProductImage(
          product
        ),

      weight:
        variant?.weight ||
        '',

      price:
        Number(
          variant?.price || 0
        ),

      quantity:
        safe,
    });

    return true;
  }


  /*
   * ---------------------------------------------------------
   * UPDATE QUANTITY
   * ---------------------------------------------------------
   */

  function updateQuantity(
    key,
    quantity
  ) {
    setItems((current) =>
      current.map((item) => {
        if (
          item.key !== key
        ) {
          return item;
        }

        if (
          Number(
            item.maxStock
          ) < 1
        ) {
          return item;
        }

        const requested =
          Math.max(
            1,
            Math.floor(
              Number(quantity) ||
                1
            )
          );

        return {
          ...item,

          quantity:
            Math.min(
              requested,
              Number(
                item.maxStock
              )
            ),
        };
      })
    );
  }


  /*
   * ---------------------------------------------------------
   * REMOVE
   * ---------------------------------------------------------
   */

  function removeItem(key) {
    setItems((current) =>
      current.filter(
        (item) =>
          item.key !== key
      )
    );
  }


  /*
   * ---------------------------------------------------------
   * CLEAR
   * ---------------------------------------------------------
   */

  function clearCart() {
    setItems([]);

    setLastAddedAt(
      null
    );

    setLastAddedItem(
      null
    );
  }


  /*
   * ---------------------------------------------------------
   * CART CALCULATIONS
   * ---------------------------------------------------------
   */

  const count =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity || 0
        ),
      0
    );

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );

  const unavailableItems =
    items.filter(
      (item) =>
        item.unavailable ===
          true ||
        Number(
          item.maxStock
        ) < 1 ||
        Number(
          item.quantity
        ) >
          Number(
            item.maxStock
          )
    );


  /*
   * ---------------------------------------------------------
   * CONTEXT
   * ---------------------------------------------------------
   */

  const value =
    useMemo(
      () => ({
        items,

        count,

        subtotal,

        unavailableItems,

        addToCart,

        updateQuantity,

        removeItem,

        clearCart,

        lastAddedAt,

        lastAddedItem,

        /*
         * Expose manual sync in case
         * checkout wants to force an
         * immediate product check.
         */
        syncCartWithProducts,
      }),
      [
        items,
        count,
        subtotal,
        unavailableItems,
        lastAddedAt,
        lastAddedItem,
      ]
    );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart =
  () => useContext(
    CartContext
  );