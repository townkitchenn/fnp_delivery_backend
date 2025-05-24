// server.js
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const { PORT, UPLOAD_DIR } = require("./src/config/constants"); // Ensure UPLOAD_DIR is imported
const migrations = require("./src/database/migrations");
const fs = require("fs");
const path = require("path"); // Added path

const startServer = async () => {
  try {
    await migrations();
    console.log("Database migrations completed.");

    const app = express();

    // Ensure the uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      console.log(`Created uploads directory at: ${UPLOAD_DIR}`);
    }

    app.use(cors());

    // Keep these if you have other JSON/URL-encoded routes, otherwise they are not strictly needed for Multer
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use("/uploads", express.static(UPLOAD_DIR));
    console.log(`Serving static files from: ${UPLOAD_DIR} at /uploads`);

    // --- Add a dedicated Multer error handling middleware just before your routes ---
    // This is good practice to catch errors that Multer might throw
    // before the request even reaches your controller.
    app.use((req, res, next) => {
      // You can add a pre-route logger here if needed
      next();
    });

    app.use("/api", routes); // Your API routes, where Multer is applied

    // Global Error Handling Middleware (should be after all routes)
    app.use((err, req, res, next) => {
      console.error("Caught unhandled error:", err);

      // Check if it's a Multer error
      if (err instanceof require("multer").MulterError) {
        console.error("Multer Error Code:", err.code);
        return res.status(400).json({
          error: `File upload failed: ${err.message}`,
          multerCode: err.code,
        });
      }
      // Check for errors from fileFilter (if you passed an Error object)
      if (
        (err.message && err.message.includes("Invalid file type")) ||
        err.message.includes("Images Only!")
      ) {
        return res.status(400).json({ error: err.message });
      }

      res.status(err.status || 500).json({
        error: err.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer().catch(console.error);
