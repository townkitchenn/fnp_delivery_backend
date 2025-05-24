const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const deliveryController = require("../controllers/deliveryController");
const deliveryBoyController = require("../controllers/deliveryBoyController");
const upload = require("../config/multerConfig");

router.post("/login", authController.login);
router.post("/register", authController.register);

router.get("/delivery-boys", deliveryBoyController.getAllDeliveryBoys);
router.get(
  "/delivery-items/pending",
  deliveryController.getPendingDeliveryItems
);
router.get("/delivery-items", deliveryController.getAllDeliveryItems);
router.post(
  "/delivery-items",
  upload.single("image"),
  deliveryController.createDeliveryItem
);
router.get("/delivery-items/:id", deliveryController.getDeliveryItem);
router.put("/delivery-items/:id/assign", deliveryController.assignDeliveryItem);
router.put(
  "/delivery-items/:id/status",
  upload.single("delivered_image"),
  deliveryController.updateDeliveryStatus
);

router.get(
  "/delivery-boys/:deliveryBoyId/items/:status",
  deliveryController.getDeliveryItemsByDeliveryBoy
);

router.delete("/delivery-items/:id", deliveryController.deleteDeliveryItem);
router.put(
  "/delivery-items/:id/edit",
  upload.single("image"),
  deliveryController.editDeliveryItem
);
router.put(
  "/delivery-items/:id/unassign",
  deliveryController.unassignDeliveryItem
);
router.get(
  "/delivery-items/status/:status",
  deliveryController.getDeliveryItemsByStatus
);
router.get("/delivery-items/counts/status", deliveryController.getStatusCounts);
router.get(
  "/delivery-boys/:deliveryBoyId/counts/status",
  deliveryController.getDeliveryBoyStatusCounts
);

module.exports = router;
