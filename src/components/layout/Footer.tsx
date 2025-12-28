import Link from "next/link";
import { Instagram, Phone, MapPin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-primary text-primary-foreground pt-12 pb-6 mt-auto">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <h3 className="text-2xl font-bold mb-4 font-serif">Khadi Vasthra</h3>
                        <p className="text-primary-foreground/80 text-sm leading-relaxed max-w-xs">
                            Authentic Kerala handloom mundus woven with tradition and care.
                            Bring home the essence of Kerala culture.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-4 text-gold-light font-serif">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-primary-foreground/80">
                            <li><Link href="/products" className="hover:text-gold transition-colors">Our Collection</Link></li>
                            <li><Link href="/contact" className="hover:text-gold transition-colors">Contact Us</Link></li>
                            <li><Link href="/cart" className="hover:text-gold transition-colors">My Cart</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-4 text-gold-light font-serif">Visit Us</h4>
                        <ul className="space-y-4 text-sm text-primary-foreground/80">
                            <li className="flex items-start space-x-3">
                                <MapPin className="h-5 w-5 shrink-0 text-gold-light" />
                                <span>Kurumassery, Aluva,<br />Ernakulam, Kerala</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Phone className="h-5 w-5 shrink-0 text-gold-light" />
                                <span>+91 97455 12345</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Instagram className="h-5 w-5 shrink-0 text-gold-light" />
                                <a href="https://instagram.com/khadivasthra" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">@khadivasthra</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-primary-foreground/20 pt-6 text-center text-xs text-primary-foreground/60">
                    <p>&copy; {new Date().getFullYear()} Khadi Vasthra. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
