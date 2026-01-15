import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

const target = ".next/server/middleware.js.nft.json";

if (!existsSync(target)) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ version: 1, files: [] }, null, 2));
  console.log(`[postbuild] Created missing ${target}`);
} else {
  console.log(`[postbuild] ${target} already exists`);
}
