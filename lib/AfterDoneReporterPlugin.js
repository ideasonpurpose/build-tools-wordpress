// @ts-check

import chalk from "chalk";
import { filesize } from "filesize";
import { prettierHrtime } from "./prettier-hrtime.js";

/**
 * Clean post-compilation summary for dev server.
 * Shows status, duration, entrypoints with sizes, and the local URL.
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
      const time = prettierHrtime(durationMs);

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

      // Entrypoint assets with sizes (exclude hot-update)
      try {
        const json = stats.toJson({
          all: false,
          assets: true,
          entrypoints: true,
        });

        const assetMap = new Map();
        for (const asset of json.assets ?? []) {
          if (/hot-update|\.asset\.php$/.test(asset.name)) continue;
          assetMap.set(asset.name, asset);
        }

        const entrypoints = Object.entries(json.entrypoints ?? {}).sort(([a], [b]) =>
          a.localeCompare(b),
        );

        if (entrypoints.length) {
          for (const [epName, epInfo] of entrypoints) {
            const epAssets = (epInfo.assets ?? [])
              .map((a) => assetMap.get(a.name ?? a))
              .filter(Boolean)
              .sort((a, b) => (b.size ?? 0) - (a.size ?? 0));

            if (!epAssets.length) continue;

            console.log(
              `  ${chalk.gray("↳")} ${chalk.bold(epName)} ${chalk.gray(`(${epAssets.length})`)}:`,
            );

            for (const asset of epAssets) {
              const size = asset.size != null ? filesize(asset.size) : "?";
              console.log(
                `    ${chalk.gray("·")} ${chalk.white(asset.name)} ${chalk.gray(`— ${size}`)}`,
              );
            }
          }
        }
      } catch {
        // Non-fatal: don't clutter output if stats parsing fails
      }
    });
  }
}