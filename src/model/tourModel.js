const mongoose = require("mongoose");
const slugify = require("slugify");
const Review = require("./reviewModel");
const Tour = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      minLength: [10, "Must have characters more than or equal to 10"],
      maxLength: [40, "Must have characters less than or equal to 40"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "Duration is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    discountedPrice: {
      type: Number,
    },
    ratingsAverage: {
      type: Number,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
      default: null,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      trim: true,
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty must either have value: easy, medium, difficult",
      },
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      trim: true,
    },
    images: [String],
    startDates: [Date],
    secretTour: {
      type: String,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "users", // In ref your have enter model name
      },
    ],
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      description: String,
      address: String,
      coordinates: [Number],
      day: {
        type: Number,
        default: 0,
      },
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        description: String,
        address: String,
        coordinates: [Number],
        day: Number,
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

Tour.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

Tour.virtual("reviews", {
  ref: "reviews",
  foreignField: "tour",
  localField: "_id",
});

Tour.index({ price: 1, ratingsAverage: -1 });
Tour.index({ startLocation: "2dsphere" });

Tour.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Query Middleware

Tour.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

// Embedding guides with tours

Tour.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangeAt",
  });
  next();
});

// Aggregate Middleware

Tour.pre("aggregate", function (next) {
  if (!Object.keys(this.pipeline()[0])[0] === "$geoNear")
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

module.exports = mongoose.model("tours", Tour);
