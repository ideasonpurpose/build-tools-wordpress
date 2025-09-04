import { posix as path } from "path";

import { statSync } from "fs";
import { cosmiconfig, cosmiconfigSync } from "cosmiconfig";
import chalk from "chalk";

import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { EsbuildPlugin } from "esbuild-loader";

import CopyPlugin from "copy-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import ImageMinimizerPlugin from "image-minimizer-webpack-plugin";

import {
  AfterDoneReporterPlugin,
  buildConfig,
  DependencyManifestPlugin,
  devserverProxy,
  findLocalPort,
  WatchRunReporterPlugin,
} from "../index.js";

import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

// Experimenting with this
import DependencyExtractionWebpackPlugin from "@wordpress/dependency-extraction-webpack-plugin";

/**
 * Force `mode: production` when running the analyzer
 * TODO: webpack5 changed env in here, might need to change WEBPACK_BUNDLE_ANALYZER
 */
if (process.env.WEBPACK_BUNDLE_ANALYZER) process.env.NODE_ENV = "production";

const isProduction = process.env.NODE_ENV === "production";

const stats = {
  preset: "normal",
  cachedAssets: false,
  assets: true,
  // assetsSpace: 12,
  // context: new URL( import.meta.url).pathname,
  // all: true,
  // assets: true,
  // builtAt: true,
  // cachedModules: true,
  // children: false, // Adds a bunch of blank lines to stats output
  // chunkGroups: false,
  // chunkModules: false,
  // chunkOrigins: true,
  // chunkRelations: true,
  // chunks: false,
  // colors: true,
  // depth: false,
  // env: true,
  hash: true,
  // orphanModules: false,
  // dependentModules: true,
  modules: false,
  groupAssetsByChunk: true,
  entrypoints: true,
  // // errorDetails: "auto",
  errorDetails: false,
  children: false,
  // errorDetails: true,
  errors: true,
  errorStack: false,
  // excludeAssets: [/hot-update/, /_sock-/],
  // groupAssetsByChunk: true,
  // logging: "warn",
  // optimizationBailout: true,
  // loggingTrace: false,
  performance: true,
  reasons: false,
  relatedAssets: false,
  timings: true,
  version: true,
  warnings: true,
  loggingDebug: ["sass-loader"],
};

export default async (env) => {
  // const siteDir = new URL(import.meta.url).pathname;
  const siteDir = process.cwd();
  const explorer = cosmiconfig("ideasonpurpose", { searchStrategy: "project" });
  const configFile = await explorer.search(siteDir);

  const config = await buildConfig(configFile);

  const proxy = isProduction ? {} : await devserverProxy(config);

  /**
   * `usePolling` is a placeholder, try and detect native Windows Docker mounts
   * since they don't support file-watching (no inotify events), if there's
   * something clean, use that instead. For now, this will force-enable polling.
   *
   * TODO: usePolling is likely no longer needed since webpack is running from node and
   *       not Docker
   *
   * TODO: Why so much dancing around defaults when this could just inherit from default.config?
   */
  const usePolling = Boolean(config.usePolling); // likely undefined, coerced to false
  const pollInterval = Math.max(
    parseInt(config.pollInterval, 10) || parseInt(config.usePolling, 10) || 400,
    400,
  );

  const devtool = config.devtool || false;

  return {
    stats,
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          loader: "esbuild-loader",
          options: {
            loader: "jsx",
            target: config.esTarget,
          },
        },

        {
          test: /\.(scss|css)$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            {
              loader: "css-loader",
              options: {
                import: false, // imports already handled by Sass or PostCSS
                sourceMap: !isProduction,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                sourceMap: !isProduction,
                postcssOptions: {
                  plugins: isProduction
                    ? [
                        autoprefixer,
                        cssnano({ preset: ["default", { colormin: false }] }),
                      ]
                    : [autoprefixer],
                },
              },
            },
            {
              loader: "sass-loader",
              options: {
                implementation: "sass-embedded",
                sourceMap: !isProduction,
                warnRuleAsWarning: true,
                webpackImporter: false,
                sassOptions: {
                  api: "modern-compiler",

                  loadPaths: [path.resolve(config.src, "sass")],
                },
              },
            },
          ],
        },
        /**
         * This image loader is specifically for images which are required or
         * imported into a webpack processed entry file. Optimization is
         * handled by image-minimizer-webpack-plugin. These assets will be
         * renamed with a chunkhash fragment.
         *
         * All images under `config.src` will be optimized and copied by
         * copy-webpack-plugin but will keep their original filenames and
         * relative paths. Images included in SCSS files will be processed
         * twice, once with a hashed name and again with its original name.
         */
        {
          test: /\.(jpe?g|png|gif|tif|webp|avif)$/i,
          type: "asset",
        },

        /**
         * SVGs can be imported as asset urls or React components
         *
         * To import an SVG file as a src url, append ?url to the filename:
         *     import svg from './assets/file.svg?url'
         *
         * To import an SVG file as a React component

         * @link https://react-svgr.com/docs/webpack/#use-svgr-and-asset-svg-in-the-same-project
         */
        {
          test: /\.svg$/i,
          type: "asset",
          resourceQuery: /url/, // *.svg?url
        },
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          resourceQuery: { not: [/url/] }, // exclude react component if *.svg?url
          use: ["@svgr/webpack"],
        },
        {
          test: /fonts\/.*\.(ttf|eot|woff2?)$/i,
          type: "asset",
        },
      ],
    },

    context: path.resolve(config.src),

    resolve: {
      modules: [
        path.resolve("../tools/node_modules"),
        path.resolve("../site/node_modules"),
        path.resolve("./node_modules"),
      ],
    },

    resolveLoader: {
      modules: [
        "node_modules",
        new URL("../../build-tools-wordpress/node_modules", import.meta.url)
          .pathname,
      ],
    },

    entry: config.entry,

    output: {
      path: new URL(config.dist, import.meta.url).pathname,
      /**
       * Primary output filenames SHOULD NOT include hashes in development because
       * some files are written to disk from devServer middleware. Because those
       * files are written outside standard webpack output, they aren't cleaned
       * up by standard webpack cleaning functions.
       */
      filename: isProduction ? "[name]-[contenthash:8].js" : "[name].js",
      chunkFilename: "[id]-[chunkhash:8].js",
      publicPath: config.publicPath,
      /**
       * Assets are not cleaned when writeToDisk is true in devServer
       * Works correctly with builds.
       * @link https://github.com/webpack/webpack-dev-middleware/issues/861
       */
      clean: true,
    },

    devServer: {
      host: "0.0.0.0",
      allowedHosts: "all",
      port: "auto",
      // hot: true, // TODO: What does 'only' do? https://webpack.js.org/configuration/dev-server/#devserverhot
      hot: true, // Enable hot module replacement with fallback to full reload
      client: {
        logging: "info",
        overlay: {
          errors: true,
          warnings: true,
          runtimeErrors: (error) => {
            // specific errors can be inspected and handled individually
            // https://webpack.js.org/configuration/dev-server/#overlay
            // console.log("webpack devServer runtimeError:", error);
            return false;
          },
        },
        reconnect: 30,
      },

      devMiddleware: {
        index: false, // enable root proxying

        writeToDisk: (filePath) => {
          /**
           * Note: If this is an async function, it will write everything to disk
           *
           * Never write hot-update files to disk.
           */
          // vendors-node_modules_mini-css-extract-plugin_dist_hmr_hotModuleReplacement_js-node_modules_we-780fe4.js.map
          if (/.+(hot-update)\.(js|json|js\.map)$/.test(filePath)) {
            return false;
          }
          // SHORT_CIRCUIT FOR TESTING
          return true;

          if (/.+\.(svg|json|php|jpg|png)$/.test(filePath)) {
            const fileStat = statSync(filePath, { throwIfNoEntry: false });

            /**
             * Always write SVG, PHP & JSON files
             */
            if (/.+\.(svg|json|php)$/.test(filePath)) {
              return true;
            } else {
              /**
               * Write any images under 100k and anything not yet on disk
               */
              if (!fileStat || fileStat.size < 100 * 1024) {
                return true;
              }
              /**
               * TODO: This might all be unnecessary. Webpack seems to be doing a good job with its native caching
               */
              // const randOffset = Math.random() * 300000; // 0-5 minutes
              // const expired = new Date() - fileStat.mtime > randOffset;
              // const relPath = filePath.replace(config.dist, "dist");
              // if (expired) {
              //   console.log("DEBUG writeToDisk:", { replacing: relPath });
              //   return true;
              // }
              // console.log("DEBUG writeToDisk:", { cached: relPath });
            }
          }
          return false;
        },
        // stats,
        // stats: 'verbose',
      },

      // NOTE: trying to make injection conditional so wp-admin stops reloading
      // injectClient: compilerConfig => {
      //   console.log(compilerConfig);
      //   return true;
      // },

      onListening: (devServer) => {
        const port = devServer.server.address().port;
        devServer.compiler.options.devServer.port =
          devServer.server.address().port;
        devServer.compiler._devServer = devServer;

        console.log("Listening on port:", port);
      },

      setupMiddlewares: (middlewares, devServer) => {
        // devServer.compiler.options.devServer.port =  devServer.options.port;
        // devServer.compiler._devServer =  devServer;
        // if (!devServer) {
        //   throw new Error("webpack-dev-server is not defined");
        // }

        //  devServer.internalIP('v4').then(ip => console.log('!!!!!!', ip));

        /**
         * The `/inform` route is an annoying bit of code. Here's why:
         * Ubiquity Wi-fi hardware frequently spams the shit out of their
         * networks, specifically requesting the `/inform` route from
         * every device. We still have some Ubiquity hardware on our
         * networks, so dev servers were constantly responding to
         * `/inform` requests with 404s, filling logs and cluttering
         * terminals. So that's why this is here. I hate it.
         */
        devServer.app.all("/inform", () => false);

        /**
         * The "/webpack/reload" endpoint will trigger a full devServer refresh
         * Originally from our Browsersync implementation:
         *
         * https://github.com/ideasonpurpose/wp-theme-init/blob/ad8039c9757ffc3a0a0ed0adcc616a013fdc8604/src/ThemeInit.php#L202
         */
        devServer.app.get("/webpack/reload", (req, res) => {
          console.log(
            chalk.yellow("Reload triggered by request to /webpack/reload"),
          );

          devServer.sendMessage(
            devServer.webSocketServer.clients,
            "content-changed",
          );
          res.json({ status: "Reloading!" });
        });

        return middlewares;
      },

      watchFiles: {
        paths: [
          path.resolve(config.src, "../**/*.{php,html,svg,json}"), // WordPress
        ],
        options: {
          ignored: [
            "**/.git/**",
            "**/vendor/**",
            "**/node_modules/**",
            "**/dist/**",
          ],
          ignoreInitial: true,
          ignorePermissionErrors: true,
          /**
           * TODO: Can polling be removed everywhere?
           * @link  https://github.com/docker/for-win/issues/56#issuecomment-576749639
           */
          usePolling,
          interval: pollInterval,
        },
      },

      ...proxy,
    },

    mode: isProduction ? "production" : "development",

    performance: {
      hints: isProduction ? "warning" : false,
    },

    devtool,

    plugins: [
      new MiniCssExtractPlugin({
        filename: isProduction ? "[name]-[contenthash:8].css" : "[name].css",
      }),

      new CopyPlugin({
        patterns: [
          {
            from: "**/*",
            globOptions: {
              dot: true, // TODO: Dangerous? Why is this ever necessary?!
              ignore: [
                "**/{.gitignore,.DS_Store,*:Zone.Identifier}",
                config.src + "/{block,blocks,fonts,js,sass}/**",
              ],
            },
            noErrorOnMissing: true,
          },
          {
            from: config.src + "/{block,blocks}/**/block.json",
            noErrorOnMissing: true,
          }, // re-add block.json files for loading from PHP
        ],
        options: { concurrency: 50 },
      }),

      /**
       * @link https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dependency-extraction-webpack-plugin/
       */
      new DependencyExtractionWebpackPlugin(),

      new DependencyManifestPlugin({
        writeManifestFile: true,
        manifestFile: config.manifestFile,
      }),

      new WatchRunReporterPlugin(),

      new AfterDoneReporterPlugin({
        echo: env && env.WEBPACK_SERVE,
        // message:
        //   "Dev site " + chalk.blue.bold(`http://localhost:${process.env.PORT}`),
      }),

      new BundleAnalyzerPlugin({
        analyzerMode: isProduction ? "static" : "disabled",
        openAnalyzer: false,
        reportFilename: new URL("webpack/stats/index.html", import.meta.url)
          .pathname,
      }),
    ],
    optimization: {
      splitChunks: {
        chunks: "all",
      },
      minimizer: [
        new EsbuildPlugin({
          target: config.esTarget,
          css: true,
        }),
        new ImageMinimizerPlugin({
          severityError: "error",

          minimizer: {
            implementation: ImageMinimizerPlugin.sharpMinify,

            options: {
              /**
               * Sharp options
               */
              encodeOptions: {
                jpeg: {
                  quality: 70,
                  mozjpeg: true,
                },
                png: {},
              },
            },
          },
        }),
      ],
    },
  };
};
