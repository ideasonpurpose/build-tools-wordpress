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
        /**
         * NOTE: As of webpack-dev-server vXX.XX.XXX, auto-assigned ports are
         * not propagated into the compiler.options.devServer object.
         *
         * As a workaround, this relies on the follining line being added to
         * the webpack.config file's devServer.setupMiddlewares method:
         *
         *    devServer.compiler.options.devServer.port = devServer.options.port;
         *
         */
        const { host, port } = compiler.options.devServer;
        const { startTime, endTime, modules, assetsInfo } = stats.compilation;
        const hostname = host === "0.0.0.0" ? "localhost" : host;

        const time = chalk.yellow.bold(
          humanizeDuration(endTime - startTime, { units: ["h", "m", "s"] }),
        );
        const mCount = chalk.yellow(modules.size);
        const aCount = chalk.yellow.bold(assetsInfo.size);

        const messages = [
          // `Compiled ${mCount} input modules into ${aCount} files in ${time}`,
          // "Dev site " + chalk.blue(`http://${hostname}:${chalk.bold(port)}`),
          "Dev site " + chalk.blue(`http://${hostname}:${chalk.bold(port)}`),
          this.config.message,
        ]
          .filter((m) => m.length)
          .join("\n" + this.config.prefix + " ");

        setTimeout(() =>
          // console.log("\n" + this.config.prefix + " " + messages),
          console.log( "💫" + messages),
        );

        setTimeout(() => {
          // console.log(Object.keys(compiler));
          // console.log(compiler.options);
        });
      }
    });


    // compiler.hooks.done.tapPromise("webpack-dev-server", async (stats) => {
    //   await stats;
    //   setTimeout(() => {
    //     console.log(chalk.bold.magenta("in webpack-dev-server hook"), {
    //       stats, thing: Object.keys( compiler.options),
    //     });
    //   });
    // });

  }
}
