import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div>
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 bg-white rounded-3xl border my-8 shadow-sm">
          <h1 className="text-3xl font-black text-indigo-950 mb-6">Privacy Policy</h1>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>Welcome to Sastabazar.com. We respect your privacy and are committed to protecting your personal data.</p>
            <h3 className="font-bold text-gray-800 text-base mt-4">1. Information We Collect</h3>
            <p>We collect information you provide directly to us when you create an account, make a purchase, or contact support (such as name, phone number, and delivery address).</p>
            <h3 className="font-bold text-gray-800 text-base mt-4">2. How We Use Your Information</h3>
            <p>Your information is used solely to process orders, deliver garments to your doorstep, and provide customer support.</p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}