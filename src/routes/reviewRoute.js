const express = require("express");
const authControllers = require("../controllers/authControllers");
const reviewControllers = require("../controllers/reviewsControllers");

const router = express.Router({ mergeParams: true });
router.route("/").get(reviewControllers.getReview).post(authControllers.protectRoute, reviewControllers.setUserAndTour, reviewControllers.createReview);
router.use(authControllers.protectRoute);
router.route("/:id").delete(authControllers.restrictUser, reviewControllers.deleteReview).patch(authControllers.restrictUser, reviewControllers.updateReview);

module.exports = router;
