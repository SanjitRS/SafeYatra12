/**
 * Dedicated Authority & Monitoring Verification Suite
 * Validates all Authority endpoints, role security, Module 1 (ID Verification & Audit),
 * Module 2 (SOS Dispatch Management & Response Units), and Socket.IO real-time delivery.
 */

require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');
const { app, httpServer } = require('./server');
const { connectDB, closeDB } = require('./utils/db');
const { populateData } = require('./seed');
const User = require('./models/User');
const DigitalTouristID = require('./models/DigitalTouristID');
const VerificationLog = require('./models/VerificationLog');
const ResponseUnit = require('./models/ResponseUnit');
const SOSAlert = require('./models/SOSAlert');

let server;
let baseUrl;

const makeRequest = async (method, path, body = null, token = null) => {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const runAuthorityVerification = async () => {
  console.log('\n=============================================================');
  console.log('🛡️  AUTHORITY & MONITORING BACKEND TEST SUITE');
  console.log('=============================================================\n');

  try {
    await connectDB();

    // Seed clean dataset
    await populateData({ clearExisting: true });

    // Start server on ephemeral port
    server = http.createServer(app);
    const { initSocket } = require('./utils/socket');
    const io = initSocket(server);

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    console.log(`📡 Server active on ${baseUrl}\n`);

    let passed = 0;
    let total = 0;

    const assert = (description, condition, details = '') => {
      total++;
      if (condition) {
        passed++;
        console.log(`  ✅ [PASS] ${description}`);
      } else {
        console.error(`  ❌ [FAIL] ${description} ${details}`);
        throw new Error(`Test failed: ${description} - ${details}`);
      }
    };

    // ----------------------------------------------------
    // SECTION 1: AUTHENTICATION & ROLE-BASED ACCESS
    // ----------------------------------------------------
    console.log('🔑 Testing Section 1: Authority Auth & Role Middleware...');

    // 1. Authority Login (Valid credentials)
    const authLoginRes = await makeRequest('POST', '/api/auth/authority/login', {
      email: 'officer.vikram@safety.gov',
      password: 'Password123!'
    });
    assert(
      'POST /api/auth/authority/login returns 200 with JWT and user zone',
      authLoginRes.status === 200 &&
      authLoginRes.data?.success === true &&
      authLoginRes.data?.token &&
      authLoginRes.data?.data?.user?.role === 'authority' &&
      authLoginRes.data?.data?.user?.zone === 'Central Zone'
    );
    const authorityToken = authLoginRes.data.token;

    // Decode JWT to verify claims
    const decodedToken = jwt.decode(authorityToken);
    assert(
      'Authority JWT contains role and jurisdiction/zone claims',
      decodedToken.role === 'authority' &&
      (decodedToken.zone === 'Central Zone' || decodedToken.jurisdiction === 'Central Zone')
    );

    // 2. Admin Login
    const adminLoginRes = await makeRequest('POST', '/api/auth/authority/login', {
      email: 'admin@safety.gov',
      password: 'Password123!'
    });
    assert(
      'Admin user can login via authority login endpoint',
      adminLoginRes.status === 200 && adminLoginRes.data?.data?.user?.role === 'admin'
    );
    const adminToken = adminLoginRes.data.token;

    // 3. Dispatcher Login
    const dispLoginRes = await makeRequest('POST', '/api/auth/authority/login', {
      email: 'dispatcher.kavita@safety.gov',
      password: 'Password123!'
    });
    assert(
      'Dispatcher user can login via authority login endpoint',
      dispLoginRes.status === 200 && dispLoginRes.data?.data?.user?.role === 'dispatcher'
    );
    const dispatcherToken = dispLoginRes.data.token;

    // 4. Tourist denied at Authority Login
    const touristDenyRes = await makeRequest('POST', '/api/auth/authority/login', {
      email: 'maya.lin@gmail.com',
      password: 'Password123!'
    });
    assert(
      'Tourist account is rejected by authority login (HTTP 403 Forbidden)',
      touristDenyRes.status === 403 && touristDenyRes.data?.success === false
    );

    // 5. Invalid credentials rejected
    const badLoginRes = await makeRequest('POST', '/api/auth/authority/login', {
      email: 'officer.vikram@safety.gov',
      password: 'WrongPassword999'
    });
    assert(
      'Invalid password rejected with HTTP 401',
      badLoginRes.status === 401 && badLoginRes.data?.success === false
    );

    // 6. Tourist token rejected at authority routes
    const touristLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'maya.lin@gmail.com',
      password: 'Password123!'
    });
    const touristToken = touristLoginRes.data.token;
    const touristForbidden = await makeRequest('GET', '/api/authority/sos/active', null, touristToken);
    assert(
      'authenticateAuthority blocks tourist from accessing authority routes (HTTP 403)',
      touristForbidden.status === 403
    );

    // ----------------------------------------------------
    // SECTION 2: MODULE 1 — TOURIST ID VERIFICATION
    // ----------------------------------------------------
    console.log('\n🪪 Testing Section 2: Module 1 — Tourist ID Verification & Audit Logging...');

    const mayaUser = await User.findOne({ email: 'maya.lin@gmail.com' });
    const mayaDigitalId = await DigitalTouristID.findOne({ userId: mayaUser._id });

    // 7. GET /api/authority/tourists/verify/:touristId
    const verifyByIdRes = await makeRequest(
      'GET',
      `/api/authority/tourists/verify/${mayaUser._id}`,
      null,
      authorityToken
    );
    assert(
      'GET /api/authority/tourists/verify/:touristId returns full record with masked passport',
      verifyByIdRes.status === 200 &&
      verifyByIdRes.data?.success === true &&
      verifyByIdRes.data?.data?.fullName === 'Maya Lin' &&
      verifyByIdRes.data?.data?.passportOrIdNumber.startsWith('***-') &&
      verifyByIdRes.data?.data?.tripValidity === 'active' &&
      verifyByIdRes.data?.data?.emergencyContact?.name === 'David Lin' &&
      Array.isArray(verifyByIdRes.data?.data?.itineraryDates)
    );

    // 8. Audit log created for manual verify lookup
    const auditAfterLookup = await VerificationLog.findOne({
      touristId: mayaUser._id,
      verificationMethod: 'manual_lookup'
    }).sort({ timestamp: -1 });
    assert(
      'Verification action written to VerificationLog audit collection',
      auditAfterLookup !== null &&
      auditAfterLookup.officerId.toString() === jwt.decode(authorityToken).id &&
      auditAfterLookup.result === 'verified'
    );

    // 9. POST /api/authority/tourists/verify/scan with valid signed QR token
    const scanRes = await makeRequest(
      'POST',
      '/api/authority/tourists/verify/scan',
      {
        qrPayload: mayaDigitalId.qrCodePayload,
        location: { lat: 12.9716, lng: 77.5946, address: 'Central Metro Station Post' }
      },
      authorityToken
    );
    assert(
      'POST /api/authority/tourists/verify/scan validates authentic signed QR payload',
      scanRes.status === 200 &&
      scanRes.data?.success === true &&
      scanRes.data?.verified === true &&
      scanRes.data?.data?.fullName === 'Maya Lin' &&
      scanRes.data?.data?.verificationStatus === 'valid'
    );

    // 10. Audit log created for QR scan
    const auditAfterScan = await VerificationLog.findOne({
      touristId: mayaUser._id,
      verificationMethod: 'qr_scan'
    }).sort({ timestamp: -1 });
    assert(
      'QR scan action logged in VerificationLog collection with officerId, location, and result',
      auditAfterScan !== null &&
      auditAfterScan.result === 'verified' &&
      auditAfterScan.location?.address === 'Central Metro Station Post'
    );

    // 11. POST /api/authority/tourists/verify/scan with tampered payload
    const tamperedPayload = mayaDigitalId.qrCodePayload.slice(0, -5) + 'XXXXX';
    const tamperRes = await makeRequest(
      'POST',
      '/api/authority/tourists/verify/scan',
      { qrPayload: tamperedPayload },
      authorityToken
    );
    assert(
      'POST /api/authority/tourists/verify/scan detects tampered signature and returns 400',
      tamperRes.status === 400 &&
      tamperRes.data?.success === false &&
      (tamperRes.data?.data?.result === 'tampered' || tamperRes.data?.data?.result === 'invalid')
    );

    // 12. Audit log records the tamper/failed scan attempt
    const auditTamper = await VerificationLog.findOne({
      result: { $in: ['tampered', 'invalid'] },
      verificationMethod: 'qr_scan'
    }).sort({ timestamp: -1 });
    assert(
      'Tampered / invalid scan is recorded in audit log for compliance',
      auditTamper !== null
    );

    // 13. POST /api/authority/tourists/verify/scan with expired token
    const expiredToken = jwt.sign(
      { type: 'DIGITAL_TOURIST_ID', touristId: mayaUser._id.toString() },
      process.env.DIGITAL_ID_SECRET || 'digital_id_signing_secret_tourist_2026_q78',
      { expiresIn: '-10s' }
    );
    const expiredRes = await makeRequest(
      'POST',
      '/api/authority/tourists/verify/scan',
      { qrPayload: expiredToken },
      authorityToken
    );
    assert(
      'POST /api/authority/tourists/verify/scan detects expired token and returns 400 with result: expired',
      expiredRes.status === 400 &&
      expiredRes.data?.data?.result === 'expired'
    );

    // 14. POST /api/authority/tourists/:touristId/flag
    const flagRes = await makeRequest(
      'POST',
      `/api/authority/tourists/${mayaUser._id}/flag`,
      { reason: 'Suspected stolen passport document presented at checkpoint' },
      authorityToken
    );
    assert(
      'POST /api/authority/tourists/:touristId/flag flags record with reason and timestamp',
      flagRes.status === 200 &&
      flagRes.data?.success === true &&
      flagRes.data?.data?.status === 'flagged' &&
      flagRes.data?.data?.flags?.length > 0
    );

    // Verify subsequent lookup shows flagged status
    const verifyFlaggedRes = await makeRequest(
      'GET',
      `/api/authority/tourists/verify/${mayaUser._id}`,
      null,
      authorityToken
    );
    assert(
      'Subsequent tourist verification shows flagged status and flag warnings',
      verifyFlaggedRes.status === 200 &&
      verifyFlaggedRes.data?.data?.isFlagged === true &&
      verifyFlaggedRes.data?.data?.verificationStatus === 'flagged'
    );

    // 15. GET /api/authority/tourists/verify/log
    const auditLogListRes = await makeRequest(
      'GET',
      '/api/authority/tourists/verify/log?limit=10',
      null,
      authorityToken
    );
    assert(
      'GET /api/authority/tourists/verify/log retrieves audit log history with officer & tourist details',
      auditLogListRes.status === 200 &&
      auditLogListRes.data?.success === true &&
      auditLogListRes.data?.totalCount >= 4 &&
      Array.isArray(auditLogListRes.data?.data)
    );

    // ----------------------------------------------------
    // SECTION 3: MODULE 2 — SOS DISPATCH MANAGEMENT
    // ----------------------------------------------------
    console.log('\n🚨 Testing Section 3: Module 2 — SOS Dispatch Management & Response Units...');

    // 16. GET /api/authority/sos/active
    const activeSosRes = await makeRequest('GET', '/api/authority/sos/active', null, authorityToken);
    assert(
      'GET /api/authority/sos/active returns open alerts sorted by severity and recency',
      activeSosRes.status === 200 &&
      activeSosRes.data?.success === true &&
      activeSosRes.data?.count >= 2 &&
      activeSosRes.data?.data[0].severity === 'critical'
    );
    const targetSos = activeSosRes.data.data[0];
    const sosId = targetSos.id || targetSos._id;

    // Verify overdue calculation (> 2 mins without ack)
    assert(
      'Active SOS alert older than 2 minutes is flagged overdue',
      targetSos.isOverdue === true
    );

    // 17. POST /api/authority/sos/:sosId/acknowledge
    const ackRes = await makeRequest(
      'POST',
      `/api/authority/sos/${sosId}/acknowledge`,
      {},
      authorityToken
    );
    assert(
      'POST /api/authority/sos/:sosId/acknowledge marks alert acknowledged with officer timestamp',
      ackRes.status === 200 &&
      ackRes.data?.success === true &&
      ackRes.data?.data?.status === 'acknowledged' &&
      ackRes.data?.data?.acknowledgedAt != null
    );

    // 18. GET /api/authority/units
    const unitsRes = await makeRequest('GET', '/api/authority/units', null, authorityToken);
    assert(
      'GET /api/authority/units lists available response units with type, zone, and location',
      unitsRes.status === 200 &&
      unitsRes.data?.success === true &&
      unitsRes.data?.count >= 4 &&
      unitsRes.data?.data.some((u) => u.unitId === 'PATROL-101' && u.status === 'available')
    );

    // 19. POST /api/authority/units (register/update response unit)
    const newUnitRes = await makeRequest(
      'POST',
      '/api/authority/units',
      {
        unitId: 'MED-999',
        type: 'medical_trauma',
        zone: 'Central Zone',
        status: 'available',
        currentLocation: { lat: 12.9716, lng: 77.5946, address: 'Apollo Trauma Bay 3' },
        contactNumber: '+91-80-5555-9999'
      },
      authorityToken
    );
    assert(
      'POST /api/authority/units registers or updates a response unit',
      newUnitRes.status === 201 &&
      newUnitRes.data?.success === true &&
      newUnitRes.data?.data?.unitId === 'MED-999'
    );

    // 20. POST /api/authority/sos/:sosId/dispatch
    const dispatchRes = await makeRequest(
      'POST',
      `/api/authority/sos/${sosId}/dispatch`,
      {
        unitId: 'PATROL-101',
        unitType: 'police_patrol',
        eta: 5,
        notes: 'Siren activated, approaching via north alleyway'
      },
      authorityToken
    );
    assert(
      'POST /api/authority/sos/:sosId/dispatch assigns unit, sets status to unit_dispatched and stores ETA',
      dispatchRes.status === 200 &&
      dispatchRes.data?.success === true &&
      dispatchRes.data?.data?.status === 'unit_dispatched' &&
      dispatchRes.data?.data?.assignedUnit?.unitId === 'PATROL-101' &&
      dispatchRes.data?.data?.assignedUnit?.eta === 5
    );

    // Verify unit status was updated to dispatched
    const unitAfterDispatch = await ResponseUnit.findOne({ unitId: 'PATROL-101' });
    assert(
      'ResponseUnit status updated to dispatched and linked to active SOS',
      unitAfterDispatch?.status === 'dispatched' &&
      unitAfterDispatch?.activeSosId?.toString() === sosId.toString()
    );

    // 21. POST /api/authority/sos/:sosId/escalate
    const escalateRes = await makeRequest(
      'POST',
      `/api/authority/sos/${sosId}/escalate`,
      { reason: 'Suspect observed with weapon on nearby CCTV feed' },
      authorityToken
    );
    assert(
      'POST /api/authority/sos/:sosId/escalate flags alert overdue/escalated for dashboard',
      escalateRes.status === 200 &&
      escalateRes.data?.success === true &&
      escalateRes.data?.data?.isEscalated === true &&
      escalateRes.data?.data?.severity === 'critical'
    );

    // 22. POST /api/authority/sos/:sosId/resolve
    const resolveRes = await makeRequest(
      'POST',
      `/api/authority/sos/${sosId}/resolve`,
      { closingNote: 'Suspect detained by Patrol #101. Tourist escorted safely to Canadian Consulate.' },
      authorityToken
    );
    assert(
      'POST /api/authority/sos/:sosId/resolve marks alert resolved with closing notes',
      resolveRes.status === 200 &&
      resolveRes.data?.success === true &&
      resolveRes.data?.data?.status === 'resolved' &&
      resolveRes.data?.data?.closingNote.includes('Canadian Consulate')
    );

    // Verify assigned unit was released back to available
    const unitAfterResolve = await ResponseUnit.findOne({ unitId: 'PATROL-101' });
    assert(
      'Assigned ResponseUnit automatically resets back to available status upon SOS resolution',
      unitAfterResolve?.status === 'available' &&
      unitAfterResolve?.activeSosId === null
    );

    // ----------------------------------------------------
    // SECTION 4: REAL-TIME SOCKET.IO ZONE DISPATCH
    // ----------------------------------------------------
    console.log('\n⚡ Testing Section 4: Socket.IO Real-Time Zone Reception...');

    let socketReceivedAck = false;
    const socketClient = ioClient(baseUrl, {
      auth: { token: authorityToken },
      transports: ['websocket']
    });

    await new Promise((resolve) => {
      socketClient.on('connect', () => {
        console.log('    [Socket.IO Client] Connected to test server');
        socketClient.on('sos:emergency', (data) => {
          socketReceivedAck = true;
        });
        resolve();
      });
    });

    // Tourist triggers SOS
    const triggerRes = await makeRequest(
      'POST',
      '/api/sos',
      {
        location: { lat: 12.9716, lng: 77.5946 },
        message: 'Real-time test emergency SOS trigger'
      },
      touristToken
    );
    assert('Tourist triggers new emergency SOS', triggerRes.status === 201);

    // Wait 300ms for websocket packet
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(
      'Socket.IO pushes SOS instantly to authority dashboard without polling',
      socketReceivedAck === true
    );

    socketClient.disconnect();

    console.log('\n=============================================================');
    console.log(`🎉 ALL ${passed}/${total} AUTHORITY & MONITORING TESTS PASSED!`);
    console.log('=============================================================\n');

    server.close();
    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    if (server) server.close();
    await closeDB();
    process.exit(1);
  }
};

runAuthorityVerification();
