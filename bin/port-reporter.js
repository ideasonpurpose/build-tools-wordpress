#! /usr/bin/env node

import chalk from "chalk";

import { findLocalPort } from "../index.js";

/**
 * This is a reporting/display wrapper for the local port discovery module
 */
const main = async () => {
  const info = await findLocalPort().catch((error) => ({ error }));

  if (info && info.port && info.hostname) {
    console.log(
      "\n",
      " 🚀 ",
      chalk.bold("Local WP site:"),
      chalk.magenta(`http://${info.hostname}:${chalk.bold(info.port)}`),
      "\n",
    );
  } else {
    let errString, showDebug;

    if (info.error) {
      errString = info.error.toString();
    } else {
      errString = "Unknown error occurred. Unable to discover local port";
      showDebug = true;
    }

    errString = errString.split("\n").join("\n      ");

    console.log("\n", " 🤖 ", chalk.red.bold(errString));
    if (showDebug) {
      console.log(chalk.green("  🐛  Debug:"), info);
    }
  }
};

main();
