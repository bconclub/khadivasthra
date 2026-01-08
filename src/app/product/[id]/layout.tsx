import products from "@/data/products.json";

export function generateStaticParams() {
  return products.map((product) => ({
    id: product.id,
  }));
}

export const dynamicParams = false;

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
