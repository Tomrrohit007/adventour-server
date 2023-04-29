const express = require("express");
const authControllers = require("../controllers/authControllers");
const tourControllers = require("../controllers/tourController");
const Review = require("../routes/reviewRoute");

const router = express.Router();
// MERGE ROUTES
router.use("/:tourId/reviews", Review);

// Aggregated Routes
router.route("/tour-stats").get(tourControllers.tourStats);
router
  .route("/monthly-plan/:year")
  .get(
    authControllers.protectRoute,
    authControllers.restrictTo("admin", "lead-guide", "guide"),
    tourControllers.getMonthlyPlan
  );

// Geolocations
router
  .route("/geolocation-within/:distance/center/:latlng/unit/:unit")
  .get(tourControllers.getGeolocationWithin);
router.route("/distances/center/:latlng/unit/:unit").get(tourControllers.getDistancesOfTour)

// Routes without ID
router
  .route("/")
  .get(tourControllers.getAllTours)
  .post(authControllers.protectRoute, authControllers.restrictTo("admin"), tourControllers.createTour)
// Routes with ID
router
  .route("/:id")
  .get(tourControllers.getTour)
  .delete(authControllers.protectRoute, authControllers.restrictTo("admin"), tourControllers.deleteTour)
  .patch(authControllers.protectRoute, authControllers.restrictTo("admin"), tourControllers.updateTour);

//Tour/Review
module.exports = router;
