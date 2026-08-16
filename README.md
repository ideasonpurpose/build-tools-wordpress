# @ideasonpurpose/build-tools-wordpress

#### Version 2.10.8

[![NPM Version](https://img.shields.io/npm/v/%40ideasonpurpose%2Fbuild-tools-wordpress?logo=npm)](https://www.npmjs.com/package/@ideasonpurpose/build-tools-wordpress)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/ideasonpurpose/build-tools-wordpress/npm-publish.yml?logo=github&logoColor=white)](https://github.com/ideasonpurpose/build-tools-wordpress/actions/workflows/npm-publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Build scripts and shared dependencies for WordPress development. Used in production at [Ideas On Purpose](https://www.ideasonpurpose.com).

This package centralizes Webpack configuration, asset pipelines, and helper CLIs so host projects stay thin: a small `package.json`, a one-line `webpack.config.js`, and an optional config file.

## Requirements

- **Node.js** 22.15+ (required by webpack-dev-server 6; ESM only)

## Install

```sh
npm install -D @ideasonpurpose/build-tools-wordpress
```

Typical host scripts (see [`boilerplate/package.json`](./boilerplate/package.json)):

```json
{
  "type": "module",
  "scripts": {
    "prebuild": "npm run clean",
    "build": "NODE_ENV=production webpack",
    "postbuild": "npm run zip",
    "start": "webpack serve",
    "zip": "iop-build-zip-archive"
  },
  "devDependencies": {
    "@ideasonpurpose/build-tools-wordpress": "^2.10.6"
  },
  "prettier": "@ideasonpurpose/prettier-config",
  "stylelint": {
    "extends": "@ideasonpurpose/stylelint-config"
  }
}
```

Prettier and Stylelint configs are re-exported from this package’s dependencies so hosts can extend them without separate installs.

## Quick start

**1. Point Webpack at this package**

```js
// webpack.config.js
export { webpackConfig as default } from "@ideasonpurpose/build-tools-wordpress";
```

**2. Lay out sources** under the default theme paths (package `name` → theme folder):

```text
wp-content/themes/<package-name>/
  src/
    js/main.js
    js/admin.js
    js/editor.js
    sass/   # or styles/
  dist/     # build output
```

**3. Run**

```sh
npm start          # webpack-dev-server (proxies local WordPress when available)
NODE_ENV=production npm run build   # production build + zip (if postbuild is set)
```

Full IOP projects also use Docker Compose tooling from this package (`tooling/docker-compose.yml`) and scripts like `bootstrap`, `db:dump`, and `project:refresh`. Those are optional if you only need the asset pipeline.

## Configuration

Optional config is loaded with [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) under the name `ideasonpurpose` — typically `ideasonpurpose.config.js` next to `package.json`. Values merge over [defaults](./lib/buildConfig.js).

### Defaults

| Option         | Default                                               | Notes                                                                            |
| -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src`          | `./wp-content/themes/<name>/src`                      | `<name>` from host `package.json`                                                |
| `dist`         | `./wp-content/themes/<name>/dist`                     |                                                                                  |
| `entry`        | `["./js/main.js", "./js/admin.js", "./js/editor.js"]` | Relative to `src`. String, array, or object                                      |
| `publicPath`   | `/wp-content/themes/<name>/dist/`                     |                                                                                  |
| `esTarget`     | `"es2020"`                                            | Passed to esbuild-loader / minimizer                                             |
| `devtool`      | `"source-map"`                                        |                                                                                  |
| `proxy`        | `"wordpress"`                                         | Dev-server proxy target (Docker service name, URL, IP, or `true` to auto-detect) |
| `manifestFile` | `"./dependency-manifest.json"`                        | Written into `dist`                                                              |
| `type`         | _(unset / theme)_                                     | Set `"plugin"` to change archive naming                                          |

Paths resolve relative to the config file (or `package.json` if no config file is found).

### Entry shapes

```js
// Array → basenames become entry keys (overlapping basenames merge)
entry: ["./js/main.js", "./js/admin.js"];

// String → single entry
entry: "./js/main.js";

// Object → passed through
entry: { app: "./js/main.js", admin: "./js/admin.js" };
```

### Themes vs plugins

Releases are versioned so each build is a clear rollback snapshot. For **themes**, zip archives use a versioned folder name (`my-theme-1.2.3`). That fails for **plugins**, where multiple versions can be active if directory names differ.

Set `type: "plugin"` to omit the version from the archive directory name:

```js
// ideasonpurpose.config.js
export default {
  type: "plugin",
  src: `./wp-content/plugins/my-plugin/src`,
  dist: `./wp-content/plugins/my-plugin/dist`,
  publicPath: `/wp-content/plugins/my-plugin/dist/`,
  entry: ["./js/main.js"],
};
```

## What the build does

| Area       | Implementation                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundler    | Webpack 5                                                                                                                                                                                               |
| JS/TS/JSX  | [esbuild-loader](https://github.com/privatenumber/esbuild-loader)                                                                                                                                       |
| CSS        | Sass ([sass-embedded](https://sass-lang.com/dart-sass/), modern compiler API), PostCSS (autoprefixer; cssnano in production)                                                                            |
| Images     | `asset` modules + [Sharp](https://sharp.pixelplumbing.com/) via image-minimizer-webpack-plugin                                                                                                          |
| SVG        | Asset / data-URI or React components via [@svgr/webpack](https://react-svgr.com/) (see below)                                                                                                           |
| Copy       | Static files from `src` (blocks, fonts, etc. handled specially)                                                                                                                                         |
| WordPress  | [`@wordpress/dependency-extraction-webpack-plugin`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dependency-extraction-webpack-plugin/) + custom dependency manifest |
| Dev server | Hot reload, live reload on PHP/HTML/SVG/JSON, reverse proxy to local WP                                                                                                                                 |
| Production | Content hashes, minification, optional bundle analyzer report, zip via `iop-build-zip-archive`                                                                                                          |

Sass `loadPaths` include `src/sass`, `src/styles`, and the project `node_modules`, so packages can be imported by name:

```scss
@use "some-npm-package/styles";
```

### Dev server

- Proxies the site to a local WordPress container (default Docker service name `wordpress`) when `proxy` is enabled
- Watches theme PHP/HTML/SVG/JSON for full reload
- `GET /webpack/reload` triggers a client refresh (useful from PHP or external tools)

### Zip archives

`iop-build-zip-archive` packs the theme/plugin parent of `src` into `_builds/<name>[-version].zip`. Version suffix is skipped when `type` is `"plugin"`.

## SVG processing

Webpack treats SVGs differently by context:

- **In SCSS** (`url('file.svg')`): inlined as a data URI if under 4KB, otherwise emitted as a file.
- **In JS/TSX**:
  - `import svg from 'file.svg?url'` — asset URL / data URI (4KB threshold)
  - `import Icon from 'file.svg?react'` — React component via SVGR
  - bare `import Icon from 'file.svg'` from `.jsx`/`.tsx` — React component (default)

React SVG components use `dimensions: false` (no fixed `width`/`height`; `viewBox` kept) so they scale with CSS.

Data URIs use URL-encoding (`data:image/svg+xml,<encoded>`), not base64.

### SVGO and VS Code

[SVGO](https://github.com/svg/svgo) and our preferred [`config/svgo.config.mjs`](./config/svgo.config.mjs) ship with the package, plus a stdin formatter for the editor.

Install [SVG Language Mode ID](https://marketplace.visualstudio.com/items?itemName=ideasonpurpose.svg-language-mode-id) and [Custom Local Formatters](https://marketplace.visualstudio.com/items?itemName=jkillian.custom-local-formatters), then in `settings.json`:

```json
{
  "[svg]": {
    "editor.defaultFormatter": "jkillian.custom-local-formatters",
    "editor.formatOnSave": false
  },
  "customLocalFormatters.formatters": [
    {
      "command": "iop-vscode-svgo",
      "languages": ["svg"]
    }
  ]
}
```

The formatter loads a project `svgo.config` if present, otherwise falls back to this package’s config.

Notes:

- VS Code treats SVG as XML by default; the language-mode extension is required for the `[svg]` scope.
- Formatting fails if `editor.formatOnSaveMode` is `"modifications"` (range formatting does not send a full document).

**IOP SVGO defaults** ([`config/svgo.config.mjs`](./config/svgo.config.mjs)):

- Pretty-print with 4-space indent
- Preserve ID names (`cleanupIds: false`)
- Custom: copy width/height from `viewBox` onto `<svg>` when missing
- Custom: remove top-level `fill="none"`
- `removeUselessStrokeAndFill` with `removeNone: true`

## CLI tools

| Command                       | Purpose                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iop-build-zip-archive`       | Zip theme/plugin into `_builds/`                                                                                                                                                        |
| `iop-build-port-reporter`     | Print discovered local WordPress URL/port (Docker)                                                                                                                                      |
| `iop-project-refresh`         | Sync host tooling from package boilerplate (`package.json` scripts, `docker-compose.yml`, `.gitignore`, dirs, optional templates). Flags: `--dry-run`, `--force` (allow dirty git tree) |
| `iop-html-php-prettier`       | Experimental mixed HTML/PHP formatter                                                                                                                                                   |
| `iop-format-wp-block-pattern` | Experimental WordPress block-pattern PHP formatter                                                                                                                                      |
| `iop-vscode-svgo`             | SVGO over stdin for editor formatters                                                                                                                                                   |

### `iop-html-php-prettier`

Double-formats mixed HTML and PHP (WordPress templates): PHP is tokenized, the file is formatted as HTML with Prettier, tokens are restored, then PHP is formatted with [@prettier/plugin-php](https://github.com/prettier/plugin-php).

A faster rewrite is in progress: **[Format Mixed PHP and HTML](https://github.com/ideasonpurpose/format-mixed-php-html)**.

```sh
npx iop-html-php-prettier path/to/file.php
```

Also accepts STDIN → STDOUT for Custom Local Formatters:

```json
"customLocalFormatters.formatters": [
  {
    "command": "npx iop-html-php-prettier",
    "languages": ["php"]
  }
]
```

### `iop-format-wp-block-pattern`

Formats WordPress block pattern PHP: readable block markup, expanded JSON in `<!-- wp:... -->` comments, and whitespace tuned for the block editor.

```sh
npx iop-format-wp-block-pattern path/to/pattern.php
```

### `iop-project-refresh`

Updates an existing project’s tooling from this package’s `boilerplate/` and `tooling/` trees. Safe defaults: refuses a dirty git working tree unless `--force`; use `--dry-run` to preview.

```sh
npx iop-project-refresh
npx iop-project-refresh --dry-run
npx iop-project-refresh --force
```

## Local development (this package)

Bin scripts break conventional `npm link`. In a consumer project, depend on a local path instead:

```json
"devDependencies": {
  "@ideasonpurpose/build-tools-wordpress": "file:../../build-tools-wordpress"
}
```

Reinstall on change:

```sh
cd dev-project-working-dir
npx chokidar-cli "../../build-tools-wordpress/**/*" -c "npm install"
```

## Publishing

Version-tagged releases publish to npm via GitHub Actions (OIDC trusted publishing). See [CHANGELOG.md](./CHANGELOG.md).

If the workflow needs a classic token instead, set repository secret `NPM_TOKEN` from an npm publish-capable account.

<!-- START IOP CREDIT BLURB 2026-07-->

## &nbsp;

#### Brought to you by IOP

| <a href="https://www.ideasonpurpose.com"><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/iop-logo-white-on-black-88px.png" width="44" height="44" align="top" alt="IOP Logo"></a> <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | This project is actively developed and used in production at <a href="https://www.ideasonpurpose.com">Ideas On Purpose</a>. <br>&nbsp; |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

<!-- END IOP CREDIT BLURB -->
