import Link from "next/link";
import Image from "next/image";
import products from "@/data/products.json";

const COLLECTIONS = [
  {
    name: "White Mundus",
    slug: "white-mundus",
    description: "Traditional white mundus for daily wear and special occasions",
    image: "/images/products/white-mundus/single-white-mundu-with-kasavu/mundu-gold.png",
  },
  {
    name: "Kavi Mundus",
    slug: "kavi-mundus",
    description: "Traditional saffron colored mundus for temple visits and rituals",
    image: "/images/products/kavi-mundus/cotton-kavi-dhoti/mundu-saffron.png",
  },
  {
    name: "Printed Mundus",
    slug: "printed-mundus",
    description: "Hand block printed mundus featuring traditional Kerala motifs",
    image: "/images/products/printed-mundus/floral-printed-cotton-mundu/mundu-white.png",
  },
  {
    name: "4.5m Double Mundus",
    slug: "double-mundus",
    description: "Extra length double mundus for traditional draping",
    image: "/images/products/4-5m-double-mundus/silver-kasavu-double-mundu/mundu-gold.png",
  },
  {
    name: "Single Mundus",
    slug: "single-mundus",
    description: "Single length mundus and dhotis for everyday use",
    image: "/images/products/single-mundus/premium-single-dhoti/mundu-white.png",
  },
  {
    name: "Offwhite Mundus",
    slug: "offwhite-mundus",
    description: "Off-white and cream colored mundus",
    image: "/images/products/offwhite-mundus/cream-cotton-mundu/mundu-white.png",
  },
  {
    name: "Yellow Double Mundus",
    slug: "yellow-double-mundus",
    description: "Yellow and golden colored mundus for festive occasions",
    image: "/images/products/yellow-double-mundus/mustard-yellow-mundu/mundu-white.png",
  },
  {
    name: "Festive Collection",
    slug: "festive-collection",
    description: "Special collection for festivals and celebrations",
    image: "/images/card covers/festival collection.png",
  },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

export default function CollectionsPage() {
  return (
    <div className="collections-page min-h-screen bg-cream">
      {/* Hero Banner */}
      <div className="bg-coral/10 py-12">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text font-serif mb-4">
            Our Collections
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Browse our curated collections of authentic Kerala handloom mundus,
            organized by style and tradition.
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {COLLECTIONS.map((collection) => {
            const productCount = products.filter(
              (p) => slugify(p.category) === collection.slug
            ).length;

            return (
              <Link
                key={collection.slug}
                href={`/shop/${collection.slug}`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300">
                  {/* Collection Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>

                  {/* Collection Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h2 className="text-xl md:text-2xl font-bold text-white font-serif mb-1">
                      {collection.name}
                    </h2>
                    <p className="text-white/80 text-sm mb-2">
                      {collection.description}
                    </p>
                    <span className="text-white/70 text-xs">
                      {productCount} {productCount === 1 ? "product" : "products"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
