import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy all /api requests to your Next.js backend
// For development, this proxies to the standalone server
// In production, deploy the Next.js server separately or use this as middleware

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Placeholder for API routes
// In production, these would be actual route handlers
app.all("/api/*", (req, res) => {
  res.status(503).json({
    error: "Backend service not available",
    message: "API routes need to be served from the Next.js standalone server",
    path: req.path,
    method: req.method
  });
});

// Export the Express app as a Cloud Function
export const api = functions
  .region("us-central1")
  .https.onRequest(app);
