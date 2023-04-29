const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Tour = require("../src/model/tourModel");
const Review = require("../src/model/reviewModel");
const User = require("../src/model/userModel");
const cloudinary = require("cloudinary").v2;

dotenv.config({ path: "../.env" });

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Set up Cloudinary configuration

mongoose
  .connect(process.env.DATABASE_LOCAL)
  .then(() => console.log("DB connection successful!"));

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf-8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, "utf-8")
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log("Data successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("Data successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};


// Upload tour cover images
const uploadImages = async () => {
  try {
    const documents = await Tour.find();
    await Promise.all(
      documents.map(async (document) => {
        const imagePath = `../public/img/tours/${document.imageCover}`;
        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(imagePath, {
          public_id: `cover/${document.imageCover.split('.')[0]}`,
          folder: "tour-images",
          format: "webp",
          transformation: [{ width: 1000, height: 666, quality: 90 }],
        });
        await Tour.findByIdAndUpdate(document._id, {
          $set: { imageCover: result.secure_url },
        })

        console.log(`Uploaded ${imagePath} to ${result.secure_url}`);
      })
    );
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

// upload tours image array
const uploadMultipleImages = async () => {
  try {
    const documents = await Tour.find();
    const promises = documents.map(async (document) => {
      const images = await Promise.all(
        document.images.map(async (eachImage) => {
          const imagePath = `../public/img/tours/${eachImage}`;
          const result = await cloudinary.uploader.upload(imagePath, {
            public_id: `images/${eachImage.split('.')[0]}`,
            folder: "tour-images",
            format: "webp",
            transformation: [
              {
                width: 500,
                height: 333,
                quality: 90,
              },
            ],
            timeout: 3600 * 1000,
          });
          return result.secure_url;
        })
      );
      await Tour.findByIdAndUpdate(document._id, { $set: { images } });
      console.log(`Uploaded ${document.images} to ${images}`);
    });
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

// upload user images
const userImages = async () => {
  try {
    const documents = await User.find();
    await Promise.all(
      documents.map(async (document, i) => {
        const imagePath = `../public/img/users/user-${i + 1}.jpg`;
        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(imagePath, {
          public_id: `user-${i+1}`,
          folder: "user-images",
          format: "webp",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face", quality: 90 },
          ],
        })

        await User.findByIdAndUpdate(document._id, {
          $set: { image: result.secure_url, publicId:result.public_id },
        })

        console.log(`Uploaded ${imagePath} to ${result.secure_url}`);
      })
    );
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
} else if (process.argv[2] === "--tour-upload") {
  uploadImages();
} else if (process.argv[2] === "--tour-upload-all") {
  uploadMultipleImages();
} else if (process.argv[2] === "--user-upload") {
  userImages();
}

