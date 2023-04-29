const AppError = require("../utils/appError");
const User = require("../model/userModel");
const catchAsync = require("../utils/catchError");
const handlerFactory = require("./handlerFactory");
const cloudinary = require("../utils/cloudinary");
const multer = require("multer");

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    console.log("Valid File")
    return cb(null, true);
  } else {
  console.log("Not a valid File")

    return cb(
      new AppError("Not an image! Please upload only images.", 400),
      false
    );
  }
};

const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: multerFilter,
});


exports.uploadUserPhoto = upload.single("image");

exports.hashImageUrl = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  if (req.file.size > 5 * 1024 * 1024)
    return next(
      new AppError(`Please upload a file with size less than 5MB!`, 400)
  );
  const publicId = req.user.publicId;
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "user-images",
    format: "webp",
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face", quality: 90 },
    ],
  });

  req.user.publicId = result.public_id;
  req.user.imageUrl = result.secure_url;
  next();
});


exports.destroyUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.user.publicId) {
    return next(new AppError("User doesn't have any photo", 400));
  }
  await cloudinary.uploader.destroy(req.user.publicId);
  const doc = await User.findByIdAndUpdate(req.user.id, {
    image: process.env.DEFAULT_IMAGE,
    publicId: "",
  });
  res.status(201).json({
    status: "deleted successfully",
  });
});

exports.getAllUser = handlerFactory.getAll(User);
exports.getUser = handlerFactory.getOne(User);
exports.updateUserDetails = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);

exports.getMe = async (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(204).json({
    status: "success",
  });
});

exports.updateEmail = catchAsync(async (req, res, next) => {
  req.body = { email: req.body.email };
  next();
});
