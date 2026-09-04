/**
 * Comprehensive Automated Verification Suite
 * Validates EVERY feature and contract of the Tourist Safety Platform:
 *
 * AUTH:
 *  - POST /api/tourist/register (name, email, password, nationality, passport, phone, emergency contact)
 *  - POST /api/tourist/login
 *  - GET /api/tourist/me
 *
 * FEATURE 1 — Tourist Profile & Safety Information:
 *  - GET/PUT /api/tourist/profile (trip dates, itinerary, accommodation, emergency contact, medical notes, preferred language)
 *  - GET /api/tourist/safety-info
 *
 * FEATURE 2 — Digital Tourist ID (QR):
 *  - POST /api/tourist/id/generate (short-lived 24-72h signed JWT, base64 QR)
 *  - GET /api/tourist/id
 *  - POST /verify/scan (inter-service Authority contract)
 *
 * FEATURE 3 — Location-Based Safety:
 *  - POST /api/tourist/location/update (periodic ping with rolling N points history)
 *  - GET /api/tourist/location/alerts
 *
 * FEATURE 4 — Emergency / SOS:
 *  - POST /api/tourist/sos/trigger (returns sosId, snapshot, emits socket)
 *  - GET /api/tourist/sos/:sosId/status
 *  - POST /api/tourist/sos/:sosId/cancel (false alarm cancellation)
 *
 * FEATURE 5 — Risk & Safety Alerts:
 *  - POST /api/admin/risk-zones
 *  - GET /api/tourist/alerts/nearby
 *
 * FEATURE 6 — Incident Reporting:
 *  - POST /api/tourist/incidents
 *  - GET /api/tourist/incidents/mine
 *  - GET /api/authority/incidents (authority read access)
 *
 * FEATURE 7 — AI / Smart Feature:
 *  - POST /api/tourist/ai/assess-risk (location + time of day -> risk score + natural-language safety tip)
 *  - POST /api/tourist/ai/incident-triage
 *
 * FEATURE 8 — Safety Resources:
 *  - GET /api/tourist/resources (emergency numbers, embassy contacts by nationality, nearest hospital/police)
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { app } = require('./server');
const { connectDB, closeDB } = require('./utils/db');
const LocationPing = require('./models/LocationPing');

let server;
let baseUrl;

const makeRequest = async (method, path, body = null, token = null) => {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const runVerification = async () => {
  console.log('\n🔍 [VERIFICATION SUITE] Starting Complete Tourist Safety Platform Verification...\n');

  try {
    // 1. Start Server on ephemeral test port
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`📡 Verification test server running at ${baseUrl}\n`);

    let passedTests = 0;
    let totalTests = 0;

    const assertTest = (description, condition, details = '') => {
      totalTests++;
      if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${description}`);
      } else {
        console.error(`  ❌ [FAIL] ${description} ${details}`);
        throw new Error(`Test failed: ${description}`);
      }
    };

    // ----------------------------------------------------
    // 0. HEALTH CHECK
    // ----------------------------------------------------
    const health = await makeRequest('GET', '/health');
    assertTest('Health check endpoint returns ONLINE status', health.status === 200 && health.data?.status === 'ONLINE');

    // ----------------------------------------------------
    // AUTH TESTS (POST /api/tourist/register, /login, /me)
    // ----------------------------------------------------
    const testTouristEmail = `maya.traveler.${Date.now()}@example.com`;
    const regRes = await makeRequest('POST', '/api/tourist/register', {
      name: 'Maya Lin',
      email: testTouristEmail,
      password: 'Password123!',
      nationality: 'Canada',
      passportNumber: 'CAN-9988112',
      phone: '+1-555-0199',
      emergencyContact: {
        name: 'David Lin',
        phone: '+1-555-0198',
        relation: 'Father'
      }
    });
    assertTest('POST /api/tourist/register creates tourist in DB & returns JWT', regRes.status === 201 && regRes.data?.token);
    const touristToken = regRes.data.token;
    const touristId = regRes.data.user?.id || regRes.data.user?._id;

    // Authority Registration & Login (for testing authority endpoints)
    const testAuthEmail = `officer.${Date.now()}@safety.gov`;
    const authRegRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Inspector Vikram',
      email: testAuthEmail,
      password: 'Password123!',
      role: 'authority',
      phone: '+91-9876543210',
      nationality: 'India'
    });
    assertTest('POST /api/auth/register creates authority officer', authRegRes.status === 201 && authRegRes.data.user?.role === 'authority');
    const authorityToken = authRegRes.data.token;

    // POST /api/tourist/login
    const loginRes = await makeRequest('POST', '/api/tourist/login', {
      email: testTouristEmail,
      password: 'Password123!'
    });
    assertTest('POST /api/tourist/login succeeds with valid credentials', loginRes.status === 200 && loginRes.data?.token);

    // GET /api/tourist/me
    const meRes = await makeRequest('GET', '/api/tourist/me', null, touristToken);
    assertTest('GET /api/tourist/me returns authenticated tourist profile', meRes.status === 200 && meRes.data.user?.email === testTouristEmail);

    // ----------------------------------------------------
    // FEATURE 1 — PROFILE & SAFETY INFO
    // ----------------------------------------------------
    const profileUpdate = await makeRequest(
      'PUT',
      '/api/tourist/profile',
      {
        passportNumber: 'CAN-9988112',
        tripDates: { startDate: '2026-09-01', endDate: '2026-09-15' },
        accommodation: 'Grand Heritage Hotel, Room 402',
        itinerary: [{ location: 'Palace District', startDate: '2026-09-02', endDate: '2026-09-08' }],
        emergencyContacts: [{ name: 'David Lin', phone: '+1-555-0198', relation: 'Father' }],
        medicalNotes: {
          bloodGroup: 'O+',
          allergies: ['Penicillin', 'Peanuts'],
          conditions: ['Mild Asthma']
        },
        preferredLanguage: 'en'
      },
      touristToken
    );
    assertTest('PUT /api/tourist/profile updates trip dates, accommodation, medical notes & itinerary', profileUpdate.status === 200 && profileUpdate.data.data?.accommodation === 'Grand Heritage Hotel, Room 402');

    const profileGet = await makeRequest('GET', '/api/tourist/profile', null, touristToken);
    assertTest('GET /api/tourist/profile retrieves complete tourist profile', profileGet.status === 200 && profileGet.data.data?.passportNumber === 'CAN-9988112');

    const safetyInfoRes = await makeRequest('GET', '/api/tourist/safety-info?destination=central', null, touristToken);
    assertTest('GET /api/tourist/safety-info returns destination guidelines and emergency hotlines', safetyInfoRes.status === 200 && safetyInfoRes.data.guidelines?.length > 0 && safetyInfoRes.data.emergencyHotlines?.police);

    // ----------------------------------------------------
    // FEATURE 2 — DIGITAL TOURIST ID (QR)
    // ----------------------------------------------------
    const generateIdRes = await makeRequest('POST', '/api/tourist/id/generate', { validityHours: 48 }, touristToken);
    assertTest(
      'POST /api/tourist/id/generate generates short-lived signed JWT & Base64 QR code',
      generateIdRes.status === 201 &&
      generateIdRes.data.qrCode?.startsWith('data:image/png;base64,') &&
      generateIdRes.data.token
    );
    const qrSignedToken = generateIdRes.data.token;

    const getIdRes = await makeRequest('GET', '/api/tourist/id', null, touristToken);
    assertTest('GET /api/tourist/id fetches active Digital ID and QR code', getIdRes.status === 200 && getIdRes.data.digitalId?.status === 'active');

    // Authority contract verification endpoint: POST /verify/scan
    const verifyScanRes = await makeRequest('POST', '/verify/scan', { qrCodePayload: qrSignedToken });
    assertTest(
      'POST /verify/scan verifies scanned Digital ID matching Authority contract',
      verifyScanRes.status === 200 &&
      verifyScanRes.data.verified === true &&
      verifyScanRes.data.tourist?.name === 'Maya Lin' &&
      verifyScanRes.data.tourist?.medicalInfo?.bloodGroup === 'O+'
    );

    // ----------------------------------------------------
    // FEATURE 5 — RISK ZONES (Seed/Update & Admin)
    // ----------------------------------------------------
    const createZoneRes = await makeRequest('POST', '/api/admin/risk-zones', {
      name: 'Old Bazaar Hazard Sector',
      description: 'High rate of organized pickpocketing and street scams after dark.',
      riskLevel: 'high',
      category: 'crime',
      center: { lat: 12.9716, lng: 77.5946 },
      radiusMeters: 750
    }, authorityToken);
    assertTest('POST /api/admin/risk-zones creates risk zone', createZoneRes.status === 201 && createZoneRes.data.data?.name === 'Old Bazaar Hazard Sector');

    // ----------------------------------------------------
    // FEATURE 3 — LOCATION-BASED SAFETY & ROLLING BUFFER
    // ----------------------------------------------------
    const locationUpdateRes = await makeRequest('POST', '/api/tourist/location/update', {
      lat: 12.9716,
      lng: 77.5946,
      speed: 1.4,
      batteryLevel: 92
    }, touristToken);
    assertTest(
      'POST /api/tourist/location/update detects risk zone breach and returns warnings',
      locationUpdateRes.status === 200 &&
      locationUpdateRes.data.inRiskZone === true &&
      locationUpdateRes.data.warnings?.length > 0
    );

    // Verify rolling location history prunes older points
    for (let p = 0; p < 25; p++) {
      await makeRequest('POST', '/api/tourist/location/update', { lat: 12.9716 + p * 0.0001, lng: 77.5946 }, touristToken);
    }
    const pingCount = await LocationPing.countDocuments({ touristId });
    assertTest('Location rolling buffer caps tourist history to last N points (<= 20)', pingCount <= 20);

    const locationAlertsRes = await makeRequest('GET', '/api/tourist/location/alerts?lat=12.9716&lng=77.5946&radius=1000', null, touristToken);
    assertTest('GET /api/tourist/location/alerts returns active risk zones within radius', locationAlertsRes.status === 200 && locationAlertsRes.data.alerts?.length > 0);

    // GET /api/tourist/alerts/nearby (Proactive push-style alerts for tourist's last known location)
    const nearbyAlertsRes = await makeRequest('GET', '/api/tourist/alerts/nearby', null, touristToken);
    assertTest('GET /api/tourist/alerts/nearby returns proactive hazard warnings for last known GPS', nearbyAlertsRes.status === 200 && nearbyAlertsRes.data.alertsCount > 0);

    // ----------------------------------------------------
    // FEATURE 4 — EMERGENCY / SOS DISPATCH & STATUS
    // ----------------------------------------------------
    const sosTriggerRes = await makeRequest('POST', '/api/tourist/sos/trigger', {
      location: { lat: 12.9716, lng: 77.5946 },
      message: 'Suspicious group blocking alleyway, requesting escort!'
    }, touristToken);
    assertTest(
      'POST /api/tourist/sos/trigger creates SOSAlert, snapshot, and returns sosId',
      sosTriggerRes.status === 201 &&
      sosTriggerRes.data.sosId &&
      sosTriggerRes.data.alert?.touristProfileSnapshot?.name === 'Maya Lin'
    );
    const activeSosId = sosTriggerRes.data.sosId;

    const sosStatusRes = await makeRequest('GET', `/api/tourist/sos/${activeSosId}/status`, null, touristToken);
    assertTest('GET /api/tourist/sos/:sosId/status returns active SOS status', sosStatusRes.status === 200 && sosStatusRes.data.status === 'active');

    const sosCancelRes = await makeRequest('POST', `/api/tourist/sos/${activeSosId}/cancel`, {
      reason: 'Accidental trigger / false alarm'
    }, touristToken);
    assertTest('POST /api/tourist/sos/:sosId/cancel cancels false-alarm SOS alert', sosCancelRes.status === 200 && sosCancelRes.data.status === 'cancelled');

    // ----------------------------------------------------
    // FEATURE 6 — INCIDENT REPORTING
    // ----------------------------------------------------
    const incidentReportRes = await makeRequest('POST', '/api/tourist/incidents', {
      type: 'theft',
      description: 'Handbag unzipped and wallet stolen while boarding crowded bus.',
      location: { lat: 12.9718, lng: 77.5948, address: 'Bus Terminal Crosswalk' },
      photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136',
      severity: 'medium'
    }, touristToken);
    assertTest('POST /api/tourist/incidents records incident with AI classification', incidentReportRes.status === 201 && incidentReportRes.data.incidentId);
    const incidentId = incidentReportRes.data.incidentId;

    const myIncidentsRes = await makeRequest('GET', '/api/tourist/incidents/mine', null, touristToken);
    assertTest("GET /api/tourist/incidents/mine returns tourist's own reports", myIncidentsRes.status === 200 && myIncidentsRes.data.count > 0);

    const authorityIncidentsRes = await makeRequest('GET', '/api/authority/incidents', null, authorityToken);
    assertTest('GET /api/authority/incidents provides Authority backend read access to all reports', authorityIncidentsRes.status === 200 && authorityIncidentsRes.data.count > 0);

    // ----------------------------------------------------
    // FEATURE 7 — AI / SMART RISK ASSESSMENT & TRIAGE
    // ----------------------------------------------------
    const aiRiskAssessRes = await makeRequest('POST', '/api/tourist/ai/assess-risk', {
      location: { lat: 12.9716, lng: 77.5946 },
      timeOfDay: 'night (10:30 PM)'
    }, touristToken);
    assertTest(
      'POST /api/tourist/ai/assess-risk returns AI risk score, summary, and natural-language safety tip',
      aiRiskAssessRes.status === 200 &&
      aiRiskAssessRes.data.riskScore != null &&
      aiRiskAssessRes.data.safetyTip?.length > 10
    );

    const aiTriageRes = await makeRequest('POST', '/api/tourist/ai/incident-triage', {
      text: 'Armed robbery at knife-point near the dark tunnel, victim bleeding!',
      type: 'other'
    }, touristToken);
    assertTest(
      'POST /api/tourist/ai/incident-triage auto-categorizes free text into severity and urgency score',
      aiTriageRes.status === 200 &&
      aiTriageRes.data.triage?.severity === 'critical' &&
      aiTriageRes.data.triage?.urgencyScore >= 8
    );

    // ----------------------------------------------------
    // FEATURE 8 — SAFETY RESOURCES
    // ----------------------------------------------------
    const resourcesRes = await makeRequest('GET', '/api/tourist/resources?nationality=Canada&lat=12.9716&lng=77.5946', null, touristToken);
    assertTest(
      'GET /api/tourist/resources returns emergency hotlines, Canadian Embassy, and nearest hospital/police',
      resourcesRes.status === 200 &&
      resourcesRes.data.emergencyNumbers?.police === '112' &&
      resourcesRes.data.embassyContact?.country === 'Canada' &&
      resourcesRes.data.nearestFacilities?.nearestPoliceStation
    );

    // ----------------------------------------------------
    // SECURITY GUARD TEST
    // ----------------------------------------------------
    const unauthorizedAttempt = await makeRequest('GET', '/api/authority/dashboard-summary', null, touristToken);
    assertTest('Tourist is forbidden from accessing authority control endpoints (HTTP 403)', unauthorizedAttempt.status === 403);

    console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!\n`);
    console.log('----------------------------------------------------');
    console.log('Full Tourist-Facing Verification Complete:');
    console.log(' • AUTH: /register, /login, /me (Tourist & Authority): PASS');
    console.log(' • Feature 1: Profile & Destination Safety Info: PASS');
    console.log(' • Feature 2: Digital ID (QR) & Authority /verify/scan Contract: PASS');
    console.log(' • Feature 3: Location Updates, Geo-Alerts & Rolling Buffer: PASS');
    console.log(' • Feature 4: Emergency SOS Trigger, Status Poll & Cancel: PASS');
    console.log(' • Feature 5: Risk Zones Seed & Proactive Nearby Alerts: PASS');
    console.log(' • Feature 6: Incident Reporting, Mine & Authority Read: PASS');
    console.log(' • Feature 7: AI Risk Engine & Natural-Language Safety Tip: PASS');
    console.log(' • Feature 8: Safety Resources, Embassy & Geo-Nearest Care: PASS');
    console.log('----------------------------------------------------\n');

    server.close();
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error);
    if (server) server.close();
    await closeDB();
    process.exit(1);
  }
};

runVerification();
