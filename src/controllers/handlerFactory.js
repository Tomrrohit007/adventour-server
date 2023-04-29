const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchError");
const APIFeatures = require("../utils/apiFeature");

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let query = {};
    if (req.params.tourId) query = { tour: req.params.tourId };
    const features = new APIFeatures(Model.find(query), req.query)
      .filter()
      .sort()
      .limitFields()
      .pagination();

    const data = await features.query;
    return res.status(200).json({ count: data.length, data });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError(`Document with id /${id}/ not found`, 404));
    }

    res.status(200).json({ status: "success", data: doc });
  });

// Delete one
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id).exec();

    if (!doc) {
      next(new AppError(`Invalid ${Model.modelName.toLowerCase()} ID`, 404));
      return;
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

//Update one
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, {...req.body, image:req.user.imageUrl, publicId:req.user.publicId}, {
      new: true,
      runValidators: true,
    })

    if (!doc) {
      next(new AppError(`Invalid ${Model.modelName.toLowerCase()} ID`, 404));
      return;
    }

    res.status(201).json({
      status: "success",
      data: doc,
    });
  });

// Create One
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    return res
      .status(201)
      .json({ message: "Created Successfully", data: newDoc });
  });

