"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { InstagramCarousel } from "@/components/product/InstagramCarousel";
import products from "@/data/products.json";
import { ArrowRight, CheckCircle, Truck, ShieldCheck, Star, Instagram } from "lucide-react";

export default function Home() {
  // Filter single-mundus featured products (price 1999)
  const featuredSingleMundus = products.filter(p => 
    p.isFeatured && 
    p.category === "Single Mundus" && 
    p.price === 1999
  );

  return (
    <>
      {/* Hero Section - Fullscreen Cover Image */}
      <section className="hero-section relative -mt-24 pt-24 h-screen flex items-center justify-center overflow-hidden">
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
        <div className="hero-section__content container mx-auto px-4 max-w-7xl relative z-20 text-center space-y-3 max-w-4xl">
          <span className="hero-section__badge inline-block px-4 py-1.5 border border-white/30 rounded-full text-sm tracking-widest uppercase font-medium bg-white/20 backdrop-blur-sm text-white">
            Est. 1990 • Authentic Kerala Handloom
          </span>
          <div className="hero-section__logo-wrapper flex justify-center">
            <Image
              src="/Khadi Vasthra White Transparnt.png"
              alt="Khadi Vasthra Logo"
              width={500}
              height={200}
              className="hero-section__logo h-auto w-full max-w-md md:max-w-lg lg:max-w-xl object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <p className="hero-section__description text-xl md:text-2xl text-white/95 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md">
            Discover the finest collection of handcrafted Mundus and Dhotis, brought to you directly from the artisans of Aluva.
          </p>
          <div className="hero-section__actions flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="#featured-collection" className="hero-section__cta-primary">
              <Button size="lg" variant="secondary" className="font-bold min-w-[200px] h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white text-[#EA4C6B] hover:bg-cream">
                Shop Now
              </Button>
            </a>
            <Link href="/contact" className="hero-section__cta-secondary">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#EA4C6B] min-w-[200px] h-14 text-lg font-semibold hover:-translate-y-1 transition-all duration-300">
                Visit Our Store
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="main-content flex flex-col gap-16 pb-16 relative z-10 bg-white">
      {/* Featured Products - White bg, cream cards */}
      <section id="featured-collection" className="featured-collection-section bg-white container mx-auto px-4 max-w-7xl py-12 scroll-mt-24">
        <div className="featured-collection-section__header flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="featured-collection-section__header-content space-y-4">
            <h2 className="featured-collection-section__title text-4xl font-bold text-text font-serif">Featured Collection</h2>
            <div className="featured-collection-section__divider h-1 w-20 bg-coral rounded-full"></div>
            <p className="featured-collection-section__description text-text-muted text-lg max-w-xl">Handpicked favorites that represent the pinnacle of our craftsmanship. Perfect for weddings, festivals, and daily elegance.</p>
          </div>
          <Link href="/products" className="featured-collection-section__view-all-link hidden md:block">
            <Button variant="ghost" className="text-text hover:text-coral group text-lg font-medium hover:bg-cream/50">
              View All Collection <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="featured-collection-section__carousel">
          <ProductCarousel products={featuredSingleMundus} />
        </div>

        <div className="featured-collection-section__footer mt-12 text-center">
          <Link href="/products" className="featured-collection-section__cta-link">
            <Button variant="outline" className="w-full md:w-auto h-12 text-lg px-8">View All Products</Button>
          </Link>
        </div>
      </section>

      {/* About Section - Cream bg, white cards */}
      <section className="about-section bg-cream py-24 relative overflow-hidden">
        <div className="about-section__container container mx-auto px-4 max-w-7xl grid md:grid-cols-2 gap-16 items-center relative z-10">
          <div className="about-section__image-wrapper relative h-[500px] rounded-2xl overflow-hidden shadow-lg border border-cream/50">
            {/* Using a placeholder that looks more like fabric/weaving */}
            <Image
              src="https://placehold.co/800x1000/F5E6D3/1A1A1A?text=Our+Heritage"
              alt="Handloom weaving heritage"
              fill
              className="about-section__image object-cover hover:scale-105 transition-transform duration-700"
            />
            <div className="about-section__badge absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-lg border border-cream/50">
              <div className="about-section__badge-content flex items-center gap-4">
                <div className="about-section__badge-icon bg-coral p-3 rounded-full">
                  <Star className="h-6 w-6 text-white fill-current" />
                </div>
                <div className="about-section__badge-text">
                  <p className="text-sm text-coral uppercase tracking-wider font-bold">Trusted Legacy</p>
                  <p className="text-text font-serif text-lg">Over 30 Years of Excellence</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-section__content space-y-8">
            <span className="about-section__label text-coral font-bold tracking-widest text-sm uppercase flex items-center gap-2">
              <span className="w-8 h-px bg-coral"></span> Our Story
            </span>
            <h2 className="about-section__title text-5xl font-bold text-text font-serif leading-tight">Preserving the Art <br /> of <span className="text-coral italic">Kerala Handloom</span></h2>
            <p className="about-section__description text-text-muted leading-loose text-lg">
              Khadi Vasthra is more than just a store; it's a celebration of Kerala's rich textile heritage.
              Located in the heart of Aluva, we have been bridging the gap between traditional weavers and modern lifestyles since 1990.
            </p>
            <p className="about-section__description-secondary text-text-muted leading-loose text-lg">
              Every thread in our mundus tells a story of patience, skill, and dedication. We take pride in sourcing directly
              from master weavers, ensuring that the art form thrives while you get the most authentic quality.
            </p>

            <div className="about-section__features pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "100% Pure Cotton",
                "Authentic Khadi Mark",
                "Direct Weaver Support",
                "Traditional Techniques"
              ].map((item, i) => (
                <div key={i} className="about-section__feature-item flex items-center gap-3 bg-white p-4 rounded-lg border border-cream/50">
                  <CheckCircle className="h-5 w-5 text-coral" />
                  <span className="font-medium text-text">{item}</span>
                </div>
              ))}
            </div>

            <div className="about-section__cta pt-4">
              <Link href="/contact">
                <Button variant="outline" className="h-12 px-8 font-semibold">Read More About Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - White bg */}
      <section className="why-choose-section bg-white container mx-auto px-4 max-w-7xl py-12">
        <div className="why-choose-section__header text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="why-choose-section__title text-4xl font-bold text-text font-serif">Why Choose Khadi Vasthra?</h2>
          <div className="why-choose-section__divider h-1 w-20 bg-coral mx-auto rounded-full"></div>
          <p className="why-choose-section__description text-text-muted">We promise not just a product, but an experience of tradition and quality.</p>
        </div>

        <div className="why-choose-section__features grid md:grid-cols-3 gap-8">
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

      {/* Promo Banner - Coral pink bg, white text */}
      <section className="promo-banner-section bg-coral text-white py-20 relative overflow-hidden">
        <div className="promo-banner-section__container container mx-auto px-4 max-w-7xl relative z-10 text-center">
          <h2 className="promo-banner-section__title text-3xl md:text-5xl font-bold font-serif mb-6">Special Offer This Season</h2>
          <p className="promo-banner-section__description text-white/90 max-w-2xl mx-auto text-lg mb-10">
            Get 10% off on all orders above ₹2000. Use code TRADITION10 at checkout.
          </p>
          <Link href="/products" className="promo-banner-section__cta">
            <Button size="lg" variant="secondary" className="font-bold h-14 px-10 text-lg shadow-lg">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>



      {/* Instagram Video Showcase - White bg with 9:16 Phone Mockups */}
      <section className="instagram-section bg-white container mx-auto px-4 max-w-7xl py-16 rounded-3xl mb-12 shadow-sm border border-cream/30">
        <div className="instagram-section__header text-center mb-12">
          <h2 className="instagram-section__title text-4xl font-bold text-text font-serif mb-4">Trending on Instagram</h2>
          <p className="instagram-section__description text-text-muted text-lg">Follow us @khadivasthra for styling tips and new arrivals</p>
        </div>

        <div className="instagram-section__carousel">
          <InstagramCarousel 
            posts={[
              { id: 'DSLG5swkxMZ', type: 'embed' },
              { id: 'DRxcwWFE-69', type: 'embed' },
              { id: 'DRho1QQj4ca', type: 'embed' },
              { id: 'DRXsHKxE4FV', type: 'embed' },
              { id: 'DQ9quGyj4Ez', type: 'embed' }
            ]}
            autoplayInterval={5000}
          />
        </div>

        <div className="instagram-section__footer mt-10 text-center">
          <a href="https://instagram.com/khadivasthra" target="_blank" rel="noopener noreferrer" className="instagram-section__follow-link">
            <Button variant="outline" className="gap-2 font-bold h-12 px-8">
              <Instagram className="h-5 w-5" /> Follow Us on Instagram
            </Button>
          </a>
        </div>
      </section>

      {/* Newsletter / CTA Section - Cream bg, orange subscribe button */}
      <section className="cta-section bg-cream py-20 relative overflow-hidden">
        <div className="cta-section__container container mx-auto px-4 max-w-7xl relative z-10 text-center">
          <h2 className="cta-section__title text-3xl md:text-5xl font-bold font-serif mb-6 text-text">Ready to Experience Tradition?</h2>
          <p className="cta-section__description text-text-muted max-w-2xl mx-auto text-lg mb-10">
            Explore our exclusive collection of white, off-white, and colored mundus. Perfect for weddings, festivals, and daily wear.
          </p>
          <Link href="/products" className="cta-section__link">
            <Button size="lg" variant="secondary" className="font-bold h-14 px-10 text-lg shadow-lg">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>
      </div>
    </>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="feature-card group bg-white p-8 rounded-2xl shadow-sm border border-cream/30 text-center hover:shadow-md hover:border-coral/30 transition-all duration-300 transform hover:-translate-y-2">
      <div className="feature-card__icon-wrapper flex justify-center mb-6 bg-coral group-hover:bg-coral-dark p-5 rounded-full w-20 h-20 mx-auto items-center transition-colors shadow-lg shadow-coral/20">
        {icon}
      </div>
      <h3 className="feature-card__title text-xl font-bold mb-4 text-text font-serif">{title}</h3>
      <p className="feature-card__description text-text-muted leading-relaxed">{description}</p>
    </div>
  )
}
