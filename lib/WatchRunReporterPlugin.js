import path from "path";
import chalk from "chalk";

/**
 * Clean file-change reporting for watch/dev mode.
 * Shows what triggered the recompile without flooding the terminal.
 *
 * Tracks compiler.hooks.invalid to capture the triggering filename,
 * falling back to compiler.modifiedFiles when available.
 */
export class WatchRunReporterPlugin {
  constructor(options = {}) {
    const defaults = {
      echo: true,
      message: chalk.gray("recompiling..."),
    };
    this.config = { ...defaults, ...options };
    this.name = "IOP WatchRun Reporter";
    this.invalidFile = null;
  }

  apply(compiler) {
    compiler.hooks.invalid.tap(this.name, (fileName) => {
      this.invalidFile = fileName;
    });

    compiler.hooks.watchRun.tap(this.name, () => {
      if (!this.config.echo) return;

      const root = process.cwd();
      const modFiles = compiler.modifiedFiles?.size
        ? Array.from(compiler.modifiedFiles)
        : null;
      const changed =
        modFiles || (this.invalidFile ? [this.invalidFile] : null);

      this.invalidFile = null;

      if (!changed) return;

      const relFiles = changed
        .map((p) => path.relative(root, p) || ".")
        .sort();

      let changeMsg;
      if (relFiles.length === 1) {
        changeMsg = chalk.bold.yellow(relFiles[0]);
      } else if (relFiles.length <= 3) {
        changeMsg = chalk.bold.yellow(relFiles.join(", "));
      } else {
        changeMsg = chalk.bold.yellow(
          `${relFiles.slice(0, 2).join(", ")} +${relFiles.length - 2} more`,
        );
      }

      console.log(
        `\n${chalk.cyan("⟳")} Changed: ${changeMsg} ${this.config.message}`,
      );
    });
  }
}