import React from 'react';

interface Testimonial {
  name: string;
  comment: string;
  rating: number;
}

interface SellerMarketplaceTrustProps {
  amazonUrl?: string;
  flipkartUrl?: string;
  meeshoUrl?: string;
  testimonials?: Testimonial[];
}

export const SellerMarketplaceTrust: React.FC<SellerMarketplaceTrustProps> = ({
  amazonUrl,
  flipkartUrl,
  meeshoUrl,
  testimonials = []
}) => {
  if (!amazonUrl && !flipkartUrl && !meeshoUrl) return null;

  return (
    <div className="marketplace-trust-container" style={{ padding: '20px', textAlign: 'center', background: '#f9f9f9', margin: '20px 0', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>અમારી અન્ય શોપિંગ પ્લેટફોર્મ પર પણ મુલાકાત લો</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>ગ્રાહકોના વિશ્વાસ માટે તમે અમને નીચેના પ્લેટફોર્મ પર પણ શોધી શકો છો:</p>
      
      <div className="buttons-group" style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
        {amazonUrl && (
          <a href={amazonUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#FF9900', color: '#fff', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '12px' }}>
            Amazon પર જુઓ
          </a>
        )}
        {flipkartUrl && (
          <a href={flipkartUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#2874F0', color: '#fff', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '12px' }}>
            Flipkart પર જુઓ
          </a>
        )}
        {meeshoUrl && (
          <a href={meeshoUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#F43397', color: '#fff', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '12px' }}>
            Meesho પર જુઓ
          </a>
        )}
      </div>

      {testimonials.length > 0 && (
        <div className="testimonials-section" style={{ marginTop: '20px' }}>
          <h4>ગ્રાહકોના અભિપ્રાય</h4>
          {testimonials.map((t, index) => (
            <div key={index} style={{ background: '#fff', padding: '10px', margin: '10px auto', maxWidth: '400px', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <p>"{t.comment}"</p>
              <strong>- {t.name}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
