import { adminDb } from '../config/firebaseAdmin.js';

import {
  verifyRazorpaySignature,
  fetchRazorpayPayment,
} from '../services/razorpayService.js';

import { sendOrderEmail } from '../services/orderPlacedEmailService.js';
import { sendOrderAcceptedEmail } from '../services/orderAcceptedEmailService.js';
import { sendOrderRejectedEmail } from '../services/orderRejectedEmailService.js';
import { sendOrderPackedEmail } from '../services/orderPackedEmailService.js';
import { sendOrderShippedEmail } from '../services/orderShippedEmailService.js';


/* =========================================================
   FINALIZE ORDER
   ========================================================= */

export async function finalizeOrder(req, res) {
  try {
    const { paymentSessionId, payment } = req.body || {};

    if (
      !paymentSessionId ||
      !payment?.razorpay_order_id ||
      !payment?.razorpay_payment_id
    ) {
      return res.status(400).json({
        message: 'Verified payment is required',
      });
    }

    const sessionRef = adminDb
      .collection('paymentSessions')
      .doc(paymentSessionId);

    const orderRef = adminDb
      .collection('orders')
      .doc();

    const result = await adminDb.runTransaction(async (tx) => {
      /* ---------------------------------------------------
         PAYMENT SESSION
         --------------------------------------------------- */

      const sessionSnap = await tx.get(sessionRef);

      if (!sessionSnap.exists) {
        throw new Error('Payment session not found');
      }

      const session = sessionSnap.data();

      if (session.userId !== req.user.uid) {
        throw new Error(
          'Payment session does not belong to you'
        );
      }

      /*
       * Prevent duplicate order creation if the frontend
       * submits the same successful payment more than once.
       */
      if (session.status === 'CONSUMED') {
        return {
          duplicate: true,
          orderId: session.orderId,
        };
      }

      if (session.status !== 'VERIFIED') {
        throw new Error(
          'Payment has not been verified'
        );
      }

      if (
        session.providerOrderId !==
          payment.razorpay_order_id ||
        session.paymentId !==
          payment.razorpay_payment_id
      ) {
        throw new Error('Payment mismatch');
      }

      if (
        session.expiresAt?.toDate?.() < new Date()
      ) {
        throw new Error(
          'Payment session expired'
        );
      }

      /* ---------------------------------------------------
         RAZORPAY SIGNATURE
         --------------------------------------------------- */

      const signatureOk =
        verifyRazorpaySignature({
          orderId:
            payment.razorpay_order_id,
          paymentId:
            payment.razorpay_payment_id,
          signature:
            payment.razorpay_signature,
        });

      if (!signatureOk) {
        throw new Error(
          'Payment verification failed'
        );
      }

      /* ---------------------------------------------------
         USER / ADDRESS / COUPON
         --------------------------------------------------- */

      const profileRef = adminDb
        .collection('users')
        .doc(req.user.uid);

      /*
       * IMPORTANT:
       * The address is always read from the authenticated
       * user's own addresses collection.
       */
      const addressRef = profileRef
        .collection('addresses')
        .doc(session.addressId);

      const couponRef = session.couponCode
        ? adminDb
            .collection('coupons')
            .doc(
              String(session.couponCode)
            )
        : null;

      /*
       * One specific promo code can only be used once
       * by one user.
       */
      const redemptionRef =
        session.couponCode
          ? profileRef
              .collection('couponRedemptions')
              .doc(
                String(session.couponCode)
              )
          : null;

      const reads = [
        tx.get(profileRef),
        tx.get(addressRef),
      ];

      if (couponRef) {
        reads.push(tx.get(couponRef));
      }

      if (redemptionRef) {
        reads.push(tx.get(redemptionRef));
      }

      const results =
        await Promise.all(reads);

      const profileSnap = results[0];
      const addressSnap = results[1];

      const couponSnap = couponRef
        ? results[2]
        : null;

      const redemptionSnap =
        redemptionRef
          ? results[3]
          : null;

      if (!addressSnap.exists) {
        throw new Error(
          'Delivery address no longer exists'
        );
      }

      if (redemptionSnap?.exists) {
        throw new Error(
          'This promo code has already been used on your account.'
        );
      }

      /* ---------------------------------------------------
         PRODUCTS / STOCK / PRICE VERIFICATION
         --------------------------------------------------- */

      const productRefs =
        session.items.map((item) =>
          adminDb
            .collection('products')
            .doc(item.productId)
        );

      const productSnaps = [];

      for (const ref of productRefs) {
        productSnaps.push(
          await tx.get(ref)
        );
      }

      const finalItems = [];

      for (
        let i = 0;
        i < session.items.length;
        i += 1
      ) {
        const item =
          session.items[i];

        const snap =
          productSnaps[i];

        if (!snap.exists) {
          throw new Error(
            `${item.name} is no longer available`
          );
        }

        const product =
          snap.data();

        const variantIndex =
          (product.variants || [])
            .findIndex(
              (v) =>
                String(v.weight) ===
                String(item.weight)
            );

        if (variantIndex < 0) {
          throw new Error(
            `${item.name} / ${item.weight} is no longer available`
          );
        }

        const variant =
          product.variants[
            variantIndex
          ];

        const requestedQuantity =
          Number(item.quantity);

        if (
          !Number.isFinite(
            requestedQuantity
          ) ||
          requestedQuantity <= 0
        ) {
          throw new Error(
            `Invalid quantity for ${item.name}`
          );
        }

        if (
          Number(variant.stock) <
          requestedQuantity
        ) {
          throw new Error(
            `${item.name} has insufficient stock`
          );
        }

        /*
         * Never trust the browser's price.
         */
        if (
          Math.round(
            Number(variant.price)
          ) !==
          Math.round(
            Number(item.price)
          )
        ) {
          throw new Error(
            `Price changed for ${item.name}. Please restart checkout.`
          );
        }

        const nextVariants =
          product.variants.map(
            (v, idx) =>
              idx === variantIndex
                ? {
                    ...v,
                    stock:
                      Number(v.stock) -
                      requestedQuantity,
                  }
                : v
          );

        tx.update(
          productRefs[i],
          {
            variants:
              nextVariants,
            updatedAt:
              new Date(),
          }
        );

        const trustedPrice =
          Math.round(
            Number(variant.price)
          );

        finalItems.push({
          ...item,
          price: trustedPrice,
          lineTotal:
            trustedPrice *
            requestedQuantity,
          quantity:
            requestedQuantity,
        });
      }

      /* ---------------------------------------------------
         COUPON VALIDATION
         --------------------------------------------------- */

      if (couponRef) {
        if (!couponSnap?.exists) {
          throw new Error(
            'Coupon is no longer available'
          );
        }

        const coupon =
          couponSnap.data();

        const expiry =
          coupon.expiresAt
            ?.toDate?.() ||
          (
            coupon.expiresAt
              ? new Date(
                  coupon.expiresAt
                )
              : null
          );

        if (
          coupon.active !== true ||
          (
            expiry &&
            !Number.isNaN(
              expiry.getTime()
            ) &&
            expiry <= new Date()
          )
        ) {
          throw new Error(
            'Coupon is no longer valid'
          );
        }

        if (
          Number(
            coupon.maxUses || 0
          ) > 0 &&
          Number(
            coupon.usedCount || 0
          ) >=
            Number(
              coupon.maxUses
            )
        ) {
          throw new Error(
            'Coupon usage limit has been reached'
          );
        }

        tx.update(
          couponRef,
          {
            usedCount:
              Number(
                coupon.usedCount || 0
              ) + 1,
            updatedAt:
              new Date(),
          }
        );

        tx.create(
          redemptionRef,
          {
            couponCode:
              coupon.code ||
              couponSnap.id,
            orderId:
              orderRef.id,
            usedAt:
              new Date(),
          }
        );
      }

      /* ---------------------------------------------------
         ORDER DATE / EXPECTED DELIVERY DATE
         --------------------------------------------------- */

      const now = new Date();

      const deliveryMode =
        session.deliveryMode ===
        'SUPERFAST'
          ? 'SUPERFAST'
          : 'NORMAL';

      const expectedDeliveryDate =
        new Date(now);

      expectedDeliveryDate.setDate(
        expectedDeliveryDate.getDate() +
          (
            deliveryMode ===
            'SUPERFAST'
              ? 4
              : 7
          )
      );

      /* ---------------------------------------------------
         ORDER
         --------------------------------------------------- */

      const order = {
        userId: req.user.uid,

        items: finalItems,

        addressSnapshot: {
          id: addressSnap.id,
          ...addressSnap.data(),
        },

        profileSnapshot: {
          name:
            profileSnap.data()?.name ||
            req.user.name ||
            '',

          phone:
            profileSnap.data()?.phone ||
            '',

          email:
            req.user.email ||
            '',
        },

        /* Billing */
        subtotal:
          Number(
            session.subtotal || 0
          ),

        netMerchandise:
          Number(
            session.netMerchandise || 0
          ),

        shipping:
          Number(
            session.shipping || 0
          ),

        deliveryMode,

        discount:
          Number(
            session.discount || 0
          ),

        couponCode:
          session.couponCode ||
          null,

        platformFee:
          Number(
            session.platformFee || 0
          ),

        platformFeeDisplayed:
          Number(
            session.platformFeeDisplayed ||
              0
          ),

        platformFeeEnabled:
          session.platformFeeEnabled ===
          true,

        gstPercent:
          Number(
            session.gstPercent ||
              2.36
          ),

        gst:
          Number(
            session.gst || 0
          ),

        total:
          Number(
            session.total || 0
          ),

        /* Dates */
        orderDate:
          now.toISOString(),

        expectedDeliveryDate:
          expectedDeliveryDate.toISOString(),

        /* Payment */
        paymentProvider:
          String(
            process.env
              .RAZORPAY_ENABLED ||
              ''
          )
            .trim()
            .toLowerCase() ===
          'true'
            ? 'razorpay'
            : 'test',

        razorpayOrderId:
          payment.razorpay_order_id,

        razorpayPaymentId:
          payment.razorpay_payment_id,

        paymentStatus:
          'VERIFIED',

        /* Status */
        orderStatus:
          'PLACED',

        statusHistory: [
          {
            status: 'PLACED',
            at: now.toISOString(),
          },
          {
            status:
              'PAYMENT_VERIFIED',
            at: now.toISOString(),
          },
        ],

        createdAt: now,

        updatedAt: now,
      };

      tx.create(
        orderRef,
        order
      );

      /*
       * Consume payment session so the same payment
       * cannot create another order.
       */
      tx.update(
        sessionRef,
        {
          status: 'CONSUMED',
          consumedAt: now,
          orderId:
            orderRef.id,
        }
      );

      return {
        duplicate: false,
        orderId:
          orderRef.id,
      };
    });

    /* =====================================================
       SEND ORDER CONFIRMATION EMAIL
       ===================================================== */

    if (!result.duplicate) {
      try {
        const orderSnap =
          await adminDb
            .collection('orders')
            .doc(result.orderId)
            .get();

        if (orderSnap.exists) {
          const data =
            orderSnap.data();

          let paymentDetails =
            null;

          /*
           * Fetch Razorpay payment details so the order
           * can contain:
           *
           * - Payment method
           * - UPI / wallet / bank / card
           * - Transaction ID
           * - Razorpay payment ID
           */
          try {
            paymentDetails =
              await fetchRazorpayPayment(
                data.razorpayPaymentId
              );
          } catch (
            paymentError
          ) {
            console.error(
              'payment details fetch failed:',
              paymentError.message
            );
          }

          if (paymentDetails) {
            const paymentMethod =
              paymentDetails.method ||
              '';

            const paymentApp =
              paymentDetails.upi?.vpa ||
              paymentDetails.wallet ||
              paymentDetails.bank ||
              paymentDetails.card
                ?.network ||
              '';

            const transactionId =
              paymentDetails.id ||
              data.razorpayPaymentId;

            const paymentStatus =
              paymentDetails.status ===
              'captured'
                ? 'CAPTURED'
                : String(
                    paymentDetails.status ||
                      'VERIFIED'
                  ).toUpperCase();

            await adminDb
              .collection('orders')
              .doc(result.orderId)
              .update({
                paymentStatus,

                paymentMethod,

                paymentApp,

                transactionId,

                paymentDetails: {
                  id: transactionId,
                  method:
                    paymentMethod,
                  app:
                    paymentApp,
                },

                updatedAt:
                  new Date(),
              });

            /*
             * Update local object too, so EmailJS
             * receives the payment information.
             */
            data.paymentStatus =
              paymentStatus;

            data.paymentMethod =
              paymentMethod;

            data.paymentApp =
              paymentApp;

            data.transactionId =
              transactionId;

            data.paymentDetails = {
              id: transactionId,
              method:
                paymentMethod,
              app:
                paymentApp,
            };
          }

          await sendOrderEmail({
            to:
              data.profileSnapshot
                ?.email ||
              req.user.email,

            customerName:
              data.profileSnapshot
                ?.name ||
              req.user.name ||
              'Customer',

            orderId:
              result.orderId,

            total:
              data.total,

            items:
              data.items,

            address:
              data.addressSnapshot,

            status:
              'PLACED',

            billing:
              data,
          });
        }
      } catch (
        emailError
      ) {
        /*
         * IMPORTANT:
         * Email failure must never make a valid
         * paid order fail.
         */
        console.error(
          'Order confirmation email failed:',
          emailError.message
        );
      }
    }

    res.json({
      orderId:
        result.orderId,

      duplicate:
        result.duplicate,
    });
  } catch (error) {
    console.error(
      'Finalize order error:',
      error
    );

    res.status(400).json({
      message:
        error.message ||
        'Unable to finalize order',
    });
  }
}


/* =========================================================
   MY ORDERS
   ========================================================= */

export async function listMyOrders(
  req,
  res
) {
  try {
    const snap =
      await adminDb
        .collection('orders')
        .where(
          'userId',
          '==',
          req.user.uid
        )
        .get();

    const orders =
      snap.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

    orders.sort(
      (a, b) => {
        const av =
          a.createdAt
            ?.toMillis?.() ||
          new Date(
            a.createdAt || 0
          ).getTime();

        const bv =
          b.createdAt
            ?.toMillis?.() ||
          new Date(
            b.createdAt || 0
          ).getTime();

        return bv - av;
      }
    );

    res.json(orders);
  } catch (error) {
    console.error(
      'List my orders error:',
      error
    );

    res.status(500).json({
      message:
        'Unable to load orders',
    });
  }
}


/* =========================================================
   GET ONE ORDER
   ========================================================= */

export async function getMyOrder(
  req,
  res
) {
  try {
    const snap =
      await adminDb
        .collection('orders')
        .doc(req.params.id)
        .get();

    if (!snap.exists) {
      return res.status(404).json({
        message:
          'Order not found',
      });
    }

    const data =
      snap.data();

    /*
     * Customer can only see their own order.
     * Admin can see any order.
     */
    if (
      data.userId !==
        req.user.uid &&
      req.user.admin !== true
    ) {
      return res.status(403).json({
        message:
          'Access denied',
      });
    }

    res.json({
      id: snap.id,
      ...data,
    });
  } catch (error) {
    console.error(
      'Get order error:',
      error
    );

    res.status(500).json({
      message:
        'Unable to load order',
    });
  }
}


/* =========================================================
   ADMIN - ALL ORDERS
   ========================================================= */

export async function listAdminOrders(
  req,
  res
) {
  try {
    const snap =
      await adminDb
        .collection('orders')
        .orderBy(
          'createdAt',
          'desc'
        )
        .limit(500)
        .get();

    res.json(
      snap.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      )
    );
  } catch (error) {
    console.error(
      'List admin orders error:',
      error
    );

    res.status(500).json({
      message:
        'Unable to load orders',
    });
  }
}


/* =========================================================
   ADMIN - UPDATE ORDER STATUS
   ========================================================= */

export async function updateOrderStatus(
  req,
  res
) {
  const requested =
    String(
      req.body?.status || ''
    )
      .trim()
      .toUpperCase();

  /*
   * Forward-only order flow.
   *
   * PLACED
   *    ↓
   * ACCEPTED
   *    ↓
   * PROCESSING
   *    ↓
   * PACKED
   *    ↓
   * SHIPPED
   *    ↓
   * OUT_FOR_DELIVERY
   *    ↓
   * DELIVERED
   */

  const nextStatus = {
    PLACED:
      'ACCEPTED',

    ACCEPTED:
      'PROCESSING',

    PROCESSING:
      'PACKED',

    PACKED:
      'SHIPPED',

    SHIPPED:
      'OUT_FOR_DELIVERY',

    OUT_FOR_DELIVERY:
      'DELIVERED',
  };

  const validStatuses = [
    'ACCEPTED',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'REJECTED',
    'CANCELLED',
  ];

  /*
   * Basic status validation.
   */
  if (
    !validStatuses.includes(
      requested
    )
  ) {
    return res.status(400).json({
      message:
        'Invalid or unsupported order status',
    });
  }

  try {
    const ref =
      adminDb
        .collection('orders')
        .doc(req.params.id);

    let previousStatus = '';

    /* -----------------------------------------------------
       UPDATE STATUS TRANSACTIONALLY
       ----------------------------------------------------- */

    await adminDb.runTransaction(
      async (tx) => {
        const snap =
          await tx.get(ref);

        if (!snap.exists) {
          throw new Error(
            'Order not found'
          );
        }

        const order =
          snap.data();

        previousStatus =
          String(
            order.orderStatus ||
              'PLACED'
          )
            .trim()
            .toUpperCase();

        /*
         * Same status is not allowed.
         */
        if (
          requested ===
          previousStatus
        ) {
          throw new Error(
            'Order is already at this status'
          );
        }

        /* -------------------------------------------------
           CANCEL
           ------------------------------------------------- */

        if (
          requested ===
          'CANCELLED'
        ) {
          if (
            ![
              'PLACED',
              'ACCEPTED',
            ].includes(
              previousStatus
            )
          ) {
            throw new Error(
              'This order can no longer be cancelled from the current step.'
            );
          }
        }

        /* -------------------------------------------------
           REJECT
           ------------------------------------------------- */

        else if (
          requested ===
          'REJECTED'
        ) {
          if (
            previousStatus !==
            'PLACED'
          ) {
            throw new Error(
              'Only a newly placed order can be rejected.'
            );
          }
        }

        /* -------------------------------------------------
           NORMAL FORWARD FLOW
           ------------------------------------------------- */

        else {
          /*
           * THIS IS THE IMPORTANT FIX.
           *
           * We check the next status of the CURRENT
           * status, not the next status of the requested
           * status.
           *
           * Example:
           *
           * OUT_FOR_DELIVERY
           *       ↓
           * DELIVERED
           *
           * nextStatus.OUT_FOR_DELIVERY
           * === DELIVERED
           */
          const expectedNext =
            nextStatus[
              previousStatus
            ];

          if (!expectedNext) {
            throw new Error(
              `Order cannot move forward from ${previousStatus}.`
            );
          }

          if (
            expectedNext !==
            requested
          ) {
            throw new Error(
              `Order must move from ${previousStatus} to ${expectedNext}. Previous steps cannot be selected.`
            );
          }
        }

        /* -------------------------------------------------
           STATUS HISTORY
           ------------------------------------------------- */

        const history =
          Array.isArray(
            order.statusHistory
          )
            ? order.statusHistory
            : [];

        const now =
          new Date();

        tx.update(
          ref,
          {
            orderStatus:
              requested,

            updatedAt:
              now,

            statusHistory: [
              ...history,

              {
                status:
                  requested,

                at:
                  now.toISOString(),
              },
            ],
          }
        );
      }
    );

    /* =====================================================
       STATUS EMAILS
       ===================================================== */

    /*
     * These statuses have separate email services.
     *
     * ACCEPTED  → accepted email
     * REJECTED  → rejected email
     * PACKED    → packed email
     * SHIPPED   → shipped email
     *
     * DELIVERED does NOT incorrectly send the shipped
     * email anymore.
     */
    if (
      [
        'ACCEPTED',
        'REJECTED',
        'PACKED',
        'SHIPPED',
      ].includes(
        requested
      )
    ) {
      try {
        const snap =
          await ref.get();

        if (snap.exists) {
          const data =
            snap.data();

          const payload = {
            to:
              data.profileSnapshot
                ?.email,

            customerName:
              data.profileSnapshot
                ?.name ||
              'Customer',

            orderId:
              snap.id,

            total:
              data.total,

            items:
              data.items,

            address:
              data.addressSnapshot,

            billing:
              data,
          };

          if (
            requested ===
            'ACCEPTED'
          ) {
            await sendOrderAcceptedEmail(
              payload
            );
          }

          else if (
            requested ===
            'REJECTED'
          ) {
            await sendOrderRejectedEmail(
              payload
            );
          }

          else if (
            requested ===
            'PACKED'
          ) {
            await sendOrderPackedEmail(
              payload
            );
          }

          else if (
            requested ===
            'SHIPPED'
          ) {
            await sendOrderShippedEmail(
              payload
            );
          }
        }
      } catch (
        emailError
      ) {
        /*
         * Status was already successfully updated.
         * Email failure must not roll it back.
         */
        console.error(
          `${requested} order email failed:`,
          emailError.message
        );
      }
    }

    /* -----------------------------------------------------
       RESPONSE
       ----------------------------------------------------- */

    res.json({
      ok: true,

      previousStatus,

      orderStatus:
        requested,
    });
  } catch (error) {
    console.error(
      'Order status update failed:',
      error
    );

    res.status(400).json({
      message:
        error.message ||
        'Unable to update order status',
    });
  }
}