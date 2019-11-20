const fs = require("fs");
const path = require("path");
const InfoHandler = require("./InfoHandler");
const ManifestHandler = require("./ManifestHandler");
const { copyFolderTreeWithMemoization, makeDir } = require("./FolderFunctions");
const {
  VSC_REPO_NAME,
  MANIFEST_DIR,
  COMMANDS,
  MASTER_MANIFEST_NAME
} = require("../../constants");

/* RepoHandler handles all methods regarding repos. */
module.exports = class RepoHandler {
  constructor(username, repoName, projectPath) {
    console.log("(RH) projectPath=" + projectPath);

    // Store all properties regarding about the current repo
    this.repo = {
      username,
      repoName,
      projectPath
    };
  }

  /* Utility functions
   *******************/
  create() {
    // Setup repo and manifest folder
    fs.mkdirSync(
      path.join(this.repo.projectPath, VSC_REPO_NAME, MANIFEST_DIR),
      {
        recursive: true
      }
    );

    // Create a new manifest handler
    const manifestHandler = this.getNewManifestHandler();
    // Add command to new manifest
    manifestHandler.addCommand(COMMANDS.CREATE);
    // manifestHandler.write() returns id and path of the newly created manifest.
    const { manifestID, manifestPath } = manifestHandler.write();

    console.log(
      "(create), manifestID=" + manifestID + ", manifestPath=" + manifestPath
    );

    // Initialize and write info.json
    const infoHandler = this.getNewInfoHandler();

    // Write an default info.json first
    infoHandler.write();

    // Update the info.json with the new manifest
    infoHandler.addManifest(manifestID, manifestPath);
  }

  addLabel(manifestID, label) {
    const infoHandler = this.getNewInfoHandler();
    infoHandler.addLabel(manifestID, label);
  }

  checkin() {
    const infoHandler = this.getNewInfoHandler();

    // The manifestID in the head will be the parent of this new checkin manifest.
    const parentID = infoHandler.getCurrentHead();

    console.log("(checkin) parentID=" + parentID);

    const manifestHandler = this.getNewManifestHandler();
    // Add command to manifest handler
    manifestHandler.addCommand(COMMANDS.CHECKIN);

    // Copy folder tree to repo
    const folderStructure = copyFolderTreeWithMemoization(
      this.repo.projectPath,
      path.join(this.repo.projectPath, VSC_REPO_NAME)
    );

    // Add the structure into the manifest.
    manifestHandler.addStructure(folderStructure);

    // Write the manifest into the file system. Attach the parentID to that manifest
    const { manifestID, manifestPath } = manifestHandler.write(parentID);

    // Update the info.json with the new manifest
    infoHandler.addManifest(manifestID, manifestPath);
  }

  checkout(sourceProjectPath, manifestID) {
    const pathToSourceRepo = path.join(sourceProjectPath, VSC_REPO_NAME);

    console.log("(check-out) pathToSourceRepo=" + pathToSourceRepo);

    const manifestHandler = this.getNewManifestHandler();
    manifestHandler.addCommand(COMMANDS.CHECKOUT);

    // Grab info.json from source
    const manifestObject = this.getManifestObject(pathToSourceRepo, manifestID);
    console.log("(check-out) manifestObject=" + JSON.stringify(manifestObject));

    // Copy source file into the checkout folder
    manifestObject.structure.forEach(artifact =>
      this.checkoutArtifact(artifact, sourceProjectPath)
    );
    // Copy the structure that uses to checkout
    manifestHandler.addStructure(manifestObject.structure);

    // Setup repo and manifest folder
    fs.mkdirSync(
      path.join(this.repo.projectPath, VSC_REPO_NAME, MANIFEST_DIR),
      {
        recursive: true
      }
    );

    manifestHandler.addCheckoutFrom(sourceProjectPath);

    // Write a new manifest into file with the parentID = manifestID from parameter
    manifestHandler.write(manifestID);
  }

  /* Helper functions
   *******************/
  getManifestObject(pathToSourceRepo, manifestID) {
    const sourceRepoInfoObject = JSON.parse(
      fs.readFileSync(path.join(pathToSourceRepo, MASTER_MANIFEST_NAME))
    );

    const manifestList = sourceRepoInfoObject.manifests;

    console.log(
      "(getManifestObject), manifestList=" + JSON.stringify(manifestList)
    );

    let manifestPath;
    for (let i = 0; i < manifestList.length; i++) {
      console.log(
        "(getManifestObject), manifestList[i].manifestID=" +
          manifestList[i].manifestID +
          ", manifestID=" +
          manifestID
      );
      if (manifestList[i].manifestID === manifestID) {
        manifestPath = manifestList[i].manifestPath;
      }
    }

    console.log("(getManifestObject), manifestPath=" + manifestPath);

    return JSON.parse(fs.readFileSync(manifestPath));
  }

  getNewManifestHandler() {
    return new ManifestHandler(
      this.repo.username,
      this.repo.repoName,
      path.join(this.repo.projectPath, VSC_REPO_NAME, MANIFEST_DIR)
    );
  }

  getNewInfoHandler() {
    return new InfoHandler(
      this.repo.username,
      this.repo.repoName,
      path.join(this.repo.projectPath, VSC_REPO_NAME)
    );
  }

  getHeadManifestID() {
    return this.getNewInfoHandler().getCurrentHead();
  }

  checkoutArtifact(artifact, sourceProjectPath) {
    const escapedFileName = this.escapeRegExp(artifact.artifactNode);

    // Append the folder path with the new target path
    const newDestPath = path.join(
      this.repo.projectPath,
      artifact.artifactRelPath
        .split("/")
        .slice(2)
        .join("/") // exclude /repo
    );
    console.log("(checkout-Artifact), newDestPath=", newDestPath);

    // Recursively make folders in the destination
    makeDir(newDestPath);

    // Regrex to get the filename from leaf folder
    const regrexForFileName = /.+(?=\/)/;
    // If no match, return null
    const fileNameMatches = regrexForFileName.exec(artifact.artifactNode);

    // If there is a file in the repo folder
    if (fileNameMatches) {
      // Grab fileName from regrex
      const fileName = fileNameMatches[0];

      // Get full file path from source
      const fileSource = path.join(
        sourceProjectPath,
        artifact.artifactRelPath,
        artifact.artifactNode
      );

      // Create the folder
      makeDir(newDestPath);

      // Copy the file
      fs.copyFileSync(fileSource, path.join(newDestPath, fileName));
    }
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  }
};
