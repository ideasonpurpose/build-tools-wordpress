#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";

const { name } = JSON.parse(readFileSync("package.json", "utf8"));
await rm(`wp-content/themes/${name}/dist`, { recursive: true, force: true });
