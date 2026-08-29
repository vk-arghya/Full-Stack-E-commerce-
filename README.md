# Acharjya's Achar Bari — Production-style E-commerce Starter

## Run locally

### Backend
```powershell
cd backend
npm install
npm run dev
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

## Environment

Copy the examples and fill in your own values:

- `frontend/.env.example` → `frontend/.env`
- `backend/.env.example` → `backend/.env`
- `backend/firebase-service-account.json.example` → `backend/firebase-service-account.json`

The Firebase Admin JSON is server-only. Never put it in `frontend`, `public`, Git, or a deployed static bundle.

Until you add your live Razorpay credentials, keep:

```env
RAZORPAY_ENABLED=false
```

## Admin access

1. Sign into the storefront with the Google account you want to administer.
2. From `backend`, run:

```powershell
npm run admin:set -- your-admin-email@example.com
```

3. Sign out and sign in again so Firebase receives the refreshed custom claim.
4. Open `/admin`.

All admin API routes are checked server-side using the Firebase Admin custom claim. The frontend admin guard is only an additional UX layer.

## What is protected

- Server-side product price and stock verification at checkout.
- Authenticated delivery-address ownership.
- Orders can only be created by the authenticated backend flow.
- Firestore transactions recheck and decrement stock atomically.
- Payment sessions are single-use.
- Coupon validity and usage limits are checked again during final order creation.
- Customer order reads go through authenticated backend APIs.
- Admin writes require the Firebase Admin custom claim.
- API requests automatically attach the Firebase ID token.
- CORS, security headers, request-size limits and rate limiting are enabled.
- Firebase client rules deny direct customer order creation and payment-session access.

## Coupon flow

Admins create coupons in `/admin/coupons`. Customers see active coupons in their profile and can enter a code during checkout. The backend calculates the discount from current server prices; the browser cannot choose the final payable amount.

## EmailJS

Put the EmailJS service/template/public key in `backend/.env`. Order confirmation is sent to the authenticated customer's email after a successful order. Email failure is logged and does not invalidate an otherwise successful order.


## EmailJS configuration
Set `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID` and `EMAILJS_PUBLIC_KEY` in `backend/.env`. In the EmailJS template, set the recipient/To field to `{{to_email}}`. The order confirmation is sent by the backend after the order is created. The Admin Dashboard includes **Test order email** to verify the configuration.

## Product image uploads
Admin product images are uploaded through the authenticated backend to Firebase Storage. Set `FIREBASE_STORAGE_BUCKET` in `backend/.env` to the exact bucket name shown in Firebase Storage.

## Google Login setup

The frontend intentionally does **not** contain Firebase secrets. Copy `frontend/.env.example` to `frontend/.env` and fill in the six `VITE_FIREBASE_*` values from Firebase Console > Project settings > Your apps. Then enable **Google** under Firebase Authentication > Sign-in method and add `localhost` (and the production domain) under Authentication > Settings > Authorized domains. Restart Vite after changing `.env`.

If the login button says `Configure Firebase to Login`, at least one required `VITE_FIREBASE_*` value is missing from `frontend/.env`.

## Manual product images

You can place your own product photos in `frontend/public/images/products/` using these filenames: `mango.jpg`, `lemon.jpg`, `chilli.jpg`, `garlic.jpg`, `mixed.jpg`, `green-chilli.jpg`, `sweet-mango.jpg`, and `ginger.jpg`. The storefront uses a real database image URL when present, otherwise it tries the matching local image and finally falls back to the built-in placeholder.

## Pricing source of truth

Customer-facing prices and checkout totals are read from the backend product catalogue. The same `productId + weight` variant is used in product details, cart refresh, quote, payment creation and final order validation. Do not hardcode a different price in the frontend. If Firestore already contains an old price, update that variant once from the admin Products screen; the application deliberately does not overwrite admin-managed prices on startup.


## Important live-catalogue behavior
The public storefront reads products only from Firestore. There is no startup demo catalogue and no fallback product list, so deleting a product in Admin removes it from the storefront after the next catalogue refresh and prevents stale cached cart entries from remaining purchasable. Product prices shown in product details, cart and checkout are reconciled with the live backend catalogue.

## Manual product photos
Put a photo in `frontend/public/images/products/`, then enter either `mango.jpg` or `/images/products/mango.jpg` in the Admin Product **Image path / URL** field. This is the recommended approach if you do not want to use Firebase Storage uploads.
