#! /usr/bin/env node
import { exec } from "node:child_process";

import chalk from "chalk";

exec("docker compose port wordpress 80", (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  if (stdout) {
    const [addr, port] = stdout.split(":");

    console.log(
      `🟢 ${chalk.gray("(iop)")}:`,
     chalk.bold( "Local WP site:"),
      chalk.blue(`http://localhost:${chalk.bold(port)}`),
    );
  }
  // console.log(`stdout: ${stdout}`);
  // console.error(`stderr: ${stderr}`);
});
