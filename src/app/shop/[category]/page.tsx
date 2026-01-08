import products from "@/data/products.json";
import ShopCategoryClient from "./ShopCategoryClient";

function slugify(text: string) {
  return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

// Generate static params for all categories
export function generateStaticParams() {
  const categories = Array.from(new Set(products.map((p) => p.category)));
  return categories.map((category) => ({
    category: slugify(category),
  }));
}

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <ShopCategoryClient slug={category} />;
}
