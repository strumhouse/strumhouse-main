import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Database, Users, Lock, Cookie, Eye, ExternalLink, Baby, RefreshCw, Phone, Mail, MapPin, Globe } from 'lucide-react';

const Privacy: React.FC = () => {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      color: "text-blue-500",
      items: [
        "Contact Details: Name, phone number, email address.",
        "Booking Information: Session date/time, duration, service type, payment status.",
        "Payment Details: Transaction information (note: we do not store card or UPI credentials).",
        "Communication History: Chat records or emails for customer support and service improvements.",
        "Device Information: IP address, browser type, and device used to access our website (for analytics)."
      ]
    },
    {
      icon: Users,
      title: "How We Use Your Information",
      color: "text-green-500",
      items: [
        "Manage bookings and provide rehearsal and studio services at Strumhouse.",
        "Communicate confirmations, reminders, or updates related to your session.",
        "Respond to customer service inquiries.",
        "Send occasional offers, updates, or feedback requests (you may opt out anytime).",
        "Improve our services and website user experience."
      ]
    },
    {
      icon: Shield,
      title: "Data Sharing",
      color: "text-yellow-500",
      items: [
        "We do not sell, rent, or share your personal information with third parties, except:",
        "With service providers (e.g., payment gateways) for completing transactions.",
        "When required by law or in response to legal requests.",
        "To prevent fraud, abuse, or unauthorized access."
      ]
    },
    {
      icon: Lock,
      title: "Data Storage & Security",
      color: "text-purple-500",
      items: [
        "Your personal data is stored securely with access limited to authorized staff at Strumhouse.",
        "We implement reasonable physical, technical, and administrative safeguards to protect your data.",
        "However, no system is 100% secure. We encourage you to use strong passwords and secure devices."
      ]
    },
    {
      icon: Cookie,
      title: "Cookies and Analytics",
      color: "text-orange-500",
      items: [
        "Our website may use cookies and third-party tools (e.g., Google Analytics) to understand user behavior and improve our online presence. You can control or disable cookies via your browser settings."
      ]
    },
    {
      icon: Eye,
      title: "Your Rights",
      color: "text-red-500",
      items: [
        "Access the personal information we have about you.",
        "Request corrections or deletions of your data.",
        "Withdraw consent or opt out of communications.",
        "To exercise these rights, contact us via email or phone."
      ]
    },
    {
      icon: ExternalLink,
      title: "Links to Other Sites",
      color: "text-indigo-500",
      items: [
        "Our website or social media pages may contain links to external sites. Strumhouse is not responsible for the privacy practices of those websites."
      ]
    },
    {
      icon: Baby,
      title: "Children's Privacy",
      color: "text-pink-500",
      items: [
        "Our services are not directed toward individuals under the age of 13. We do not knowingly collect personal data from children."
      ]
    },
    {
      icon: RefreshCw,
      title: "Policy Updates",
      color: "text-teal-500",
      items: [
        "Strumhouse may update this Privacy Policy periodically. The latest version will always be available on our website. Please review it regularly."
      ]
    }
  ];

  const contactInfo = [
    {
      icon: Phone,
      title: "Phone/WhatsApp",
      detail: "+91 8882382545",
      color: "text-green-500"
    },
    {
      icon: Mail,
      title: "Email",
      detail: "contact.strumhouse@gmail.com",
      color: "text-yellow-500"
    },
    {
      icon: MapPin,
      title: "Address",
      detail: "G-19 A, basement, Main Rd, Block G, Kalkaji, Delhi, New Delhi, Delhi 110019",
      color: "text-blue-500"
    },
    {
      icon: Globe,
      title: "Website",
      detail: "www.strumhouse.in",
      color: "text-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-500 to-yellow-500 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              At Strumhouse, your privacy is important to us. This Privacy Policy outlines how we collect, 
              use, and protect your personal information when you use our services, visit our website, 
              or communicate with us.
            </p>
            <div className="mt-6 text-sm text-gray-500">
              <p>Effective Date: 1st January 2023</p>
            </div>
          </motion.div>

          {/* Privacy Sections */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="bg-gray-900 p-8 rounded-xl border border-gray-800"
              >
                <div className="flex items-center mb-6">
                  <div className={`p-3 rounded-lg bg-gray-800 ${section.color} mr-4`}>
                    <section.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <span className="text-yellow-500 mr-3 mt-1">•</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="max-w-4xl mx-auto mt-16"
          >
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">📞 Contact Us</h3>
              <p className="text-gray-400 mb-8 text-center">
                For bookings, support, or questions, reach out:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contactInfo.map((info, index) => (
                  <motion.div
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.3 + index * 0.1 }}
                    className="flex items-center space-x-4"
                  >
                    <div className={`p-3 rounded-lg bg-gray-800 ${info.color}`}>
                      <info.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">{info.title}</h4>
                      <p className="text-white">{info.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Privacy; 