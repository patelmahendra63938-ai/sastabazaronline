// test-courier.js
//
// Temporary NimbusPost connectivity test.
// Credentials must come from environment variables.
// Do NOT hard-code API keys or secrets in this file.
//
// NOTE:
// This file still contains legacy v1 testing assumptions.
// We will replace the API contract after NimbusPost provides
// the official Partner API v2 documentation.

const API_KEY =
  process.env.COURIER_API_KEY ||
  process.env.NIMBUSPOST_API_KEY;

const API_SECRET =
  process.env.COURIER_SECRET_KEY ||
  process.env.NIMBUSPOST_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error(
    'NimbusPost credentials are missing from environment variables.'
  );

  console.error(
    'Expected COURIER_API_KEY/NIMBUSPOST_API_KEY and COURIER_SECRET_KEY/NIMBUSPOST_API_SECRET.'
  );

  process.exit(1);
}

const tokenEndpoints = [
  {
    url: 'https://api.nimbuspost.com/v1/users/token',
    payloads: [
      {
        api_key: API_KEY,
        api_secret: API_SECRET,
      },
      {
        key: API_KEY,
        secret: API_SECRET,
      },
      {
        client_id: API_KEY,
        client_secret: API_SECRET,
      },
    ],
  },
  {
    url: 'https://api.nimbuspost.com/v1/users/generate-token',
    payloads: [
      {
        api_key: API_KEY,
        api_secret: API_SECRET,
      },
      {
        key: API_KEY,
        secret: API_SECRET,
      },
    ],
  },
  {
    url: 'https://api.nimbuspost.com/v1/users/login',
    payloads: [
      {
        key: API_KEY,
        secret: API_SECRET,
      },
    ],
  },
];

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function authenticateAndTest() {
  console.log('====================================================');
  console.log('       NIMBUSPOST LEGACY V1 CONNECTION TEST         ');
  console.log('====================================================');
  console.log('');

  let activeToken = null;

  for (const endpoint of tokenEndpoints) {
    for (const body of endpoint.payloads) {
      const label =
        `${endpoint.url} with ${Object.keys(body).join('+')}`;

      process.stdout.write(`Testing: ${label} ... `);

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(body),
        });

        const data = await safeJson(response);

        if (
          response.ok &&
          data.status &&
          data.data
        ) {
          activeToken =
            typeof data.data === 'string'
              ? data.data
              : data.data.token ||
                data.data.access_token ||
                null;

          if (activeToken) {
            console.log('TOKEN ACQUIRED');
            console.log('');
            break;
          }
        }

        console.log(
          `Rejected (${response.status}: ${
            data.message ||
            data.error ||
            'Unknown response'
          })`
        );
      } catch (error) {
        console.log(
          `Error: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    }

    if (activeToken) {
      break;
    }
  }

  if (!activeToken) {
    console.log('');
    console.log('----------------------------------------------------');
    console.log('Legacy JWT token could not be obtained.');
    console.log(
      'Trying legacy serviceability with API headers...'
    );
    console.log('----------------------------------------------------');
    console.log('');

    try {
      const response = await fetch(
        'https://api.nimbuspost.com/v1/courier/serviceability',
        {
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
        }
      );

      const data = await safeJson(response);

      console.log('Direct Headers Result:', data);
    } catch (error) {
      console.error(
        error instanceof Error
          ? error.message
          : String(error)
      );
    }

    return;
  }

  console.log('====================================================');
  console.log('       TESTING LEGACY V1 SERVICEABILITY             ');
  console.log('====================================================');
  console.log('');

  try {
    const response = await fetch(
      'https://api.nimbuspost.com/v1/courier/serviceability',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
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
      }
    );

    const data = await safeJson(response);

    if (
      response.ok &&
      data.status &&
      Array.isArray(data.data)
    ) {
      console.log(
        'Legacy NimbusPost v1 API responded successfully.'
      );

      console.log('');
      console.log('Available Couriers & Rates');
      console.log('--------------------------');

      data.data
        .slice(0, 5)
        .forEach((courier, index) => {
          const name =
            courier.name ||
            courier.courier_name ||
            'Unknown Courier';

          const rate =
            courier.rate ??
            courier.total_charges ??
            'N/A';

          const eta =
            courier.estimated_delivery_days ||
            'N/A';

          console.log(
            `${index + 1}. ${name} | Rate: ${rate} | ETA: ${eta}`
          );
        });
    } else {
      console.log(
        'Serviceability Response:',
        data
      );
    }
  } catch (error) {
    console.error(
      'Serviceability Error:',
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}

authenticateAndTest().catch((error) => {
  console.error(
    'Fatal test error:',
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exitCode = 1;
});