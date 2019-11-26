/********** IMPORT MODULES **********/
const express = require("express");
const { ViewOneUser } = require("../../private/js/View");
const { DB_PATH } = require("../../private/js/");
const path = require("path");
const fs = require("fs");
const Parser = require("./../../private/js/Parser");
/****************************************/

const router = express.Router();

router.get("/:username", function(req, res, next) {
  const username = req.params.username;
  const userPath = path.join(DB_PATH, username);

  // If it's a new user, create a folder in database
  if (!fs.existsSync(userPath)) {
    fs.mkdirSync(userPath, { recursive: true });
  }
  const projList = new ViewOneUser(username).execute().projects;

  res.render("user", {
    username,
    projList
  });
});

router.post("/:username", function(req, res, next) {
  const { commandInput } = req.body;
  const username = req.params.username;
  Parser().commandParse(username, commandInput);

  res.redirect("/user/" + username);
});

module.exports = router;
