import products from "@/data/products.json";

function slugify(text: string) {
  return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

export function generateStaticParams() {
  const categories = Array.from(new Set(products.map(p => p.category)));
  return categories.map((category) => ({
    slug: slugify(category),
  }));
}

export const dynamicParams = false;

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
