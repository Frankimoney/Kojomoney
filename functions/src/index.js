import * as functions from "firebase-functions";
import * as express from "express";

const app = express();

// Enable CORS for mobile and web apps
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Import all route handlers from the Next.js API routes
// For now, this is a placeholder - the actual routes are handled by the Next.js server

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Catch-all for API routes that should be handled by Next.js
app.all("/api/*", (req, res) => {
  res.status(501).json({
    error: "API endpoint not implemented in Cloud Functions",
    message: "Please deploy the full Next.js server to handle API routes",
    path: req.path
  });
});

// Export the Express app as a Cloud Function
export const api = functions
  .region("us-central1")
  .https.onRequest(app);

