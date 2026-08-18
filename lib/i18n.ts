/**
 * SASTABAZARONLINE Multi-Language & Regional Localization Engine
 * Supports English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, 
 * Malayalam, Punjabi, Urdu, Odia, and Assamese.
 */

export type SupportedLanguage = 
  | 'en' 
  | 'hi' 
  | 'gu' 
  | 'mr' 
  | 'bn' 
  | 'ta' 
  | 'te' 
  | 'kn' 
  | 'ml' 
  | 'pa' 
  | 'ur' 
  | 'or' 
  | 'as';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  native: string;
}

export const SUPPORTED_INDIAN_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
];

export const dictionaries: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    storeName: 'SASTABAZARONLINE',
    tagline: 'Wholesale Hub (Surat)',
    searchPlaceholder: 'Search home, kitchen & fashion products...',
    cart: 'Cart',
    wishlist: 'Wishlist',
    orders: 'My Orders',
    home: 'Home',
    quickLinks: 'Quick Links',
    categories: 'Categories',
    contactUs: 'Contact Us',
    exclusiveSale: 'SASTABAZARONLINE EXCLUSIVE SALE',
    shopTheSale: 'Shop The Sale →',
    noActiveOffer: 'No Active Offer Found',
    rightsReserved: 'All Rights Reserved.',
  },
  hi: {
    storeName: 'SASTABAZARONLINE',
    tagline: 'थोक केंद्र (सूरत)',
    searchPlaceholder: 'होम, किचन और फैशन उत्पाद खोजें...',
    cart: 'कार्ट',
    wishlist: 'विशलिस्ट',
    orders: 'मेरे ऑर्डर',
    home: 'होम',
    quickLinks: 'त्वरित लिंक',
    categories: 'श्रेणियाँ',
    contactUs: 'संपर्क करें',
    exclusiveSale: 'SASTABAZARONLINE विशेष सेल',
    shopTheSale: 'सेल देखें →',
    noActiveOffer: 'कोई सक्रिय ऑफर नहीं मिला',
    rightsReserved: 'सर्वाधिकार सुरक्षित।',
  },
  gu: {
    storeName: 'SASTABAZARONLINE',
    tagline: 'જથ્થાબંધ હબ (સુરત)',
    searchPlaceholder: 'ઘર, રસોડું અને ફેશન ઉત્પાદનો શોધો...',
    cart: 'કાર્ટ',
    wishlist: 'વિશલિસ્ટ',
    orders: 'મારા ઓર્ડર',
    home: 'હોમ',
    quickLinks: 'ઝડપી લિંક્સ',
    categories: 'શ્રેણીઓ',
    contactUs: 'સંપર્ક કરો',
    exclusiveSale: 'SASTABAZARONLINE એક્સ્ક્લુઝિવ સેલ',
    shopTheSale: 'સેલ જુઓ →',
    noActiveOffer: 'કોઈ સક્રિય ઓફર મળી નથી',
    rightsReserved: 'બધા હકો આરક્ષિત છે.',
  },
  mr: { storeName: 'SASTABAZARONLINE', tagline: 'घाऊक केंद्र (सुरत)', searchPlaceholder: 'उत्पादने शोधा...', cart: 'कार्ट', wishlist: 'विशलिस्ट', orders: 'माझ्या ऑर्डर्स', home: 'होम', quickLinks: 'जलद दुवे', categories: 'श्रेण्या', contactUs: 'संपर्क साधा', exclusiveSale: 'विशेष सेल', shopTheSale: 'सेल पहा →', noActiveOffer: 'कोणतीही ऑफर नाही', rightsReserved: 'सर्व हक्क राखीव.' },
  bn: { storeName: 'SASTABAZARONLINE', tagline: 'পাইকারি হাব (সুরাত)', searchPlaceholder: 'পণ্য অনুসন্ধান করুন...', cart: 'কার্ট', wishlist: 'পছন্দের তালিকা', orders: 'আমার অর্ডার', home: 'হোম', quickLinks: 'দ্রুত লিঙ্ক', categories: 'বিভাগ', contactUs: 'যোগাযোগ করুন', exclusiveSale: 'এক্সক্লুসিভ সেল', shopTheSale: 'অফার দেখুন →', noActiveOffer: 'কোনো অফার নেই', rightsReserved: 'সর্বস্বত্ব সংরক্ষিত।' },
  ta: { storeName: 'SASTABAZARONLINE', tagline: 'மொத்த விற்பனை மையம் (சூரத்)', searchPlaceholder: 'தயவுசெய்து தேடவும்...', cart: 'கார்ட்', wishlist: 'விருப்பப் பட்டியல்', orders: 'எனது ஆர்டர்கள்', home: 'முகப்பு', quickLinks: 'விரைவான இணைப்புகள்', categories: 'வகைகள்', contactUs: 'தொடர்புகொள்ள', exclusiveSale: 'பிரத்யேக தள்ளுபடி', shopTheSale: 'விற்பனையைக் காண்க →', noActiveOffer: 'சலுகைகள் இல்லை', rightsReserved: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.' },
  te: { storeName: 'SASTABAZARONLINE', tagline: 'హోల్‌సేల్ కేంద్రం (సూరత్)', searchPlaceholder: 'ఉత్పత్తులను వెతకండి...', cart: 'కార్ట్', wishlist: 'విష్‌లిస్ట్', orders: 'నా ఆర్డర్లు', home: 'హోమ్', quickLinks: 'త్వరిత లింకులు', categories: 'వర్గాలు', contactUs: 'మమ్మల్ని సంప్రదించండి', exclusiveSale: 'ప్రత్యేక సేల్', shopTheSale: 'సేల్ చూడండి →', noActiveOffer: 'ఆఫర్‌లు కనుగొనబడలేదు', rightsReserved: 'అన్ని హక్కులూ ప్రత్యేకించబడ్డాయి.' },
  kn: { storeName: 'SASTABAZARONLINE', tagline: 'ಸಗಟು ಕೇಂದ್ರ (ಸುರತ್)', searchPlaceholder: 'ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ...', cart: 'ಕಾರ್ಟ್', wishlist: 'ಇಷ್ಟಪಟ್ಟಿ', orders: 'ನನ್ನ ಆದೇಶಗಳು', home: 'ಮುಖಪುಟ', quickLinks: 'ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು', categories: 'ವರ್ಗಗಳು', contactUs: 'ಸಂಪರ್ಕಿಸಿ', exclusiveSale: 'ವಿಶೇಷ ಮಾರಾಟ', shopTheSale: 'ಮಾರಾಟ ನೋಡಿ →', noActiveOffer: 'ಯಾವುದೇ ಕೊಡುಗೆಗಳಿಲ್ಲ', rightsReserved: 'ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.' },
  ml: { storeName: 'SASTABAZARONLINE', tagline: 'ഹോൾസെയിൽ ഹബ്ബ് (സൂറത്ത്)', searchPlaceholder: 'ഉൽപ്പന്നങ്ങൾ തിരയുക...', cart: 'കാർട്ട്', wishlist: 'വിഷ്‌ലിസ്റ്റ്', orders: 'എന്റെ ഓർഡറുകൾ', home: 'ഹോം', quickLinks: 'ദ്രുത ലിങ്കുകൾ', categories: 'വിഭാഗങ്ങൾ', contactUs: 'ബന്ധപ്പെടുക', exclusiveSale: 'പ്രത്യേക വിൽപ്പന', shopTheSale: 'വിൽപ്പന കാണുക →', noActiveOffer: 'ഓഫറുകൾ ലഭ്യമല്ല', rightsReserved: 'എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.' },
  pa: { storeName: 'SASTABAZARONLINE', tagline: 'ਥੋਕ ਕੇਂਦਰ (ਸੂਰਤ)', searchPlaceholder: 'ਉਤਪਾਦ ਖੋਜੋ...', cart: 'ਕਾਰਟ', wishlist: 'ਵਿਸ਼ਲਿਸਟ', orders: 'ਮੇਰੇ ਆਰਡਰ', home: 'ਹੋਮ', quickLinks: 'ਤੁਰੰਤ ਲਿੰਕ', categories: 'ਸ਼੍ਰੇਣੀਆਂ', contactUs: 'ਸੰਪਰਕ ਕਰੋ', exclusiveSale: 'ਖਾਸ ਸੇਲ', shopTheSale: 'ਸੇਲ ਦੇਖੋ →', noActiveOffer: 'ਕੋਈ ਆਫ਼ਰ ਨਹੀਂ', rightsReserved: 'ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ।' },
  ur: { storeName: 'SASTABAZARONLINE', tagline: 'تھوک مرکز (سورت)', searchPlaceholder: 'مصنوعات تلاش کریں...', cart: 'کارٹ', wishlist: 'خواہش کی فہرست', orders: 'میرے آرڈرز', home: 'ہوم', quickLinks: 'فوری لنکس', categories: 'زمرہ جات', contactUs: 'ہم سے رابطہ کریں', exclusiveSale: 'خصوصی سیل', shopTheSale: 'سیل دیکھیں →', noActiveOffer: 'کوئی آفر نہیں ملی', rightsReserved: 'جملہ حقوق محفوظ ہیں۔' },
  or: { storeName: 'SASTABAZARONLINE', tagline: 'পাইକାରୀ କେନ୍ଦ୍ର (ସୁରତ)', searchPlaceholder: 'ଉତ୍ପାଦ ଖୋଜନ୍ତୁ...', cart: 'କାର୍ଟ', wishlist: 'ଇଚ୍ଛା ତାଲିକା', orders: 'ମୋର ଅର୍ଡର', home: 'ହୋମ୍', quickLinks: 'ଶୀଘ୍ର ଲିଙ୍କ୍', categories: 'ବର୍ଗ', contactUs: 'ଯୋଗାଯୋଗ କରନ୍ତୁ', exclusiveSale: 'ବିଶେଷ ସେଲ୍', shopTheSale: 'ସେଲ୍ ଦେଖନ୍ତୁ →', noActiveOffer: 'କୌଣసి ଅଫର୍ ନାହିଁ', rightsReserved: 'ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ।' },
  as: { storeName: 'SASTABAZARONLINE', tagline: 'পাইকাৰী কেন্দ্ৰ (চুৰাট)', searchPlaceholder: 'উৎপাদন বিচাৰক...', cart: 'কাৰ্ট', wishlist: 'ইচ্ছাতালিকা', orders: 'মোৰ অৰ্ডাৰ', home: 'হোম', quickLinks: 'দ্ৰুত লিংক', categories: 'শিতান', contactUs: 'যোগাযোগ কৰক', exclusiveSale: 'বিশেষ বিক্ৰী', shopTheSale: 'বিক্ৰী চাওক →', noActiveOffer: 'কোনো অফাৰ নাই', rightsReserved: 'সৰ্বস্বত্ব সংৰক্ষিত।' }
};

export function translate(lang: SupportedLanguage, key: string): string {
  const dictionary = dictionaries[lang] || dictionaries['en'];
  if (dictionary && dictionary[key]) {
    return dictionary[key];
  }
  if (dictionaries['en'][key]) {
    console.warn(`[SASTABAZARONLINE I18N WARNING] Missing translation key "${key}" for language "${lang}". Fell back to English.`);
    return dictionaries['en'][key];
  }
  return key;
}

export function logLanguageError(action: string, errorDetails: string) {
  console.error(`[SASTABAZARONLINE LANGUAGE ERROR] ❌ Action: ${action} | Details: ${errorDetails} | Time: ${new Date().toISOString()}`);
}

export function logLanguageSuccess(languageCode: string) {
  console.log(`[SASTABAZARONLINE LANGUAGE SUCCESS] ✅ Active language switched to: ${languageCode.toUpperCase()}`);
}