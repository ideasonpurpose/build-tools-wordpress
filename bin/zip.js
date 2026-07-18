#! /usr/bin/env node
// @ts-check

import { createReadStream, createWriteStream, statSync } from "node:fs";
import { basename, dirname, join } from "node:path/posix";
import { clearLine, cursorTo } from "node:readline";

import { ZipArchive } from "archiver";
import chalk from "chalk";
import cliTruncate from "cli-truncate";
import { cosmiconfig } from "cosmiconfig";
import { filesize } from "filesize";
import { readJsonSync, ensureFileSync } from "fs-extra/esm";
import { globby } from "globby";
import isTextPath from "is-text-path";
import replaceStream from "replacestream";
import stringLength from "string-length";

import { buildConfig } from "../index.js";
import { prettierHrtime } from "../lib/prettier-hrtime.js";

/**
 * @typedef {import("../lib/buildConfig.js").BuildConfig} BuildConfig
 *
 * @typedef {Object} ArchiveFile
 * @property {string} path - Path relative to projectDir
 * @property {import("node:fs").Stats} stat
 * @property {import("node:stream").Readable} contents
 */

async function getConfig() {
  const siteDir = process.cwd();
  const explorer = cosmiconfig("ideasonpurpose");
  const configFile = await explorer.search(siteDir);

  /** @type {BuildConfig} */
  const config = await buildConfig(configFile);

  return { config };
}
/** @type {{ config: BuildConfig }} */
const { config } = await getConfig();

const pkgJson = readJsonSync(new URL("package.json", config.configFileUrl));
pkgJson.name = pkgJson.name ?? "archive";
pkgJson.version = pkgJson.version ?? "";

const archiveName = pkgJson.name || "archive";
const archiveVersion = config.type !== "plugin" ? `-${pkgJson.version}` : "";

const versionDirName = `${archiveName}${archiveVersion}`.replace(/[ .]/g, "_");

const zipFileName = `${versionDirName}.zip`;
const zipFile = new URL(`_builds/${zipFileName}`, config.configFileUrl);

ensureFileSync(zipFile.pathname);
const output = createWriteStream(zipFile);

output.on("finish", finishReporter);

const archive = new ZipArchive({ zlib: { level: 9 } });
archive.pipe(output);

console.log(chalk.bold("Bundling Project for Deployment"));
const start = process.hrtime();

/**
 * Set projectDir to the parent directory of config.src, all bundled
 * files will be found relative to this.
 */
const projectDir = new URL(`${config.src}/../`, config.configFileUrl);

/**
 * Counters for total uncompressed size and number of files
 * and a re-usable scoped continuer for file info
 */
let inBytes = 0;
let fileCount = 0;

const globOpts = { cwd: projectDir.pathname, nodir: false };
globby(
  [
    "**/*",
    "!_builds",
    "!**/*.sql",
    "!**/node_modules",
    "!CHANGELOG.md",
    "!composer.lock",
    "!coverage*",
    "!docker-compose.yml",
    "!docker-compose.yml",
    "!package-lock.json",
    "!phpunit.xml",
    "!src",
    "!test",
    "!tests",
  ],
  globOpts,
)
  .then((fileList) => {
    /**
     * Throw an error and bail out if there are no files to zip
     */
    if (!fileList.length) {
      throw new Error("No files found.");
    }
    return fileList;
  })
  .then((fileList) =>
    fileList.map((f) => {
      const file = {
        path: f,
        stat: statSync(new URL(f, projectDir)),
        contents: createReadStream(join(globOpts.cwd, f)),
      };

      /**
       * Replace the dev folder name with the versioned folder name in hard-coded
       * include paths. These replacements are only run against webpack's compiled
       * assets and Composer's generated autoloaders.
       */
      if (isTextPath(f)) {
        const devPath = new RegExp(`wp-content/themes/${archiveName}/`, "gi");

        file.contents = file.contents.pipe(
          replaceStream(devPath, `wp-content/themes/${versionDirName}/`),
        );
      }

      file.contents.on("data", (chunk) => {
        inBytes += chunk.length;
      });

      file.contents.on("end", () => {
        fileCount += 1;
        foundReporter(file);
      });

      /**
       * Adding a data handler changes a stream's mode from paused to flowing
       * so we need to change it back or the streams will be truncated
       */
      file.contents.pause();
      return file;
    }),
  )
  .then((fileList) =>
    fileList.map((f) =>
      archive.append(f.contents, {
        name: f.path,
        prefix: versionDirName,
      }),
    ),
  )
  .then(() => archive.finalize())
  .catch(console.error);

/**
 * @param {ArchiveFile} file
 */
function foundReporter(file) {
  if (!process.stdout.isTTY) return;
  let outString = [
    "🔍 ",
    chalk.yellow("Found"),
    chalk.magenta(fileCount),
    chalk.yellow("files..."),
    chalk.gray(`(Uncompressed: ${filesize(inBytes)}) `),
  ].join(" ");

  /**
   * calculate width of terminal then shorten paths
   */
  const cols = process.stdout.columns - stringLength(outString) - 1;
  outString += chalk.blue(cliTruncate(file.path, cols, { position: "middle" }));

  if (fileCount % 25 == 0) {
    clearLine(process.stdout, 0);
    cursorTo(process.stdout, 0);
    process.stdout.write(outString);
  }
}

function finishReporter() {
  const outBytes = archive.pointer();
  const end = process.hrtime(start);
  const duration = prettierHrtime(end);
  const savedBytes = inBytes - outBytes;
  const savedPercent = ((1 - outBytes / inBytes) * 100).toFixed(2);

  clearLine(process.stdout, 0);
  cursorTo(process.stdout, 0);

  console.log(
    "🔍 ",
    chalk.yellow("Found"),
    chalk.magenta(fileCount),
    chalk.yellow("files"),
    chalk.gray(`(Uncompressed: ${filesize(inBytes)})`),
  );
  console.log(
    "👀 ",
    chalk.yellow("Webpack Bundle Analyzer report:"),
    chalk.magenta("webpack/stats/index.html"),
  );
  console.log(
    "📦 ",
    chalk.yellow("Created"),
    chalk.magenta(filesize(outBytes)),
    chalk.yellow("Zip archive"),
    chalk.gray(`(Saved ${filesize(savedBytes)}, ${savedPercent}%)`),
  );
  console.log(
    "🎁 ",
    chalk.yellow("Theme archive"),
    chalk.magenta(
      `${basename(dirname(zipFile.pathname))}/${chalk.bold(zipFileName)}`,
    ),
    chalk.yellow("created in"),
    chalk.magenta(duration),
  );
  console.log("⏳");
  console.log(
    "🚀 ",
    chalk.bold(`Remember to push to ${chalk.cyan("GitHub!")}`),
  );
  console.log("✨");
}
