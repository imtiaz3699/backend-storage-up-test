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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Configure Helmet to work with CORS (after CORS middleware)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Disable CSP to avoid conflicts
  })
);

// CORS configuration - single unified settings
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:7000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:7000",
  "https://storag-up-admin-64aa23516b44.herokuapp.com",
  "https://5a8385ef78c9.ngrok-free.app",
  "http://192.168.100.141:7000",
  "http://localhost:5173/"
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
        // In development, allow localhost on any port
        if (
          process.env.NODE_ENV !== "production" &&
          origin.startsWith("http://localhost:")
        ) {
          callback(null, true);
        } else {
          // Reject other origins (don't throw error, just reject)
          callback(null, false);
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
    optionsSuccessStatus: 200, // Support legacy browsers
  })
);
app.use(morgan("dev"));
app.use(cookieParser());

// Stripe Webhook Route (MUST be before JSON body parser)
// Webhooks need raw body for signature verification
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Body parsers for other routes (must come after webhook route)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
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
