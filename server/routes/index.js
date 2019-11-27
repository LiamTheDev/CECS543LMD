const express = require("express");

const router = express.Router();

router.get("/", function(req, res, next) {
  return res.render("index");
});

router.post("/", function(req, res) {
  const username =
    req.body.username === "" ? "johndoe" : req.body.username.toLowerCase();

  res.redirect("/user/" + username);
});

router.get("/test", function(req, res, next) {
  var json = numberOfConflict(
    "/Users/dennislo/Desktop/git/school/CECS543LMD/database/dennis2/py2/manifests/manifest_3.json",
    "/Users/dennislo/Desktop/git/school/CECS543LMD/database/dennis2/py2/manifests/manifest_1.json"
  );
  console.log(json);
});

module.exports = router;
