// multerConfig.js
const multer = require("multer");
const path = require("path");
const { UPLOAD_DIR } = require("../config/constants"); // Use the absolute path

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR); // Use the absolute UPLOAD_DIR
  },
  filename: (req, file, cb) => {
    // Generate a more robust unique filename, e.g., fieldname-timestamp.ext
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Pass an Error object with a specific message
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, and PNG images are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
