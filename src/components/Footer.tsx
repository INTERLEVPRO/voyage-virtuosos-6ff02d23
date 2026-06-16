import { Link } from "@tanstack/react-router";
import { Phone, Mail, Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black text-white py-12 px-6 sm:px-10 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* Column 1 */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg mb-4 uppercase">INTERLEV GmbH</h3>
          
          <div>
            <p className="font-semibold text-sm">B8 Building Leverkusen</p>
            <p className="text-sm text-gray-300">Adolf-Kaschny-Straße 19, 51373 Leverkusen</p>
          </div>
          
          <div>
            <p className="font-semibold text-sm">Innovation Park Leverkusen</p>
            <p className="text-sm text-gray-300">Hemmelrather Weg 201, 51377 Leverkusen</p>
          </div>
          
          <div className="flex gap-4 pt-4">
            <a href="#" className="flex h-12 w-12 items-center justify-center bg-gray-500 hover:bg-gray-600 transition">
              <Phone className="h-6 w-6 text-white" />
            </a>
            <a href="#" className="flex h-12 w-12 items-center justify-center bg-[#25D366] hover:bg-[#20b858] transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
            </a>
            <a href="#" className="flex h-12 w-12 items-center justify-center bg-[#EA4335] hover:bg-[#d33c30] transition">
              <Mail className="h-6 w-6 text-white" />
            </a>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg mb-4 uppercase">META NAVIGATION</h3>
          <ul className="space-y-4">
            <li><Link to="/" className="text-sm font-semibold text-white hover:text-gray-300 transition">Contact Now</Link></li>
            <li><Link to="/" className="text-sm font-semibold text-white hover:text-gray-300 transition">Imprint</Link></li>
            <li><Link to="/" className="text-sm font-semibold text-white hover:text-gray-300 transition">Data protection</Link></li>
          </ul>
          
          <div className="flex gap-4 pt-4">
            <a href="#" className="flex h-12 w-12 items-center justify-center bg-[#3b5998] hover:bg-[#2d4373] transition">
              <Facebook className="h-7 w-7 text-white fill-current" />
            </a>
            <a href="#" className="flex h-12 w-12 items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 transition">
              <Instagram className="h-7 w-7 text-white" />
            </a>
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg mb-4">Where to find us</h3>
          <div className="space-y-4">
            <div className="w-full h-[150px] bg-gray-800 relative overflow-hidden rounded">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2516.326887556094!2d6.9840337!3d51.0454378!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bf2b1a8d9a2ba7%3A0xc621b1b4bc669f!2sAdolf-Kaschny-Stra%C3%9Fe%2019%2C%2051373%20Leverkusen%2C%20Germany!5e0!3m2!1sen!2sus!4v1716301234567!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
              />
            </div>
            <div className="w-full h-[150px] bg-gray-800 relative overflow-hidden rounded">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2516.7118182218765!2d7.0270144!3d51.0381666!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bf298fc20623e1%3A0x6fbbf562e8484a95!2sHemmelrather%20Weg%20201%2C%2051377%20Leverkusen%2C%20Germany!5e0!3m2!1sen!2sus!4v1716301234568!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
              />
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
