import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const PRODUCTS_JSON = path.join(PUBLIC_DIR, "data", "products.json");

function walkPngs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkPngs(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      results.push(full);
    }
  }
  return results;
}

async function convert(filePath: string): Promise<void> {
  const webpPath = filePath.replace(/\.png$/i, ".webp");
  const rel = path.relative(PUBLIC_DIR, filePath);

  if (fs.existsSync(webpPath) && !fs.existsSync(filePath)) {
    return;
  }

  if (fs.existsSync(webpPath)) {
    fs.unlinkSync(filePath);
    console.log(`  skip  ${rel} (webp exists)`);
    return;
  }

  const beforeKB = Math.round(fs.statSync(filePath).size / 1024);
  await sharp(filePath).webp({ quality: 85 }).toFile(webpPath);
  const afterKB = Math.round(fs.statSync(webpPath).size / 1024);
  fs.unlinkSync(filePath);

  const saved = Math.round((1 - afterKB / beforeKB) * 100);
  console.log(`  ✓  ${rel}  ${beforeKB}KB → ${afterKB}KB  (-${saved}%)`);
}

function updateJson(jsonPath: string): void {
  if (!fs.existsSync(jsonPath)) return;
  const before = fs.readFileSync(jsonPath, "utf-8");
  const after = before.replace(/\.png(?=['"\\])/g, ".webp");
  if (before !== after) {
    fs.writeFileSync(jsonPath, after);
    console.log("  ✓  public/data/products.json updated");
  }
}

async function main() {
  const pngs = walkPngs(PUBLIC_DIR);
  if (pngs.length === 0) {
    console.log("convert-to-webp: no PNGs found, skipping");
    return;
  }

  console.log(`convert-to-webp: converting ${pngs.length} PNG(s)`);
  for (const f of pngs) {
    await convert(f);
  }
  updateJson(PRODUCTS_JSON);
  console.log("convert-to-webp: done\n");
}

main().catch((err) => {
  console.error("convert-to-webp failed:", err);
  process.exit(1);
});
