const mongoose = require("mongoose");
require("dotenv").config();
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.mongo_URL)
  .then(() => {
    console.log("Connected To Database");
  })
  .catch((error) => {
    console.log("Error connecting to database", error);
  });
