import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Global configurations for Cashfree (using let to support dynamic file-backed reloading)
let CASHFREE_APP_ID = "";
let CASHFREE_SECRET_KEY = "";
let CASHFREE_ENV = "sandbox";

export function reloadCashfreeConfig() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
    const localEnvPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(localEnvPath)) {
      dotenv.config({ path: localEnvPath, override: true });
    }
  } catch (error) {
    console.warn("[CASHFREE CONFIG ERROR] Failed reloading env files:", error);
  }

  CASHFREE_APP_ID = (process.env.CASHFREE_APP_ID || "").replace(/^["']|["']$/g, "").trim();
  CASHFREE_SECRET_KEY = (process.env.CASHFREE_SECRET_KEY || "").replace(/^["']|["']$/g, "").trim();
  
  const rawEnv = (process.env.CASHFREE_ENV || "sandbox").replace(/^["']|["']$/g, "").trim().toLowerCase();
  // Map TEST -> sandbox, LIVE -> production (production mode checks)
  const isProd = rawEnv === "production" || rawEnv === "live" || CASHFREE_SECRET_KEY.startsWith("cfsk_ma_prod_");
  CASHFREE_ENV = isProd ? "production" : "sandbox";
}

// Initial bootstrap load
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || "sri-praharsha-saree-gold-standard-secret-key-2026";
reloadCashfreeConfig();

console.log(`[CASHFREE BOOTSTRAP] Dynamic configuration system ready.`);
console.log(`[CASHFREE BOOTSTRAP] Environment: ${CASHFREE_ENV}`);
console.log(`[CASHFREE BOOTSTRAP] App ID length: ${CASHFREE_APP_ID.length}, mask prefix: ${CASHFREE_APP_ID.slice(0, 6)}...`);
console.log(`[CASHFREE BOOTSTRAP] Secret Key length: ${CASHFREE_SECRET_KEY.length}, mask suffix: ...${CASHFREE_SECRET_KEY.slice(-8)}`);
const DB_FILE = path.join(process.cwd(), "database.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to load/save database state
interface DbSchema {
  sarees: any[];
  orders: any[];
  users: any[];
  coupons: any[];
  banners: any[];
}

const DEFAULT_SAREES = [
  {
    id: "saree-kanjivaram-royal",
    name: "Swarna Mayil Kanjivaram Silk Saree",
    type: "Kanjivaram",
    price: 24500,
    originalPrice: 28500,
    description: "Woven with absolute precision near Kanchipuram, this masterpiece features exquisite swarna (gold) and velli (silver) zari peacock and rudraksha motifs gracefully running across the premium mulberry silk canvas. A heavy contrast pallu and a traditional Korvai border make it a premium heritage jewel, suitable for grand celebrations and bridal heirlooms.",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80"
    ],
    color: "Temple Gold",
    colorHex: "#C5A059",
    contrastColor: "Deep Crimson Red",
    contrastColorHex: "#8C1C24",
    zariType: "Pure Gold Zari",
    silkMarkApproved: true,
    weight: 850,
    warpCount: "3-Ply Pure Mulberry Silk",
    origin: "Kanchipuram, Tamil Nadu",
    weavingTime: 28,
    stock: 5,
    rating: 4.9,
    reviewsCount: 38,
    tags: ["Bridal", "Bestseller", "Pure Gold Zari"]
  },
  {
    id: "saree-banarasi-crimson",
    name: "Rajkumari Shikargah Banarasi Silk",
    type: "Banarasi",
    price: 18900,
    originalPrice: 22000,
    description: "An architectural fantasy woven in fine silk, depicting the highly revered Shikargah layout — featuring a dense hunting scene with birds, animals, and floral creepers. The crimson silk weft is entirely overlaid with intricate, fine gold zari threads, creating a shimmering royal veil with exceptional drape and luxurious weight.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80"
    ],
    color: "Crimson Red",
    colorHex: "#A2101F",
    contrastColor: "Classic Forest Green",
    contrastColorHex: "#12482F",
    zariType: "Antique Zari",
    silkMarkApproved: true,
    weight: 920,
    warpCount: "Katan Silk (Pure Mulberry)",
    origin: "Varanasi, Uttar Pradesh",
    weavingTime: 36,
    stock: 4,
    rating: 4.8,
    reviewsCount: 22,
    tags: ["Royal Weave", "Rich Brocade", "Silk Mark"]
  },
  {
    id: "saree-paithani-blue",
    name: "Mayur Pankh Paithani Silk Saree",
    type: "Paithani",
    price: 21500,
    originalPrice: 25000,
    description: "A stellar Maharashtrian masterpiece in electric royal blue, defined by a lavish, multi-colored oblique silk-woven pallu showcasing fine peacock motifs sitting on floral branches. The iconic border is heavily set with pure gold zari base lines (Narali border), handwoven meticulously on standard pit looms.",
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80"
    ],
    color: "Indigo Royal Blue",
    colorHex: "#123D7F",
    contrastColor: "Vibrant Magenta Pink",
    contrastColorHex: "#BD1162",
    zariType: "Pure Gold Zari",
    silkMarkApproved: true,
    weight: 790,
    warpCount: "Filature Silk × Organzine Silk",
    origin: "Paithan, Maharashtra",
    weavingTime: 22,
    stock: 3,
    rating: 4.9,
    reviewsCount: 15,
    tags: ["Peacock Pallu", "Traditional Caret"]
  },
  {
    id: "saree-pochampally-coral",
    name: "Telia Rumal Pochampally Ikat Silk",
    type: "Pochampally",
    price: 14200,
    originalPrice: 17000,
    description: "This Pochampally Ikat features geometric symmetry that is both ancient and amazingly modern. Using the tie-and-dye double ikat process, both the warp and weft silk yarns are dyed multiple times after precise binding, resulting in sharp, feathered brick-red and coal-black motifs with exceptional texture.",
    image: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80"
    ],
    color: "Terracotta Coral",
    colorHex: "#D5563D",
    contrastColor: "Sovereign Midnight Blue",
    contrastColorHex: "#0D2040",
    zariType: "Tested Zari",
    silkMarkApproved: true,
    weight: 680,
    warpCount: "Charka Hand-reeled Silk",
    origin: "Pochampally, Telangana",
    weavingTime: 14,
    stock: 8,
    rating: 4.7,
    reviewsCount: 29,
    tags: ["Double Ikat", "Geometric", "Lightweight Silk"]
  }
];

function readDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    const adminPasswordHash = bcrypt.hashSync("admin123", 10);
    const demoCustomerPasswordHash = bcrypt.hashSync("user123", 10);
    const initialDb: DbSchema = {
      sarees: DEFAULT_SAREES,
      orders: [
        {
          id: "order-1001",
          customerName: "Kalyan Vasantham",
          customerEmail: "kalyanvasantham906@gmail.com",
          customerPhone: "+91 98765 43210",
          items: [
            {
              saree: DEFAULT_SAREES[0],
              quantity: 1,
              customBlouseStyle: {
                colorName: "Deep Crimson Red",
                colorHex: "#8C1C24",
                borderType: "Zari Border",
                neckStyle: "Royal Boat-Neck",
                sleeveLength: "Elbow Length",
                measurementNotes: "Standard Size 38 chest"
              }
            }
          ],
          discountAmount: 2450,
          totalAmount: 22050,
          couponCode: "FESTIVE10",
          shippingAddress: "Flat 402, Sri Praharsha Enclave, Jubilee Hills, Hyderabad, Telangana - 500033",
          paymentMethod: "COD",
          paymentStatus: "Paid",
          orderStatus: "Delivered",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        },
        {
          id: "order-1002",
          customerName: "Pranavi Sharma",
          customerEmail: "pranavi.sharma@example.com",
          customerPhone: "+91 91234 56789",
          items: [
            {
              saree: DEFAULT_SAREES[1],
              quantity: 1
            }
          ],
          discountAmount: 0,
          totalAmount: 18900,
          couponCode: "",
          shippingAddress: "Tower B, Heritage Apartments, Baner, Pune, Maharashtra - 411045",
          paymentMethod: "Razorpay",
          paymentStatus: "Paid",
          orderStatus: "Shipped",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Yesterday
        }
      ],
      users: [
        {
          id: "user-admin",
          name: "SPS Admin",
          email: "admin@spssarees.com",
          password: adminPasswordHash,
          role: "admin",
          phone: "+91 99999 99999",
          address: "Sri Praharsha Silk Warehouse, Kanchipuram"
        },
        {
          id: "user-demo",
          name: "Vasanth Kalyan",
          email: "user@spssarees.com",
          password: demoCustomerPasswordHash,
          role: "customer",
          phone: "+91 98765 43210",
          address: "Jubilee Hills, Hyderabad"
        }
      ],
      coupons: [
        { code: "FESTIVE10", discountPercentage: 10, active: true },
        { code: "ROYAL15", discountPercentage: 15, active: true },
        { code: "WELCOME5", discountPercentage: 5, active: true }
      ],
      banners: [
        { id: "banner-1", title: "Weaving Legends Since 1962", active: true }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
    return initialDb;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading database file, returning default schema", err);
    return { sarees: [], orders: [], users: [], coupons: [], banners: [] };
  }
}

function writeDb(data: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Nodemailer Helper setup
// Standard lazy initializer configuration
function sendTransactionalEmail(to: string, subject: string, htmlContent: string) {
  console.log(`\n=================== TRANSACTIONAL EMAIL TO ${to} ===================`);
  console.log(`SUBJECT: ${subject}`);
  console.log("HTML CONTENT TRUNCATED PREVIEW:\n", htmlContent.replace(/<[^>]*>/g, ' ').substring(0, 500) + "...\n");
  console.log("==================================================================\n");

  const smtpUser = process.env.SMTP_EMAIL;
  const smtpPass = process.env.SMTP_PASSWORD;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      transporter.sendMail({
        from: `"SPS Sarees Official" <${smtpUser}>`,
        to: to,
        subject: subject,
        html: htmlContent
      }, (err, info) => {
        if (err) {
          console.error("Nodemailer delivery error:", err);
        } else {
          console.log("Nodemailer delivery successful! MessageID:", info.messageId);
        }
      });
    } catch (e) {
      console.error("Failed to trigger Nodemailer sending client:", e);
    }
  } else {
    console.log("SMTP not configured (.env contains no SMTP_EMAIL). Logged visual proxy cleanly in console.");
  }
}

// Multer photo uploading disk engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  app.use(express.json());

  // Define transparent CORS middleware before other routes
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  
  // Expose public static path for uploads & default preview static images
  app.use("/public/uploads", express.static(UPLOADS_DIR));
  app.use("/uploads", express.static(UPLOADS_DIR));

  // REST APIs Core - placed FIRST before Vite Handlers
  
  // 1. Auth Handlers
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, email, password, phone, address } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const db = readDb();
      if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const newUser = {
        id: "user-" + Date.now(),
        name,
        email: email.toLowerCase(),
        password: bcrypt.hashSync(password, 10),
        role: "customer",
        phone: phone || "",
        address: address || ""
      };

      db.users.push(newUser);
      writeDb(db);

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        token,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone, address: newUser.address }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const db = readDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Authorization token required" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid or expired authorization token" });
      req.user = user;
      next();
    });
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    authenticateToken(req, res, () => {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access privileges strictly required" });
      }
      next();
    });
  };

  // 2. Product Management
  app.get("/api/sarees", (req, res) => {
    try {
      const db = readDb();
      res.json(db.sarees);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sarees", requireAdmin, (req, res) => {
    try {
      const db = readDb();
      const newSaree = {
        id: "saree-" + Date.now(),
        ...req.body,
        price: Number(req.body.price),
        originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : undefined,
        stock: Number(req.body.stock) || 5,
        rating: Number(req.body.rating) || 5.0,
        reviewsCount: Number(req.body.reviewsCount) || 0,
        weavingTime: Number(req.body.weavingTime) || 15,
        weight: Number(req.body.weight) || 800,
        gallery: req.body.gallery || [req.body.image]
      };

      db.sarees.unshift(newSaree);
      writeDb(db);
      res.status(201).json(newSaree);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/sarees/:id", requireAdmin, (req, res) => {
    try {
      const db = readDb();
      const index = db.sarees.findIndex(s => s.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: "Saree product not found" });

      const updatedSaree = {
        ...db.sarees[index],
        ...req.body,
        price: Number(req.body.price),
        originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : undefined,
        stock: Number(req.body.stock),
        rating: Number(req.body.rating),
        reviewsCount: Number(req.body.reviewsCount),
        weavingTime: Number(req.body.weavingTime),
        weight: Number(req.body.weight),
        gallery: req.body.gallery || db.sarees[index].gallery
      };

      db.sarees[index] = updatedSaree;
      writeDb(db);
      res.json(updatedSaree);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sarees/:id", requireAdmin, (req, res) => {
    try {
      const db = readDb();
      db.sarees = db.sarees.filter(s => s.id !== req.params.id);
      writeDb(db);
      res.json({ message: "Saree deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Image Upload
  app.post("/api/upload", upload.array("images", 5), (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No image files uploaded" });
      }
      
      const filePaths = req.files.map((file: any) => `/uploads/${file.filename}`);
      res.status(201).json({ fileUrls: filePaths });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Coupons & Checkout Utilities
  app.get("/api/coupons", (req, res) => {
    const db = readDb();
    res.json(db.coupons);
  });

  app.post("/api/coupons", requireAdmin, (req, res) => {
    const { code, discountPercentage, active } = req.body;
    if (!code || !discountPercentage) return res.status(400).json({ error: "Missing parameters" });
    const db = readDb();
    const newCoupon = { code: code.toUpperCase(), discountPercentage: Number(discountPercentage), active: active !== false };
    db.coupons.push(newCoupon);
    writeDb(db);
    res.status(201).json(newCoupon);
  });

  // 5. Orders API
  app.get("/api/orders", authenticateToken, (req: any, res) => {
    try {
      const db = readDb();
      if (req.user.role === "admin") {
        res.json(db.orders);
      } else {
        const userOrders = db.orders.filter(o => o.customerEmail.toLowerCase() === req.user.email.toLowerCase());
        res.json(userOrders);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    reloadCashfreeConfig();
    try {
      const { 
        customerName, customerEmail, customerPhone, items, 
        discountAmount, totalAmount, couponCode, shippingAddress, paymentMethod 
      } = req.body;

      if (!customerName || !customerEmail || !items || items.length === 0 || !shippingAddress) {
        return res.status(400).json({ error: "Missing order completion fields" });
      }

      const db = readDb();
      // Generate a guaranteed highly-unique orderId to avoid 409 collisions on the Cashfree Payment Gateway (e.g., order-sps-20412398)
      const uniqueSuffix = Date.now().toString().slice(-8) + Math.floor(1000 + Math.random() * 9000);
      const orderId = `order-sps-${uniqueSuffix}`;
      
      const newOrder = {
        id: orderId,
        customerName,
        customerEmail: customerEmail.toLowerCase(),
        customerPhone: customerPhone || "",
        items,
        discountAmount: Number(discountAmount) || 0,
        totalAmount: Number(totalAmount),
        couponCode: couponCode || "",
        shippingAddress,
        paymentMethod: paymentMethod || "COD",
        paymentStatus: "Pending", // start everything as pending; COD remains pending until direct handover
        orderStatus: "Pending",
        createdAt: new Date().toISOString()
      };

      // Subtract inventory stock
      items.forEach((item: any) => {
        const sareeIndex = db.sarees.findIndex(s => s.id === item.saree.id);
        if (sareeIndex !== -1) {
          db.sarees[sareeIndex].stock = Math.max(0, db.sarees[sareeIndex].stock - (item.quantity || 1));
        }
      });

      db.orders.unshift(newOrder);
      writeDb(db);

      // Handle Cashfree payment routing
      if (paymentMethod === "CASHFREE" || paymentMethod === "Razorpay") {
        let payment_session_id = "";
        const originUrl = req.headers.origin || process.env.APP_URL || "https://sps-sarees.netlify.app";

        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
          return res.status(400).json({ error: "Cashfree API configuration keys are missing in the server environment variables. Unable to instantiate payment session." });
        }

        try {
          const isProd = CASHFREE_ENV === "production" || CASHFREE_SECRET_KEY.startsWith("cfsk_ma_prod_");
          const host = isProd ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
          
          let cleanedPhone = (customerPhone || "").replace(/[^0-9]/g, "");
          if (cleanedPhone.length > 10) { cleanedPhone = cleanedPhone.slice(-10); }
          if (cleanedPhone.length < 10) { cleanedPhone = "9999999999"; }

          const cfPayload = {
            order_amount: Number(totalAmount),
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
              customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 45),
              customer_phone: cleanedPhone,
              customer_email: customerEmail.toLowerCase(),
              customer_name: customerName
            },
            order_meta: {
              return_url: `${originUrl}?order_id=${orderId}&cf_verify=true`
            }
          };

          const cfResponse = await fetch(`${host}/orders`, {
            method: "POST",
            headers: {
              "x-client-id": CASHFREE_APP_ID,
              "x-client-secret": CASHFREE_SECRET_KEY,
              "x-api-version": "2023-08-01",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(cfPayload)
          });

          if (cfResponse.ok) {
            const cfData: any = await cfResponse.json();
            payment_session_id = cfData.payment_session_id;
          } else {
            const errorText = await cfResponse.text();
            console.error(`Cashfree API Error Response (${cfResponse.status}):`, errorText);
            return res.status(cfResponse.status).json({ error: `Cashfree gateway setup rejected order creation: ${errorText}` });
          }
        } catch (cfErr: any) {
          console.error("Failed call to Cashfree sandbox orders REST endpoint:", cfErr);
          return res.status(500).json({ error: `Failed initiating Cashfree payment session: ${cfErr.message}` });
        }

        if (!payment_session_id) {
          return res.status(400).json({ error: "Failed to generate a secure checkout session with Cashfree Payment Gateway." });
        }

        return res.status(201).json({
          ...newOrder,
          payment_session_id,
          isDemo: false,
          cashfreeEnv: (CASHFREE_ENV === "production" || CASHFREE_SECRET_KEY.startsWith("cfsk_ma_prod_")) ? "production" : "sandbox"
        });
      }

      // Default COD payment immediately triggers transactional email as it completes placing the order
      if (paymentMethod === "COD") {
        const customerEmailBody = `
          <div style="font-family: 'Georgia', serif; padding: 30px; border-radius: 12px; border: 1px solid #e2d2ae; background-color: #faf8f5; color: #1c1917; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #78350f; font-family: 'Cinzel', serif; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #78350f; padding-bottom: 12px;">SPS SAREES (Sri Praharsha Silk Sarees)</h2>
            <p style="font-size: 14px; line-height: 1.6;">Dear <strong>${customerName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #444;">Thank you for investing in authentic Indian heritage! Your Cash on Delivery order has been placed successfully and has been assigned to our master weavers' registry.</p>
            
            <div style="background-color: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ecebe7; margin: 20px 0;">
              <p style="margin: 4px 0; font-size: 13px;"><strong>Order ID:</strong> #${orderId}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Shipping Address:</strong> ${shippingAddress}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #78350f;"><strong>Total Amount:</strong> ₹${Number(totalAmount).toLocaleString('en-IN')}</p>
            </div>

            <h3 style="color: #78350f; font-size: 14px; text-transform: uppercase;">Your Silk Masterpieces:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 1px solid #e1e0da; text-align: left; font-size: 12px;">
                  <th style="padding: 8px 0;">Saree Weave</th>
                  <th style="padding: 8px 0; text-align: center;">Qty</th>
                  <th style="padding: 8px 0; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((it: any) => `
                  <tr style="border-bottom: 1px solid #f2f1ed; font-size: 13px;">
                    <td style="padding: 10px 0;">
                      <strong>${it.saree.name}</strong><br/>
                      <span style="font-size: 10px; color: #666;">Type: ${it.saree.type} | Color: ${it.saree.color}</span>
                    </td>
                    <td style="padding: 10px 0; text-align: center;">${it.quantity}</td>
                    <td style="padding: 10px 0; text-align: right;">₹${(it.saree.price * it.quantity).toLocaleString('en-IN')}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <p style="font-size: 12px; color: #777; font-style: italic; line-height: 1.5; border-top: 1px solid #e1e0da; pt: 12px;">Notes on Heritage Care: Pure gold and Katan silk are extremely delicate. Unfold your sarees every few months and avoid direct naphthalene. If dry cleaning, prefer silk mark authorized professionals.</p>
            <p style="font-size: 13px; margin-top: 24px;">Warmest regards,<br/><strong>The Weaver Guild</strong><br/>Sri Praharsha Silk Sarees</p>
          </div>
        `;

        const adminEmailBody = `
          <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-top: 0;">🚨 New COD Order Received</h2>
            <p style="font-size: 14px;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="font-size: 14px;"><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
            <p style="font-size: 14px;"><strong>Phone:</strong> ${customerPhone}</p>
            <p style="font-size: 14px;"><strong>Total Revenue:</strong> ₹${Number(totalAmount).toLocaleString('en-IN')}</p>
            <p style="font-size: 14px;"><strong>Payment Gateway:</strong> Cash on Delivery (COD)</p>

            <h3 style="color: #1e293b; font-size: 14px; text-transform: uppercase;">Order Items Details:</h3>
            <ul style="padding-left: 20px; font-size: 13px; line-height: 1.6;">
              ${items.map((it: any) => `
                <li>
                  <strong>${it.saree.name}</strong> (Qty: ${it.quantity}) - Rate: ₹${it.saree.price.toLocaleString('en-IN')}
                </li>
              `).join("")}
            </ul>
          </div>
        `;

        sendTransactionalEmail(customerEmail, `Your SPS Sarees Heritage COD Order #${orderId} has been successfully placed!`, customerEmailBody);
        sendTransactionalEmail("admin@spssarees.com", `🚨 [New Order COD] SPS Sarees Order #${orderId}`, adminEmailBody);
      }

      res.status(201).json(newOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Cashfree Payment status
  app.post("/api/payments/cashfree-verify", async (req, res) => {
    reloadCashfreeConfig();
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Missing orderId verification parameter" });
      }

      const db = readDb();
      const index = db.orders.findIndex(o => o.id === orderId);
      if (index === -1) {
        return res.status(404).json({ error: "Order details not found in our database" });
      }

      const order = db.orders[index];

      // If already marked Paid, return instantly
      if (order.paymentStatus === "Paid") {
        return res.json({ status: "success", order });
      }

      let paymentVerified = false;
      const isConfigured = CASHFREE_APP_ID && CASHFREE_SECRET_KEY;

      if (!isConfigured) {
        return res.status(400).json({ error: "Cashfree API configuration is missing on the server environment variables." });
      }

      try {
        const isProd = CASHFREE_ENV === "production" || CASHFREE_SECRET_KEY.startsWith("cfsk_ma_prod_");
        const host = isProd ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
        
        const response = await fetch(`${host}/orders/${orderId}`, {
          method: "GET",
          headers: {
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const cfOrderData: any = await response.json();
          if (cfOrderData.order_status === "PAID") {
            paymentVerified = true;
          } else {
            console.warn(`Order ${orderId} has Cashfree status: ${cfOrderData.order_status}`);
          }
        } else {
          const responseErr = await response.text();
          console.error(`Error response fetching cashfree order ${orderId}:`, response.status, responseErr);
        }
      } catch (cfFetchErr) {
        console.error("Failed connecting to Cashfree API securely:", cfFetchErr);
      }

      if (paymentVerified) {
        db.orders[index].paymentStatus = "Paid";
        writeDb(db);

        // Send confirmation emails upon payment verified success!
        const customerEmailBody = `
          <div style="font-family: 'Georgia', serif; padding: 30px; border-radius: 12px; border: 1px solid #e2d2ae; background-color: #faf8f5; color: #1c1917; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #78350f; font-family: 'Cinzel', serif; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #78350f; padding-bottom: 12px;">SPS SAREES</h2>
            <p style="font-size: 14px; line-height: 1.6;">Dear <strong>${order.customerName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #444;">We have successfully verified your online payment of <strong>₹${order.totalAmount.toLocaleString('en-IN')}</strong> via the Cashfree PG. Your order is officially confirmed!</p>
            
            <div style="background-color: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ecebe7; margin: 20px 0;">
              <p style="margin: 4px 0; font-size: 13px;"><strong>Order ID:</strong> #${orderId}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Method:</strong> Cashfree Secure Gateway (Paid)</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #78350f;"><strong>Total Amount:</strong> ₹${Number(order.totalAmount).toLocaleString('en-IN')}</p>
            </div>

            <h3 style="color: #78350f; font-size: 14px; text-transform: uppercase;">Weaving master registry items:</h3>
            <ul style="padding-left: 20px; font-size: 13px; font-family: sans-serif; line-height: 1.6;">
              ${order.items.map((it: any) => `
                <li><strong>${it.saree.name}</strong> (Qty: ${it.quantity})</li>
              `).join("")}
            </ul>

            <p style="font-size: 12px; color: #777; font-style: italic; line-height: 1.5; border-top: 1px solid #e1e0da; pt: 12px;">Our loom artisans have started preparing the gold warp fibers. Follow tracking inside your profile cabinet.</p>
            <p style="font-size: 13px; margin-top: 24px;">Warmest regards,<br/><strong>The Weaver Guild</strong><br/>Sri Praharsha Silk Sarees</p>
          </div>
        `;

        const adminEmailBody = `
          <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; background-color: #f0fdf4;">
            <h2 style="color: #166534; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-top: 0;">✅ [Paid] New Web Order Approved</h2>
            <p style="font-size: 14px;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="font-size: 14px;"><strong>Customer Name:</strong> ${order.customerName}</p>
            <p style="font-size: 14px;"><strong>Direct Phone:</strong> ${order.customerPhone}</p>
            <p style="font-size: 14px;"><strong>Amount Collected:</strong> ₹${order.totalAmount.toLocaleString('en-IN')}</p>
            <p style="font-size: 14px;"><strong>Gateway:</strong> Cashfree Gateway (Auto-Verified)</p>
          </div>
        `;

        sendTransactionalEmail(order.customerEmail, `Payment Confirmed: Your SPS Sarees Order #${orderId} is Active!`, customerEmailBody);
        sendTransactionalEmail("admin@spssarees.com", `💸 [Paid Success] SPS Sarees Order #${orderId}`, adminEmailBody);

        return res.json({ status: "success", order: db.orders[index] });
      }

      res.status(400).json({ error: "Order payment verification not confirmed on gateway yet." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Secure dual handshake Webhook Listener for Cashfree payments
  app.post("/api/payments/cashfree-webhook", express.json(), async (req, res) => {
    reloadCashfreeConfig();
    try {
      const payload = req.body;
      console.log("Received Cashfree Webhook callback payload:", JSON.stringify(payload));
      
      const orderObj = payload.data?.order || payload.order;
      const paymentObj = payload.data?.payment || payload.payment;
      
      const webhookOrderId = orderObj?.order_id || payload.order_id;
      if (!webhookOrderId) {
        return res.status(400).send("Webhook order identifier not found.");
      }

      const isConfigured = CASHFREE_APP_ID && CASHFREE_SECRET_KEY;
      if (!isConfigured) {
        return res.status(400).send("Cashfree API environmental parameters are not configured on host.");
      }

      let webhookVerified = false;

      try {
        const isProd = CASHFREE_ENV === "production" || CASHFREE_SECRET_KEY.startsWith("cfsk_ma_prod_");
        const host = isProd ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

        const response = await fetch(`${host}/orders/${webhookOrderId}`, {
          method: "GET",
          headers: {
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const cfOrderData: any = await response.json();
          if (cfOrderData.order_status === "PAID") {
            webhookVerified = true;
          }
        } else {
          console.error(`Webhook handshake order verifying call returned ${response.status}`);
        }
      } catch (handshakeErr) {
        console.error("Failed executing direct webhook check back-channel call:", handshakeErr);
      }

      if (webhookVerified) {
        const db = readDb();
        const index = db.orders.findIndex(o => o.id === webhookOrderId);
        if (index !== -1) {
          const order = db.orders[index];
          if (order.paymentStatus !== "Paid") {
            db.orders[index].paymentStatus = "Paid";
            writeDb(db);

            // Send confirmation emails upon payment verified success!
            const customerEmailBody = `
              <div style="font-family: 'Georgia', serif; padding: 30px; border-radius: 12px; border: 1px solid #e2d2ae; background-color: #faf8f5; color: #1c1917; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #78350f; font-family: 'Cinzel', serif; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #78350f; padding-bottom: 12px;">SPS SAREES</h2>
                <p style="font-size: 14px; line-height: 1.6;">Dear <strong>${order.customerName}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #444;">We have successfully verified your online payment of <strong>₹${order.totalAmount.toLocaleString('en-IN')}</strong> via the Cashfree Webhook handler. Your order is officially active!</p>
                
                <div style="background-color: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ecebe7; margin: 20px 0;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Order ID:</strong> #${webhookOrderId}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Method:</strong> Cashfree Gateway (Webhook Handshake Verified)</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
                  <p style="margin: 4px 0; font-size: 13px; color: #78350f;"><strong>Total Amount:</strong> ₹${Number(order.totalAmount).toLocaleString('en-IN')}</p>
                </div>

                <h3 style="color: #78350f; font-size: 14px; text-transform: uppercase;">Weaving master registry items:</h3>
                <ul style="padding-left: 20px; font-size: 13px; font-family: sans-serif; line-height: 1.6;">
                  ${order.items.map((it: any) => `
                    <li><strong>${it.saree.name}</strong> (Qty: ${it.quantity})</li>
                  `).join("")}
                </ul>

                <p style="font-size: 12px; color: #777; font-style: italic; line-height: 1.5; border-top: 1px solid #e1e0da; pt: 12px;">Our loom artisans have started preparing the gold warp fibers. Follow tracking inside your profile cabinet.</p>
                <p style="font-size: 13px; margin-top: 24px;">Warmest regards,<br/><strong>The Weaver Guild</strong><br/>Sri Praharsha Silk Sarees</p>
              </div>
            `;

            const adminEmailBody = `
              <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; background-color: #f0fdf4;">
                <h2 style="color: #166534; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-top: 0;">✅ [Paid] Webhook Order Approved</h2>
                <p style="font-size: 14px;"><strong>Order ID:</strong> #${webhookOrderId}</p>
                <p style="font-size: 14px;"><strong>Customer Name:</strong> ${order.customerName}</p>
                <p style="font-size: 14px;"><strong>Direct Phone:</strong> ${order.customerPhone}</p>
                <p style="font-size: 14px;"><strong>Amount Collected:</strong> ₹${order.totalAmount.toLocaleString('en-IN')}</p>
                <p style="font-size: 14px;"><strong>Gateway Source:</strong> Cashfree Callback Webhook</p>
              </div>
            `;

            sendTransactionalEmail(order.customerEmail, `Payment Confirmed: Your SPS Sarees Order #${webhookOrderId} is Active!`, customerEmailBody);
            sendTransactionalEmail("admin@spssarees.com", `💸 [Paid Webhook Success] SPS Sarees Order #${webhookOrderId}`, adminEmailBody);
          }
        }
        return res.status(200).send("Webhook processed successfully.");
      }

      return res.status(200).send("Webhook received. Status not PAID yet.");
    } catch (err: any) {
      console.error("Webhook route error:", err);
      return res.status(500).send("Internal Server Error processing Webhook callback.");
    }
  });

  app.put("/api/orders/:id/status", requireAdmin, (req, res) => {
    try {
      const { orderStatus, paymentStatus } = req.body;
      const db = readDb();
      const index = db.orders.findIndex(o => o.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: "Order details not found" });

      if (orderStatus) db.orders[index].orderStatus = orderStatus;
      if (paymentStatus) db.orders[index].paymentStatus = paymentStatus;

      writeDb(db);

      // Notify customer of order updates
      const customerUpdateBody = `
        <div style="font-family: 'Georgia', serif; padding: 30px; border-radius: 12px; border: 1px solid #e2d2ae; background-color: #faf8f5; color: #1c1917; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #78350f; font-family: 'Cinzel', serif; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #78350f; padding-bottom: 12px;">SPS SAREES</h2>
          <p style="font-size: 14px;">Greetings <strong>${db.orders[index].customerName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">Your heritage handwoven order <strong style="color: #78350f;">#${req.params.id}</strong> has been updated by the weavers guild.</p>
          
          <div style="background-color: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ecebe7; margin: 20px 0; text-align: center;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>NEW WEAVE STATUS:</strong></p>
            <p style="margin: 0; font-size: 20px; color: #78350f; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${db.orders[index].orderStatus}</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #555;">Our team is handling your premium silks with absolute precision and insured transport safeguards. You can trace ongoing progress using your account cabinet.</p>
          <p style="font-size: 13px; margin-top: 24px;">Warmest regards,<br/><strong>The Weaver Guild</strong><br/>Sri Praharsha Silk Sarees</p>
        </div>
      `;

      sendTransactionalEmail(
        db.orders[index].customerEmail, 
        `Update on your SPS Sarees Order #${req.params.id}: ${db.orders[index].orderStatus}`, 
        customerUpdateBody
      );

      res.json(db.orders[index]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Manage Banners, Customers, Coupon Listings APIs
  app.get("/api/dashboard/summary", requireAdmin, (req, res) => {
    try {
      const db = readDb();
      const revenue = db.orders
        .filter(o => o.orderStatus !== "Cancelled" && o.paymentStatus === "Paid")
        .reduce((sum, o) => sum + o.totalAmount, 0);
      
      const ordersCount = db.orders.length;
      const customersCount = db.users.filter(u => u.role === "customer").length;
      const outOfStockCount = db.sarees.filter(s => s.stock <= 0).length;

      // Group revenue by Month for chart
      const revenueByMonth = [
        { month: "Jan", revenue: 45000 },
        { month: "Feb", revenue: 58000 },
        { month: "Mar", revenue: 89000 },
        { month: "Apr", revenue: 94000 },
        { month: "May", revenue: revenue }
      ];

      res.json({
        totRevenue: revenue,
        totOrders: ordersCount,
        totCustomers: customersCount,
        outOfStock: outOfStockCount,
        revenueByMonth,
        recentOrders: db.orders.slice(0, 5),
        inventoryAlerts: db.sarees.filter(s => s.stock <= 2)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/customers", requireAdmin, (req, res) => {
    try {
      const db = readDb();
      const customers = db.users.filter(u => u.role === "customer").map(u => {
        const userOrders = db.orders.filter(o => o.customerEmail.toLowerCase() === u.email.toLowerCase());
        const totalSpent = userOrders.filter(o => o.orderStatus !== "Cancelled" && o.paymentStatus === "Paid").reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          ordersCount: userOrders.length,
          totalSpent
        };
      });
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite Integration for Spa or static distribution
  if (process.env.VERCEL) {
    // Under Vercel, static files are served directly by Vercel CDN, and we don't start the listener.
    return app;
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK PORTAL READY] Server running on http://localhost:${PORT}`);
  });

  return app;
}

// Export app-getter promise for external serverless handlers (Vercel)
let serverPromise: Promise<express.Express> | null = null;
export function getApp() {
  if (!serverPromise) {
    serverPromise = startServer();
  }
  return serverPromise;
}

// Kickstart server only when not executing under Vercel environment
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Express dev server crashed:", err);
  });
}

