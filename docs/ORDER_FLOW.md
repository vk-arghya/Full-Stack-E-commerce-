# Order and Razorpay Flow

1. Customer browses products without login.
2. Customer can add products to local cart.
3. Checkout is protected by Firebase Authentication.
4. Profile completion and delivery address are checked.
5. Frontend asks backend to create a Razorpay order.
6. Backend must recalculate the amount from Firestore before creating the Razorpay order.
7. Razorpay Checkout opens.
8. Customer pays.
9. Razorpay returns order ID, payment ID and signature.
10. Frontend sends those values to the authenticated backend.
11. Backend verifies the Razorpay signature.
12. Backend re-reads products, prices and stock.
13. Backend should use a Firestore transaction to decrement stock and create the final order.
14. Order is stored as PAYMENT_VERIFIED / ACCEPTED.
15. Admin manages ACCEPTED → PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED.
16. Customer's My Orders screen listens to the Firestore order and sees the status update.

Never use a frontend success callback as proof of payment.
