# @ideasonpurpose/build-tools-wordpress

#### Version 2.1.8

[![NPM Version](https://img.shields.io/npm/v/%40ideasonpurpose%2Fbuild-tools-wordpress?logo=npm)](https://www.npmjs.com/package/@ideasonpurpose/build-tools-wordpress)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/ideasonpurpose/build-tools-wordpress/npm-publish.yml?logo=github&logoColor=white)](https://github.com/ideasonpurpose/build-tools-wordpress#readme)

Build scripts and dependencies for IOP's WordPress development environments.

## About This Package

These tools were migrated from our [Docker-based WordPress build tools](https://github.com/ideasonpurpose/docker-build) to speed up development and began the process of moving our build tools away from webpack. Gathering dependencies also simplifies the package.json and configuration files in host projects, making those slightly more manageable.

### Versioned Releases

IOP versions our themes so every release creates a clear rollback snapshot. To accomplish this, every milestone build is generated into a versioned directory. This works well for themes where only one can be active, but fails for plugins where multiple versions can be simultaneously enabled so long as their directory names are different.

To work around this, a `type` property can be added to the config file. When `type` is `plugin`, builds will not add the version to directory names.

### Optional Config

Each project may optionally include an **ideasonpurpose.config.js** file in the same directory as **package.json**. Any settings in this file will override [the defaults](https://github.com/ideasonpurpose/build-tools-wordpress/blob/main/config/ideasonpurpose.config.js).

<!--

- **`src`** - The **source** directory containing source files which should be compiled or transposed. The contents of this directory will be omitted from builds.
- **`dist`** - The **distribution** directory where processed, production-ready files will be output to. All contents of this directory will be included in builds.
- **`src`** - An array of file entry points relative to the `src` directory. Each entry point will generate a like-named output file. All files and assets imported by a given entry point will be accessible from that entry's corresponding output file.

-->

## Local Development

Because this project makes use of bin scripts, conventional `npm link` workflows won't work correctly. To work on this code in a development project, change the project's package.json to install from a local file path, probably something like this:

```json
  "devDependencies": {
    "@ideasonpurpose/build-tools-wordpress": "../../build-tools-wordpress"
  }
```

Running a simple watch script to re-install on changes will make things somewhat seamless:

```sh
cd dev-project-working-dir
npm chokidar-cli "../../build-tools-wordpress/**/*" -c "npm install"
```

### Additional Notes

This project expects an entirely ES Module based environment and specifies all dependencies using standard ESM import syntax. Projects importing this file should set `"type": "module"` in their package.json files.

#### Publishing to [npm](https://www.npmjs.com/package/@ideasonpurpose/build-tools-wordpress)

A GitHub action will auto-publish version-tagged releases to npm. In order to publish, the repository must have an `NPM_TOKEN` secret set with the token from npm. [Log into npmjs.org](https://www.npmjs.com/login) with a publish-authorized account, then find the token page linked from the Profile page sidebar. Generate a new token and update the repository secret.

<!-- START IOP CREDIT BLURB -->

## &nbsp;

#### Brought to you by IOP

<a href="https://www.ideasonpurpose.com"><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/iop-logo-white-on-black-88px.png" height="44" align="top" alt="IOP Logo"></a><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/spacer.png" align="middle" width="4" height="54"> This project is actively developed and used in production at <a href="https://www.ideasonpurpose.com">Ideas On Purpose</a>.

<!-- END IOP CREDIT BLURB -->
```
