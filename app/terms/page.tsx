import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div>
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 bg-white rounded-3xl border my-8 shadow-sm">
          <h1 className="text-3xl font-black text-indigo-950 mb-6">Terms & Conditions</h1>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>By accessing Sastabazar.com, you agree to be bound by these terms and conditions managed by Adhyey Brothers.</p>
            <h3 className="font-bold text-gray-800 text-base mt-4">1. Pricing & Orders</h3>
            <p>All prices listed for garments and clothing are in Indian Rupees (INR) and inclusive of taxes where applicable. We reserve the right to accept or cancel any order.</p>
            <h3 className="font-bold text-gray-800 text-base mt-4">2. Return & Exchange</h3>
            <p>We offer a 7-day easy return policy for unused and unworn items with original tags intact.</p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}