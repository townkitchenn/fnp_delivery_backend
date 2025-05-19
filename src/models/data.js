const deliveryItems = [
  {
    id: 1,
    description: "Package 1",
    address: "Address 1",
    status: "Pending",
    assignedDeliveryBoy: null,
  },
  {
    id: 2,
    description: "Package 2",
    address: "Address 2",
    status: "Pending",
    assignedDeliveryBoy: null,
  },
];

const deliveryBoys = [
  { id: 101, name: "John Doe", status: "Available" },
  { id: 102, name: "Jane Smith", status: "Available" },
];

const users = [
  { id: "admin1", username: "admin", password: "password", role: "admin" },
  {
    id: "driver1",
    username: "driver",
    password: "password",
    role: "deliveryBoy",
  },
];

module.exports = {
  deliveryItems,
  deliveryBoys,
  users,
};
