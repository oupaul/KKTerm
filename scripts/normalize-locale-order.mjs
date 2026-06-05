#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = path.join(rootDir, "src", "i18n", "locales");
const sourceLocale = "en.json";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function orderLikeSource(localeValue, sourceValue) {
  if (!isRecord(localeValue) || !isRecord(sourceValue)) {
    return localeValue;
  }

  const ordered = {};
  for (const key of Object.keys(sourceValue)) {
    if (Object.prototype.hasOwnProperty.call(localeValue, key)) {
      ordered[key] = orderLikeSource(localeValue[key], sourceValue[key]);
    }
  }

  for (const key of Object.keys(localeValue)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = localeValue[key];
    }
  }

  return ordered;
}

async function readJsonWithEol(fileName) {
  const filePath = path.join(localesDir, fileName);
  const text = await readFile(filePath, "utf8");
  return {
    data: JSON.parse(text),
    eol: text.includes("\r\n") ? "\r\n" : "\n",
  };
}

const localeFiles = (await readdir(localesDir))
  .filter((name) => name.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b, "en"));

const { data: source } = await readJsonWithEol(sourceLocale);

for (const fileName of localeFiles) {
  if (fileName === sourceLocale) {
    continue;
  }

  const { data: locale, eol } = await readJsonWithEol(fileName);
  const ordered = orderLikeSource(locale, source);
  await writeFile(
    path.join(localesDir, fileName),
    `${JSON.stringify(ordered, null, 2).replace(/\n/g, eol)}${eol}`,
    "utf8",
  );
  console.log(`${fileName}: normalized`);
}
