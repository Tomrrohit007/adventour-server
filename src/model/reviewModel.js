const mongoose = require("mongoose");
const Tour = require("./tourModel");
const Review = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review must have a review"],
      minLength: [1, "Review should have some letters"],
    },
    rating: {
      type: Number,
      min: [1, "Rating should have a minimum value of 1"],
      max: [5, "Rating should have a maximum value of 5"],
      required: [true, "Review must have a rating"],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "tours",
      required: [true, "Review must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "users",
      required: [true, "Review must belong to a user"],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

Review.index({tour:1, user:1}, {unique:true})

Review.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name image",
  });
  next();
});

Review.statics.calAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

Review.post("save", function () {
  this.constructor.calAverageRatings(this.tour);
});

// POST REQ have a instance of executed document i.e reviewUpdated in this case

Review.post(/^findOneAnd/, async function (reviewUpdated) {
  console.log(reviewUpdated);
  await reviewUpdated.constructor.calAverageRatings(reviewUpdated.tour);
});

module.exports = mongoose.model("reviews", Review);
