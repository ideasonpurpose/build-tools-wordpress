import chalk from "chalk";
import humanizeDuration from "humanize-duration";

/**
 * Simple plugin for printing some text after compilation stats are displayed
 *
 * Messages should be configured in an argument object:
 *
 *    new AfterDoneReporterPlugin({message: "Your Message Here"})
 */
export class AfterDoneReporterPlugin {
  constructor(options = {}) {
    const defaults = {
      echo: true,
      prefix: `🟢${chalk.gray("(iop)")}:`,
      message: "",
    };
    this.config = { ...defaults, ...options };
    this.name = "IOP Reporter Plugin";
    this.messages = [];
  }

  apply(compiler) {
    compiler.hooks.done.tapPromise(this.name, async (stats) => {
      if (this.config.echo) {
        // console.log(compiler.options, stats);
        const { host, port } = compiler.options.devServer;
        const { startTime, endTime, modules, assetsInfo } = stats.compilation;
        const hostname = host === "0.0.0.0" ? "localhost" : host;

        const time = chalk.yellow.bold(
          humanizeDuration(endTime - startTime, { units: ["h", "m", "s"] }),
        );
        const mCount = chalk.yellow(modules.size);
        const aCount = chalk.yellow.bold(assetsInfo.size);

        const messages = [
          `Compiled ${mCount} input modules into ${aCount} files in ${time}`,
          "Dev site " + chalk.blue(`http://${hostname}:${chalk.bold(port)}`),
          this.config.message,
        ]
          .filter((m) => m.length)
          .join("\n" + this.config.prefix + " ");

        setTimeout(() =>
          console.log("\n" + this.config.prefix + " " + messages),
        );
      }
    });
  }
}
