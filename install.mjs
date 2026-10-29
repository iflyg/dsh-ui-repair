/**
 * Install `dsh-ui-repair` into the desktop profile.
 *
 * Mirrors install.mjs from dsh-installed-inventory: back up the two manifest
 * files, copy the package, then register it as both a dependency and a bundle.
 * The Loader merges the package's own `cordis.patch.yml` (`- insert:`) into the
 * load tree, so the profile patch file itself is not edited.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const profileDir = "E:/DeepSeek Harness/.dsh/profiles/desktop";
const sourceDir = "C:/Users/Tofei8.cn/WorkBuddy/2026-10-28-20-46-51/dsh-ui-repair";
const pkgName = "dsh-ui-repair";
const targetDir = join(profileDir, "node_modules", pkgName);
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const backupDir = join("E:/DeepSeek Harness/.dsh", `repair-backup-${stamp}-uirepair`);
const manifestPath = join(profileDir, "package.json");

mkdirSync(backupDir, { recursive: true });
cpSync(manifestPath, join(backupDir, "package.json"));
cpSync(join(profileDir, "cordis.patch.yml"), join(backupDir, "cordis.patch.yml"));

if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
for (const entry of ["lib", "package.json", "cordis.patch.yml", "README.md", "LICENSE"]) {
  cpSync(join(sourceDir, entry), join(targetDir, entry), { recursive: true });
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const before = {
  deps: Object.keys(manifest.dependencies ?? {}).length,
  bundles: (manifest.dsh?.profile?.bundles ?? []).length,
};
manifest.dependencies = manifest.dependencies ?? {};
manifest.dependencies[pkgName] = `file:${sourceDir.replace(/\\/g, "/")}`;
manifest.dsh = manifest.dsh ?? {};
manifest.dsh.profile = manifest.dsh.profile ?? {};
manifest.dsh.profile.bundles = manifest.dsh.profile.bundles ?? [];
if (!manifest.dsh.profile.bundles.includes(pkgName)) manifest.dsh.profile.bundles.push(pkgName);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const after = JSON.parse(readFileSync(manifestPath, "utf8"));
console.log("backup:", backupDir);
console.log("installed:", targetDir);
console.log("deps", before.deps, "->", Object.keys(after.dependencies).length);
console.log("bundles", before.bundles, "->", after.dsh.profile.bundles.length);
console.log("in bundles:", after.dsh.profile.bundles.includes(pkgName));
