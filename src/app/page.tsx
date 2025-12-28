import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { ArrowRight, CheckCircle, Truck, ShieldCheck } from "lucide-react";

export default function Home() {
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 8); // Show 8 for better grid

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center bg-primary text-secondary overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>

        <div className="container-custom relative z-10 text-center space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Authentic Khadi <br /> Mundus from Kerala
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-light">
            Experience the elegance of tradition with our premium collection of hand-woven mundus and dhotis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/products">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-primary font-bold min-w-[200px] h-14 text-lg">
                Shop Collection
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 min-w-[200px] h-14 text-lg">
                Visit Our Store
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-primary">Featured Collection</h2>
            <p className="text-text-muted mt-2">Handpicked favorites from our weavers</p>
          </div>
          <Link href="/products" className="hidden md:block">
            <Button variant="ghost" className="text-primary hover:text-primary-dark group">
              View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-8 text-center md:hidden">
          <Link href="/products">
            <Button variant="outline" className="w-full">View All Products</Button>
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white py-16">
        <div className="container-custom grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-[400px] rounded-lg overflow-hidden bg-gray-200 shadow-xl">
            {/* Simple Placeholder Image for About */}
            <Image
              src="https://placehold.co/800x600/F5F5F5/800000?text=Khadi+Weaving"
              alt="Handloom weaving"
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-6">
            <span className="text-accent font-bold tracking-wider text-sm uppercase">Our Story</span>
            <h2 className="text-4xl font-bold text-primary">Preserving Tradition since 1990</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              Khadi Vasthra is more than just a store; it's a celebration of Kerala's rich textile heritage.
              Located in the heart of Aluva, we bring you the finest hand-woven fabrics directly from skilled artisans.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Each mundu tells a story of craftsmanship and dedication. We ensure that every piece meets the highest standards of quality and authenticity.
            </p>
            <ul className="space-y-3 pt-2">
              <li className="flex items-center space-x-3 text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>100% Cotton & Authentic Khadi</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Direct from Handloom Weavers</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Traditional & Contemporary Designs</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container-custom">
        <h2 className="text-3xl font-bold text-primary text-center mb-12">Why Choose Khadi Vasthra?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<ShieldCheck className="h-10 w-10 text-primary" />}
            title="Premium Quality"
            description="We strictly maintain quality checks to ensure you get only the best fabric."
          />
          <FeatureCard
            icon={<Truck className="h-10 w-10 text-primary" />}
            title="Fast Delivery"
            description="We ensure your orders are packed with care and delivered to you on time via reliable partners."
          />
          <FeatureCard
            icon={<CheckCircle className="h-10 w-10 text-primary" />}
            title="Authentic Sourcing"
            description="Sourced directly from traditional weavers to support the local handloom community."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-orange-100 text-center hover:shadow-md transition-shadow">
      <div className="flex justify-center mb-6 bg-secondary p-4 rounded-full w-20 h-20 mx-auto items-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
