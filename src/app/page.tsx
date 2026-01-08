"use client";

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import staticProducts from "@/data/products.json";

// Product type
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(staticProducts as Product[]);

  // Load products from localStorage if admin made changes
  useEffect(() => {
    const savedData = localStorage.getItem("khadi_admin_products");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const prods = parsed.products || parsed;
        if (Array.isArray(prods) && prods.length > 0) {
          setProducts(prods);
        }
      } catch (e) {
        console.error("Failed to load saved products", e);
      }
    }
  }, []);

  // Get all featured products
  const featuredProducts = products.filter(p => p.isFeatured);
  
  // Get best selling products
  const bestSelling = products.filter(p => p.isBestSeller).slice(0, 7);
  
  // Categories for top category section
  const categories = [
    { name: "White Mundus", image: "/images/mundu-white.png", slug: "white-mundus" },
    { name: "Kavi", image: "/images/mundu-gold.png", slug: "kavi-mundus" },
    { name: "Printed", image: "/images/mundu-pink.png", slug: "printed-mundus" },
    { name: "Double", image: "/images/mundu-saffron.png", slug: "double-mundus" },
  ];

  return (
    <>
      {/* Hero Section - Fullscreen Cover Image */}
      <section className="hero-section relative pt-20 h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <Image
          src="/Cover KV.webp"
          alt="Khadi Vasthra Cover"
          fill
          className="hero-section__background-image object-cover z-0"
          priority
          quality={90}
        />
        {/* Dark Overlay for Text Readability */}
        <div className="hero-section__overlay absolute inset-0 bg-black/30 z-0"></div>
        {/* Content */}
        <div className="hero-section__content container mx-auto px-4 max-w-7xl relative z-20 text-center space-y-1.5 max-w-4xl">
          <span className="hero-section__badge inline-block px-2 py-0.5 border border-white/30 rounded-full text-xs tracking-widest uppercase font-medium bg-white/20 backdrop-blur-sm text-white mb-4">
            Est. 1990
          </span>
          <div className="hero-section__logo-wrapper flex justify-center mb-4">
            <Image
              id="hero-logo"
              src="/Khadi Vasthra White Transparnt.png"
              alt="Khadi Vasthra Logo"
              width={300}
              height={120}
              className="hero-section__logo h-auto w-full max-w-[200px] md:max-w-[250px] lg:max-w-[300px] object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <p className="hero-section__description text-sm md:text-base text-white/95 max-w-[30%] mx-auto font-light leading-relaxed drop-shadow-md mb-4">
            Discover the finest collection of handcrafted Mundus and Dhotis, brought to you directly from the artisans of Aluva.
          </p>
          <div className="hero-section__actions flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/products" className="hero-section__cta-primary">
              <Button size="lg" variant="secondary" className="font-bold min-w-[100px] h-12 text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-orange text-white hover:bg-orange-dark">
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products - Cream bg */}
      <section className="featured-section bg-cream py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-coral/10 text-coral text-sm font-semibold rounded-full mb-4">
              ⭐ Handpicked for You
            </span>
            <h2 className="featured-section__title text-4xl font-bold text-text font-serif">
              Featured Products
            </h2>
            <p className="text-text-muted mt-2 max-w-xl mx-auto">
              Our finest selection of premium mundus, chosen for their exceptional quality and craftsmanship
            </p>
          </div>
          {featuredProducts.length > 0 ? (
            <ProductCarousel products={featuredProducts} showHeart={true} />
          ) : (
            <p className="text-center text-text-muted py-12">No featured products yet.</p>
          )}
        </div>
      </section>

      {/* Three Banners - White bg */}
      <section className="banners-section bg-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Banner 1: Festival Collection */}
            <div className="banner-card relative h-64 rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-coral/80 to-coral/60 z-10"></div>
              <div className="relative z-20 h-full flex flex-col items-center justify-center text-white p-6">
                <h3 className="text-3xl font-bold font-serif mb-2">Festival Collection</h3>
                <p className="text-white/90 text-center">Celebrate traditions</p>
              </div>
            </div>
            
            {/* Banner 2: 25% Off */}
            <div className="banner-card relative h-64 rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/80 to-orange/60 z-10"></div>
              <div className="relative z-20 h-full flex flex-col items-center justify-center text-white p-6">
                <h3 className="text-5xl font-bold font-serif mb-2">25% Off</h3>
                <p className="text-white/90 text-center">Limited time offer</p>
              </div>
            </div>
            
            {/* Banner 3: New Arrivals */}
            <div className="banner-card relative h-64 rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-cream/80 to-cream/60 z-10"></div>
              <div className="relative z-20 h-full flex flex-col items-center justify-center text-text p-6">
                <h3 className="text-3xl font-bold font-serif mb-2">New Arrivals</h3>
                <p className="text-text-muted text-center">Latest designs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Category - White bg */}
      <section className="category-section bg-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="category-section__title text-4xl font-bold text-text font-serif text-center mb-12">
            Top Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <Link key={index} href={`/products/${category.slug}`} className="category-card group">
                <div className="category-card__image-wrapper relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="category-card__name text-center text-lg font-semibold text-text group-hover:text-coral transition-colors">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Best Selling - Cream bg, Masonry Grid */}
      <section className="bestselling-section bg-cream py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="bestselling-section__title text-4xl font-bold text-text font-serif text-center mb-12">
            Best Selling
          </h2>
          <div className="bestselling-section__grid grid md:grid-cols-3 gap-6">
            {/* Large left product */}
            {bestSelling[0] && (
              <div className="md:col-span-1 md:row-span-2">
                <ProductCard product={bestSelling[0]} variant="white" />
              </div>
            )}
            
            {/* 4 small right products */}
            <div className="md:col-span-2 grid grid-cols-2 gap-6">
              {bestSelling.slice(1, 5).map((product) => (
                <ProductCard key={product.id} product={product} variant="white" />
              ))}
            </div>
            
            {/* 3 products below */}
            <div className="md:col-span-3 grid md:grid-cols-3 gap-6">
              {bestSelling.slice(5, 8).map((product) => (
                <ProductCard key={product.id} product={product} variant="white" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Marquee - Coral bg */}
      <section className="marquee-section bg-coral py-6 overflow-hidden">
        <div className="marquee-container flex whitespace-nowrap">
          <div className="marquee-content flex animate-scroll">
            <span className="text-white text-2xl font-bold mx-8">Welcome to our store</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Authentic Kerala Handloom</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Premium Quality Mundus</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Welcome to our store</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Authentic Kerala Handloom</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Premium Quality Mundus</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
          </div>
          <div className="marquee-content flex animate-scroll" aria-hidden="true">
            <span className="text-white text-2xl font-bold mx-8">Welcome to our store</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Authentic Kerala Handloom</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Premium Quality Mundus</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Welcome to our store</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Authentic Kerala Handloom</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
            <span className="text-white text-2xl font-bold mx-8">Premium Quality Mundus</span>
            <span className="text-white text-2xl font-bold mx-8">•</span>
          </div>
        </div>
      </section>

      {/* About Section - White bg */}
      <section className="about-section bg-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Image */}
            <div className="about-section__image-wrapper relative h-[500px] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/Cover KV.webp"
                alt="Khadi Vasthra Heritage"
                fill
                className="object-cover"
              />
            </div>
            
            {/* Right: Text Content */}
            <div className="about-section__content space-y-6">
              <span className="about-section__badge inline-block px-4 py-2 bg-orange text-white font-bold text-sm uppercase tracking-wider rounded-full">
                Since 1990
              </span>
              <h2 className="about-section__title text-4xl md:text-5xl font-bold text-text font-serif leading-tight">
                Preserving Kerala's Handloom Heritage
              </h2>
              <p className="about-section__description text-lg text-text-muted leading-relaxed">
                Khadi Vasthra is more than just a store; it's a celebration of Kerala's rich textile heritage.
                Located in the heart of Aluva, we have been bridging the gap between traditional weavers and modern lifestyles since 1990.
              </p>
              <p className="about-section__description-secondary text-lg text-text-muted leading-relaxed">
                Every thread in our mundus tells a story of patience, skill, and dedication. We take pride in sourcing directly
                from master weavers, ensuring that the art form thrives while you get the most authentic quality.
              </p>
              <div className="about-section__cta pt-4">
                <Link href="/contact">
                  <Button size="lg" className="bg-coral hover:bg-coral-dark text-white font-bold h-12 px-8">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
