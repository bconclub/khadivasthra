import Image from "next/image";
import { MapPin, Phone, Instagram } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="contact-page container mx-auto px-4 max-w-7xl py-16">
            {/* Logo Section - Same as Homepage */}
            <div className="contact-page__header text-center mb-12">
                <div className="contact-page__logo-wrapper flex justify-center mb-6">
                    <Image
                        src="/Khadi Vasthra White Transparnt.webp"
                        alt="Khadi Vasthra Logo"
                        width={400}
                        height={160}
                        className="contact-page__logo h-auto w-full max-w-xs md:max-w-md object-contain"
                        priority
                    />
                </div>
                <h1 className="contact-page__title text-4xl font-bold mb-4 text-text">Get in Touch</h1>
                <p className="contact-page__subtitle text-lg text-text-muted max-w-2xl mx-auto">
                    We'd love to hear from you. Reach out to us for any inquiries about our handcrafted Mundus and Dhotis.
                </p>
            </div>

            <div className="contact-page__content grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                {/* Contact Info */}
                <div className="contact-page__info space-y-8">
                    <div className="contact-page__info-card bg-white p-8 rounded-lg shadow-sm border border-cream/30 h-full">
                        <h2 className="contact-page__info-title text-2xl font-bold mb-6 text-text">Contact Information</h2>

                        <div className="contact-page__info-list space-y-8">
                            <div className="contact-page__info-item contact-page__info-item--address flex items-start space-x-4">
                                <div className="contact-page__info-icon bg-cream/50 p-3 rounded-full flex-shrink-0">
                                    <MapPin className="h-6 w-6 text-coral" />
                                </div>
                                <div className="contact-page__info-content">
                                    <h3 className="contact-page__info-item-title font-semibold text-text text-lg">Visit Us</h3>
                                    <p className="contact-page__info-item-text text-text-muted mt-2 leading-relaxed">
                                        Khadi Vasthra<br />
                                        Kurumassery P.O,<br />
                                        Aluva, Ernakulam,<br />
                                        Kerala - 683579
                                    </p>
                                </div>
                            </div>

                            <div className="contact-page__info-item contact-page__info-item--phone flex items-center space-x-4">
                                <div className="contact-page__info-icon bg-cream/50 p-3 rounded-full flex-shrink-0">
                                    <Phone className="h-6 w-6 text-coral" />
                                </div>
                                <div className="contact-page__info-content">
                                    <h3 className="contact-page__info-item-title font-semibold text-text text-lg">Call Us</h3>
                                    <a href="tel:+918714090510" className="contact-page__info-link text-text-muted hover:text-coral transition-colors block mt-1">
                                        +91 87140 90510
                                    </a>
                                </div>
                            </div>

                            <div className="contact-page__info-item contact-page__info-item--social flex items-center space-x-4">
                                <div className="contact-page__info-icon bg-cream/50 p-3 rounded-full flex-shrink-0">
                                    <Instagram className="h-6 w-6 text-coral" />
                                </div>
                                <div className="contact-page__info-content">
                                    <h3 className="contact-page__info-item-title font-semibold text-text text-lg">Follow Us</h3>
                                    <a
                                        href="https://instagram.com/khadivasthra"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="contact-page__info-link text-text-muted hover:text-coral transition-colors block mt-1"
                                    >
                                        @khadivasthra
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="contact-page__map h-[400px] bg-cream/30 rounded-lg overflow-hidden shadow-sm border border-cream/30 relative">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31433.24263304194!2d76.3331778!3d10.1504975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b080f6e9c9f80d9%3A0xc6c766e4480d1e3d!2sKurumassery%2C%20Kerala!5e0!3m2!1sen!2sin!4v1703780000000!5m2!1sen!2sin"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="contact-page__map-iframe absolute inset-0"
                        title="Google Maps Location of Kurumassery"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
