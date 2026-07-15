// @ts-check

import chalk from "chalk";
import humanizeDuration from "humanize-duration";

/**
 * Clean post-compilation summary for dev server.
 * Shows status, duration, and the local URL without placeholder text or setTimeout hacks.
 */
export class AfterDoneReporterPlugin {
  constructor(options = {}) {
    const defaults = {
      echo: true,
    };
    this.config = { ...defaults, ...options };
    this.name = "IOP AfterDone Reporter";
  }

  apply(compiler) {
    compiler.hooks.done.tap(this.name, (stats) => {
      if (!this.config.echo) return;

      const devServer = compiler.options.devServer || {};
      const host = devServer.host === "0.0.0.0" ? "localhost" : devServer.host || "localhost";
      const port = devServer.port || "auto";
      const url = chalk.blue.underline(`http://${host}:${port}`);

      const durationMs = stats.endTime && stats.startTime ? stats.endTime - stats.startTime : 0;
      const time = humanizeDuration(durationMs, { units: ["s", "ms"], round: true });

      const hasErrors = stats.hasErrors();
      const hasWarnings = stats.hasWarnings();

      let statusLine;
      if (hasErrors) {
        statusLine = `${chalk.red.bold("✖ Failed")} in ${chalk.yellow(time)}`;
      } else if (hasWarnings) {
        statusLine = `${chalk.yellow.bold("⚠ Compiled with warnings")} in ${chalk.yellow(time)}`;
      } else {
        statusLine = `${chalk.green.bold("✔ Compiled")} in ${chalk.yellow(time)}`;
      }

      console.log(`\n${statusLine} → ${url}`);
    });
  }
}