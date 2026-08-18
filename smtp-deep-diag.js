// smtp-deep-diag.js
const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 1. Manually parse .env.local safely
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnvLocal();
const SMTP_USER = env.SMTP_USER || 'sales@sastabazaronline.in';
const SMTP_PASS = env.SMTP_PASS || 'Adhyey@040290';
const DOMAIN = SMTP_USER.split('@')[1] || 'sastabazaronline.in';

async function runDiagnosis() {
  console.log('====================================================');
  console.log('       DEEP SMTP & DNS DIAGNOSTIC SUITE             ');
  console.log('====================================================\n');

  // STEP 1: Environment Integrity Check
  console.log('--- [STEP 1: Environment Integrity] ---');
  console.log(`SMTP_USER:              ${SMTP_USER ? 'PRESENT (' + SMTP_USER + ')' : 'MISSING'}`);
  console.log(`SMTP_PASS:              ${SMTP_PASS ? 'PRESENT' : 'MISSING'}`);
  console.log(`SMTP_PASS Length:       ${SMTP_PASS.length} characters`);
  console.log(`Has Leading/Trailing Space: ${SMTP_PASS !== SMTP_PASS.trim() ? 'YES (WARNING)' : 'NO'}`);
  console.log(`Has Enclosing Quotes:   ${(SMTP_PASS.startsWith('"') && SMTP_PASS.endsWith('"')) ? 'YES (WARNING)' : 'NO'}\n`);

  if (!SMTP_PASS) {
    console.error('❌ Cannot continue: SMTP_PASS is empty in .env.local\n');
    return;
  }

  // STEP 2: DNS & Mail Server Host Resolution
  console.log('--- [STEP 2: DNS & Mail Provider Inspection] ---');
  try {
    const mxRecords = await dns.resolveMx(DOMAIN);
    console.log(`✓ MX Records Found for ${DOMAIN}:`);
    mxRecords.sort((a, b) => a.priority - b.priority).forEach((mx) => {
      console.log(`   - Priority: ${mx.priority} -> Host: ${mx.exchange}`);
    });

    const isTitan = mxRecords.some((r) => r.exchange.toLowerCase().includes('titan.email'));
    const isM365 = mxRecords.some((r) => r.exchange.toLowerCase().includes('outlook.com'));
    const isSecureserver = mxRecords.some((r) => r.exchange.toLowerCase().includes('secureserver.net'));

    if (isTitan) console.log('✓ Mail Provider Identified: GoDaddy Titan Email');
    else if (isM365) console.log('⚠️ Mail Provider Identified: Microsoft 365 Exchange (Requires smtp.office365.com)');
    else if (isSecureserver) console.log('⚠️ Mail Provider Identified: GoDaddy Secureserver (Requires smtpout.secureserver.net)');
    else console.log('⚠️ Custom / Unrecognized Mail Server detected.');
  } catch (err) {
    console.error(`❌ DNS MX Lookup Failed for ${DOMAIN}:`, err.message);
    console.log('   (This indicates domain hold, DNS misconfiguration, or propagation delay)');
  }
  console.log('');

  // STEP 3: Matrix Connection & Authentication Test
  console.log('--- [STEP 3: SMTP Handshake & Authentication Test] ---');

  const testMatrix = [
    {
      label: 'Titan Direct SSL',
      host: 'smtp.titan.email',
      port: 465,
      secure: true,
    },
    {
      label: 'Titan STARTTLS',
      host: 'smtp.titan.email',
      port: 587,
      secure: false,
      requireTLS: true,
    },
    {
      label: 'GoDaddy Secureserver SSL',
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
    },
  ];

  for (const config of testMatrix) {
    process.stdout.write(`Testing ${config.label} (${config.host}:${config.port})... `);
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS || false,
      auth: {
        user: SMTP_USER.trim(),
        pass: SMTP_PASS.trim(),
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 8000,
    });

    try {
      await transporter.verify();
      console.log('✅ AUTH SUCCESSFUL!');
      console.log(`\n🎉 WORKING CONFIGURATION FOUND:`);
      console.log(`   SMTP_HOST=${config.host}`);
      console.log(`   SMTP_PORT=${config.port}`);
      console.log(`   SMTP_SECURE=${config.secure}`);
      console.log(`   SMTP_USER="${SMTP_USER}"\n`);
      return;
    } catch (err) {
      console.log(`❌ FAILED`);
      console.log(`   Error Code: ${err.code || 'N/A'} | Message: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('              DIAGNOSTIC CONCLUSION                 ');
  console.log('====================================================');
  console.log('If all servers returned 535 5.7.8, the issue is on the PROVIDER side:');
  console.log('1. The GoDaddy domain may be on "Status Hold" preventing outbound relay.');
  console.log('2. The Titan mailbox is newly provisioned and pending activation sync.');
  console.log('3. Your GoDaddy account is on Microsoft 365 rather than Titan.');
}

runDiagnosis();