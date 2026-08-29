# Billing, Delivery & Promo Rules

- GST: fixed 2.36% of the net merchandise amount plus charged delivery/platform fee.
- Normal delivery: free at ₹350+ merchandise subtotal. Below ₹350: West Bengal <=500g ₹25, West Bengal >500g ₹50; outside West Bengal adds ₹25.
- Super Fast: one alternative mode, Admin-controlled price (₹85 default); it does not stack with Normal Delivery.
- Platform fee: Admin-controlled amount and on/off. Default is off, so the configured ₹10 is displayed as waived until Admin enables charging it.
- Each promo code can be redeemed only once by a specific user. Different promo codes can each be used once.
- Admin can mark coupons visible or private. Private coupons remain manually usable when shared but are not listed in the customer account.
- The current EmailJS `{{items}}` variable includes the purchased items followed by the full billing breakdown, so the existing template displays delivery mode, delivery charge, platform fee/waiver, GST, coupon discount and total.
