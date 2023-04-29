const express = require("express");
const router = express.Router();

const authController = require("../controllers/authControllers");
const userController = require("../controllers/userControllers");

// Login Related API
router.post("/forget-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.use(authController.protectRoute);

router.patch(
  "/update-password",
  authController.passwordBeforeSaving,
  authController.updatePassword
);
router.patch(
  "/update-email",
  userController.getMe,
  authController.passwordBeforeSaving,
  userController.updateEmail,
  userController.updateUserDetails
);
router.patch(
  "/update-details",
  userController.getMe,
  authController.passwordAndEmailCheck,
  userController.uploadUserPhoto,
  userController.hashImageUrl,
  userController.updateUserDetails
);

router.patch(
  "/remove-image",
  authController.passwordAndEmailCheck,
  userController.destroyUserPhoto
);
router.delete(
  "/deactivate-account",
  authController.passwordBeforeSaving,
  userController.deactivateUser
);
router.get("/me", userController.getMe, userController.getUser);

router.route("/").get(userController.getAllUser);
router
  .route("/:id")
  .delete(userController.deleteUser)
  .get(userController.getUser);

module.exports = router;
