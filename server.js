import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { initializeDailyProcessing } from "./jobs/index.js";
import { handleStripeWebhook } from "./controllers/paymentController.js";
import { initializeSocket } from "./utils/socketService.js";
import { initializeSocketHandlers } from "./socket/socketHandler.js";
import { tokenMiddleware, protectAdmin } from "./middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, 
  })
);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:7000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:7000",
  "http://127.0.0.1:5173",
  "https://storag-up-admin-64aa23516b44.herokuapp.com",
  "https://5a8385ef78c9.ngrok-free.app",
  "http://192.168.100.141:7000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Allow localhost on any port (for development and testing)
        if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
          callback(null, true);
        } else {
          // Check if origin matches production frontend URL from env
          const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
          if (frontendUrl && origin === frontendUrl.replace(/\/+$/, '')) {
            callback(null, true);
          } else {
            // Reject other origins (don't throw error, just reject)
            console.warn(`⚠️  CORS blocked origin: ${origin}`);
            callback(null, false);
          }
        }
      }
    },
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    optionsSuccessStatus: 200, 
  })
);
app.use(morgan("dev"));
app.use(cookieParser());


app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/storageup";
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.log(error, "Server Error:=>");

    // Don't exit - let the app continue (some routes might work)
    // process.exit(1);
  });

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to StorageUp Backend API",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Database clearing endpoint (DEVELOPMENT ONLY - Admin protected)
app.delete("/api/admin/clear-database", tokenMiddleware, protectAdmin, async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Database clearing is disabled in production mode",
      });
    }

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const db = mongoose.connection.db;
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Database is already empty",
        collections_dropped: 0,
      });
    }

    const droppedCollections = [];
    
    // Drop each collection
    for (const collection of collections) {
      try {
        await db.collection(collection.name).drop();
        droppedCollections.push(collection.name);
        console.log(`✅ Dropped collection: ${collection.name}`);
      } catch (error) {
        console.error(`❌ Error dropping collection ${collection.name}:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Database cleared successfully. ${droppedCollections.length} collection(s) dropped.`,
      collections_dropped: droppedCollections.length,
      dropped_collections: droppedCollections,
    });
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing database",
      error: error.message,
    });
  }
});

// API Routes (most routes use JSON body parser)
app.use("/api", routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);
if (io) {
  initializeSocketHandlers(io);
}

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);

  // Log email configuration status and initialize
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASSWORD;
  if (process.env.SMTP_HOST && smtpUser && smtpPass) {
    try {
      const { sendEmail } = await import("./utils/emailService.js");
    } catch (error) {
      console.error(
        `📧 ⚠️  Email service initialization error:`,
        error.message
      );
    }

    // Initialize Daily Processing Jobs
    console.log(`📅 Initializing Daily Processing System...`);
    try {
      initializeDailyProcessing();
    } catch (error) {
      console.error(
        `📅 ⚠️  Daily Processing initialization error:`,
        error.message
      );
    }
  } else {
    console.log(
      `📧 ⚠️  Email service not configured - will use Ethereal test account`
    );
    console.log(
      `📧 To configure Gmail, add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env`
    );
  }
});
