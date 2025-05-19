const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const deliveryController = require("../controllers/deliveryController");
const deliveryBoyController = require("../controllers/deliveryBoyController");

router.post("/login", authController.login);
router.post("/register", authController.register);

router.get("/delivery-boys", deliveryBoyController.getAllDeliveryBoys);
router.get(
  "/delivery-items/pending",
  deliveryController.getPendingDeliveryItems
);
router.get("/delivery-items", deliveryController.getAllDeliveryItems);
router.post("/delivery-items", deliveryController.createDeliveryItem);
router.get("/delivery-items/:id", deliveryController.getDeliveryItem);
router.put("/delivery-items/:id/assign", deliveryController.assignDeliveryItem);
router.put(
  "/delivery-items/:id/status",
  deliveryController.updateDeliveryStatus
);
router.get(
  "/delivery-boys/:deliveryBoyId/items",
  deliveryController.getDeliveryItemsByDeliveryBoy
);

module.exports = router;
