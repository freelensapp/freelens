# @freelens/jest

This package contains jest configurations and scripts for Lens packages.

## Install

```
$ npm install @freelens/jest
```

## Features

### Package configurations
Shared configurations for minimal duplication.

#### Node

**./packages/<any-package>/jest.config.js**
```javascript
module.exports = require("@freelens/jest").monorepoPackageConfig(__dirname).configForNode;
```

#### React

**./packages/<any-package>/jest.config.js**
```javascript
module.exports = require("@freelens/jest").monorepoPackageConfig(__dirname).configForReact;
```

### Root configuration
You may want to enable testing of packages using single command from root level. This allows you to utilize `jest --watch` between all packages.


**./jest.config.js**
```javascript
module.exports = require("@freelens/jest").monorepoRootConfig(__dirname);
```

### Scripts

#### lens-test
Test package with coverage enforcement. Automatically opens coverage report in case of failure.

**./packages/<any-package>/package.json**
```json
{
 "scripts": {
   "test": "lens-test"
 }         
}
```
