const db = require("../config/db");
const path = require("path");
const multer = require("multer"); // Ensure multer is imported for MulterError

// Move constants to top
const validStatuses = [
  "PENDING",
  "ASSIGNED",
  "PICKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "DELIVERY_ATTEMPTED",
];

// Helper function (keep this separate, as you provided it)
const formatItemWithUrls = (item, req) => {
  // Get the base URL from the request (e.g., "http://localhost:3000")
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  return {
    ...item,
    image_url: item.image_path
      ? `${baseUrl}/${item.image_path.replace(/^\/+/, "")}` // Ensure no leading slash in stored path
      : null,
    delivered_image_url: item.delivered_image
      ? `${baseUrl}/${item.delivered_image.replace(/^\/+/, "")}` // Ensure no leading slash in stored path
      : null,
  };
};

const getAllDeliveryItems = async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id
       ORDER BY d.id DESC`
    );
    const itemsWithUrls = items.map((item) => formatItemWithUrls(item, req));
    res.json(itemsWithUrls);
  } catch (error) {
    console.error("Error fetching delivery items:", error);
    res.status(500).json({ error: "Failed to fetch delivery items" });
  }
};

const getDeliveryItem = async (req, res) => {
  try {
    const [item] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.id = ?`,
      [req.params.id]
    );
    if (!item.length) {
      return res.status(404).json({ error: "Delivery item not found" });
    }
    res.json(formatItemWithUrls(item[0], req));
  } catch (error) {
    console.error("Error fetching delivery item:", error);
    res.status(500).json({ error: "Failed to fetch delivery item" });
  }
};

const createDeliveryItem = async (req, res) => {
  try {
    const {
      name,
      description = "",
      address,
      location = "", // Add location field
      delivery_time = "",
      customer_number = "",
      alternative_number = "",
    } = req.body;

    // --- IMPORTANT DEBUGGING LOGS (keep these, they are useful!) ---
    console.log("Backend: Request received in createDeliveryItem controller.");
    console.log("Backend: req.body (from Multer):", req.body);
    console.log("Backend: req.file (from Multer):", req.file);
    // --- END DEBUGGING LOGS ---

    // --- AGGRESSIVE FALLBACK / DEBUGGING STEP ---
    // You can remove this block once you are absolutely confident Multer is working.
    // It's not part of standard production code.
    if (Object.keys(req.body).length === 0 && !req.file) {
      console.warn(
        "Backend: req.body and req.file are empty after Multer. This is a severe issue with Multer setup."
      );
      try {
        // Attempt to log raw body for deeper debugging if Multer totally fails
        const rawBody = req.rawBody
          ? req.rawBody.toString()
          : "No raw body captured";
        console.log(
          "Backend: Raw body content (first 500 chars):",
          rawBody.substring(0, 500)
        );
      } catch (parseError) {
        console.error(
          "Backend: Error attempting to read raw body:",
          parseError
        );
      }
    }
    // --- END AGGRESSIVE FALLBACK ---

    // Validation
    if (!name || !address) {
      return res.status(400).json({
        error: "Name and address are required fields.",
        receivedData: { name: name, address: address }, // Show what was received
      });
    }

    // Determine the path to store in the database:
    // Multer's req.file.path usually gives an absolute OS path (e.g., C:\...\uploads\filename.jpg)
    // We want to store a relative path suitable for URL construction (e.g., uploads/filename.jpg)
    let dbImagePath = null;
    if (req.file) {
      // path.basename gets just the filename (e.g., 'image-1748020483501.jpeg')
      // Prepend 'uploads/' to get the path relative to your static server
      // Make sure this matches your `app.use('/uploads', express.static(UPLOAD_DIR));` setup
      dbImagePath = `uploads/${path.basename(req.file.path)}`;
    }

    // --- Your actual database interaction ---
    const [result] = await db.query(
      `INSERT INTO delivery_items
       (name, description, address, location, delivery_time, customer_number, alternative_number, image_path, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        address,
        location,
        delivery_time,
        customer_number,
        alternative_number,
        dbImagePath, // Store the cleaned, relative path in the database
        "Pending", // Default status
      ]
    );

    // Create the response object with the stored data
    const newDeliveryItem = {
      id: result.insertId, // Use the ID from your actual database insert
      name,
      description,
      address,
      location, // Include location
      delivery_time,
      customer_number,
      alternative_number,
      image_path: dbImagePath, // This is the path stored in DB
      status: "Pending",
      assignedDeliveryBoy: null,
      // You can add delivered_image: null here if your DB has it
    };

    // Use the helper to add the correct image_url to the response before sending
    const responseItem = formatItemWithUrls(newDeliveryItem, req);

    console.log("Backend: New item created successfully:", responseItem);
    res.status(201).json(responseItem);
  } catch (error) {
    console.error(
      "Backend Error in createDeliveryItem (top-level catch):",
      error
    );

    if (error instanceof multer.MulterError) {
      console.error("Backend: Multer Error Code:", error.code);
      if (error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "File size too large. Max 5MB allowed." });
      }
      return res.status(400).json({ error: `Upload error: ${error.message}` });
    }

    // Check for custom errors from fileFilter
    if (error.message && error.message.includes("Invalid file type")) {
      return res.status(400).json({ error: error.message });
    }

    // Generic error for other issues
    res
      .status(500)
      .json({ error: "Failed to create delivery item on server." });
  }
};

const assignDeliveryItem = async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    const itemId = req.params.id;

    // Check if delivery item exists
    const [items] = await db.query(
      "SELECT * FROM delivery_items WHERE id = ?",
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: "Delivery item not found" });
    }

    const item = items[0];

    // Check if delivery boy exists
    const [deliveryBoys] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = ?",
      [deliveryBoyId, "deliveryBoy"]
    );

    if (deliveryBoys.length === 0) {
      return res.status(400).json({ error: "Delivery boy not found" });
    }

    if (item.assigned_delivery_boy_id) {
      return res
        .status(400)
        .json({ error: "Delivery item is already assigned" });
    }

    // Update delivery item with assigned delivery boy
    await db.query(
      "UPDATE delivery_items SET assigned_delivery_boy_id = ?, status = ? WHERE id = ?",
      [deliveryBoyId, "Assigned", itemId]
    );

    // Get updated item with delivery boy info
    const [updatedItem] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.id = ?`,
      [itemId]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    console.error("Error assigning delivery item:", error);
    res.status(500).json({ error: "Failed to assign delivery item" });
  }
};

// Add a helper function to format status consistently
const formatStatus = (status) => {
  if (!status) return null;
  // Normalize status format: convert to uppercase and replace spaces with underscores
  return status.trim().replace(/\s+/g, "_").toUpperCase();
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const itemId = req.params.id;
    const status = req.body.status;

    console.log("Backend: Status update request:", {
      status,
      file: req.file,
      body: req.body,
    });

    // Handle delivered image like other image uploads
    const deliveredImagePath = req.file
      ? `uploads/${path.basename(req.file.path)}`.replace(/^\/+/, "")
      : null;

    // Update query with formatted image path
    const updateQuery = deliveredImagePath
      ? "UPDATE delivery_items SET status = ?, delivered_image = ? WHERE id = ?"
      : "UPDATE delivery_items SET status = ? WHERE id = ?";

    const updateParams = deliveredImagePath
      ? [status, deliveredImagePath, itemId]
      : [status, itemId];

    await db.query(updateQuery, updateParams);

    // Get updated item with explicit fields
    const [updatedItem] = await db.query(
      `SELECT d.*, d.status as status, d.delivered_image, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.id = ?`,
      [itemId]
    );

    const formattedResponse = formatItemWithUrls(updatedItem[0], req);
    console.log("Sending formatted response:", formattedResponse);
    res.json(formattedResponse);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
};

// Update getDeliveryItemsByStatus to explicitly handle Out_For_Delivery
const getDeliveryItemsByStatus = async (req, res) => {
  try {
    const status = formatStatus(req.params.status);

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        validStatuses,
      });
    }

    const [items] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id
       WHERE d.status = ?
       ORDER BY d.id DESC`,
      [status]
    );

    const itemsWithUrls = items.map((item) => formatItemWithUrls(item, req));
    res.json(itemsWithUrls);
  } catch (error) {
    console.error("Error fetching delivery items by status:", error);
    res.status(500).json({ error: "Failed to fetch delivery items" });
  }
};

// Update getDeliveryItemsByDeliveryBoy to format status properly
const getDeliveryItemsByDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const status = formatStatus(req.params.status); // Format status like other APIs

    console.log("Fetching items for delivery boy:", { deliveryBoyId, status });

    const [items] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.assigned_delivery_boy_id = ? 
       AND d.status = ?
       ORDER BY d.id DESC`,
      [deliveryBoyId, status]
    );

    const itemsWithUrls = items.map((item) => formatItemWithUrls(item, req));
    res.json(itemsWithUrls);
  } catch (error) {
    console.error("Error fetching delivery boy items:", error);
    res.status(500).json({ error: "Failed to fetch delivery boy items" });
  }
};

const getPendingDeliveryItems = async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id
       WHERE d.status = ?
       ORDER BY d.id DESC`,
      ["Pending"]
    );

    const itemsWithUrls = items.map((item) => formatItemWithUrls(item, req));
    res.json(itemsWithUrls);
  } catch (error) {
    console.error("Error fetching pending delivery items:", error);
    res.status(500).json({ error: "Failed to fetch pending delivery items" });
  }
};

const deleteDeliveryItem = async (req, res) => {
  try {
    const itemId = req.params.id;

    // Check if item exists
    const [item] = await db.query("SELECT * FROM delivery_items WHERE id = ?", [
      itemId,
    ]);

    if (item.length === 0) {
      return res.status(404).json({ error: "Delivery item not found" });
    }

    // Allow deletion of pending and delivered items only
    if (!["Pending", "Delivered"].includes(item[0].status)) {
      return res.status(400).json({
        error: "Can only delete pending or delivered items",
      });
    }

    // Delete the item
    await db.query("DELETE FROM delivery_items WHERE id = ?", [itemId]);

    res.json({ message: "Delivery item deleted successfully" });
  } catch (error) {
    console.error("Error deleting delivery item:", error);
    res.status(500).json({ error: "Failed to delete delivery item" });
  }
};

const editDeliveryItem = async (req, res) => {
  try {
    // Add debug logging
    console.log("Backend: Edit request received:", {
      body: req.body,
      file: req.file,
    });

    const itemId = req.params.id;
    const {
      name,
      description = "",
      address,
      location = "",
      delivery_time = "",
      customer_number = "",
      alternative_number = "",
    } = req.body;

    // Check if item exists
    const [items] = await db.query(
      "SELECT * FROM delivery_items WHERE id = ?",
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: "Delivery item not found" });
    }

    if (!["Pending", "Assigned"].includes(items[0].status)) {
      return res.status(400).json({
        error: "Can only edit items that haven't been picked up yet",
      });
    }

    // Handle image update
    const dbImagePath = req.file
      ? `uploads/${path.basename(req.file.path)}`.replace(/^\/+/, "")
      : items[0].image_path;

    // Update query with all fields
    await db.query(
      `UPDATE delivery_items 
       SET name = ?, 
           description = ?, 
           address = ?, 
           location = ?,
           delivery_time = ?, 
           customer_number = ?, 
           alternative_number = ?,
           image_path = ?
       WHERE id = ?`,
      [
        name, // Use direct values instead of fallbacks
        description,
        address,
        location,
        delivery_time,
        customer_number,
        alternative_number,
        dbImagePath,
        itemId,
      ]
    );

    // Get updated item
    const [updatedItem] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.id = ?`,
      [itemId]
    );

    // Format response with URLs
    const responseItem = formatItemWithUrls(updatedItem[0], req);
    console.log("Backend: Item updated successfully:", responseItem);
    res.json(responseItem);
  } catch (error) {
    console.error("Error editing delivery item:", error);
    res.status(500).json({ error: "Failed to edit delivery item" });
  }
};

const unassignDeliveryItem = async (req, res) => {
  try {
    const itemId = req.params.id;

    // Check if delivery item exists and is assigned
    const [items] = await db.query(
      "SELECT * FROM delivery_items WHERE id = ?",
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: "Delivery item not found" });
    }

    const item = items[0];

    if (!item.assigned_delivery_boy_id) {
      return res
        .status(400)
        .json({ error: "Item is not assigned to any delivery boy" });
    }

    if (!["Assigned"].includes(item.status)) {
      return res.status(400).json({
        error: "Cannot unassign item that is already picked up or delivered",
      });
    }

    // Remove assignment and update status to pending
    await db.query(
      "UPDATE delivery_items SET assigned_delivery_boy_id = NULL, status = 'Pending' WHERE id = ?",
      [itemId]
    );

    // Get updated item
    const [updatedItem] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.id = ?`,
      [itemId]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    console.error("Error unassigning delivery item:", error);
    res.status(500).json({ error: "Failed to unassign delivery item" });
  }
};

const getStatusCounts = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM delivery_items
      GROUP BY status
      ORDER BY status`);

    // Convert to object with status as keys
    const statusCounts = {};
    results.forEach((row) => {
      statusCounts[row.status || "undefined"] = row.count;
    });

    res.json(statusCounts);
  } catch (error) {
    console.error("Error fetching status counts:", error);
    res.status(500).json({ error: "Failed to fetch status counts" });
  }
};

const getDeliveryBoyStatusCounts = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;

    const [results] = await db.query(
      `
      SELECT status, COUNT(*) as count
      FROM delivery_items
      WHERE assigned_delivery_boy_id = ?
      GROUP BY status
      ORDER BY status`,
      [deliveryBoyId]
    );

    const statusCounts = {};
    results.forEach((row) => {
      statusCounts[row.status || "undefined"] = row.count;
    });

    res.json(statusCounts);
  } catch (error) {
    console.error("Error fetching delivery boy status counts:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch delivery boy status counts" });
  }
};

// Add to module.exports
module.exports = {
  getAllDeliveryItems,
  getDeliveryItem,
  createDeliveryItem,
  assignDeliveryItem,
  updateDeliveryStatus,
  getDeliveryItemsByDeliveryBoy,
  getPendingDeliveryItems,
  deleteDeliveryItem,
  editDeliveryItem,
  unassignDeliveryItem,
  getDeliveryItemsByStatus,
  getStatusCounts,
  getDeliveryBoyStatusCounts,
};
