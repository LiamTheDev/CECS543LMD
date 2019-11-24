const fs = require("fs");
const path = require("path");
const Queue = require("./Queue");
const artifactFile = require("./Artifact");

/* This function reads each file from source folder, create artifact id and copy to target folder */
function copyDirTree(fromPath, toPath) {
  // console.log("(CF) fromPath=" + fromPath + "\n(CF) toPath=" + toPath);

  let struct = [];
  const projectPath = fromPath;

  (function copyDirTreeRec(fromPath, toPath) {
    const queue = new Queue();

    const allFiles = fs.readdirSync(fromPath);
    for (let file of allFiles) {
      queue.enqueue(file);
    }

    while (!queue.isEmpty()) {
      const file = queue.dequeue();

      //Ignore DOT FILE (ex: .DS_STORE)
      if (!/^(?!\.).*$/.test(file)) continue;

      // For Dir file
      if (isDir(fromPath, file)) {
        const sourceFile = path.join(fromPath, file);
        const targetFile = path.join(toPath, file);

        // Create dir at target
        makeDirSync(targetFile);

        struct.push({
          artifactNode: "",
          artifactRelPath: path.normalize(
            path.relative(projectPath, targetFile)
          )
        });

        //Recursive call
        copyDirTreeRec(sourceFile, targetFile);
      } else {
        // For FILE
        const leafFolder = path.join(toPath, file);

        // Create the folder there
        makeDirSync(leafFolder);

        const filePath = path.join(fromPath, file);
        const aID = artifactFile(filePath);

        //Move the file with artifact name
        const aAbsPath = path.join(leafFolder, aID);
        fs.copyFileSync(filePath, aAbsPath);

        // Grab the absolute path from database to the curent artifact
        const aDirPath = path.parse(leafFolder).dir;

        // Add artifact and its path to manifest
        struct.push({
          artifactNode: path.join(file, aID),
          artifactRelPath: path.normalize(path.relative(projectPath, aDirPath))
        });
      }
    }
  })(fromPath, toPath);

  return struct;
}

/**
 * Check if a file from a source is a directory
 */
function isDir(source, fileName) {
  const filePath = path.join(source, fileName);
  return fs.statSync(filePath).isDirectory();
}

/* Function to create a directory if directory is not exists */
function makeDirSync(path, options = { recursive: true }) {
  !fs.existsSync(path) && fs.mkdirSync(path, options);
}

module.exports = {
  copyDirTree,
  isDir,
  makeDirSync
};
