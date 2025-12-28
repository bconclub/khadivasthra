import { MapPin, Phone, Instagram } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="container mx-auto px-4 max-w-7xl py-16">
            <h1 className="text-4xl font-bold text-center mb-12 text-primary">Get in Touch</h1>

            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                {/* Contact Info */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 h-full">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Contact Information</h2>

                        <div className="space-y-8">
                            <div className="flex items-start space-x-4">
                                <div className="bg-secondary p-3 rounded-full flex-shrink-0">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">Visit Us</h3>
                                    <p className="text-gray-600 mt-2 leading-relaxed">
                                        Khadi Vasthra<br />
                                        Kurumassery P.O,<br />
                                        Aluva, Ernakulam,<br />
                                        Kerala - 683579
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="bg-secondary p-3 rounded-full flex-shrink-0">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">Call Us</h3>
                                    <a href="tel:+919745512345" className="text-gray-600 hover:text-primary transition-colors block mt-1">
                                        +91 97455 12345
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="bg-secondary p-3 rounded-full flex-shrink-0">
                                    <Instagram className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">Follow Us</h3>
                                    <a
                                        href="https://instagram.com/khadivasthra"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-primary transition-colors block mt-1"
                                    >
                                        @khadivasthra
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="h-[400px] bg-gray-200 rounded-lg overflow-hidden shadow-sm border border-gray-100 relative">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31433.24263304194!2d76.3331778!3d10.1504975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b080f6e9c9f80d9%3A0xc6c766e4480d1e3d!2sKurumassery%2C%20Kerala!5e0!3m2!1sen!2sin!4v1703780000000!5m2!1sen!2sin"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0"
                        title="Google Maps Location of Kurumassery"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
