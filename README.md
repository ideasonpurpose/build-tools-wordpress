# @ideasonpurpose/build-tools-wordpress

#### Version 1.1.9

![NPM Version](https://img.shields.io/npm/v/%40ideasonpurpose%2Fbuild-tools-wordpress?logo=npm)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/ideasonpurpose/build-tools-wordpress/npm-publish.yml?logo=github&logoColor=white)

Build scripts and dependencies for IOP's WordPress development environments.

## Config

Each project should have an **ideasonpurpose.config.js** file in the same directory as **package.json**. This file should export an object with at least three properties set:

- **`src`** - The **source** directory containing source files which should be compiled or transposed. The contents of this directory will be omitted from builds.
- **`dist`** - The **distribution** directory where processed, production-ready files will be output to. All contents of this directory will be included in builds.
- **`src`** - An array of file entry points relative to the `src` directory. Each entry point will generate a like-named output file. All files and assets imported by a given entry point will be accessible from that entry's corresponding output file.

## About This Project

These tools were migrated from our [Docker-based WordPress build tools](https://github.com/ideasonpurpose/docker-build) to speed up development and began the process of moving our build tools away from webpack. Gathering dependencies also simplifies the package.json files in host projects, making those slightly more manageable.

The **example/webpack.config.js** file works best when paired with a PHP environment like our [Docker WordPress environments](https://github.com/ideasonpurpose/docker-wordpress-dev). It's capable of proxying to other servers, but that's sort of crazy.

### Additional Notes

This project expects an entirely ES Module based environment and specifies all dependencies using standard ESM import syntax. Projects importing this file should set `"type": "module"` in their package.json files.

#### Publishing to [npm](https://www.npmjs.com/package/@ideasonpurpose/build-tools-wordpress)

A GitHub action will auto-publish version-tagged releases to npm. In order to publish, the repository must have an `NPM_TOKEN` secret set with the token from npm. [Log into npmjs.org](https://www.npmjs.com/login) with a publish-authorized account, then find the token page linked from the Profile page sidebar. Generate a new token and update the repository secret.

<!-- START IOP CREDIT BLURB -->

## &nbsp;

#### Brought to you by IOP

<a href="https://www.ideasonpurpose.com"><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/iop-logo-white-on-black-88px.png" height="44" align="top" alt="IOP Logo"></a><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/spacer.png" align="middle" width="4" height="54"> This project is actively developed and used in production at <a href="https://www.ideasonpurpose.com">Ideas On Purpose</a>.

<!-- END IOP CREDIT BLURB -->
