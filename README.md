# 🛡️ SafeYatra— Tourist Safety & Authority Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-2dsphere-brightgreen.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-black.svg)](https://socket.io/)

SafeYatra12 is an end-to-end Tourist Safety Platform connecting travelers and emergency response authorities in real-time.

---

## 📂 Repository Structure

The platform is split into two interoperable subsystems:

```
SafeYatra12/
├── Toursit Site/          # 📱 Tourist-Facing Backend & Client
│   ├── controllers/       # Auth, Profile, Digital ID, SOS, Location, AI Risk, Incidents
│   ├── models/            # Tourist, SOSAlert, Incident, RiskZone, LocationPing
│   ├── routes/            # /api/tourist/* and shared contract endpoints
│   ├── utils/             # AI risk engine, NLP urgency classifier, Socket.IO
│   ├── frontend/          # Tourist mobile/web client frontend
│   ├── server.js          # Express server + WebSocket gateway (Port 5000)
│   ├── seed.js            # Demo dataset seeder
│   ├── verify.js          # 26-test automated verification suite
│   └── README.md          # Comprehensive tourist backend documentation
│
└── Authority part/        # 👮 Authority Command & Dispatch Monitoring
    └── ...                # Authority dashboard, dispatch engine & verification scanner
```

---

## 📱 Tourist Part (`Toursit Site/`)

The tourist-facing system provides:
- **Authentication**: `POST /api/tourist/register`, `POST /api/tourist/login`, `GET /api/tourist/me`
- **Profile & Safety Info**: `GET/PUT /api/tourist/profile`, `GET /api/tourist/safety-info`
- **Digital Tourist ID (QR)**: `POST /api/tourist/id/generate`, `GET /api/tourist/id`, `POST /verify/scan`
- **Location-Based Safety**: `POST /api/tourist/location/update` (rolling buffer N=20), `GET /api/tourist/location/alerts`
- **Emergency SOS**: `POST /api/tourist/sos/trigger` (returns `sosId` & profile snapshot), `GET /api/tourist/sos/:sosId/status`, `POST /api/tourist/sos/:sosId/cancel`
- **Risk & Safety Alerts**: `POST /api/admin/risk-zones`, `GET /api/tourist/alerts/nearby`
- **Incident Reporting**: `POST /api/tourist/incidents`, `GET /api/tourist/incidents/mine`, `GET /api/authority/incidents`
- **AI / Smart Features**: `POST /api/tourist/ai/assess-risk` (location + time of day ➔ risk score + natural-language safety tip), `POST /api/tourist/ai/incident-triage`
- **Safety Resources**: `GET /api/tourist/resources` (emergency numbers, embassy directory, nearest hospital/police)

### Quick Start (Tourist Part):
```bash
cd "Toursit Site"
npm install
npm run seed
npm run dev
npm test
```

See [`Toursit Site/README.md`](./Toursit%20Site/README.md) for full endpoint specifications, data models, and inter-service integration contracts.
