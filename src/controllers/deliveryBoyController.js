const db = require("../config/db");

const getAllDeliveryBoys = async (req, res) => {
  try {
    const [deliveryBoys] = await db.query(
      `SELECT 
        u.id, 
        u.username, 
        u.phone_number,
        COALESCE(d.status, 'idle') as status,
        d.name as current_item_name
       FROM users u 
       LEFT JOIN (
         SELECT assigned_delivery_boy_id, status, name 
         FROM delivery_items 
         WHERE status IN ('Assigned', 'Picked') 
         ORDER BY created_at DESC
       ) d ON u.id = d.assigned_delivery_boy_id
       WHERE u.role = 'deliveryBoy'
       GROUP BY u.id
       ORDER BY u.id DESC`
    );

    const formattedDeliveryBoys = deliveryBoys.map((boy) => ({
      id: boy.id,
      username: boy.username,
      phone_number: boy.phone_number,
      current_delivery: {
        status: boy.status,
        itemName: boy.current_item_name || null,
      },
    }));

    res.json(formattedDeliveryBoys);
  } catch (error) {
    console.error("Error fetching delivery boys:", error);
    res.status(500).json({ error: "Failed to fetch delivery boys" });
  }
};

module.exports = {
  getAllDeliveryBoys,
};
