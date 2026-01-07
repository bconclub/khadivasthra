import Link from "next/link";
import { Instagram, Phone, MapPin } from "lucide-react";

export function Footer() {
    return (
        <footer className="footer bg-cream border-t border-cream/50 pt-12 pb-6 mt-auto">
            <div className="footer__container container mx-auto px-4 max-w-7xl">
                <div className="footer__content grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="footer__section footer__section--about">
                        <h3 className="footer__title text-2xl font-bold mb-4 font-serif text-text">Khadi Vasthra</h3>
                        <p className="footer__description text-text-muted text-sm leading-relaxed max-w-xs">
                            Authentic Kerala handloom mundus woven with tradition and care.
                            Bring home the essence of Kerala culture.
                        </p>
                    </div>

                    <div className="footer__section footer__section--links">
                        <h4 className="footer__section-title text-lg font-semibold mb-4 text-text font-serif">Quick Links</h4>
                        <ul className="footer__links space-y-2 text-sm text-text-muted">
                            <li className="footer__link-item"><Link href="/products" className="footer__link hover:text-coral transition-colors">Our Collection</Link></li>
                            <li className="footer__link-item"><Link href="/contact" className="footer__link hover:text-coral transition-colors">Contact Us</Link></li>
                            <li className="footer__link-item"><Link href="/cart" className="footer__link hover:text-coral transition-colors">My Cart</Link></li>
                        </ul>
                    </div>

                    <div className="footer__section footer__section--contact">
                        <h4 className="footer__section-title text-lg font-semibold mb-4 text-text font-serif">Visit Us</h4>
                        <ul className="footer__contact-list space-y-4 text-sm text-text-muted">
                            <li className="footer__contact-item flex items-start space-x-3">
                                <MapPin className="footer__contact-icon h-5 w-5 shrink-0 text-coral" />
                                <span className="footer__contact-text">Kurumassery, Aluva,<br />Ernakulam, Kerala</span>
                            </li>
                            <li className="footer__contact-item flex items-center space-x-3">
                                <Phone className="footer__contact-icon h-5 w-5 shrink-0 text-coral" />
                                <span className="footer__contact-text">+91 97455 12345</span>
                            </li>
                            <li className="footer__contact-item flex items-center space-x-3">
                                <Instagram className="footer__contact-icon h-5 w-5 shrink-0 text-coral" />
                                <a href="https://instagram.com/khadivasthra" target="_blank" rel="noopener noreferrer" className="footer__contact-link hover:text-coral transition-colors">@khadivasthra</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer__copyright border-t border-cream/50 pt-6 text-center text-xs text-text-muted">
                    <p className="footer__copyright-text">&copy; {new Date().getFullYear()} Khadi Vasthra. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
