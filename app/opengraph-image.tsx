import { ImageResponse } from 'next/og';

export const alt = 'ADHYEY BROTHERS — Women’s Ethnic Wear & Fashion';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#fffaf5',
          color: '#741f23',
          padding: '70px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 999,
            border: '6px solid #c89b52',
            background: '#fff7e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            fontWeight: 800,
            marginBottom: 32,
          }}
        >
          AB
        </div>
        <div style={{ fontSize: 62, fontWeight: 900, letterSpacing: 2 }}>
          ADHYEY BROTHERS
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 31,
            fontWeight: 600,
            color: '#8a5c25',
          }}
        >
          Women’s Ethnic Wear • Girls Fashion • Pan India Delivery
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 23,
            color: '#5f5148',
          }}
        >
          Quality • Trust • Style
        </div>
      </div>
    ),
    size
  );
}
