import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

import paymentRoutes from './routes/paymentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import customRequestRoutes from './routes/customRequestRoutes.js';


const app = express();


/* =========================================================
   CORS
========================================================= */

const allowedOrigins = String(
  process.env.FRONTEND_URL ||
    'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) =>
    origin.trim().replace(/\/$/, '')
  )
  .filter(Boolean);


app.disable('x-powered-by');


app.use(
  cors({
    origin(origin, callback) {
      /*
       * Allow requests that do not contain an Origin header.
       *
       * Examples:
       * - Postman
       * - server-to-server requests
       * - local health checks
       */
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin =
        String(origin)
          .trim()
          .replace(/\/$/, '');

      /*
       * Allow only configured frontend origins.
       */
      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        return callback(null, true);
      }

      console.error(
        `CORS blocked origin: ${origin}`
      );

      return callback(
        new Error(
          'Origin not allowed by CORS'
        )
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);


/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use(
  (req, res, next) => {
    const nonce =
      crypto.randomBytes(16).toString(
        'base64'
      );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    res.setHeader(
      'X-Frame-Options',
      'DENY'
    );

    res.setHeader(
      'Referrer-Policy',
      'strict-origin-when-cross-origin'
    );

    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
        "connect-src 'self' https: http://localhost:5000 http://127.0.0.1:5000",
        "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
      ].join('; ')
    );

    res.setHeader(
      'X-Request-Id',
      nonce
    );

    next();
  }
);


/* =========================================================
   RATE LIMITING
========================================================= */

const buckets = new Map();

app.use(
  (req, res, next) => {
    const key =
      req.ip || 'unknown';

    const now =
      Date.now();

    const windowMs =
      60_000;

    const limit =
      120;

    const current =
      buckets.get(key) || {
        start: now,
        count: 0,
      };

    if (
      now - current.start >
      windowMs
    ) {
      current.start = now;
      current.count = 0;
    }

    current.count += 1;

    buckets.set(
      key,
      current
    );

    if (
      current.count >
      limit
    ) {
      return res.status(429).json({
        message:
          'Too many requests. Please try again shortly.',
      });
    }

    next();
  }
);


/* =========================================================
   BODY PARSING
========================================================= */

app.use(
  express.json({
    limit: '8mb',
  })
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/api/health',
  (_req, res) => {
    res.json({
      ok: true,
      service:
        "Acharjya's Achar Bari API",
    });
  }
);


/* =========================================================
   API ROUTES
========================================================= */

app.use(
  '/api/admin',
  adminRoutes
);

app.use(
  '/api/payments',
  paymentRoutes
);

app.use(
  '/api/orders',
  orderRoutes
);

app.use(
  '/api/products',
  productRoutes
);

app.use(
  '/api/profile',
  profileRoutes
);

app.use(
  '/api/custom-requests',
  customRequestRoutes
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {
    console.error(
      error
    );

    res.status(
      error.status || 500
    ).json({
      message:
        error.message ||
        'Server error',
    });
  }
);


/* =========================================================
   SERVER
========================================================= */

const port =
  process.env.PORT ||
  5000;

app.listen(
  port,
  () => {
    console.log(
      `Acharjya API running on ${port}`
    );

    console.log(
      'Allowed frontend origins:',
      allowedOrigins.join(', ')
    );
  }
);