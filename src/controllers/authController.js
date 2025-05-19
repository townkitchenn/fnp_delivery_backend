const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await db.query(
      "SELECT id, username, role, is_admin, phone_number FROM users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (users.length > 0) {
      const user = users[0];
      res.json({
        token: "fake-jwt-token",
        userId: user.id,
        username: user.username,
        phoneNumber: user.phone_number,
        role: user.role,
        isAdmin: user.is_admin,
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

const register = async (req, res) => {
  try {
    const { username, password, confirmPassword, phoneNumber, isAdmin } =
      req.body;

    // Debug log
    console.log("Registration attempt:", { username, phoneNumber, isAdmin });

    // Validation
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // Check if username exists
    const [existingUsers] = await db
      .query("SELECT id FROM users WHERE username = ?", [username])
      .catch((err) => {
        console.error("Error checking existing user:", err);
        throw err;
      });

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Create new user
    const userId = uuidv4();
    const role = isAdmin ? "admin" : "deliveryBoy";

    const query = `
      INSERT INTO users (id, username, password, phone_number, role, is_admin) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [userId, username, password, phoneNumber, role, !!isAdmin];

    await db.query(query, values).catch((err) => {
      console.error("Error inserting new user:", err);
      console.error("Query:", query);
      console.error("Values:", values);
      throw err;
    });

    console.log("User registered successfully:", userId);

    res.status(201).json({
      message: "User registered successfully",
      userId,
      username,
      role,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  login,
  register,
};
