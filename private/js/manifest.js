/**
 * Create a manifest object and write it into a json file
 * in the repo folder.
 *
 * ROOT: databae/username/reponame/
 *
 * General form of manifest object
 *  - id: store id of this manifest
 *  - command: store the command attached with this manifest
 *  - user: user name
 *  - repo: repo name
 *  - date: date and time of the command
 *  - structure:
 *       + "[leaf folder]/artifact" : relative location to the root
 *
 * Ex: The structure for path: /liam/foo/bar.txt/artifact1.txt
 * "bar.txt/artifact1.txt" : """" (empty string on relative location)
 *
 * Ex: The structure for path: /liam/foo/baz/bar.txt/artifact3.txt
 * "bar.txt/artifact1.txt" : "baz"
 *
 *
 * For master_manifest.json
 * General Form:
 *  "id" : "manifest path"
 * 
 * With: 
 *  - id: auto increment. Higher number = newer manifest.
 *  - manifest path: the path to each manifest of this repo.
 
 */
const fs = require("fs");
const path = require("path");
const util = require("util");
const constants = require("../../server/constants");

// Turn fs.readFile into a promise
const readFilePromise = util.promisify(fs.readFile);

class Manifest {
  constructor(command, pathToRepo) {
    this.pathToRepo = pathToRepo;
    this.command = command;
  }

  // Grab or create the master_manifest.json
  init() {
    try {
      // Grab the master_manifest.json file
      const rawMasterManifest = fs.readFileSync(
        path.join(this.pathToRepo, "master_manifest.json")
      );

      // rawMasterManifest is currently a buffer. So, toString() converts it into a string
      // then JSON converts string into object
      // store that in the manifest object
      this.masterManifest = JSON.parse(rawMasterManifest.toString());

      // Prepare new id for a new manifest file
      this.newID = Object.keys(this.masterManifest).length + 1;

      console.log("Master Manifest File:\n", this.masterManifest);
    } catch (err) {
      // File doesn't exist, create a new master_manifest.json
      // Path of the upcoming master_manifest.json
      const masterJsonPath = path.join(this.pathToRepo, "master_manifest.json");

      // Create master_manifest.json with {}
      fs.writeFileSync(masterJsonPath, "{}");
      if (fs.existsSync(masterJsonPath)) {
        console.log("successfully write master.JSON");

        this.newID = 1; // Set up id for the new manifest file.
      } else {
        console.log("failed to write master JSON");
      }
    }

    // Create a template for a new manifest
    const deconstructedPathToRepo = pathToRepo.split("/");
    const len = deconstructedPathToRepo.length;
    const userName = deconstructedPathToRepo[len - 2];
    const repoName = deconstructedPathToRepo[len - 1];
    const datetime = new Date();
    // console.log(datetime);

    this.manifest = {
      id: this.newID,
      user: userName,
      repo: repoName,
      command: this.command,
      datetime: datetime,
      structure: {}
    };
  }

  // Store artifact path and relative location into this.manifest object
  // Artifact path: [leaf_folder]/[artifact_file]
  // Relative path: from rootRepo
  // Look above for reference
  addToStructure(artifactPath, relPath) {
    this.manifest.structure.artifactPath = relPath;
  }

  complete() {
    // Write manifest file into the manifest folder
    const manifestName = "manifest_" + this.newID.toString() + ".json";
    // console.log(manifestName);
    const newManifestPath = path.join(pathToRepo, "manifests", manifestName);
    try {
      fs.writeFileSync(newManifestPath, JSON.stringify(this.manifest));
      console.log(
        `${manifestName} is successfully written into ${newManifestPath}`
      );
    } catch (err) {
      console.log(err);
    }
  }
}

const pathToRepo = path.join(
  constants.ROOTPATH,
  "database",
  "liam",
  "tic_tac_toe"
);
const test = new Manifest("create Repo", pathToRepo);
test.init();
test.addToStructure("test1", "path1");
test.complete();
