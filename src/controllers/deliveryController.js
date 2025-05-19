const db = require("../config/db");

const getAllDeliveryItems = async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id
       ORDER BY d.id DESC`
    );
    res.json(items);
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
    res.json(item[0]);
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
      delivery_time = "",
      customer_number = "",
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        error: "Name and address are required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO delivery_items 
       (name, description, address, delivery_time, customer_number, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, address, delivery_time, customer_number, "Pending"]
    );

    const newDeliveryItem = {
      id: result.insertId,
      name,
      description,
      address,
      delivery_time,
      customer_number,
      status: "Pending",
      assignedDeliveryBoy: null,
    };

    res.status(201).json(newDeliveryItem);
  } catch (error) {
    console.error("Error creating delivery item:", error);
    res.status(500).json({ error: "Failed to create delivery item" });
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

const updateDeliveryStatus = async (req, res) => {
  try {
    const itemId = req.params.id;
    const { status } = req.body;

    // Check if delivery item exists
    const [items] = await db.query(
      "SELECT * FROM delivery_items WHERE id = ?",
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: "Delivery item not found" });
    }

    const item = items[0];
    const allowedStatuses = [
      "Pending",
      "Assigned",
      "Picked",
      "Delivered",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Validate status transition
    const validTransitions = {
      Pending: ["Assigned", "Cancelled"],
      Assigned: ["Picked", "Cancelled"],
      Picked: ["Delivered", "Cancelled"],
      Delivered: [],
      Cancelled: [],
    };

    if (!validTransitions[item.status].includes(status)) {
      return res.status(400).json({
        error: `Cannot change status from ${item.status} to ${status}`,
      });
    }

    // Update status
    await db.query("UPDATE delivery_items SET status = ? WHERE id = ?", [
      status,
      itemId,
    ]);

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
    console.error("Error updating delivery status:", error);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
};

const getDeliveryItemsByDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoyId = req.params.deliveryBoyId;
    const [items] = await db.query(
      `SELECT d.*, u.username as delivery_boy_name 
       FROM delivery_items d 
       LEFT JOIN users u ON d.assigned_delivery_boy_id = u.id 
       WHERE d.assigned_delivery_boy_id = ?
       ORDER BY d.id DESC`,
      [deliveryBoyId]
    );
    res.json(items);
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

    // Return empty array if no items found instead of error
    if (!items.length) {
      return res.json([]);
    }

    res.json(items);
  } catch (error) {
    console.error("Error fetching pending delivery items:", error);
    res.status(500).json({ error: "Failed to fetch pending delivery items" });
  }
};

module.exports = {
  getAllDeliveryItems,
  getDeliveryItem,
  createDeliveryItem,
  assignDeliveryItem,
  updateDeliveryStatus,
  getDeliveryItemsByDeliveryBoy,
  getPendingDeliveryItems,
};
