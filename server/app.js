const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const logger = require("morgan");

const PORT = 3000;

const app = express();

const index = require("./routes/");
const user = require("./routes/user");
const users = require("./routes/users");

// Set up middlewares
app.set("view engine", "pug");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public"))); // Serve static files
app.use(logger("dev"));

// Routings
app.use("/", index);
app.use("/user", user);
app.use("/users", users);
app.use(function(err, req, res, next) {
  console.log(err);
  res.render("error", { err });
});

// Entry point
app.listen(PORT, () => console.log("Listening..."));
