const path = require('path');
const fs = require('fs');

const { makeDirSync, makeQueue, isDir } = require('./Functions');
const { ManifestWriter, ManifestReader } = require('./Manifest');
const { MasterManWriter, MasterManReader } = require('./Master');
const { DB_PATH, MANIFEST_DIR, VSC_REPO_NAME, COMMANDS } = require('./');

/**
 * Handling all actions for a project
 */
class ProjectHandler {
  constructor(username) {
    this.username = username;
  }

  /**
   * Add project name to the this instance
   * @param {String} projectName
   * @returns this instance
   */
  forProject(projectName) {
    this.projectName = projectName;
    this.projectPath = path.join(DB_PATH, this.username, projectName);
    this.repoPath = path.join(this.projectPath, VSC_REPO_NAME);
    this.manDirPath = path.join(this.repoPath, MANIFEST_DIR);
    return this;
  }

  /**
   * Create action
   * @returns void
   */
  create() {
    // Create all necessary folder at the target repo
    fs.mkdirSync(path.join(this.repoPath, MANIFEST_DIR), { recursive: true });

    // Get handlers
    const manWriter = new ManifestWriter(this.username, this.projectName);
    const masManWriter = new MasterManWriter(this.username, this.projectName);

    // Build and write a manifest
    const newMan = manWriter
      .addCommand(COMMANDS.CREATE)
      .addParent()
      .addStructure()
      .write();

    // Add new manifest to master manifest
    masManWriter.addNewMan(newMan);
  }

  /**
   * Remove a project of a user
   * @returns void
   */
  remove() {
    fs.rmdirSync(this.projectPath, { recursive: true });
  }

  /**
   * Label a manifest
   * @param {Number} manID manifest's ID
   * @param {String} label
   * @returns void
   */
  label(manID, label) {
    const masManWriter = new MasterManWriter(this.username, this.projectName);
    masManWriter.addLabel(manID, label);
  }

  /**
   * Check-in action
   * @param {String=} projPath the path to the project
   * @returns void
   */
  checkin(projPath = this.projectPath) {
    projPath = projPath || this.projectPath;

    // Get handlers
    const manWriter = new ManifestWriter(this.username, this.projectName);
    const masManWriter = new MasterManWriter(this.username, this.projectName);
    const masManReader = new MasterManReader(this.username, this.projectName);

    // Get artifacts
    const artifactsList = this._checkinProjectTree(projPath, this.repoPath);

    // Get HEAD manifest ID
    const head = masManReader.getHead();

    // Write manifest
    const newMan = manWriter
      .addCommand(COMMANDS.CHECKIN)
      .addParent({ parentID: head, parentPath: this.manDirPath })
      .addStructure(artifactsList)
      .write();

    // Update master manifest
    masManWriter.addNewMan(newMan);
  }

  /**
   * Check-out action
   * @param {String} sUsername from username
   * @param {String} sProjectName from project name
   * @param {Number} sID from manifest ID or label
   * @throws Error if master manifest doesn't exist
   * @returns void
   */
  checkout(sUsername, sProjectName, sID) {
    // Initialize all handlers
    const tManWriter = new ManifestWriter(this.username, this.projectName);
    const sManReader = new ManifestReader(sUsername, sProjectName);
    const tMasManWriter = new MasterManWriter(this.username, this.projectName);

    // Attempt to get manifest
    const sMan = sManReader.getMan(sID);

    // Create all necessary folder
    fs.mkdirSync(this.manDirPath, { recursive: true });

    // Checkout files
    const sProjectPath = path.join(DB_PATH, sUsername, sProjectName);
    const sArtifactList = sMan.structure || [];

    sArtifactList.forEach(artifact => {
      this._checkoutArtifact(artifact, sProjectPath);
    });

    const artifactsList = this._checkinProjectTree(
      this.projectPath,
      this.repoPath
    );

    // Build and write a manifest
    const newMan = tManWriter
      .addCommand(COMMANDS.CHECKOUT)
      .addParent({
        parentID: sMan.id,
        parentPath: path.join(sManReader.repoPath, MANIFEST_DIR)
      })
      .addStructure(artifactsList)
      .write();

    // Add new manifest to master manifest
    tMasManWriter.addNewMan(newMan);
  }

  /**
   * Remove a project of a user
   * @returns void
   */
  remove() {
    fs.rmdirSync(this.projectPath, { recursive: true });
  }

  /**
   * Merge Out action
   * @param {String} sUsername source username
   * @param {Number | String} sID source manifest ID or label
   * @param {Number | String} tID target manifest ID or label
   */
  mergeOut(sUsername, sID, tID) {
    // Get all handlers
    const tManifestWriter = new ManifestWriter(this.username, this.projectName);
    const tManifestReader = new ManifestReader(this.username, this.projectName);
    const tMasManWriter = new MasterManWriter(this.username, this.projectName);
    const sManReader = new ManifestReader(sUsername, this.projectName);

    // Get manifests using identifications
    const tManifest = tManifestReader.getMan(tID);
    const sManifest = sManReader.getMan(sID);

    // Get conflicted file list
    const movedFileList = this._mergeOutOperation(
      sUsername,
      sManifest.id,
      tManifest.id
    );

    const parentList = [
      {
        parentID: sManifest.id,
        parentPath: path.join(
          DB_PATH,
          sUsername,
          this.projectName,
          VSC_REPO_NAME,
          MANIFEST_DIR
        )
      },
      {
        parentID: tManifest.id,
        parentPath: path.join(
          DB_PATH,
          this.username,
          this.projectName,
          VSC_REPO_NAME,
          MANIFEST_DIR
        )
      }
    ];

    // Write new manifest
    const newMan = tManifestWriter
      .addCommand(COMMANDS.MERGE_OUT)
      .addParent(...parentList)
      .addStructure(movedFileList)
      .write();

    // Add manifest to master manifest
    tMasManWriter.addNewMan(newMan);
  }

  /**
   * Merge in action
   */
  mergeIn() {
    // Get all handlers
    const manReader = new ManifestReader(this.username, this.projectName);
    const manWriter = new ManifestWriter(this.username, this.projectName);
    const masManReader = new MasterManReader(this.username, this.projectName);
    const masManWriter = new MasterManWriter(this.username, this.projectName);

    const headID = masManReader.getHead();
    const manifest = manReader.getMan(headID);

    // Check if the head manifest is a merge-out
    if (manifest.command !== COMMANDS.MERGE_OUT)
      throw new Error('Previous manifest was not a merge out');

    // Check if conflicted files have been fixed
    if (!this._hasUserFixedMergeOut(manifest.structure)) {
      throw new Error('Please fix all conflict files before merge in');
    }

    const artifactsList = this._checkinProjectTree(
      this.projectPath,
      this.repoPath
    );
    const head = masManReader.getHead();

    // Write manifest
    const newMan = manWriter
      .addCommand(COMMANDS.MERGE_IN)
      .addParent({ parentID: head, parentPath: this.manDirPath })
      .addStructure(artifactsList)
      .write();

    // Update master manifest
    masManWriter.addNewMan(newMan);
  }

  /***************************** Private functions ****************************/

  /***************************** MERGE OUT*****************************/
  /**
   * Check if user has fix all conflicts after merge out
   * @param {Array} fileList list of all path to conflicts file [{source, target, ancestor}]
   * @returns {Boolean} true if there is still file with _mt OR _mg OR _mr. False otherwise
   */
  _hasUserFixedMergeOut(fileList) {
    fileList = fileList || [];

    for (let i = 0; i < fileList.length; i++) {
      const list = fileList[i];
      const filePaths = Object.values(list);

      for (let j = 0; j < filePaths.length; j++) {
        const file = filePaths[j];
        if (fs.existsSync(file)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Carry out merge-out operation
   * @param {String} sUsername
   * @param {Number | String} sManifestID Source's manifest ID or label
   * @param {Number | String} tManifestID Target's manifest ID or label
   * @returns {Array} an array of all conflicted files
   */
  _mergeOutOperation(sUsername, sManifestID, tManifestID) {
    const sourceProjectPath = path.join(DB_PATH, sUsername, this.projectName);

    const sManifestPathList = this._getParentList(
      sourceProjectPath,
      sManifestID
    );
    const tManifestPathList = this._getParentList(
      this.projectPath,
      tManifestID
    );

    const gManifestID = this._commonAncestor(
      sManifestPathList,
      tManifestPathList
    );

    // Get readers for souce user and target user
    const sManifestReader = new ManifestReader(sUsername, this.projectName);
    const gManifestReader = new ManifestReader(sUsername, this.projectName);
    const tManifestReader = new ManifestReader(this.username, this.projectName);

    // Get all manifests
    const sManifest = sManifestReader.getMan(sManifestID);
    const tManifest = tManifestReader.getMan(tManifestID);

    const conflictList = this._gatherConflicts(sManifest, tManifest);
    // Include artifact from ancestor manifest
    conflictList.map(conflict => {
      const fileName = conflict.source.artifactNode.split(path.sep)[0];
      const filePath = conflict.source.artifactRelPath;
      const gArtifact = gManifestReader.getArtifact(
        fileName,
        filePath,
        gManifestID
      );

      return (conflict.ancestor = gArtifact);
    });

    const movedFileList = [];
    conflictList.forEach(conflict => {
      const sourceInfo = conflict.source;
      const ancestorInfo = conflict.ancestor;
      const targetInfo = conflict.target;
      const filename = sourceInfo.artifactNode.split(path.sep)[0];

      const sourceArtifactPath = path.join(
        sourceProjectPath,
        VSC_REPO_NAME,
        sourceInfo.artifactRelPath,
        sourceInfo.artifactNode
      );

      const ancestorArtifactPath = path.join(
        sourceProjectPath,
        VSC_REPO_NAME,
        ancestorInfo.artifactRelPath,
        ancestorInfo.artifactNode
      );
      const targetFilePath = path.join(
        this.projectPath,
        targetInfo.artifactRelPath,
        filename
      );

      const movedFile = this._mergeOutMoveFile(
        sourceArtifactPath,
        ancestorArtifactPath,
        targetFilePath
      );

      movedFileList.push(movedFile);
    });

    console.log('Please resolve these conflicts: ');
    console.log(movedFileList);
    return movedFileList;
  }

  /**
   * Get ancestor list of a particular manifest
   * @param {String} projectPath the absolute path of a project
   * @param {Number} manifestID manifest ID
   * @returns {Array} return an array of ancestry manifest ID
   */
  _getParentList(projectPath, manifestID) {
    // Using PathObj now but will change to use this.path
    let paths = []; // Array that will hold all paths
    let queue = new makeQueue();
    queue.enqueue({
      manifestID: manifestID,
      startingArr: [],
      startingPath: projectPath
    });

    while (!queue.isEmpty()) {
      let pathObj = queue.dequeue();
      manifestID = pathObj.manifestID;
      projectPath = pathObj.startingPath;

      let targetPath = projectPath.split(VSC_REPO_NAME)[0];
      // console.log(targetPath);
      targetPath = path.join(targetPath, VSC_REPO_NAME, MANIFEST_DIR);
      let targetParentList = pathObj.startingArr.concat(manifestID);

      // Read First Manifest file
      let manifestData = JSON.parse(
        fs.readFileSync(path.join(targetPath, manifestID.toString() + '.json'))
      );
      // Grab first Parent
      let curParent = manifestData.parent[0].parentID;
      let parentPath = manifestData.parent[0].parentPath;

      // While a parent exists
      while (curParent != null) {
        targetParentList.push(curParent);
        manifestData = JSON.parse(
          fs.readFileSync(path.join(parentPath, curParent.toString() + '.json'))
        );

        if (
          !manifestData.hasOwnProperty('parent') ||
          manifestData.parent.length === 0
        ) {
          curParent = null;
          break;
        }

        switch (manifestData.command) {
          case COMMANDS.MERGE_OUT: // 2 Parents
            parentPath = manifestData.parent[0].parentPath;
            curParent = manifestData.parent[0].parentID;

            let mergePath = manifestData.parent[1].parentPath;
            let mergeParent = manifestData.parent[1].parentID;
            queue.enqueue({
              manifestID: mergeParent,
              startingArr: targetParentList.slice(),
              startingPath: mergePath
            });
            break;
          default:
            // Regular commit/checkin
            parentPath = manifestData.parent[0].parentPath;
            curParent = manifestData.parent[0].parentID;
        }
      }
      paths.push(targetParentList);
    }
    return paths;
  }

  /**
   * Find the most recent common ancestor ID between two arrays
   * @param {Array} targetArr An array of array of ancestry manifest ID of target
   * @param {Array} sourceArr An array of array of ancestry manifest ID of source
   * @returns {Number} the most common ancestor manifest ID
   */
  _commonAncestor(targetArr, sourceArr) {
    let result = [];
    targetArr.forEach(pathArr => {
      sourceArr.forEach(sourceArr => {
        result.push(this._commonAncestorBetweenTwoList(pathArr, sourceArr));
      });
    });
    return Math.max(...result);
  }

  /**
   * Find the most recent common ancestor ID between two manifests
   * @param {Number} targetList an array of target ancestry manifest ID
   * @param {Number} sourceList an array of source ancestry manifest ID
   * @return {Number} most recent common ancestor manifest ID
   */
  _commonAncestorBetweenTwoList(targetList, sourceList) {
    for (let i = 0; i < targetList.length; i++) {
      if (sourceList.includes(targetList[i])) {
        return targetList[i];
      }
    }
    throw new Error('Unable to find common ancestor');
  }

  /**
   * Find conflicts between two manifests. A conflict occurs when same file name with extension but different artifact ID at the same directory.
   * @param {JSON} mania first manifest JSON
   * @param {JSON} manib second manifest JSON
   * @returns {Array} an array of objects with the format {source : {artifactNode, artifactRelPath}, target: {artifactNode, artifactRelPath}}
   */
  _gatherConflicts(mania, manib) {
    const ssmallfilelist = [];
    const sfilelist = [];
    const sfolderlist = [];
    const sinfolder = [];
    let filename;

    for (let prop in mania.structure) {
      let structure = mania.structure[prop];
      sfilelist.push(mania.structure[prop]);
      filename = structure.artifactNode;
      ssmallfilelist.push(filename);
      sinfolder.push(structure.artifactRelPath);

      let tar = filename.lastIndexOf('/');
      let file = filename.substring(0, tar);
      sfolderlist.push(file);
    }

    const tsmallfilelist = [];
    const tfilelist = [];
    const tfolderlist = [];
    const tinfolder = [];

    for (let prop in manib.structure) {
      let structure = manib.structure[prop];
      tfilelist.push(manib.structure[prop]);
      filename = structure.artifactNode;
      tsmallfilelist.push(filename);
      tinfolder.push(structure.artifactRelPath);

      let tar = filename.lastIndexOf('/');
      let file = filename.substring(0, tar);
      tfolderlist.push(file);
    }

    let conflict = 0;
    let data = [];
    for (const [key, value] of Object.entries(sfolderlist)) {
      let tkey = tfolderlist.indexOf(value);

      if (
        tsmallfilelist[tkey] != ssmallfilelist[key] &&
        tinfolder[tkey] == sinfolder[key] &&
        key in ssmallfilelist &&
        tkey in tsmallfilelist
      ) {
        data.push({
          source: sfilelist[key],
          target: tfilelist[tkey]
        });

        conflict++;
      }
    }
    return data;
  }
  /**
   * During merge out, move file from source's repo path and grandma's repo path to target project directory
   *    of target file
   * @param {String} rPath source's absolute artifact path
   * @param {String} gPath grandma's absolute artifact path
   * @param {String} tPath target's file in project tree
   * @returns void
   */
  _mergeOutMoveFile(rPath, gPath, tPath) {
    // Parent directory of tPath
    let targetDirectory = path.dirname(tPath);
    // Set filenames to variables
    const fileName = path.basename(tPath);
    // Save file extensions for later
    const extension = path.extname(tPath);

    // Append _mr or _mg or _mt to the duplicated filenames
    const rFilePath = path.join(
      targetDirectory,
      fileName.replace(/\.[^/.]+$/, '') + '_mr' + extension
    );
    const gFilePath = path.join(
      targetDirectory,
      fileName.replace(/\.[^/.]+$/, '') + '_mg' + extension
    );
    const tFilePath = path.join(
      targetDirectory,
      fileName.replace(/\.[^/.]+$/, '') + '_mt' + extension
    );

    // Move file from source repo to target project tree
    fs.copyFileSync(rPath, rFilePath);
    // // Move file from ancestor repo to target project tree
    fs.copyFileSync(gPath, gFilePath);
    // Add  _mt filename of file at target folder tree
    fs.renameSync(tPath, tFilePath);

    return {
      fromSource: rFilePath,
      fromAncestor: gFilePath,
      fromTarget: tFilePath
    };
  }
  /***************************** CHECK-OUT *****************************/
  /**
   * During checkout, turn artifact from source's repo to a file in target project tree
   * @param {JSON} artifact artifact object {artifactNode, artifactRelPath}
   * @param {String} sProjectPath source's project path
   * @returns void
   */
  _checkoutArtifact(artifact, sProjectPath) {
    const dirPath = path.join(this.projectPath, artifact.artifactRelPath);
    fs.mkdirSync(dirPath, { recursive: true }); // Recursively make directories at the destination

    if (artifact.artifactNode !== '') {
      const fullFilePathFromSource = path.join(
        sProjectPath,
        VSC_REPO_NAME,
        artifact.artifactRelPath,
        artifact.artifactNode
      );
      const fileName = artifact.artifactNode.split(path.sep)[0];
      fs.copyFileSync(fullFilePathFromSource, path.join(dirPath, fileName));
    }
  }

  /***************************** CHECK-IN *****************************/
  /**
   * For each file in project path, compute artifact ID, change filename to artifact ID and move it to the provided repo path
   * @param {*} projPath source project path that the files are evaluated.
   * @param {*} toPath the repo path where the artifact's parent directory and itself will be stored.
   * @returns void
   */
  _checkinProjectTree(projPath, toPath) {
    let struct = [];
    const repoPath = path.join(projPath, VSC_REPO_NAME);
    const _createArtifactID = this._createArtifactID; //_createArtifactID is not visible in _checkinProjectTreeRec

    (function _checkinProjectTreeRec(projPath, toPath) {
      const queue = makeQueue(); // create a new queue to store pending files/dirs

      // Add all files/dirs from project path to queue
      const allFiles = fs.readdirSync(projPath);
      for (let file of allFiles) {
        queue.enqueue(file);
      }

      while (!queue.isEmpty()) {
        const file = queue.dequeue();
        if (!/^(?!\.).*$/.test(file)) continue; //Ignore DOT FILE (ex: .DS_STORE)

        // For Dir
        if (isDir(projPath, file)) {
          const sourceFile = path.join(projPath, file);
          const targetFile = path.join(toPath, file);

          // Create dir at target
          makeDirSync(targetFile);

          struct.push({
            artifactNode: '',
            artifactRelPath: path.normalize(path.relative(repoPath, targetFile))
          });

          //Recursive call
          _checkinProjectTreeRec(sourceFile, targetFile);
        } else {
          // For file
          const leafFolder = path.join(toPath, file);

          // Create the folder there
          makeDirSync(leafFolder);

          const filePath = path.join(projPath, file);
          const aID = _createArtifactID(filePath); // compute artifact ID

          //Move the file with artifact name
          const aAbsPath = path.join(leafFolder, aID);
          fs.copyFileSync(filePath, aAbsPath);

          // Grab the absolute path from database to the current artifact
          const aDirPath = path.parse(leafFolder).dir;

          // Add artifact and its path to manifest
          struct.push({
            artifactNode: path.join(file, aID),
            artifactRelPath: path.normalize(path.relative(repoPath, aDirPath))
          });
        }
      }
    })(projPath, toPath);

    return struct;
  }

  /**
   * Compute artifact ID from file's content
   * @param {String} filePath full path to file
   * @returns {Number} artifact ID of the file
   */
  _createArtifactID(filePath) {
    // Read the file and grab the extension
    let data = fs.readFileSync(filePath, 'utf8');
    let ext = filePath.substring(filePath.lastIndexOf('.'));
    let weights = [1, 3, 7, 11, 13];
    const len = data.length;
    let weight;
    let sum = 0;

    // Creating the checksum using the ASCII numeric by multiplying character by the weights
    for (let i = 0; i < len; i++) {
      weight = i % weights.length;
      sum += data.charCodeAt(i) * weights[weight];
    }

    // Cap so the sum doesn't grow too large
    sum = sum % (Math.pow(2, 31) - 1);
    let artifactName = `${sum}-L${len}${ext}`;
    return artifactName;
  }
}

module.exports = {
  ProjectHandler
};
