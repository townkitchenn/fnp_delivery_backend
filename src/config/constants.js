module.exports = {
  // Use a port for your Express server like 3000
  PORT: 3000,

  // Database connection config – keep 3306 as is (default MySQL port)
  DB_CONFIG: {
    host: "database-1.czycqw8g63l1.eu-north-1.rds.amazonaws.com",
    user: "admin",
    password: "townkitchennka20",
    database: "fnp_delivery",
    port: 3306, // Optional: you can specify this or leave it (3306 is default)
  },
};
