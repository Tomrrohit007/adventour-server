const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const validator = require("validator");

const User = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "name is required"],
    maxLength: [50, "name should be upto 50 characters"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: [true, "email should be unique"],
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  image: {
    type: String,
    default:process.env.DEFAULT_IMAGE
  },
  publicId:{
    type:String,
  },
  role: {
    type: String,
    enum: ["admin", "user", "guide", "lead-guide"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "A password is required"],
    minLenght: [8, "A password must have minimum length of 8 characters"],
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, "A password is required"],
    minLenght: [8, "A password must have minimum length of 8 characters"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      messsage: "Passwords doesn't match",
    },
  },
  passwordChangeAt: {
    type: Date,
  },
  passwordResetToken: String,
  resetTokenExpiresIn: Date,
  active: {
    type: Boolean,
    select: false,
    default: true,
  },
});

// Encrypting Password
User.pre("save", async function (next) {
  // Checking if password is being modified
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.confirmPassword = undefined;
  next();
});

// Adding Property to find out When Last time user password was changed
User.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) {
    next();
  }
  this.passwordChangeAt = Date.now() - 2000;
});

// Filtering out Deactivated Users

User.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Checking if login password is correct
User.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Checking if Password was changed after user logged in
User.methods.changePasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangeAt) {
    const changedTimestamp = this.passwordChangeAt.getTime() / 1000;
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

//Creating Password reset token
User.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetTokenExpiresIn = Date.now() + 600000;
  return resetToken;
};

module.exports = mongoose.model("users", User);
