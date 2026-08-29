import { adminDb, adminStorage } from '../config/firebaseAdmin.js';
import crypto from 'node:crypto';
import { sendStockAvailableEmail } from '../services/stockAvailableEmailService.js';

const CATEGORIES = [
  'mango',
  'lemon',
  'chilli',
  'garlic',
  'mixed',
  'special',
];

/*
 * These are the same products used by the public catalogue
 * as its safe first-run seed.
 */

function cleanVariants(input) {
  if (!Array.isArray(input) || !input.length) {
    throw new Error(
      'At least one quantity variant is required'
    );
  }

  const variants = input.map((variant) => ({
    weight: String(
      variant.weight || ''
    ).trim(),

    price: Math.round(
      Number(variant.price)
    ),

    stock: Math.max(
      0,
      Math.floor(
        Number(variant.stock)
      )
    ),
  }));

  if (
    variants.some(
      (v) =>
        !v.weight ||
        !Number.isFinite(v.price) ||
        v.price < 0 ||
        !Number.isFinite(v.stock)
    )
  ) {
    throw new Error(
      'Invalid product variant'
    );
  }

  const weights =
    variants.map((v) =>
      v.weight.toLowerCase()
    );

  if (
    new Set(weights).size !==
    weights.length
  ) {
    throw new Error(
      'Duplicate quantity variants are not allowed'
    );
  }

  return variants;
}

function cleanProduct(body) {
  const category = String(
    body.category || ''
  )
    .trim()
    .toLowerCase();

  if (!CATEGORIES.includes(category)) {
    throw new Error(
      'Invalid category'
    );
  }

  const name = String(
    body.name || ''
  ).trim();

  if (
    name.length < 2 ||
    name.length > 120
  ) {
    throw new Error(
      'Product name must be between 2 and 120 characters'
    );
  }

  return {
    name,

    category,

    description: String(
      body.description || ''
    ).trim(),

    ingredients: String(
      body.ingredients || ''
    ).trim(),

    storage: String(
      body.storage || ''
    ).trim(),

    shelfLife: String(
      body.shelfLife || ''
    ).trim(),

    image: (() => {
      const image = String(
        body.image || ''
      ).trim();

      if (!image) return '';

      if (
        /^(https?:)?\/\//i.test(
          image
        ) ||
        image.startsWith('/')
      ) {
        return image;
      }

      return `/images/products/${image.replace(
        /^.*[\\\/]/,
        ''
      )}`;
    })(),

    variants:
      cleanVariants(
        body.variants
      ),

    featured:
      Boolean(body.featured),

    bestSeller:
      Boolean(body.bestSeller),

    mostLoved:
      Boolean(body.mostLoved),

    upcoming:
      Boolean(body.upcoming),

    updatedAt:
      new Date(),
  };
}

/*
 * ---------------------------------------------------------
 * LIST PRODUCTS
 * ---------------------------------------------------------
 */

export async function listProducts(
  _req,
  res
) {
  try {
    const snap =
      await adminDb
        .collection('products')
        .orderBy('name')
        .get();

    res.json(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  } catch (error) {
    console.error(
      'listProducts:',
      error
    );

    res.status(500).json({
      message:
        'Unable to load products',

      code:
        'PRODUCTS_LOAD_FAILED',
    });
  }
}

/*
 * ---------------------------------------------------------
 * GET PRODUCT
 * ---------------------------------------------------------
 */

export async function getProduct(
  req,
  res
) {
  try {
    const snap =
      await adminDb
        .collection('products')
        .doc(req.params.id)
        .get();

    if (!snap.exists) {
      return res
        .status(404)
        .json({
          message:
            'Product not found',
        });
    }

    res.json({
      id: snap.id,
      ...snap.data(),
    });
  } catch (error) {
    console.error(
      'getProduct:',
      error
    );

    res.status(500).json({
      message:
        'Unable to load product',
    });
  }
}

/*
 * ---------------------------------------------------------
 * CREATE PRODUCT
 * ---------------------------------------------------------
 */

export async function createProduct(
  req,
  res
) {
  try {
    const data =
      cleanProduct(req.body);

    data.createdAt =
      new Date();

    data.createdBy =
      req.user.uid;

    const ref =
      adminDb
        .collection('products')
        .doc();

    await ref.set(data);

    res.status(201).json({
      id: ref.id,
      ...data,
    });
  } catch (error) {
    console.error(
      'createProduct:',
      error
    );

    res.status(400).json({
      message:
        error.message ||
        'Unable to create product',
    });
  }
}

/*
 * ---------------------------------------------------------
 * UPDATE PRODUCT
 *
 * IMPORTANT:
 *
 * Detect individual variant:
 *
 *   0 -> >0   = back in stock
 *
 * This works even when another variant
 * of the same product is still in stock.
 * ---------------------------------------------------------
 */

export async function updateProduct(
  req,
  res
) {
  try {
    const ref =
      adminDb
        .collection('products')
        .doc(req.params.id);

    const current =
      await ref.get();

    if (!current.exists) {
      return res
        .status(404)
        .json({
          message:
            'Product not found',
        });
    }

    /*
     * Keep all existing fields that
     * the admin form did not send.
     */
    const before =
      current.data() || {};

    const merged = {
      ...before,
      ...(req.body || {}),
    };

    const data =
      cleanProduct(merged);

    /*
     * Detect stock transitions BEFORE
     * writing the new product.
     */
    const beforeVariants =
      Array.isArray(
        before.variants
      )
        ? before.variants
        : [];

    const afterVariants =
      Array.isArray(
        data.variants
      )
        ? data.variants
        : [];

    /*
     * Map old stock by variant weight.
     */
    const oldStockByWeight =
      new Map();

    for (
      const variant of
        beforeVariants
    ) {
      const weight =
        String(
          variant.weight || ''
        )
          .trim()
          .toLowerCase();

      if (!weight) continue;

      oldStockByWeight.set(
        weight,
        Math.max(
          0,
          Number(
            variant.stock
          ) || 0
        )
      );
    }

    /*
     * Find variants that changed:
     *
     * 0 -> 1
     * 0 -> 5
     * 0 -> 30
     *
     * These are restocked variants.
     */
    const restockedVariants =
      afterVariants.filter(
        (variant) => {
          const weight =
            String(
              variant.weight || ''
            )
              .trim()
              .toLowerCase();

          if (!weight) {
            return false;
          }

          const previousStock =
            oldStockByWeight.get(
              weight
            ) ?? 0;

          const currentStock =
            Math.max(
              0,
              Number(
                variant.stock
              ) || 0
            );

          return (
            previousStock <= 0 &&
            currentStock > 0
          );
        }
      );

    /*
     * Save the product first.
     *
     * Even if email sending fails,
     * the admin's product update must
     * NOT fail.
     */
    await ref.set(
      {
        ...data,
        updatedAt:
          new Date(),
        updatedBy:
          req.user.uid,
      },
      {
        merge: true,
      }
    );

    /*
     * -----------------------------------------------------
     * SEND BACK-IN-STOCK WISHLIST EMAILS
     * -----------------------------------------------------
     */

    if (
      restockedVariants.length >
      0
    ) {
      try {
        /*
         * Find all wishlist documents
         * containing this product.
         */
        const saved =
          await adminDb
            .collectionGroup(
              'wishlist'
            )
            .where(
              'id',
              '==',
              req.params.id
            )
            .get();

        /*
         * Send notification to every
         * matching wishlist customer.
         */
        await Promise.all(
          saved.docs.map(
            async (
              wishlistDoc
            ) => {
              try {
                /*
                 * Expected structure:
                 *
                 * users/{uid}/wishlist/{productId}
                 */
                const uid =
                  wishlistDoc
                    .ref
                    .parent
                    .parent
                    ?.id;

                if (!uid) {
                  return;
                }

                const wishlistData =
                  wishlistDoc.data() ||
                  {};

                /*
                 * Your wishlist stores
                 * product variants too.
                 */
                const wishlistVariants =
                  Array.isArray(
                    wishlistData.variants
                  )
                    ? wishlistData.variants
                    : [];

                /*
                 * If wishlist variant information
                 * exists, determine which variants
                 * the customer saved.
                 */
                const wishlistWeights =
                  new Set(
                    wishlistVariants
                      .map(
                        (
                          variant
                        ) =>
                          String(
                            variant.weight ||
                              ''
                          )
                            .trim()
                            .toLowerCase()
                      )
                      .filter(Boolean)
                  );

                /*
                 * Match restocked variants
                 * against the wishlist.
                 *
                 * If no variant information
                 * exists in the wishlist,
                 * notify for the product.
                 */
                const matchingVariants =
                  restockedVariants.filter(
                    (
                      variant
                    ) => {
                      if (
                        wishlistWeights.size ===
                        0
                      ) {
                        return true;
                      }

                      return wishlistWeights.has(
                        String(
                          variant.weight ||
                            ''
                        )
                          .trim()
                          .toLowerCase()
                      );
                    }
                  );

                if (
                  matchingVariants.length ===
                  0
                ) {
                  return;
                }

                /*
                 * Get customer profile.
                 */
                const userSnap =
                  await adminDb
                    .collection('users')
                    .doc(uid)
                    .get();

                if (
                  !userSnap.exists
                ) {
                  return;
                }

                const userData =
                  userSnap.data() ||
                  {};

                const email =
                  String(
                    userData.email ||
                      ''
                  ).trim();

                if (!email) {
                  return;
                }

                /*
                 * Show the restored variants
                 * in the email.
                 */
                const variantText =
                  matchingVariants
                    .map(
                      (
                        variant
                      ) =>
                        String(
                          variant.weight ||
                            ''
                        ).trim()
                    )
                    .filter(Boolean)
                    .join(', ');

                const emailProductName =
                  variantText
                    ? `${data.name} (${variantText})`
                    : data.name;

                await sendStockAvailableEmail(
                  {
                    to: email,

                    customerName:
                      userData.name ||
                      'Customer',

                    productName:
                      emailProductName,
                  }
                );

                console.log(
                  `✓ Stock available email sent to ${email} for ${emailProductName}`
                );
              } catch (
                customerError
              ) {
                /*
                 * One customer's email failure
                 * must not stop notifications
                 * for other customers.
                 */
                console.error(
                  'Stock notification failed for wishlist user:',
                  customerError
                );
              }
            }
          )
        );
      } catch (
        notifyError
      ) {
        /*
         * Email/wishlist failure must never
         * make the admin product update fail.
         */
        console.error(
          'Stock availability notifications failed:',
          notifyError
        );
      }
    }

    const updated =
      await ref.get();

    res.json({
      id: updated.id,
      ...updated.data(),
    });
  } catch (error) {
    console.error(
      'updateProduct:',
      error
    );

    res.status(400).json({
      message:
        error.message ||
        'Unable to update product',
    });
  }
}

/*
 * ---------------------------------------------------------
 * DELETE PRODUCT
 * ---------------------------------------------------------
 */

export async function deleteProduct(
  req,
  res
) {
  try {
    const ref =
      adminDb
        .collection('products')
        .doc(req.params.id);

    const current =
      await ref.get();

    if (!current.exists) {
      return res
        .status(404)
        .json({
          message:
            'Product not found',
        });
    }

    await ref.delete();

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      'deleteProduct:',
      error
    );

    res.status(500).json({
      message:
        'Unable to delete product',
    });
  }
}

/*
 * ---------------------------------------------------------
 * UPLOAD PRODUCT IMAGE
 * ---------------------------------------------------------
 */

export async function uploadProductImage(
  req,
  res
) {
  try {
    const productId =
      String(
        req.params.id || ''
      ).trim();

    if (!productId) {
      return res
        .status(400)
        .json({
          message:
            'Product id is required',
        });
    }

    const productRef =
      adminDb
        .collection('products')
        .doc(productId);

    const productSnap =
      await productRef.get();

    if (!productSnap.exists) {
      return res
        .status(404)
        .json({
          message:
            'Product not found',
        });
    }

    const {
      data,
      contentType,
      fileName,
    } = req.body || {};

    const allowed =
      new Set([
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
      ]);

    const safeContentType =
      String(
        contentType || ''
      ).toLowerCase();

    if (
      !allowed.has(
        safeContentType
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Only JPG, PNG, WEBP or AVIF images are allowed.',
        });
    }

    if (
      typeof data !== 'string' ||
      !data.startsWith('data:')
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid image data.',
        });
    }

    const base64 =
      data.split(',')[1] ||
      '';

    const buffer =
      Buffer.from(
        base64,
        'base64'
      );

    if (!buffer.length) {
      return res
        .status(400)
        .json({
          message:
            'Empty image.',
        });
    }

    if (
      buffer.length >
      5 * 1024 * 1024
    ) {
      return res
        .status(413)
        .json({
          message:
            'Product image must be 5 MB or smaller.',
        });
    }

    const ext =
      {
        'image/jpeg':
          'jpg',
        'image/png':
          'png',
        'image/webp':
          'webp',
        'image/avif':
          'avif',
      }[safeContentType];

    const safeBase =
      String(
        fileName ||
          'product'
      )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          '-'
        )
        .slice(
          0,
          80
        );

    const objectPath =
      `products/${productId}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const bucket =
      adminStorage.bucket();

    const file =
      bucket.file(
        objectPath
      );

    const token =
      crypto.randomUUID();

    await file.save(
      buffer,
      {
        resumable:
          false,

        metadata: {
          contentType:
            safeContentType,

          cacheControl:
            'public,max-age=31536000,immutable',

          metadata: {
            firebaseStorageDownloadTokens:
              token,

            originalName:
              safeBase,
          },
        },
      }
    );

    const encodedPath =
      encodeURIComponent(
        objectPath
      );

    const imageUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    await productRef.update(
      {
        image:
          imageUrl,

        updatedAt:
          new Date(),

        updatedBy:
          req.user.uid,
      }
    );

    res.json({
      imageUrl,
    });
  } catch (error) {
    console.error(
      'uploadProductImage:',
      error
    );

    res.status(500).json({
      message:
        error.message ||
        'Unable to upload product image',
    });
  }
}