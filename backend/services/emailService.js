const EMAILJS_URL =
  'https://api.emailjs.com/api/v1.0/email/send';

function config(event = 'DEFAULT') {
  const key = String(event || 'DEFAULT').toUpperCase();
  const prefix = key === 'DEFAULT' ? 'EMAILJS' : `EMAILJS_${key}`;
  return {
    serviceId: String(process.env[`${prefix}_SERVICE_ID`] || process.env.EMAILJS_SERVICE_ID || '').trim(),
    templateId: String(process.env[`${prefix}_TEMPLATE_ID`] || (key === 'DEFAULT' ? process.env.EMAILJS_TEMPLATE_ID : '') || '').trim(),
    publicKey: String(process.env[`${prefix}_PUBLIC_KEY`] || process.env.EMAILJS_PUBLIC_KEY || '').trim(),
    privateKey: String(process.env[`${prefix}_PRIVATE_KEY`] || process.env.EMAILJS_PRIVATE_KEY || '').trim(),
  };
}

export function emailConfigured(event = 'DEFAULT') {
  const { serviceId, templateId, publicKey, privateKey } = config(event);
  return Boolean(serviceId && templateId && publicKey && privateKey);
}

export async function sendEmailTemplate({
  to,
  templateParams = {},
  event = 'DEFAULT',
}) {
  const { serviceId, templateId, publicKey, privateKey } = config(event);

  const recipient =
    String(to || '').trim();

  if (!emailConfigured(event)) {
    throw new Error(`EmailJS is not configured for ${event}. Set the corresponding EMAILJS_${String(event).toUpperCase()}_* values in backend/.env.`);
  }

  if (!recipient) {
    throw new Error(
      'Customer email address is missing.'
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const response = await fetch(
      EMAILJS_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        signal: controller.signal,

        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,

          // Required when EmailJS
          // strict API access is enabled.
          accessToken: privateKey,

          template_params: {
            ...templateParams,

            to_email: recipient,
            user_email: recipient,
            customer_email: recipient,
            reply_to: recipient,
          },
        }),
      }
    );

    const body =
      await response.text().catch(
        () => ''
      );

    if (!response.ok) {
      throw new Error(
        `EmailJS request failed (${response.status})${
          body
            ? `: ${body.slice(0, 500)}`
            : ''
        }`
      );
    }

    return {
      sent: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}


/*
|--------------------------------------------------------------------------
| ORDER CONFIRMATION EMAIL
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| {{items}}
|      = products ONLY
|
| {{billing_details}}
|      = billing ONLY
|
| {{payment_details}}
|      = payment ONLY
|
| This prevents the customer from seeing the
| same information twice.
|
|--------------------------------------------------------------------------
*/

export async function sendOrderEmail({
  to,
  customerName,
  orderId,
  total,
  items,
  address,
  status = 'PLACED',
  billing = {},
}) {
  const recipient =
    String(to || '').trim();

  if (!recipient) {
    throw new Error(
      'Customer email address is missing.'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const money = (value) => {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number.toFixed(2)
      : '0.00';
  };

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const formatIndiaDateTime = (
    value
  ) => {
    if (!value) {
      return 'Date unavailable';
    }

    let date;

    /*
     * Firestore Timestamp
     */
    if (
      value &&
      typeof value.toDate ===
        'function'
    ) {
      date = value.toDate();
    }

    /*
     * JavaScript Date
     */
    else if (
      value instanceof Date
    ) {
      date = value;
    }

    /*
     * String / number
     */
    else {
      date = new Date(value);
    }

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Date unavailable';
    }

    return date.toLocaleString(
      'en-IN',
      {
        timeZone:
          'Asia/Kolkata',

        day: '2-digit',
        month: 'short',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: true,
      }
    );
  };


  /*
  |--------------------------------------------------------------------------
  | Order Items
  |--------------------------------------------------------------------------
  |
  | ONLY products are placed in {{items}}.
  |
  */

  const safeItems =
    Array.isArray(items)
      ? items
      : [];

  const itemLines =
    safeItems
      .map((item) => {
        const name =
          escapeHtml(
            item.name ||
              'Pickle'
          );

        const weight =
          escapeHtml(
            item.weight ||
              'Standard'
          );

        const quantity =
          Math.max(
            1,
            Number(
              item.quantity
            ) || 1
          );

        const price =
          Number(
            item.price || 0
          );

        const lineTotal =
          Number(
            item.lineTotal ??
              price * quantity
          );

        return `
          <div style="
            padding:12px 0;
            border-bottom:1px solid #eeeeee;
          ">

            <table style="
              width:100%;
              border-collapse:collapse;
            ">

              <tr>

                <td style="
                  vertical-align:top;
                  padding-right:12px;
                ">

                  <div style="
                    font-size:14px;
                    font-weight:700;
                    color:#222222;
                  ">
                    ${name}
                  </div>

                  <div style="
                    margin-top:4px;
                    font-size:13px;
                    color:#777777;
                  ">
                    ${weight} × ${quantity}
                  </div>

                </td>

                <td style="
                  width:90px;
                  text-align:right;
                  vertical-align:top;
                  font-size:14px;
                  font-weight:700;
                  color:#222222;
                ">
                  ₹${money(lineTotal)}
                </td>

              </tr>

            </table>

          </div>
        `;
      })
      .join('');


  /*
  |--------------------------------------------------------------------------
  | Delivery Address
  |--------------------------------------------------------------------------
  */

  const addressText = address
    ? [
        address.name,
        address.phone,
        address.address,
        address.city,
        address.district,
        address.state,
        address.pincode,
      ]
        .filter(Boolean)
        .map(escapeHtml)
        .join(', ')
    : 'Delivery address unavailable';


  /*
  |--------------------------------------------------------------------------
  | Dates
  |--------------------------------------------------------------------------
  */

  const orderDate =
    billing.orderDate ||
    billing.createdAt;

  const expectedDeliveryDate =
    billing.expectedDeliveryDate;

  const orderDateText =
    formatIndiaDateTime(
      orderDate
    );

  const expectedDeliveryDateText =
    formatIndiaDateTime(
      expectedDeliveryDate
    );


  /*
  |--------------------------------------------------------------------------
  | Delivery Mode
  |--------------------------------------------------------------------------
  */

  const rawDeliveryMode =
    String(
      billing.deliveryMode ||
        'NORMAL'
    )
      .trim()
      .toUpperCase();

  const isSuperFast =
    rawDeliveryMode ===
      'SUPERFAST' ||
    rawDeliveryMode ===
      'SUPER_FAST';

  const deliveryModeText =
    isSuperFast
      ? 'Super Fast Delivery'
      : 'Normal Delivery';


  /*
  |--------------------------------------------------------------------------
  | Billing Values
  |--------------------------------------------------------------------------
  */

  const subtotal =
    Number(
      billing.subtotal || 0
    );

  const discount =
    Number(
      billing.discount || 0
    );

  const shipping =
    Number(
      billing.shipping || 0
    );

  const gstPercent =
    Number(
      billing.gstPercent ??
        2.36
    );

  const gst =
    Number(
      billing.gst || 0
    );

  const orderTotal =
    Number(total || 0);


  /*
  |--------------------------------------------------------------------------
  | Platform Fee
  |--------------------------------------------------------------------------
  */

  const platformFeeEnabled =
    billing.platformFeeEnabled ===
    true;

  const platformFee =
    Number(
      billing.platformFee || 0
    );

  const platformFeeDisplayed =
    Number(
      billing.platformFeeDisplayed ||
        0
    );

  let platformFeeText;

  if (platformFeeEnabled) {
    platformFeeText =
      `₹${money(platformFee)}`;
  } else if (
    platformFeeDisplayed > 0
  ) {
    platformFeeText = `
      <span style="
        text-decoration:line-through;
        color:#999999;
        margin-right:6px;
      ">
        ₹${money(
          platformFeeDisplayed
        )}
      </span>

      <span style="
        color:#188038;
        font-weight:700;
      ">
        Waived
      </span>
    `;
  } else {
    platformFeeText =
      '₹0.00';
  }


  /*
  |--------------------------------------------------------------------------
  | Billing Details
  |--------------------------------------------------------------------------
  |
  | Financial information ONLY.
  |
  */

  const billingDetails = `
    <table style="
      width:100%;
      border-collapse:collapse;
      font-family:Arial,Helvetica,sans-serif;
      font-size:14px;
    ">

      <tr>
        <td style="
          padding:7px 0;
          color:#666666;
        ">
          Subtotal
        </td>

        <td style="
          padding:7px 0;
          text-align:right;
          font-weight:600;
          color:#222222;
        ">
          ₹${money(subtotal)}
        </td>
      </tr>


      ${
        discount > 0
          ? `
            <tr>

              <td style="
                padding:7px 0;
                color:#188038;
              ">
                Coupon discount
              </td>

              <td style="
                padding:7px 0;
                text-align:right;
                font-weight:600;
                color:#188038;
              ">
                -₹${money(discount)}
              </td>

            </tr>
          `
          : ''
      }


      <tr>

        <td style="
          padding:7px 0;
          color:#666666;
        ">
          ${deliveryModeText}
        </td>

        <td style="
          padding:7px 0;
          text-align:right;
          font-weight:600;
          color:#222222;
        ">
          ${
            shipping > 0
              ? `₹${money(shipping)}`
              : '<span style="color:#188038;">FREE</span>'
          }
        </td>

      </tr>


      <tr>

        <td style="
          padding:7px 0;
          color:#666666;
        ">
          Platform fee
        </td>

        <td style="
          padding:7px 0;
          text-align:right;
          font-weight:600;
        ">
          ${platformFeeText}
        </td>

      </tr>


      <tr>

        <td style="
          padding:7px 0;
          color:#666666;
        ">
          GST (${gstPercent.toFixed(2)}%)
        </td>

        <td style="
          padding:7px 0;
          text-align:right;
          font-weight:600;
          color:#222222;
        ">
          ₹${money(gst)}
        </td>

      </tr>


      <tr>

        <td colspan="2" style="
          padding-top:12px;
          border-top:1px solid #dddddd;
        "></td>

      </tr>


      <tr>

        <td style="
          padding:4px 0;
          font-size:17px;
          font-weight:700;
          color:#263b1f;
        ">
          Order Total
        </td>

        <td style="
          padding:4px 0;
          text-align:right;
          font-size:20px;
          font-weight:700;
          color:#263b1f;
        ">
          ₹${money(orderTotal)}
        </td>

      </tr>

    </table>
  `;


  /*
  |--------------------------------------------------------------------------
  | Payment Details
  |--------------------------------------------------------------------------
  */

  const paymentStatus =
    escapeHtml(
      billing.paymentStatus ||
        'PAID'
    );

  const transactionId =
    escapeHtml(
      billing.transactionId ||
        billing.razorpayPaymentId ||
        'Not available'
    );

  const razorpayOrderId =
    escapeHtml(
      billing.razorpayOrderId ||
        'Not available'
    );

  const paymentMethod =
    escapeHtml(
      billing.paymentMethod ||
        'Not available'
    );

  const paymentApp =
    escapeHtml(
      billing.paymentApp ||
        ''
    );


  const paymentDetails = `
    <table style="
      width:100%;
      border-collapse:collapse;
      font-family:Arial,Helvetica,sans-serif;
      font-size:13px;
    ">

      <tr>

        <td style="
          padding:6px 0;
          color:#777777;
        ">
          Payment status
        </td>

        <td style="
          padding:6px 0;
          text-align:right;
          font-weight:700;
          color:#188038;
        ">
          ${paymentStatus}
        </td>

      </tr>


      <tr>

        <td style="
          padding:6px 0;
          color:#777777;
        ">
          Payment method
        </td>

        <td style="
          padding:6px 0;
          text-align:right;
          font-weight:600;
          color:#333333;
        ">
          ${paymentMethod}
        </td>

      </tr>


      ${
        paymentApp
          ? `
            <tr>

              <td style="
                padding:6px 0;
                color:#777777;
              ">
                Payment app
              </td>

              <td style="
                padding:6px 0;
                text-align:right;
                font-weight:600;
                color:#333333;
              ">
                ${paymentApp}
              </td>

            </tr>
          `
          : ''
      }


      <tr>

        <td style="
          padding:6px 0;
          color:#777777;
        ">
          Transaction ID
        </td>

        <td style="
          padding:6px 0;
          text-align:right;
          font-weight:600;
          color:#333333;
          word-break:break-all;
        ">
          ${transactionId}
        </td>

      </tr>


      <tr>

        <td style="
          padding:6px 0;
          color:#777777;
        ">
          Razorpay Order ID
        </td>

        <td style="
          padding:6px 0;
          text-align:right;
          font-weight:600;
          color:#333333;
          word-break:break-all;
        ">
          ${razorpayOrderId}
        </td>

      </tr>

    </table>
  `;


  /*
  |--------------------------------------------------------------------------
  | Final EmailJS Parameters
  |--------------------------------------------------------------------------
  */

  const emailParams = {

    /*
     * Recipient
     */
    to_email: recipient,

    user_email: recipient,

    customer_email: recipient,


    /*
     * Customer
     */
    customer_name:
      customerName ||
      'Customer',


    /*
     * Order
     */
    order_id:
      orderId,

    order_status:
      status,

    store_name:
      "Acharjya's Achar Bari",


    /*
     * Dates
     */
    order_date:
      orderDateText,

    expected_delivery_date:
      expectedDeliveryDateText,


    /*
     * PRODUCTS ONLY
     */
    items:
      itemLines ||
      '<div>No items found.</div>',


    /*
     * ADDRESS ONLY
     */
    delivery_address:
      addressText,


    /*
     * DELIVERY
     */
    delivery_mode:
      deliveryModeText,

    delivery_charge:
      money(shipping),


    /*
     * BILLING
     */
    billing_details:
      billingDetails,

    subtotal:
      money(subtotal),

    coupon_discount:
      money(discount),

    platform_fee:
      platformFeeEnabled
        ? money(platformFee)
        : 'Waived',

    gst_percent:
      gstPercent.toFixed(2),

    gst_amount:
      money(gst),

    order_total:
      money(orderTotal),


    /*
     * PAYMENT
     */
    payment_status:
      paymentStatus,

    transaction_id:
      transactionId,

    razorpay_order_id:
      razorpayOrderId,

    payment_method:
      paymentMethod,

    payment_app:
      paymentApp,

    payment_details:
      paymentDetails,
  };


  /*
  |--------------------------------------------------------------------------
  | Send
  |--------------------------------------------------------------------------
  */

  const lifecycleStatus = String(status).toUpperCase();
  const event = ['ACCEPTED', 'REJECTED', 'PACKED', 'SHIPPED'].includes(lifecycleStatus) ? lifecycleStatus : 'DEFAULT';
  return sendEmailTemplate({
    to: recipient,
    templateParams: emailParams,
    event,
  });
}

export async function sendWelcomeEmail({ to, customerName }) {
  const recipient = String(to || '').trim();
  if (!recipient) throw new Error('Customer email address is missing.');
  return sendEmailTemplate({
    to: recipient,
    event: 'WELCOME',
    templateParams: {
      to_email: recipient,
      user_email: recipient,
      customer_email: recipient,
      customer_name: customerName || 'Customer',
      store_name: "Acharjya's Achar Bari",
    },
  });
}

export async function sendStockAvailableEmail({ to, customerName, productName }) {
  const recipient = String(to || '').trim();
  if (!recipient) throw new Error('Customer email address is missing.');
  return sendEmailTemplate({
    to: recipient,
    event: 'STOCK',
    templateParams: {
      to_email: recipient,
      user_email: recipient,
      customer_email: recipient,
      customer_name: customerName || 'Customer',
      product_name: productName || 'Your saved pickle',
      store_name: "Acharjya's Achar Bari",
    },
  });
}
