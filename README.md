# CECS543LMD

VCS Project for CECS 543 Sec 07 11646

# Intro

A simulated Version Control which allows user to check-in, check-out, merge, label commits.

# Technology

- Node JS
- Express
- Javascript
- Bootstrap

# Authors

Liam Nguyen | Matt Nguyen | Marco Curci | Dennis Lo

# Project Demo

- Live version:
  - Follow GUIDE.
- Manual by terminal:
  - Follow step 1 and 2 of guide
  - Use:
  ```bash
  $ npm run simulation
  ```
  - At each step, manually inspect the file in database or at the terminal log

# Guide

1. Required:

- [Node](https://nodejs.org/en/download/). Node.js v11 or higher is recommended.
- [NPM](https://www.npmjs.com/get-npm). Version 6+ is recommended.
- [PUG](https://pugjs.org/). Version 6+ is recommended.

2. Install all dependencies using [npm install](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install
```

3. On terminal, start server by:

```bash
$ npm start
```

4. Run stimulation:

```bash
$ npm run simulation

Press 1 to run all
```

5. On web broswer, go to URL: [http://localhost:3000/](http://localhost:3000/)

## Structure

```bash
|- database (store repos from users)
|- private (helper JS functions)
|- public (static files)
|- server (store server related files)
	|- routes (store routers)
   	|- app.js (server entry point)
	|- constants.js (stores all constants)
|- tests (store spec files)
|- views (store all template files)
```

## Stand Up Reports

Part 1: [LINK](https://1drv.ms/w/s!AgJrpqI0jWm8gZpljgq3uOegIrgdbQ)

Part 2: [LINK](https://onedrive.live.com/view.aspx?resid=BC698D34A2A66B02!19862&ithint=file%2cdocx&authkey=!APonenOErzhufgc)

Part 3: [LINK](https://1drv.ms/w/s!AgJrpqI0jWm8gZtLdcwpHtGLqwOcFg?e=5Ky85v)
