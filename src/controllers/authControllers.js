const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const AppError = require("../utils/appError");
const User = require("../model/userModel");
const Review = require("../model/reviewModel");
const catchAsync = require("../utils/catchError");
const { promisify } = require("util");
const Email = require("../utils/email");

// JWT TOKEN
const jwtToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createTokenAndSend = (user, code, res) => {
  // Data is already stored in DB So we can remove this data to prevent it for sending as a response
  user.active = undefined;
  user.password = undefined;
  user.passwordChangeAt = undefined;

  const token = jwtToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now(process.env.COOKIE_EXPIRES_IN) + 30 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);
  res.status(code).json({
    status: "success",
    token,
    data: user,
  });
};

const sendToken = (user, code, res) => {
  // Data is already stored in DB So we can remove this data to prevent it for sending as a response
  user.active = undefined;
  user.password = undefined;
  user.passwordChangeAt = undefined;

  const token = jwtToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now(process.env.COOKIE_EXPIRES_IN) + 30 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);
  res.status(code).json({
    status: "success",
    token,
  });
};

// SIGN UP
exports.signup = catchAsync(async (req, res, next) => {
  const { name, password, email, confirmPassword, role } = req.body;
  const newUser = await User.create({
    name,
    password,
    email,
    confirmPassword,
  });
  const url = `http://${req.get("host")}/user/me`;

  await new Email(newUser, url).sendWelcome();

  createTokenAndSend(newUser, 201, res);
});

// LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { password, email } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  sendToken(user, 200, res);
});

// Protected Route

exports.protectRoute = catchAsync(async (req, res, next) => {
  const { authorization } = req.headers;
  let token;
  // 1) GET TOKEN
  if (authorization && authorization.startsWith("Bearer")) {
    token = authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please login to get access", 401)
    );
  }

  // 2) VERIFY TOKEN
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to the token doesn't exist anymore", 401)
    );
  }

  // Check if User changed password after login
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(new AppError("The user have changed password recently", 401));
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have the permission to perform this action",
          403
        )
      );
    }
    next();
  };
};

// Forget Password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError(`Not user with /${req.body.email}/ exist`));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateModifiedOnly: true });

  const resetUrl = `http://${req.get(
    "host"
  )}/user/reset-password/${resetToken}`;

  const message = `forget your password submit a patch request with your new password and send it to ${resetUrl}/n If your didn't forget your password please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (Valid for only 10min)",
      message,
    });

    return res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.resetTokenExpiresIn = undefined;
    await user.save({ validateModifiedOnly: true });

    return next(
      new AppError(
        "There is an error while sending a email! Please try again",
        500
      )
    );
  }
});

// RESET THE PASSWORD
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({ passwordResetToken: hashedToken });
  if (!user) {
    return next(new AppError("Token doesn't match or it is expired", 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.resetTokenExpiresIn = undefined;
  await user.save();

  sendToken(user, 200, res);
});

exports.passwordBeforeSaving = catchAsync(async (req, res, next) => {
  if (!req.body.currentPassword) {
    return next(
      new AppError("Current Password is required to perform this action", 401)
    );
  }
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Incorrect current password", 401));
  }
  next();
});

// UPADATE PASSWORD
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { newPassword, confirmNewPassword } = req.body;
  req.user.password = newPassword;
  req.user.confirmPassword = confirmNewPassword;
  await req.user.save();

  sendToken(req.user, 200, res);
});

// Restrict User from modifying other's reviews
exports.restrictUser = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(
      new AppError(`review doesn't exist with /${req.params.id}/ ID!`, 404)
    );
  }
  if (!(review.user.id === req.user.id || req.user.role === "admin")) {
    return next(
      new AppError("You do not have permission to perform this action", 404)
    );
  }
  next();
});

// Check if someone try to change password or changedPassword without authentication
exports.passwordAndEmailCheck = catchAsync(async (req, res, next) => {
  if (
    req.body.password ||
    req.body.confirmPassword ||
    req.body.passwordChangeAt ||
    req.body.email
  ) {
    return next(
      new AppError(
        "To update password or email use /users/update-password/ or /users/update-email/ route",
        404
      )
    );
  }
  if (req.body.role) {
    return next(new AppError("Only admin can update user role", 404));
  }

  next();
});
