#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import fs from "fs-extra";
import { readPackageUp } from "read-package-up";
import sortPackageJson from "sort-package-json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boilerplateDir = path.resolve(__dirname, "../boilerplate");

const GITIGNORE_URL =
  "https://gist.githubusercontent.com/joemaller/4f7518e0d04a82a3ca16/raw";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");

  const pkgInfo = await readPackageUp({
    cwd: process.cwd(),
    normalize: false,
  });
  if (!pkgInfo) {
    console.error(chalk.red("No package.json found. Run from a project root."));
    process.exit(1);
  }
  const projectRoot = path.dirname(pkgInfo.path);
  const projectPkg = pkgInfo.packageJson;

  if (!dryRun && !force) {
    try {
      const status = execSync("git status --porcelain --untracked-files=no", {
        cwd: projectRoot,
        encoding: "utf8",
      }).trim();
      if (status) {
        console.log(
          chalk.yellow(
            "⚠️  Working tree is dirty. Use --force to proceed or --dry-run to preview.",
          ),
        );
        return;
      }
    } catch {
      // no git, continue
    }
  }

  console.log(chalk.blue("Refreshing project tooling..."));

  // 1. Merge package.json
  const templatePkg = await fs.readJson(
    path.join(boilerplateDir, "package.json"),
  );
  // Drop scripts this package now manages so stale pre/post hooks don't block npm
  const managedKeys = Object.keys(projectPkg.scripts || {}).filter((k) =>
    ["bootstrap", "project:refresh"].some((n) => k.includes(n)),
  );

  for (const k of managedKeys) {
    delete projectPkg.scripts[k];
  }

  const keysToMerge = ["scripts", "dependencies", "devDependencies"];

  for (const key of keysToMerge) {
    if (templatePkg[key]) {
      projectPkg[key] = { ...(projectPkg[key] || {}), ...templatePkg[key] };
    }
  }

  // prettier and stylelint are simple enough to just overwrite directly
  if (templatePkg.prettier) {
    projectPkg.prettier = templatePkg.prettier;
  }
  if (templatePkg.stylelint) {
    projectPkg.stylelint = templatePkg.stylelint;
  }

  if (!dryRun) {
    await fs.writeJson(
      path.join(projectRoot, "package.json"),
      sortPackageJson(projectPkg),
      {
        spaces: 2,
      },
    );
    console.log(chalk.green("✓  Updated package.json"));
  } else {
    console.log(chalk.gray("--dry-run: would update package.json"));
  }

  // 2. docker-compose.yml stub (includes this package's tooling/docker-compose.yml)
  const composeSrc = path.join(boilerplateDir, "docker-compose.yml");
  const composeDest = path.join(projectRoot, "docker-compose.yml");
  if (!dryRun) {
    await fs.copy(composeSrc, composeDest, { overwrite: true });
    console.log(chalk.green("✓  Updated docker-compose.yml"));
  }

  // 3. webpack.config.js stub
  const webpackSrc = path.join(boilerplateDir, "webpack.config.js");
  const webpackDest = path.join(projectRoot, "webpack.config.js");

  if (!dryRun) {
    await fs.copy(webpackSrc, webpackDest, { overwrite: true });
    console.log(chalk.green("✓  Updated webpack.config.js"));
  }

  // 4. biome.json
  const biomeSrc = path.resolve(__dirname, "../biome.json");

  const biomeDest = path.join(projectRoot, "biome.json");
  if (!dryRun) {
    await fs.copy(biomeSrc, biomeDest, { overwrite: true });
    console.log(chalk.green("✓  Updated biome.json"));
  }

  // 5. svgo.config.mjs
  const svgoSrc = path.resolve(__dirname, "../config/svgo.config.mjs");

  const svgoDest = path.join(projectRoot, "svgo.config.mjs");
  if (!dryRun) {
    await fs.copy(svgoSrc, svgoDest, { overwrite: true });
    console.log(chalk.green("✓  Updated svgo.config.mjs"));
  }

  // 6. .env.sample
  const envSrc = path.join(boilerplateDir, ".env.sample");
  const envDest = path.join(projectRoot, ".env.sample");
  if (!dryRun) {
    await fs.copy(envSrc, envDest, { overwrite: true });
    console.log(chalk.green("✓  Updated .env.sample"));
  }

  // 7. .gitignore from gist
  try {
    const res = await fetch(GITIGNORE_URL);
    const gitignore = await res.text();
    if (!dryRun) {
      await fs.writeFile(path.join(projectRoot, ".gitignore"), gitignore);
      console.log(chalk.green("✓  Updated .gitignore from gist"));
    }
  } catch (e) {
    console.warn(chalk.yellow("Could not fetch .gitignore: " + e.message));
  }

  // 8. create dirs
  const dirs = ["_db", "wp-content/plugins", "wp-content/uploads"];

  for (const d of dirs) {
    const full = path.join(projectRoot, d);
    if (!(await fs.pathExists(full))) {
      if (!dryRun) await fs.mkdirp(full);
    }
  }

  // 9. composer.json if missing
  const composerSrc = path.join(boilerplateDir, "composer.json");
  const composerDest = path.join(projectRoot, "composer.json");
  if (!(await fs.pathExists(composerDest))) {
    if (!dryRun) {
      await fs.copy(composerSrc, composerDest);
      console.log(chalk.green("✓  Created composer.json"));
    }
  }

  // 10. Print next steps
  if (!dryRun) {
    console.log("");
    console.log(chalk.cyan("Run these to finish setup:"));
    console.log(chalk.cyan("  npm install"));
    console.log(chalk.cyan("  docker compose pull"));
    console.log(chalk.cyan("  npm run composer:update"));
  }

  if (dryRun) console.log(chalk.gray("Dry run complete."));
}

main().catch((e) => {
  console.error(chalk.red(e.message));

  process.exit(1);
});
