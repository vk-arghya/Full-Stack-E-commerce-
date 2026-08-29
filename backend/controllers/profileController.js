import { adminDb } from '../config/firebaseAdmin.js';
import { sendWelcomeEmail } from '../services/welcomeEmailService.js';

const PROFILE_FIELDS = [
  'name',
  'phone',
  'whatsapp',
  'state',
  'district',
  'city',
  'pincode',
];

const ADDRESS_FIELDS = [
  'label',
  'name',
  'phone',
  'whatsapp',
  'state',
  'district',
  'city',
  'pincode',
  'address',
];

/* =========================================================
   COUPON VALIDATION
========================================================= */

function couponIsValid(coupon) {
  if (!coupon || coupon.active !== true) {
    return false;
  }

  if (coupon.expiresAt) {
    const expiry =
      coupon.expiresAt?.toDate?.() ||
      new Date(coupon.expiresAt);

    if (
      !Number.isNaN(expiry.getTime()) &&
      expiry <= new Date()
    ) {
      return false;
    }
  }

  if (
    Number(coupon.maxUses || 0) > 0 &&
    Number(coupon.usedCount || 0) >=
      Number(coupon.maxUses)
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   CLEAN FIELDS
========================================================= */

function cleanFields(body, fields) {
  return Object.fromEntries(
    fields
      .filter((key) => key in (body || {}))
      .map((key) => [
        key,
        String(body[key] ?? '').trim(),
      ])
  );
}

/* =========================================================
   ADDRESS VALIDATION
========================================================= */

function validateAddress(data) {
  const required = [
    'label',
    'name',
    'phone',
    'state',
    'district',
    'city',
    'pincode',
    'address',
  ];

  if (
    required.some(
      (key) =>
        !String(data[key] || '').trim()
    )
  ) {
    throw new Error(
      'Please complete all required address fields.'
    );
  }

  if (
    !/^\d{6}$/.test(
      String(data.pincode).trim()
    )
  ) {
    throw new Error(
      'Please enter a valid 6 digit PIN code.'
    );
  }

  if (
    !/^[0-9+ -]{10,15}$/.test(
      String(data.phone).trim()
    )
  ) {
    throw new Error(
      'Please enter a valid phone number.'
    );
  }
}

/* =========================================================
   ENSURE USER PROFILE
   =========================================================

   IMPORTANT:

   - Creates the profile only when it does not exist.
   - Uses a Firestore transaction to prevent two
     simultaneous requests from creating two profiles.
   - Welcome email is sent only after this request
     actually creates the profile.
   - Existing users never receive the welcome email
     again when logging in or refreshing.
========================================================= */

async function ensureUserProfile(uid, token = {}) {
  if (!uid) {
    throw new Error(
      'Authenticated user ID is missing.'
    );
  }

  const ref = adminDb
    .collection('users')
    .doc(uid);

  const result = await adminDb.runTransaction(
    async (tx) => {
      const snap = await tx.get(ref);

      /*
       * Existing user.
       *
       * Do NOT send welcome email.
       */
      if (snap.exists) {
        return {
          created: false,
          data: snap.data(),
        };
      }

      const now = new Date();

      const data = {
        uid,

        name:
          token.name ||
          token.displayName ||
          '',

        email:
          token.email ||
          '',

        photoURL:
          token.picture ||
          token.photoURL ||
          '',

        phone: '',
        whatsapp: '',

        state: '',
        district: '',
        city: '',
        pincode: '',

        profileComplete: false,

        role: 'user',

        /*
         * This is kept for tracking whether the
         * welcome email has been sent.
         */
        welcomeEmailSentAt: null,

        createdAt: now,
        updatedAt: now,
      };

      /*
       * Atomically create the user profile.
       */
      tx.create(ref, data);

      return {
        created: true,
        data,
      };
    }
  );

  /*
   * User already existed.
   *
   * Therefore:
   * NO welcome email.
   */
  if (!result.created) {
    return ref.get();
  }

  /*
   * This request actually created the profile.
   *
   * Therefore this is the ONLY request allowed
   * to send the welcome email.
   */
  try {
    const recipient = String(
      token.email || ''
    ).trim();

    if (recipient) {
      await sendWelcomeEmail({
        to: recipient,

        customerName:
          token.name ||
          token.displayName ||
          'Customer',
      });

      /*
       * Mark welcome email as successfully sent.
       */
      await ref.update({
        welcomeEmailSentAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (emailError) {
    /*
     * Email failure must not prevent the
     * user profile from being created.
     */
    console.error(
      'Welcome email failed:',
      emailError.message
    );
  }

  return ref.get();
}

/* =========================================================
   GET PROFILE
========================================================= */

export async function getProfile(req, res) {
  try {
    const snap = await ensureUserProfile(
      req.user.uid,
      req.user
    );

    return res.json({
      id: snap.id,
      ...snap.data(),
    });
  } catch (e) {
    console.error(
      'getProfile:',
      e
    );

    return res.status(500).json({
      message:
        'Unable to load profile',
    });
  }
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

export async function updateProfile(req, res) {
  try {
    const ref = adminDb
      .collection('users')
      .doc(req.user.uid);

    const current =
      await ensureUserProfile(
        req.user.uid,
        req.user
      );

    const data = cleanFields(
      req.body,
      PROFILE_FIELDS
    );

    const merged = {
      ...(current.data() || {}),
      ...data,
    };

    const complete = [
      'name',
      'phone',
      'state',
      'district',
      'city',
      'pincode',
    ].every(
      (key) =>
        String(
          merged[key] || ''
        ).trim()
    );

    await ref.set(
      {
        ...data,
        profileComplete: complete,
        updatedAt: new Date(),
      },
      {
        merge: true,
      }
    );

    const snap = await ref.get();

    return res.json({
      id: snap.id,
      ...snap.data(),
    });
  } catch (e) {
    console.error(
      'updateProfile:',
      e
    );

    return res.status(500).json({
      message:
        e.message ||
        'Unable to save profile',
    });
  }
}

/* =========================================================
   LIST ADDRESSES
========================================================= */

export async function listAddresses(req, res) {
  try {
    await ensureUserProfile(
      req.user.uid,
      req.user
    );

    const snap = await adminDb
      .collection('users')
      .doc(req.user.uid)
      .collection('addresses')
      .get();

    return res.json(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  } catch (e) {
    console.error(
      'listAddresses:',
      e
    );

    return res.status(500).json({
      message:
        'Unable to load addresses',
    });
  }
}

/* =========================================================
   CREATE ADDRESS
========================================================= */

export async function createAddress(req, res) {
  try {
    await ensureUserProfile(
      req.user.uid,
      req.user
    );

    const data = cleanFields(
      req.body,
      ADDRESS_FIELDS
    );

    validateAddress(data);

    /*
     * IMPORTANT:
     * Addresses are stored only under the
     * authenticated user's UID.
     */
    const refBase = adminDb
      .collection('users')
      .doc(req.user.uid)
      .collection('addresses');

    /*
     * Maximum 3 addresses.
     */
    const existing =
      await refBase.get();

    if (existing.size >= 3) {
      return res.status(400).json({
        message:
          'Maximum 3 addresses allowed',
      });
    }

    const now = new Date();

    /*
     * Create address.
     */
    const ref = await refBase.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    /*
     * IMPORTANT FIX:
     * Fetch the newly created document.
     *
     * This prevents:
     * ReferenceError: snap is not defined
     */
    const snap = await ref.get();

    return res.status(201).json({
      id: snap.id,
      ...snap.data(),
    });
  } catch (e) {
    console.error(
      'createAddress:',
      e
    );

    return res.status(400).json({
      message:
        e.message ||
        'Unable to save address',
    });
  }
}

/* =========================================================
   UPDATE ADDRESS
========================================================= */

export async function updateAddress(req, res) {
  try {
    /*
     * The address is searched inside the currently
     * authenticated user's address collection.
     *
     * Therefore a user cannot modify another user's
     * address by changing the address ID.
     */
    const ref = adminDb
      .collection('users')
      .doc(req.user.uid)
      .collection('addresses')
      .doc(req.params.id);

    const current =
      await ref.get();

    if (!current.exists) {
      return res.status(404).json({
        message:
          'Address not found',
      });
    }

    const updates = cleanFields(
      req.body,
      ADDRESS_FIELDS
    );

    const data = {
      ...(current.data() || {}),
      ...updates,
    };

    validateAddress(data);

    await ref.update({
      ...updates,
      updatedAt: new Date(),
    });

    const snap = await ref.get();

    return res.json({
      id: snap.id,
      ...snap.data(),
    });
  } catch (e) {
    console.error(
      'updateAddress:',
      e
    );

    return res.status(400).json({
      message:
        e.message ||
        'Unable to update address',
    });
  }
}

/* =========================================================
   DELETE ADDRESS
========================================================= */

export async function deleteAddress(req, res) {
  try {
    /*
     * Again, this is restricted to the current
     * authenticated user's address collection.
     */
    const ref = adminDb
      .collection('users')
      .doc(req.user.uid)
      .collection('addresses')
      .doc(req.params.id);

    const current =
      await ref.get();

    if (!current.exists) {
      return res.status(404).json({
        message:
          'Address not found',
      });
    }

    await ref.delete();

    return res.json({
      ok: true,
    });
  } catch (e) {
    console.error(
      'deleteAddress:',
      e
    );

    return res.status(500).json({
      message:
        'Unable to delete address',
    });
  }
}

/* =========================================================
   CLEAN WISHLIST PRODUCT
========================================================= */

function cleanWishlistProduct(
  product = {}
) {
  const id = String(
    product.id || ''
  ).trim();

  if (!id) {
    throw new Error(
      'Product id is required'
    );
  }

  const variants =
    Array.isArray(
      product.variants
    )
      ? product.variants
          .slice(0, 20)
          .map((v) => ({
            weight: String(
              v.weight || ''
            ).trim(),

            price: Number(
              v.price || 0
            ),

            stock: Math.max(
              0,
              Math.floor(
                Number(
                  v.stock || 0
                )
              )
            ),
          }))
          .filter(
            (v) => v.weight
          )
      : [];

  return {
    id,

    name: String(
      product.name ||
        'Pickle'
    )
      .trim()
      .slice(0, 120),

    image: String(
      product.image || ''
    )
      .trim()
      .slice(0, 1000),

    category: String(
      product.category || ''
    )
      .trim()
      .slice(0, 40),

    description: String(
      product.description ||
        ''
    )
      .trim()
      .slice(0, 1000),

    ingredients: String(
      product.ingredients ||
        ''
    )
      .trim()
      .slice(0, 1000),

    storage: String(
      product.storage ||
        ''
    )
      .trim()
      .slice(0, 500),

    shelfLife: String(
      product.shelfLife ||
        ''
    )
      .trim()
      .slice(0, 200),

    variants,

    updatedAt: new Date(),
  };
}

/* =========================================================
   LIST WISHLIST
========================================================= */

export async function listWishlist(req, res) {
  try {
    await ensureUserProfile(
      req.user.uid,
      req.user
    );

    const snap = await adminDb
      .collection('users')
      .doc(req.user.uid)
      .collection('wishlist')
      .orderBy(
        'createdAt',
        'desc'
      )
      .get();

    return res.json(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  } catch (e) {
    console.error(
      'listWishlist:',
      e
    );

    return res.status(500).json({
      message:
        'Unable to load wishlist',
    });
  }
}

/* =========================================================
   SAVE WISHLIST ITEM
========================================================= */

export async function saveWishlistItem(
  req,
  res
) {
  try {
    await ensureUserProfile(
      req.user.uid,
      req.user
    );

    const product =
      cleanWishlistProduct(
        req.body?.product || {}
      );

    /*
     * Fetch the latest product from the
     * database instead of blindly trusting
     * the browser's product information.
     */
    const productSnap =
      await adminDb
        .collection('products')
        .doc(product.id)
        .get();

    const snapshot =
      productSnap.exists
        ? {
            id:
              productSnap.id,
            ...productSnap.data(),
          }
        : product;

    const safe =
      cleanWishlistProduct(
        snapshot
      );

    const ref =
      adminDb
        .collection('users')
        .doc(req.user.uid)
        .collection('wishlist')
        .doc(safe.id);

    const existing =
      await ref.get();

    await ref.set(
      {
        ...safe,

        createdAt:
          existing.exists
            ? (
                existing.data()
                  ?.createdAt ||
                new Date()
              )
            : new Date(),

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );

    return res.status(
      existing.exists
        ? 200
        : 201
    ).json({
      id: ref.id,
      ...safe,
    });
  } catch (e) {
    console.error(
      'saveWishlistItem:',
      e
    );

    return res.status(400).json({
      message:
        e.message ||
        'Unable to save wishlist item',
    });
  }
}

/* =========================================================
   DELETE WISHLIST ITEM
========================================================= */

export async function deleteWishlistItem(
  req,
  res
) {
  try {
    const id =
      decodeURIComponent(
        String(
          req.params.productId ||
            ''
        )
      ).trim();

    if (
      !id ||
      id.length > 150
    ) {
      return res.status(400).json({
        message:
          'Invalid product id',
      });
    }

    await adminDb
      .collection('users')
      .doc(req.user.uid)
      .collection('wishlist')
      .doc(id)
      .delete();

    return res.json({
      ok: true,
    });
  } catch (e) {
    console.error(
      'deleteWishlistItem:',
      e
    );

    return res.status(500).json({
      message:
        'Unable to remove wishlist item',
    });
  }
}

/* =========================================================
   AVAILABLE COUPONS
========================================================= */

export async function listAvailableCoupons(
  _req,
  res
) {
  try {
    const snap =
      await adminDb
        .collection('coupons')
        .where(
          'active',
          '==',
          true
        )
        .get();

    const coupons =
      snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          couponIsValid
        )
        .filter(
          (coupon) =>
            coupon.visibleToUsers !==
            false
        )
        .map((coupon) => ({
          id: coupon.id,

          code:
            coupon.code ||
            coupon.id,

          discountType:
            coupon.discountType ||
            'percent',

          value: Number(
            coupon.value || 0
          ),

          expiresAt:
            coupon.expiresAt ||
            null,

          maxUses: Number(
            coupon.maxUses || 0
          ),
        }));

    return res.json(coupons);
  } catch (e) {
    console.error(
      'listAvailableCoupons:',
      e
    );

    return res.status(500).json({
      message:
        'Unable to load available coupons',
    });
  }
}