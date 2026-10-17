# XC Staff Rail — CrossCountry staff PWA

A mobile-first installable Progressive Web App for station departure boards and Darwin train-running information. Includes copy, email, and print-to-PDF actions on the departures board and service detail screen.

## Important: live Darwin data requires credentials

The app includes a safe server-side integration scaffold for the National Rail Data Darwin OpenLDBWS SOAP service. **Do not put your Darwin token in `app.js`, HTML, or any browser-delivered file.** Request access and credentials through the official National Rail Data platform. API access and service terms may apply.

Until the server is configured and the token is valid, the app deliberately shows clearly labelled illustrative demo data. Demo times and statuses are not live and must not be used for operational decisions.

## Run locally

Requirements: Node.js 18+.

1. Extract this ZIP.
2. Open a terminal in the extracted `xc_railway_staff_app` folder.
3. Install server dependencies:
   ```bash
   cd server
   npm install
   ```
4. Set your token in the server environment (do not commit it to source control):
   ```bash
   export DARWIN_ACCESS_TOKEN="YOUR_TOKEN_HERE"
   npm start
   ```
   On Windows PowerShell:
   ```powershell
   $env:DARWIN_ACCESS_TOKEN="YOUR_TOKEN_HERE"
   npm start
   ```
5. Open `http://localhost:3000`.

For a live station search, enter a three-letter CRS code, such as `NCL` for Newcastle, `NRW` for Norwich, or `BHM` for Birmingham New Street. The UI accepts station names as a convenience, but the live API endpoint currently expects a CRS code. If a name is entered and the live request fails, use the station's CRS code.

## Deploy for staff use

- Host the site and API on the same HTTPS origin (required for reliable PWA installation and service worker support).
- Set `DARWIN_ACCESS_TOKEN` as a deployment secret/environment variable.
- Keep the API server private to your organisation where possible; add authentication, rate limiting, access logging, and appropriate operational approval before staff deployment.
- Review the National Rail Data API's current endpoint, WSDL/schema, access token requirements and usage terms. The included SOAP request format is an integration scaffold and may need adjustment to match the exact API product/version enabled for your account.
- Do not use demo data for railway operational decisions. Verify details in approved operational systems.

## Included

- `index.html`, `styles.css`, `app.js` — responsive user interface and actions.
- `manifest.webmanifest`, `icon.svg`, `sw.js` — installable PWA assets and basic offline shell.
- `server/` — Node.js Express proxy and Darwin SOAP integration scaffold.

## User features

- Station departures, expected status, platform, operator and calling points where supplied.
- Filter board by destination/operator/platform/status.
- Select a service for details.
- Copy board or service details.
- Email board or service details using the device's email app.
- Print any visible screen or save as PDF using the browser print dialog.
- Installable PWA shell; the live API requires an internet connection.
