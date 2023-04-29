const Review = require("../model/reviewModel");
const { deleteOne, updateOne, createOne, getAll } = require("./handlerFactory");

exports.setUserAndTour = (req, res, next) => {
  req.body.user = req.user.id;
  req.body.tour = req.params.tourId;
  next();
};

// Get reviews for current User/Tour
exports.getReview = getAll(Review);
exports.createReview = createOne(Review);
exports.deleteReview = deleteOne(Review);
exports.updateReview = updateOne(Review);

