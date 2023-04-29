require("dotenv").config();

const express = require("express");
const cors = require('cors')
const mongoose = require("mongoose");
const morgan = require("morgan");
const limitReq = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const AppError = require("./src/utils/appError");
const globalErrorControler = require("./src/controllers/globalErrorHandler");
const tourRouter = require("./src/routes/tourRoutes");
const userRouter = require("./src/routes/userRoutes");
const reviewRouter = require("./src/routes/reviewRoute");
const app = express();

process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("UNCAUGHT EXCEPTION! SHUTTING DOWN...");
  process.exit(1);
});

//GLOBAL MIDDLEWARES
app.use(helmet());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same IP
const limiter = limitReq({
  max: 600,
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this user! Please try again after 4hr",
});
app.use(limiter);
app.use(express.json({ limit: "10kb" }));
app.use(cors())
//Prevent noSQL Injection
app.use(mongoSanitize());
//Prevent html code Injection
app.use(xss());
// Clear Duplicate in query
app.use(
  hpp({
    whitelist: [
      "duration",
      "secretTour",
      "name",
      "maxGroupSize",
      "difficulty",
      "ratingsAverage",
      "ratingsQuantity",
      "price",
    ],
  })
);

app.use((req, res, next) => {
  next();
});

app.use("/tours", tourRouter);
app.use("/users", userRouter);
app.use("/reviews", reviewRouter);

// If given route doesn't match with any routes in our app then this middleware will be executed
app.all("*", (req, res, next) => {
  next(
    new AppError(`Cannot find the ${req.originalUrl} route on the server!`, 404)
  );
});

// Global Error Handler
app.use(globalErrorControler);

mongoose.connect(process.env.DATABASE_LOCAL);

const server = app.listen(process.env.PORT, () => {
  console.log("Connected to DB and Listening...");
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION! SHUTTING DOWN....");
  server.close(() => {
    process.exit(1);
  });
});
