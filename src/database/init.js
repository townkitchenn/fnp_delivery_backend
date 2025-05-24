const mysql = require("mysql2/promise");
const { DB_CONFIG } = require("../config/constants");

const initDatabase = async () => {
  try {
    // Connect directly with database name since it's already created in RDS
    const connection = await mysql.createConnection(DB_CONFIG);

    // Create tables if not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        role ENUM('admin', 'deliveryBoy') NOT NULL,
        is_admin BOOLEAN DEFAULT false
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        delivery_time VARCHAR(100),
        customer_number VARCHAR(15),
        alternative_number VARCHAR(15),
        image_path VARCHAR(255),
        delivered_image VARCHAR(255),
        status ENUM('Pending', 'Assigned', 'Picked', 'Delivered', 'Cancelled', 'Delivery_Attempted') DEFAULT 'Pending',
        assigned_delivery_boy_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_delivery_boy_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      ALTER TABLE delivery_items 
      MODIFY COLUMN status ENUM('Pending', 'Assigned', 'Picked', 'Out_For_Delivery', 'Delivered', 'Cancelled', 'Delivery_Attempted') DEFAULT 'Pending'
    `);

    console.log("Database tables initialized successfully");
    await connection.end();
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

module.exports = initDatabase;
