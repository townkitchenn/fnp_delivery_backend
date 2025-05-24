const db = require("../config/db");

const migrations = async () => {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        role ENUM('admin', 'deliveryBoy') NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create delivery_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        delivery_time VARCHAR(100),
        customer_number VARCHAR(15),
        alternative_number VARCHAR(15),
        status ENUM('Pending', 'Assigned', 'Picked', 'Delivered', 'Cancelled') DEFAULT 'Pending',
        assigned_delivery_boy_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_delivery_boy_id) REFERENCES users(id)
      )
    `);

    // Add image_path column if it doesn't exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'delivery_items' 
      AND TABLE_SCHEMA = '${process.env.DB_NAME || "fnp_delivery"}'
      AND COLUMN_NAME = 'image_path'`);

    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE delivery_items 
        ADD COLUMN image_path VARCHAR(255) DEFAULT NULL`);
      console.log("Added image_path column");
    }

    // Add alternative_number column if it doesn't exist
    const [altColumns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'delivery_items' 
      AND TABLE_SCHEMA = '${process.env.DB_NAME || "fnp_delivery"}'
      AND COLUMN_NAME = 'alternative_number'`);

    if (altColumns.length === 0) {
      await db.query(`
        ALTER TABLE delivery_items 
        ADD COLUMN alternative_number VARCHAR(15) DEFAULT NULL`);
      console.log("Added alternative_number column");
    }

    // Add delivered_image column if it doesn't exist
    const [delColumns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'delivery_items' 
      AND TABLE_SCHEMA = '${process.env.DB_NAME || "fnp_delivery"}'
      AND COLUMN_NAME = 'delivered_image'`);

    if (delColumns.length === 0) {
      await db.query(`
        ALTER TABLE delivery_items 
        ADD COLUMN delivered_image VARCHAR(255) DEFAULT NULL`);
      console.log("Added delivered_image column");
    }

    // Check if location column exists
    const [locColumns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'delivery_items' 
      AND COLUMN_NAME = 'location'`);

    if (locColumns.length === 0) {
      await db.query(`
        ALTER TABLE delivery_items 
        ADD COLUMN location VARCHAR(255) DEFAULT NULL 
        AFTER address`);
      console.log("Added location column");
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

module.exports = migrations;
