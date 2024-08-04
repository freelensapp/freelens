# Freelens

## The Repository

This repository is a fork of [Open Lens](https://github.com/lensapp/lens/tree/master), core of [Lens Desktop](https://k8slens.dev), with the aim of carrying forward its open source version.

Freelens is a standalone application for MacOS, Windows and Linux operating systems.
Below is a screenshot and video from the original Open Lens repository.

[![Screenshot](.github/screenshot.png)](https://www.youtube.com/watch?v=eeDwdVXattc)

### Prequisites

* Nodejs v16 || v18

### Build app

```sh
npm run all:install
npm run build
npm run build:app
```

At the moment tested only on Windows 10 with Node.js 18, we soon want to re-establish the various workflows including automatic release, fixing security alerts, use of github issues, projects, wikis etc..

## Development

The primary aim is currently to maintain the current open source code with its functionality and fix bugs.

### Run app

To run app in developer's mode:

```sh
npm run start-dev
```

## Contributing

Anyone is welcome to collaborate to advance the Freelens project.

## License

This source code is available to everyone under the [MIT license](./LICENSE).
