# SHINERVA.COM

Official parent-company website for Shinerva — Building Digital Ecosystems.

## Production Domain & Canonical Architecture

* **Canonical Apex Domain:** `https://shinerva.com`
* **Subdomain Redirect Requirement:** Any traffic to `https://www.shinerva.com` must be redirected (HTTP 301) to `https://shinerva.com` at the DNS/CDN/Edge hosting layer (Cloudflare / Vercel / Netlify / reverse proxy). Application-level redirect logic is deliberately not coupled to the static build.

## Brand Architecture

* **Shinerva.com**: Parent technology company
* **Shinerva.id**: AI voice technology & digital products for creators and businesses
* **Tikum.app**: Digital marketplace for products, services, and everyday technology
* **Salmo.dev**: Football data and sports intelligence platform (built on HandicapLab foundation)

## Contact Mailbox Provisioning

The website references `contact@shinerva.com` as the official corporate contact address. Mailbox provisioning and MX/SPF/DKIM/DMARC routing must be configured at the domain DNS and mail server level.

## Development & Build

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production static bundle
npm run build

# Preview production build locally
npm run preview
```
