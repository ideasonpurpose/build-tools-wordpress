#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

process.env.WEBPACK_CLI_SKIP_IMPORT_LOCAL = "1";
process.env.WEBPACK_PACKAGE = require.resolve("webpack");
process.env.WEBPACK_DEV_SERVER_PACKAGE = require.resolve("webpack-dev-server");

await import("webpack-cli/bin/cli.js");
