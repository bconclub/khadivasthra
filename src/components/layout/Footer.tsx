import Link from "next/link";
import Image from "next/image";
import { Instagram, Phone, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
    return (
        <footer className="footer bg-cream border-t border-cream/50 pt-16 pb-8 mt-auto">
            <div className="footer__container container mx-auto px-4 max-w-7xl">
                <div className="footer__content grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {/* Column 1: About */}
                    <div className="footer__section footer__section--about">
                        <Link href="/" className="footer__logo-link block mb-4">
                            <Image
                                src="/Khadi Vasthra White Transparnt.png"
                                alt="Khadi Vasthra Logo"
                                width={200}
                                height={70}
                                className="footer__logo h-auto w-auto max-w-[200px] object-contain"
                                priority
                            />
                        </Link>
                        <p className="footer__description text-text-muted text-sm leading-relaxed">
                            Authentic Kerala handloom mundus woven with tradition and care.
                            Bring home the essence of Kerala culture.
                        </p>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="footer__section footer__section--links">
                        <h4 className="footer__section-title text-lg font-semibold mb-4 text-text font-serif">Quick Links</h4>
                        <ul className="footer__links space-y-2 text-sm text-text-muted">
                            <li className="footer__link-item">
                                <Link href="/products" className="footer__link hover:text-coral transition-colors">Shop</Link>
                            </li>
                            <li className="footer__link-item">
                                <Link href="/products" className="footer__link hover:text-coral transition-colors">Collections</Link>
                            </li>
                            <li className="footer__link-item">
                                <Link href="/contact" className="footer__link hover:text-coral transition-colors">About Us</Link>
                            </li>
                            <li className="footer__link-item">
                                <Link href="/contact" className="footer__link hover:text-coral transition-colors">Contact</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Customer Service */}
                    <div className="footer__section footer__section--service">
                        <h4 className="footer__section-title text-lg font-semibold mb-4 text-text font-serif">Customer Service</h4>
                        <ul className="footer__links space-y-2 text-sm text-text-muted">
                            <li className="footer__link-item">
                                <Link href="/contact" className="footer__link hover:text-coral transition-colors">Shipping Info</Link>
                            </li>
                            <li className="footer__link-item">
                                <Link href="/contact" className="footer__link hover:text-coral transition-colors">Returns</Link>
                            </li>
                            <li className="footer__link-item">
                                <Link href="/contact" className="footer__link hover:text-coral transition-colors">FAQ</Link>
                            </li>
                            <li className="footer__link-item">
                                <Link href="/contact" className="footer__link hover:text-coral transition-colors">Size Guide</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div className="footer__section footer__section--newsletter">
                        <h4 className="footer__section-title text-lg font-semibold mb-4 text-text font-serif">Newsletter</h4>
                        <p className="footer__description text-text-muted text-sm mb-4">
                            Subscribe to get updates on new collections and exclusive offers.
                        </p>
                        <form className="footer__newsletter-form space-y-3">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full px-4 py-2 border border-cream/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral text-sm"
                            />
                            <Button 
                                type="submit"
                                className="w-full bg-orange hover:bg-orange-dark text-white font-semibold"
                            >
                                Subscribe
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="footer__contact border-t border-cream/50 pt-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-text-muted">
                        <div className="footer__contact-item flex items-start space-x-3">
                            <MapPin className="footer__contact-icon h-5 w-5 shrink-0 text-coral mt-0.5" />
                            <span className="footer__contact-text">Kurumassery, Aluva, Ernakulam, Kerala</span>
                        </div>
                        <div className="footer__contact-item flex items-center space-x-3">
                            <Phone className="footer__contact-icon h-5 w-5 shrink-0 text-coral" />
                            <span className="footer__contact-text">+91 97455 12345</span>
                        </div>
                        <div className="footer__contact-item flex items-center space-x-3">
                            <Instagram className="footer__contact-icon h-5 w-5 shrink-0 text-coral" />
                            <a href="https://instagram.com/khadivasthra" target="_blank" rel="noopener noreferrer" className="footer__contact-link hover:text-coral transition-colors">
                                @khadivasthra
                            </a>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="footer__copyright border-t border-cream/50 pt-6 text-center text-xs text-text-muted">
                    <p className="footer__copyright-text">&copy; {new Date().getFullYear()} Khadi Vasthra. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
