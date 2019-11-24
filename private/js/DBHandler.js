/********** IMPORT MODULES **********/
const { fs, path, ROOTPATH, DATABASE_NAME, USERS_FILENAME } = require("./");
/****************************************/

/**
 * This handler allows use to organize all users who using our VSC systems.
 * Features:
 *      - Record all users and their projects path.
 *
 * Format:
 *      username : [
 *         {projectName1 : projectPath1}
 *         {projectName2 : projectPath2}
 *          .....
 *      ]
 */

const DatabaseHandler = () => {
  const usersDBPath = path.join(ROOTPATH, DATABASE_NAME, USERS_FILENAME);

  /** Public Interface **/
  const getUsers = () => {
    if (!isUsersDBPresent()) {
      writeFreshUsersDB();
    }

    return JSON.parse(fs.readFileSync(usersDBPath));
  };

  const addUser = username => {
    // Only add new user
    if (!isUserPresent(username)) {
      const users = getUsers();
      users[username] = [];
      updateUsersDB(users);
    }
  };

  const addProjectForUser = (username, projectName, projectPath) => {
    const users = getUsers();

    if (!isProjectPresent(username, projectName)) {
      users[username].push({
        [projectName]: projectPath
      });

      updateUsersDB(users);
    } else {
      throw new Error("Can't add an existing project");
    }

    updateUsersDB(users);
  };

  const updateProjectPath = (username, projectName, newPath) => {
    const users = getUsers();

    if (isProjectPresent(username, projectName)) {
      const projectList = users[username];
      for (let i = 0; i < projectList.length; i++) {
        filteredList = projectList.filter(project => {
          const [currentProjectName] = Object.keys(project);
          return currentProjectName !== projectName;
        });

        filteredList.push({
          [projectName]: newPath
        });
      }

      users[username] = filteredList;
      updateUsersDB(users);
    } else {
      throw new Error(`${projectName} doesn't exist`);
    }
  };

  const getProjectPath = (username, projectName) => {
    const users = getUsers();

    if (isProjectPresent(username, projectName)) {
      const projectList = users[username];
      for (let i = 0; i < projectList.length; i++) {
        const [currProjectName] = Object.keys(projectList[i]);
        if (currProjectName === projectName) {
          return projectList[i][currProjectName];
        }
      }
    }
  };

  /** Private Functions **/
  const writeFreshUsersDB = () => {
    fs.writeFileSync(usersDBPath, JSON.stringify({}));
  };

  const isUsersDBPresent = () => {
    return fs.existsSync(usersDBPath);
  };

  const updateUsersDB = newUserJSON => {
    fs.writeFileSync(usersDBPath, JSON.stringify(newUserJSON));
  };

  const isUserPresent = username => {
    return Object.keys(getUsers()).includes(username);
  };

  const isProjectPresent = (username, projectName) => {
    const users = getUsers();

    if (isUserPresent(username)) {
      const projectList = users[username];
      for (let i = 0; i < projectList.length; i++) {
        const [currentProjectName] = Object.keys(projectList[i]);
        if (currentProjectName === projectName) {
          return true;
        }
      }
    }
    return false;
  };

  /** RETURN PUBLIC INTERFACE **/
  return {
    getUsers,
    addUser,
    addProjectForUser,
    updateProjectPath,
    getProjectPath
  };
};

module.exports = DatabaseHandler;
