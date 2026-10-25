import Generator from "yeoman-generator";
import fs from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import mergewith from "lodash.mergewith";
import {
  readJsonC,
  readJsonCSafe,
  mergeArray,
  sortPackageJson,
} from "../../utils/jsonFile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class extends Generator {
  _tplRoot = join(__dirname, "templates");
  _addRoot = join(__dirname, "additions");
  _ui5Root = __dirname;

  writing() {
    const appsRoot = join(this.destinationRoot(), "app");
    let appDirs = [];
    if (fs.existsSync(appsRoot)) {
      try {
        const entries = fs.readdirSync(appsRoot, {
          withFileTypes: true,
        });
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          const appDir = join(appsRoot, e.name);
          const ui5Yaml = join(appDir, "ui5.yaml");
          if (fs.existsSync(ui5Yaml)) {
            appDirs.push(appDir);
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Store for install() phase
    this._detectedUi5Apps = appDirs;

    if (appDirs.length === 0) {
      this.log(
        chalk.yellow(
          "⚠  No UI5 apps found. Run this generator from a CAP project root with apps in app/<name>/ (each with a ui5.yaml).",
        ),
      );
      return;
    }

    this.log(chalk.bold("🔎 The following apps were found:"));
    for (const appDir of appDirs) {
      this.log(` - ${basename(appDir)}`);
    }

    // Apply templates and merges to each detected UI5 app directory
    for (const appDir of appDirs) {
      // 1) Copy template files into appDir
      this.fs.copy(
        join(this._tplRoot, "eslint.config.mjs"),
        join(appDir, "eslint.config.mjs"),
      );
      this.fs.copy(
        join(this._tplRoot, "ui5lint.config.mjs"),
        join(appDir, "ui5lint.config.mjs"),
      );

      // 2) Merge additions
      // package.json
      const destPkgPath = join(appDir, "package.json");
      const srcPkgPath = join(this._addRoot, "package.json");
      const destPkg = readJsonCSafe(this, destPkgPath, {});
      const addPkg = readJsonC(srcPkgPath, {});
      const mergedPkg = mergewith({}, destPkg, addPkg, mergeArray);
      this.fs.writeJSON(destPkgPath, sortPackageJson(mergedPkg));

      // tsconfig.json - handle rootDir sentinel and union rootDirs
      const destTsPath = join(appDir, "tsconfig.json");
      const addTsPath = join(this._addRoot, "tsconfig.json");
      const destTs = readJsonCSafe(this, destTsPath, {});
      const addTs = readJsonC(addTsPath, {});
      if (!destTs.compilerOptions) destTs.compilerOptions = {};

      const addRootDir = addTs.compilerOptions
        ? addTs.compilerOptions.rootDir
        : undefined;
      if (addRootDir === "DELETE") {
        if (destTs.compilerOptions.rootDir)
          delete destTs.compilerOptions.rootDir;
      } else if (typeof addRootDir === "string") {
        destTs.compilerOptions.rootDir = addRootDir;
      }

      const desiredRootDirs =
        addTs.compilerOptions && Array.isArray(addTs.compilerOptions.rootDirs)
          ? addTs.compilerOptions.rootDirs
          : [];
      const currentRootDirs = Array.isArray(destTs.compilerOptions.rootDirs)
        ? destTs.compilerOptions.rootDirs
        : [];
      destTs.compilerOptions.rootDirs = Array.from(
        new Set([...currentRootDirs, ...desiredRootDirs]),
      );

      this.fs.writeJSON(destTsPath, destTs);
    }
  }

  install() {
    if (this.options.skipInstall) {
      return;
    }

    this.log(chalk.bold("\n📦 Installing npm dependencies for UI5 apps..."));
    const dependenciesPath = join(this._ui5Root, "dependencies.json");
    const dependencies = readJsonCSafe(this, dependenciesPath, {});
    const devDeps = Array.isArray(dependencies.devDependencies)
      ? dependencies.devDependencies
      : [];
    if (!this._detectedUi5Apps || this._detectedUi5Apps.length === 0) return;
    for (const appDir of this._detectedUi5Apps) {
      if (devDeps.length === 0) continue;
      this.spawnSync(
        "npm",
        ["install", "--save-dev", "--save-exact"].concat(devDeps),
        {
          cwd: appDir,
        },
      );
    }
  }

  end() {
    this.log(chalk.bold.green("\n ✅ UI5 best practices applied."));
    this.log("Next steps:");
    this.log("1) Review/commit the changes.");
  }
}
