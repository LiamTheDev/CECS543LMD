"use strict";
const fs = require("fs");
const constants = require("../server/constants");
const path = require("path");
const ff = require("../private/js/FolderFunctions");

const manifestSample = {
  id: 1,
  user: "liam",
  repo: "Test_user",
  command: "create",
  datetime: "2019-10-28T23:47:00.008Z",
  structure: [
    {
      artifactNode: "",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/liam/Test_user/Folder 3"
    },
    {
      artifactNode: "testfile2.txt/9976-L17.txt",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/"
    },
    {
      artifactNode: "",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/liam/Test_user/Folder 2"
    },
    {
      artifactNode: "",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/liam/Test_user/Folder 2/Folder 2_2"
    },
    {
      artifactNode: "testfile.txt/7686-L11.txt",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/"
    },
    {
      artifactNode: ".DS_Store/83139171-L8196.DS_Store",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/"
    },
    {
      artifactNode: ".DS_Store/100881779-L10244.DS_Store",
      artifactRelPath:
        "/Users/chinhnguyen/Dropbox/School/CSULB/Master/Fall 2019/543/Project 1/Project/CECS543LMD/database/"
    }
  ]
};

const fileSource = path.join(
  constants.ROOTPATH,
  "database",
  "liam",
  "Test_user",
  "master_manifest.json"
);

const fileDest = path.join(constants.ROOTPATH, "testing", "dest");

function recreateRepo(manifest, targetPath) {
  const { structure } = manifestSample;
  structure.forEach(item => {
    const regrexForFolder = /(?<=database).*/;
    const relativeDestPath = regrexForFolder.exec(item.artifactRelPath)[0];
    const newDestPath = path.join(targetPath, relativeDestPath);

    // Create all the neccessary folders
    ff.makeDir(newDestPath);

    const regrexForFileName = /.+(?=\/)/;
    const fileNameMatches = regrexForFileName.exec(item.artifactNode);

    // If there is a file in the folder
    if (fileNameMatches) {
      // Grab fileName from regrex
      const fileName = fileNameMatches[0];
      const fileSource = path.join(item.artifactRelPath, item.artifactNode);
      const fileDest = path.join(newDestPath);

      fs.copyFileSync(fileSource, fileDest);
    }

    // Empty folder - no file
    // if(fileName === "") {

    // }
  });
}

recreateRepo(manifestSample, fileDest);
