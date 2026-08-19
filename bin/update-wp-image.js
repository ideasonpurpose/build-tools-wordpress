#!/usr/bin/env node
// @ts-check

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const WP_VERSION_URL =
  "https://raw.githubusercontent.com/ideasonpurpose/docker-wordpress-dev/refs/heads/master/wp-version.json";

const IMAGE_RE = /^([ \t]*image:[ \t]*&wp_img[ \t]+)\S+/m;

const composePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../tooling/docker-compose.yml",
);

const res = await fetch(WP_VERSION_URL);
if (!res.ok) {
  console.error(chalk.red(`Failed to fetch ${WP_VERSION_URL}: ${res.status}`));
  process.exit(1);
}

const { wordpress } = await res.json();
if (!wordpress) {
  console.error(chalk.red("wp-version.json is missing a wordpress version"));
  process.exit(1);
}

const yaml = await readFile(composePath, "utf8");
if (!IMAGE_RE.test(yaml)) {
  console.error(
    chalk.red("Could not find image: &wp_img in tooling/docker-compose.yml"),
  );
  process.exit(1);
}

const image = `ideasonpurpose/wordpress:${wordpress}`;
await writeFile(composePath, yaml.replace(IMAGE_RE, `$1${image}`));
console.log(
  "✅",
  chalk.green(`docker-compose WordPress image updated to ${image}`),
);
