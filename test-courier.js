// test-courier.js
const API_KEY = 'npk_b68c26e222914f3a';
const API_SECRET = 'BrT8o-KGdvnhUUnAE9jjKBzElZOEqLuz';

// Token generation endpoints and payload variations for NimbusPost API Keys
const tokenEndpoints = [
  {
    url: 'https://api.nimbuspost.com/v1/users/token',
    payloads: [
      { api_key: API_KEY, api_secret: API_SECRET },
      { key: API_KEY, secret: API_SECRET },
      { client_id: API_KEY, client_secret: API_SECRET },
    ],
  },
  {
    url: 'https://api.nimbuspost.com/v1/users/generate-token',
    payloads: [
      { api_key: API_KEY, api_secret: API_SECRET },
      { key: API_KEY, secret: API_SECRET },
    ],
  },
  {
    url: 'https://api.nimbuspost.com/v1/users/login',
    payloads: [
      { email: 'adhyeybrothers@gmail.com', api_key: API_KEY },
      { key: API_KEY, secret: API_SECRET },
    ],
  },
];

async function authenticateAndTest() {
  console.log('====================================================');
  console.log('    EXCHANGING NIMBUSPOST API KEY FOR JWT TOKEN     ');
  console.log('====================================================\n');

  let activeToken = null;

  for (const ep of tokenEndpoints) {
    for (const body of ep.payloads) {
      const label = `${ep.url} with ${Object.keys(body).join('+')}`;
      process.stdout.write(`Testing: ${label} ... `);

      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (res.ok && data.status && data.data) {
          activeToken = typeof data.data === 'string' ? data.data : (data.data.token || data.data.access_token);
          console.log('✅ TOKEN ACQUIRED!\n');
          break;
        } else {
          console.log(`❌ (${res.status}: ${data.message || 'Rejected'})`);
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }
    if (activeToken) break;
  }

  if (!activeToken) {
    console.log('\n----------------------------------------------------');
    console.log('⚠️ Could not automatically exchange API Key for JWT Token.');
    console.log('Checking direct serviceability endpoint with custom headers...');
    console.log('----------------------------------------------------\n');

    // Test with X-API-KEY headers
    try {
      const directRes = await fetch('https://api.nimbuspost.com/v1/courier/serviceability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'NP-API-KEY': API_KEY,
          'NP-API-SECRET': API_SECRET,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          origin: '395006',
          destination: '380001',
          payment_type: 'cod',
          weight: 500,
          length: 10,
          breadth: 10,
          height: 5,
          amount: 499,
        }),
      });
      const directData = await directRes.json();
      console.log('Direct Headers Result:', directData);
    } catch (e) {
      console.error(e.message);
    }
    return;
  }

  // Step 2: Test live serviceability with valid JWT Token
  console.log('====================================================');
  console.log('       TESTING LIVE COURIER SERVICEABILITY          ');
  console.log('====================================================\n');

  try {
    const serviceRes = await fetch('https://api.nimbuspost.com/v1/courier/serviceability', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin: '395006',      // Surat Warehouse Pincode
        destination: '380001', // Ahmedabad Delivery Pincode
        payment_type: 'cod',
        weight: 500,
        length: 10,
        breadth: 10,
        height: 5,
        amount: 499,
      }),
    });

    const serviceData = await serviceRes.json();

    if (serviceRes.ok && serviceData.status) {
      console.log('✅ NIMBUSPOST API CONNECTED SUCCESSFULLY!\n');
      console.log('--- Available Couriers & Live Shipping Rates ---');
      if (Array.isArray(serviceData.data)) {
        serviceData.data.slice(0, 5).forEach((courier, idx) => {
          console.log(`${idx + 1}. ${courier.name || courier.courier_name} | Rate: ₹${courier.rate || courier.total_charges} | Est: ${courier.estimated_delivery_days || '2-3'} Days`);
        });
      } else {
        console.log('Courier Routing Engine Active and Ready.');
      }
      console.log('------------------------------------------------\n');
      console.log('🎉 Your store is 100% connected and ready for live shipping dispatch!');
    } else {
      console.log('Serviceability Response:', serviceData);
    }
  } catch (err) {
    console.error('Serviceability Error:', err.message);
  }
}

authenticateAndTest();