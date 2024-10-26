# Freelens

## The Repository

This repository is a fork of [Open Lens](https://github.com/freelensapp/freelens/tree/master), core of [Lens Desktop](https://k8slens.dev), with the aim of carrying forward its open source version.

Freelens is a standalone application for MacOS, Windows and Linux operating systems.
Below is a screenshot and video from the original Open Lens repository.

![Screenshot](.github/screenshot.png)

### Release download

Actually you can download a release from the project nightly builds repository:
https://github.com/freelensapp/freelens-nightly-builds/releases

### Node-Pod-Menu extension

To view container logs and shell into them and nodes you can install the very useful extension [freelens-node-pod-menu](https://github.com/freelensapp/freelens-node-pod-menu)

### Prequisites

Use [NVM](https://github.com/nvm-sh/nvm) or
[mise-en-place](https://mise.jdx.dev/) to install required Node.js version.

From the root of this repository:

```sh
nvm install
# or
mise install
```

### Build app

```sh
npm ci
npm run build
npm run build:app
```

At this point, for example on Windows, simply go to the
"freelens\freelens\dist\win-unpacked" directory and run Freelens.exe.

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

Copyright (c) 2024 Freelens Authors.

Copyright (c) 2022 OpenLens Authors.

[MIT License](https://opensource.org/licenses/MIT)
