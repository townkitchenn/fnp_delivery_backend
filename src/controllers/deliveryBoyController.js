const db = require("../config/db");

const getAllDeliveryBoys = async (req, res) => {
  try {
    const [deliveryBoys] = await db.query(
      `SELECT id, username, phone_number FROM users 
       WHERE role = 'deliveryBoy' 
       ORDER BY id DESC`
    );

    res.json(deliveryBoys);
  } catch (error) {
    console.error("Error fetching delivery boys:", error);
    res.status(500).json({ error: "Failed to fetch delivery boys" });
  }
};

module.exports = {
  getAllDeliveryBoys,
};
