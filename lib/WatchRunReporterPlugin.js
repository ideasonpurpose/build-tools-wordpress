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

      const MAX_FILES = 6;
      let changeMsg;

      if (relFiles.length === 1) {
        changeMsg = chalk.bold.yellow(relFiles[0]);
      } else if (relFiles.length <= MAX_FILES) {
        changeMsg = chalk.bold.yellow(relFiles.join(", "));
      } else {
        const visible = relFiles.slice(0, MAX_FILES).join(", ");
        const remaining = relFiles.length - MAX_FILES;
        changeMsg =
          chalk.bold.yellow(visible) +
          chalk.gray(` +${remaining} more`);
      }

      const count =
        relFiles.length > 1 ? chalk.cyan(`(${relFiles.length})`) + " " : "";

      console.log(
        `\n${chalk.cyan("⟳")} Changed: ${count}${changeMsg} ${this.config.message}`,
      );
    });
  }
}