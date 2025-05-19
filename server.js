const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const { PORT } = require("./src/config/constants");
const migrations = require("./src/database/migrations");

const startServer = async () => {
  try {
    // Run database migrations
    await migrations();

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Add error handling middleware
    app.use((err, req, res, next) => {
      console.error("Unhandled error:", err);
      res.status(500).json({
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    });

    app.use("/api", routes);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer().catch(console.error);
