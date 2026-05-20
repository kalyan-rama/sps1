import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
HEALTH CHECK
========================= */

app.get("/", (req, res) => {
res.json({
success: true,
message: "SPS Sarees Backend Running"
});
});

/* =========================
CREATE CASHFREE ORDER
========================= */

app.post("/api/create-order", async (req, res) => {
try {
const {
orderId,
orderAmount,
customerName,
customerEmail,
customerPhone
} = req.body;

```
const response = await fetch(
  "https://api.cashfree.com/pg/orders",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.CASHFREE_APP_ID!,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
      "x-api-version": "2023-08-01"
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",

      customer_details: {
        customer_id: customerPhone,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone
      },

      order_meta: {
        return_url:
          "https://your-domain.vercel.app/payment-success?order_id={order_id}"
      }
    })
  }
);

const data = await response.json();

if (!response.ok) {
  return res.status(400).json({
    success: false,
    error: data
  });
}

return res.status(200).json({
  success: true,
  payment_session_id: data.payment_session_id,
  order_id: data.order_id
});
```

} catch (error: any) {
console.error("Create Order Error:", error);

```
return res.status(500).json({
  success: false,
  error: error.message
});
```

}
});

/* =========================
VERIFY PAYMENT
========================= */

app.post("/api/verify-payment", async (req, res) => {
try {
const { orderId } = req.body;

```
const response = await fetch(
  `https://api.cashfree.com/pg/orders/${orderId}`,
  {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-client-id": process.env.CASHFREE_APP_ID!,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
      "x-api-version": "2023-08-01"
    }
  }
);

const data = await response.json();

return res.status(200).json({
  success: true,
  data
});
```

} catch (error: any) {
console.error("Verify Payment Error:", error);

```
return res.status(500).json({
  success: false,
  error: error.message
});
```

}
});

/* =========================
EXPORT APP FOR VERCEL
========================= */

export default app;
