/**
 * This file contains functions that manipulate folders and folders' structure.
 */
const fs = require("fs");
const path = require("path");

const createArtifactId = require("./Artifact");
const { Queue } = require("./Queue");

/**
 * Read all files in a particular source and put it in a queue
 * @param source the original path.
 * @param targetFolder the target folder where the folder tree is replicated into.
 */
function copyFolderTree(source, targetFolder, manifestHandler) {
  let fileQueue = new Queue(); //Queue to hold files

  //Add all files to a queue
  const allFiles = fs.readdirSync(source);
  for (let file of allFiles) {
    fileQueue.enqueue(file);
  }

  //Process each element in the queue
  while (!fileQueue.isEmpty()) {
    const fileName = fileQueue.dequeue();

    //Check if fileName is a DOT FILE (ex: .DS_STORE), ignore
    if (!/^(?!\.).*$/.test(fileName)) continue;

    // let date_ob = new Date();

    // The current file is a DIRECTORY
    if (isDirectory(source, fileName)) {
      const dirPath = path.join(source, fileName);
      const newTarget = path.join(targetFolder, fileName);

      // Create the directory in the destination
      makeDir(newTarget);

      // Add """" : dirPath to structure
      manifestHandler.addToStructure("", newTarget);

      //Recursively copy sub folders and files.
      copyFolderTree(dirPath, newTarget, manifestHandler);
    } else {
      // The current file is a FILE
      // Grab the full path of leaf folder
      const leafFolder = path.join(targetFolder, fileName);

      // Create the folder there
      makeDir(leafFolder);

      //Create artifact for the file
      const filePath = path.join(source, fileName);
      const artifact = createArtifactId(filePath);

      //Move the file with artifact name
      const artifactFullPath = path.join(leafFolder, artifact);
      fs.copyFile(filePath, artifactFullPath, err => {
        if (err) throw err;
      });

      // Grab the absolute path from database to the curent artifact
      const fileNameWithoutExtension = /.*(?=\.)/.exec(fileName)[0];
      const regrex = new RegExp(`.*(?=${fileNameWithoutExtension})`);
      const fullArtifactPath = regrex.exec(artifactFullPath)[0];

      // Add artifact and its path to manifest
      manifestHandler.addToStructure(
        path.join(fileName, artifact),
        fullArtifactPath
      );
    }
  }
}

/**
 * Check if a file from a source is a directory
 * @param source  the path of the file
 * @param fileName the name of the file
 * Return: boolean
 */
function isDirectory(source, fileName) {
  const filePath = path.join(source, fileName);
  return fs.statSync(filePath).isDirectory();
}

/**
 * If a directory is not exists, create a new one. Otherwise, do nothing
 * @param path the path of the new folder
 */
function makeDir(path, options = { recursive: true }) {
  !fs.existsSync(path) && fs.mkdirSync(path, options);
}

/* Copy file to a file path */
function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
}

module.exports = {
  copyFolderTree,
  isDirectory,
  makeDir,
  copyFile
};
