# SastaBazar Online - Integration & Setup Checklist

| Integration Name | Status | Required Environment Variables | Webhook Required | Notes / Fallback Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase Database** | CONNECTED | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | No | Primary database, auth & RLS engine. |
| **GoDaddy Titan SMTP** | READY_FOR_CONFIGURATION | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | No | Falls back to server console logging if unconfigured. |
| **Meta WhatsApp API** | READY_FOR_CONFIGURATION | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | No | Falls back safely; order proceeds normally. |
| **NimbusPost Logistics** | READY_FOR_CONFIGURATION | `NIMBUSPOST_API_KEY` | Yes (Optional) | Falls back to internal weight buffer pricing model if unconfigured. |
| **Google Merchant Center** | READY_FOR_CONFIGURATION | `GOOGLE_MERCHANT_ID` | No | XML Feed accessible dynamically at `/api/feed/merchant.xml`. |
| **Google Search Console** | NEEDS MANUAL ACTION | Domain Verification TXT / HTML File | No | Requires manual property verification on Google console. |
| **Google Analytics (GA4)** | READY_FOR_CONFIGURATION | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Event architecture scaffolded. |