CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    role ENUM('admin', 'deliveryBoy') NOT NULL,
    is_admin BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS delivery_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    delivery_time VARCHAR(100),
    customer_number VARCHAR(15),
    status ENUM('Pending', 'Assigned', 'Picked', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    assigned_delivery_boy_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_delivery_boy_id) REFERENCES users(id)
);
