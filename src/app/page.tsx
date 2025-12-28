"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { ArrowRight, CheckCircle, Truck, ShieldCheck, Star, Instagram } from "lucide-react";

export default function Home() {
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 8); // Show 8 for better grid

  return (
    <div className="flex flex-col gap-16 pb-16">

      {/* Hero Section */}
      <section className="relative h-[700px] flex items-center justify-center bg-primary text-secondary overflow-hidden">
        {/* Luxury Pattern Background */}
        <div className="absolute inset-0 bg-luxury-pattern opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent"></div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10 text-center space-y-8 max-w-4xl">
          <span className="inline-block px-4 py-1.5 border border-white/30 rounded-full text-sm tracking-widest uppercase font-medium bg-white/5 backdrop-blur-sm">
            Est. 1990 • Authentic Kerala Handloom
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none font-serif text-white">
            Elegance Woven <br /> in Tradition
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed">
            Discover the finest collection of handcrafted Mundus and Dhotis, brought to you directly from the artisans of Aluva.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Link href="/products">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white border-none font-bold min-w-[200px] h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                Shop Collection
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary min-w-[200px] h-14 text-lg font-semibold hover:-translate-y-1 transition-all duration-300">
                Visit Our Store
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 max-w-7xl py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-primary font-serif">Featured Collection</h2>
            <div className="h-1 w-20 bg-accent rounded-full"></div>
            <p className="text-text-muted text-lg max-w-xl">Handpicked favorites that represent the pinnacle of our craftsmanship. Perfect for weddings, festivals, and daily elegance.</p>
          </div>
          <Link href="/products" className="hidden md:block">
            <Button variant="ghost" className="text-primary hover:text-accent group text-lg font-medium hover:bg-primary/5">
              View All Collection <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 text-center md:hidden">
          <Link href="/products">
            <Button variant="outline" className="w-full h-12 text-lg border-primary text-primary hover:bg-primary hover:text-white">View All Products</Button>
          </Link>
        </div>
      </section>

      {/* About Section - Redesigned */}
      <section className="bg-white py-24 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>

        <div className="container mx-auto px-4 max-w-7xl grid md:grid-cols-2 gap-16 items-center relative z-10">
          <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
            {/* Using a placeholder that looks more like fabric/weaving */}
            <Image
              src="https://placehold.co/800x1000/F5E6D3/3D2314?text=Our+Heritage"
              alt="Handloom weaving heritage"
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-lg border border-primary/10">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-full">
                  <Star className="h-6 w-6 text-white fill-current" />
                </div>
                <div>
                  <p className="text-sm text-primary uppercase tracking-wider font-bold">Trusted Legacy</p>
                  <p className="text-gray-900 font-serif text-lg">Over 30 Years of Excellence</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <span className="text-accent font-bold tracking-widest text-sm uppercase flex items-center gap-2">
              <span className="w-8 h-px bg-accent"></span> Our Story
            </span>
            <h2 className="text-5xl font-bold text-primary font-serif leading-tight">Preserving the Art <br /> of <span className="text-accent italic">Kerala Handloom</span></h2>
            <p className="text-gray-700 leading-loose text-lg">
              Khadi Vasthra is more than just a store; it's a celebration of Kerala's rich textile heritage.
              Located in the heart of Aluva, we have been bridging the gap between traditional weavers and modern lifestyles since 1990.
            </p>
            <p className="text-gray-700 leading-loose text-lg">
              Every thread in our mundus tells a story of patience, skill, and dedication. We take pride in sourcing directly
              from master weavers, ensuring that the art form thrives while you get the most authentic quality.
            </p>

            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "100% Pure Cotton",
                "Authentic Khadi Mark",
                "Direct Weaver Support",
                "Traditional Techniques"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-secondary p-4 rounded-lg border border-primary/5">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary-dark">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link href="/contact">
                <Button variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-white h-12 px-8 font-semibold">Read More About Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Redesigned */}
      <section className="container mx-auto px-4 max-w-7xl py-12">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl font-bold text-primary font-serif">Why Choose Khadi Vasthra?</h2>
          <div className="h-1 w-20 bg-accent mx-auto rounded-full"></div>
          <p className="text-text-muted">We promise not just a product, but an experience of tradition and quality.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<ShieldCheck className="h-8 w-8 text-white" />}
            title="Premium Quality"
            description="Every piece undergoes rigorous quality checks to ensure you receive flawless fabric with superior texture and durability."
          />
          <FeatureCard
            icon={<Truck className="h-8 w-8 text-white" />}
            title="Fast Delivery"
            description="We dispatch orders within 24 hours, ensuring your traditional attire reaches you well before your special occasion."
          />
          <FeatureCard
            icon={<CheckCircle className="h-8 w-8 text-white" />}
            title="Authentic Sourcing"
            description="We eliminate middlemen by sourcing directly from traditional weaver societies, ensuring fair prices for you and them."
          />
        </div>
      </section>



      {/* Instagram Video Showcase */}
      <section className="container mx-auto px-4 max-w-7xl py-16 bg-white rounded-3xl mb-12 shadow-sm border border-secondary-dark">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary font-serif mb-4">Trending on Instagram</h2>
          <p className="text-text-muted text-lg">Follow us @khadivasthra for styling tips and new arrivals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {[
            'DSLG5swkxMZ',
            'DRxcwWFE-69',
            'DRho1QQj4ca',
            'DRXsHKxE4FV',
            'DQ9quGyj4Ez'
          ].map((id) => (
            <div key={id} className="rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">
              <iframe
                src={`https://www.instagram.com/p/${id}/embed`}
                className="w-full aspect-[4/5]"
                width="100%"
                height="480"
                frameBorder="0"
                scrolling="no"
                allowTransparency={true}
              ></iframe>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="https://instagram.com/khadivasthra" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white gap-2 font-bold h-12 px-8">
              <Instagram className="h-5 w-5" /> Follow Us on Instagram
            </Button>
          </a>
        </div>
      </section>

      {/* Newsletter / CTA Section */}
      <section className="bg-primary text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-luxury-pattern opacity-10"></div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold font-serif mb-6">Ready to Experience Tradition?</h2>
          <p className="text-white/80 max-w-2xl mx-auto text-lg mb-10">
            Explore our exclusive collection of white, off-white, and colored mundus. Perfect for weddings, festivals, and daily wear.
          </p>
          <Link href="/products">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100 font-bold h-14 px-10 text-lg shadow-lg">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>
    </div >
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group bg-white p-8 rounded-2xl shadow-sm border border-secondary-dark text-center hover:shadow-xl hover:border-accent/30 transition-all duration-300 transform hover:-translate-y-2">
      <div className="flex justify-center mb-6 bg-primary group-hover:bg-accent p-5 rounded-full w-20 h-20 mx-auto items-center transition-colors shadow-lg shadow-primary/20">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4 text-primary-dark font-serif">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
