import http from 'http';
import app from './index';
import { env } from './config/env';

const PORT = 5099; // Dedicated test port
let server: http.Server;
let superAdminToken = '';
let userToken = '';

function request(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request(
      `http://localhost:${PORT}${path}`,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode || 500, data: json, headers: res.headers });
          } catch {
            resolve({ status: res.statusCode || 500, data: raw, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE BACKEND & SECURITY TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error('     Detail:', detail);
      failed++;
    }
  }

  try {
    // 1. Health & Readiness Probes
    console.log('--- 1. System Health Probes ---');
    const healthRes = await request('/health');
    assert(healthRes.status === 200 && healthRes.data.status === 'ok', 'GET /health returns 200 OK');

    const readyRes = await request('/ready');
    assert(readyRes.status === 200 && readyRes.data.status === 'ready', 'GET /ready returns 200 OK');

    // 1b. CORS Origin Security Validation
    console.log('\n--- 1b. Strict CORS Origin Gate ---');
    const allowedCorsRes = await request('/api/v1/categories', {
      headers: { Origin: 'https://indianfullxx.com' },
    });
    assert(allowedCorsRes.status === 200 && allowedCorsRes.headers['access-control-allow-origin'] === 'https://indianfullxx.com', 'Actual domain https://indianfullxx.com permitted by CORS');

    const vercelCorsRes = await request('/api/v1/categories', {
      headers: { Origin: 'https://fapnxx.vercel.app' },
    });
    assert(vercelCorsRes.status === 200 && vercelCorsRes.headers['access-control-allow-origin'] === 'https://fapnxx.vercel.app', 'Vercel domain https://fapnxx.vercel.app permitted by CORS');

    const blockedCorsRes = await request('/api/v1/categories', {
      headers: { Origin: 'https://unauthorized-attacker.xyz' },
    });
    assert(blockedCorsRes.status === 403 && blockedCorsRes.data?.error?.code === 'CORS_FORBIDDEN', 'Unknown origin https://unauthorized-attacker.xyz blocked with 403 CORS_FORBIDDEN');

    // 2. Public Content APIs
    console.log('\n--- 2. Public Content APIs ---');
    const videosRes = await request('/api/v1/videos');
    assert(videosRes.status === 200 && Array.isArray(videosRes.data.data.videos), 'GET /api/v1/videos lists published videos');

    const categoriesRes = await request('/api/v1/categories');
    assert(categoriesRes.status === 200 && Array.isArray(categoriesRes.data.data), 'GET /api/v1/categories lists categories');

    const bannersRes = await request('/api/v1/banners');
    assert(bannersRes.status === 200 && Array.isArray(bannersRes.data.data), 'GET /api/v1/banners lists active banners');

    const adsRes = await request('/api/v1/ads');
    assert(adsRes.status === 200 && Array.isArray(adsRes.data.data), 'GET /api/v1/ads lists ad campaigns');

    // 3. User Authentication
    console.log('\n--- 3. User Authentication & Security ---');
    const testEmail = `new_test_user_${Date.now()}@example.com`;
    const registerRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { email: testEmail, password: 'Password123!' },
    });
    assert(registerRes.status === 201 && registerRes.data.success, 'POST /api/v1/auth/register creates user account');

    const userLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: 'Password123!' },
    });
    assert(userLoginRes.status === 200 && userLoginRes.data.data.accessToken, 'POST /api/v1/auth/login logs in user');
    userToken = userLoginRes.data?.data?.accessToken;

    const invalidLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: 'WrongPassword!' },
    });
    assert(invalidLoginRes.status === 400 || invalidLoginRes.status === 500, 'POST /api/v1/auth/login rejects wrong password');

    // 4. Admin Authentication & Super Admin Setup
    console.log('\n--- 4. Admin Authentication & RBAC Gates ---');
    const adminLoginRes = await request('/api/v1/auth/admin-login', {
      method: 'POST',
      body: { email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD },
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.data.user.role === 'SUPER_ADMIN', 'POST /api/v1/auth/admin-login authenticates Super Admin');
    superAdminToken = adminLoginRes.data?.data?.accessToken;

    // Normal user attempting admin login
    const normalUserAdminLoginRes = await request('/api/v1/auth/admin-login', {
      method: 'POST',
      body: { email: testEmail, password: 'Password123!' },
    });
    assert(normalUserAdminLoginRes.status === 500 || normalUserAdminLoginRes.status === 400 || normalUserAdminLoginRes.status === 403, 'Normal user blocked from admin login');

    // 5. RBAC Protection
    console.log('\n--- 5. RBAC & Route Access Control ---');
    const unauthAdminRes = await request('/api/v1/admin/overview');
    assert(unauthAdminRes.status === 401, 'Unauthenticated GET /api/v1/admin/overview returns 401 Unauthorized');

    const forbiddenAdminRes = await request('/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(forbiddenAdminRes.status === 403, 'User token GET /api/v1/admin/overview returns 403 Forbidden');

    const allowedAdminRes = await request('/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(allowedAdminRes.status === 200 && allowedAdminRes.data.data.stats, 'Super Admin GET /api/v1/admin/overview returns 200 OK');

    // 6. Immutable Audit Logs
    console.log('\n--- 6. Audit Logging ---');
    const auditRes = await request('/api/v1/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(auditRes.status === 200 && Array.isArray(auditRes.data.data.logs) && auditRes.data.data.logs.length > 0, 'Audit logs recorded and accessible to Super Admin');

    // 7. Video Creation RBAC Security (Guest 401, User 403, Staff 201)
    console.log('\n--- 7. Video Creation RBAC Security ---');
    const guestVideoRes = await request('/api/v1/videos', {
      method: 'POST',
      body: { title: 'Unauthorized Video' },
    });
    assert(guestVideoRes.status === 401, 'Guest POST /api/v1/videos blocked with 401 Unauthorized');

    const userVideoRes = await request('/api/v1/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { title: 'Forbidden User Video', thumbnail: 'https://images.unsplash.com/test.jpg', category: 'indian' },
    });
    assert(userVideoRes.status === 403, 'Normal User POST /api/v1/videos blocked with 403 Forbidden');

    const invalidVideoRes = await request('/api/v1/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: { title: '' }, // Missing thumbnail and invalid title
    });
    assert(invalidVideoRes.status === 422, 'Super Admin POST /api/v1/videos with invalid payload returns 422 Unprocessable Entity');

    const blobVideoRes = await request('/api/v1/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        title: 'Blob Stream Test Video',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
        embedUrl: 'blob:http://localhost:5173/3829-4829-fake-blob-id',
        category: 'amateur',
      },
    });
    assert(blobVideoRes.status === 400 || blobVideoRes.status === 500, 'Video creation with temporary blob: URL rejected with error');

    const validVideoRes = await request('/api/v1/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        title: 'Dynamic Test Video 4K',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
        category: 'amateur',
        duration: '12:45',
        quality: '4K',
      },
    });
    assert(validVideoRes.status === 201 && validVideoRes.data.success, 'Super Admin POST /api/v1/videos succeeds with 201 Created');
    const createdVideoId = validVideoRes.data?.data?.id;

    // 8. Video Views & Anti-Spam View Debounce
    console.log('\n--- 8. View Count Anti-Spam Engine ---');
    const view1 = await request(`/api/v1/videos/${createdVideoId}/views`, { method: 'POST' });
    assert(view1.status === 200 && view1.data.data.counted === true, 'First view increment counted');

    const view2 = await request(`/api/v1/videos/${createdVideoId}/views`, { method: 'POST' });
    assert(view2.status === 200 && view2.data.data.counted === false, 'Immediate repeat view debounced (anti-spam protection active)');

    // 9. Video Likes Engine
    console.log('\n--- 9. Like Counter ---');
    const likeRes = await request(`/api/v1/videos/${createdVideoId}/likes`, {
      method: 'POST',
      body: { isLike: true },
    });
    assert(likeRes.status === 200 && typeof likeRes.data.data.likesCount === 'number' && typeof likeRes.data.data.rating === 'string', 'POST /api/v1/videos/:id/likes updates likes and calculates rating');

    // 10. Comments & Reports
    console.log('\n--- 10. Community Comments & DMCA Reports ---');
    const commentRes = await request('/api/v1/comments', {
      method: 'POST',
      body: { videoId: createdVideoId, text: 'Great 4K scene!' },
    });
    assert(commentRes.status === 201 && commentRes.data.data.text === 'Great 4K scene!', 'POST /api/v1/comments creates comment');

    const reportRes = await request('/api/v1/reports', {
      method: 'POST',
      body: {
        videoId: createdVideoId,
        videoTitle: 'Dynamic Test Video 4K',
        reason: 'copyright_dmca',
        details: 'Copyright claim validation test',
      },
    });
    assert(reportRes.status === 201 && reportRes.data.data.status === 'pending', 'POST /api/v1/reports creates pending DMCA claim');

    // Summary
    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (e) {
    console.error('Test execution error:', e);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

server = app.listen(PORT, () => {
  runTests();
});
