const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { address } = require('node:net');

let app;

async function startServer() {
  if (!app) {
    app = require('../server');
  }

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, port };
}

test('health endpoint is available', async () => {
  const { server, port } = await startServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'ok');
  } finally {
    server.close();
  }
});

test('contact endpoint validates required fields', async () => {
  const { server, port } = await startServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' })
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.success, false);
  } finally {
    server.close();
  }
});

test('normalizes Gemini API key values with whitespace', () => {
  const { normalizeApiKey } = require('../server');
  assert.equal(normalizeApiKey('cbyj rnip qzod vvno'), 'cbyjrnipqzodvvno');
});

test('builds a fast product fallback reply for common Bellecure questions', () => {
  const { buildFastReply } = require('../server');
  const reply = buildFastReply('What is the bottle size?');
  assert.match(reply, /250|500|1 litre|litre|bottle/i);
  assert.ok(reply.length > 20);
});

test('contact endpoint returns a clear message when email service is not configured', async () => {
  const originalUser = process.env.EMAIL_USER;
  const originalPass = process.env.EMAIL_PASS;
  process.env.EMAIL_USER = '';
  process.env.EMAIL_PASS = '';

  delete require.cache[require.resolve('../server')];
  const freshApp = require('../server');

  const server = createServer(freshApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_name: 'Jane Doe',
        phone_number: '+91 99999 99999',
        city: 'Patna',
        state: 'Bihar',
        district: 'Patna',
        business_type: 'distributor'
      })
    });

    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.message, /email.*configured|configured/i);
  } finally {
    server.close();

    if (originalUser === undefined) {
      delete process.env.EMAIL_USER;
    } else {
      process.env.EMAIL_USER = originalUser;
    }

    if (originalPass === undefined) {
      delete process.env.EMAIL_PASS;
    } else {
      process.env.EMAIL_PASS = originalPass;
    }

    delete require.cache[require.resolve('../server')];
  }
});

test('admin inquiry list endpoint responds successfully', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/inquiries`, {
      headers: {
        'x-admin-email': process.env.ADMIN_EMAIL || 'admin@bellecure.in',
        'x-admin-key': process.env.ADMIN_PASSWORD || 'admin123'
      }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  } finally {
    server.close();
  }
});

test('admin chat log list endpoint responds successfully', async () => {
  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/chat-logs`, {
      headers: {
        'x-admin-email': process.env.ADMIN_EMAIL || 'admin@bellecure.in',
        'x-admin-key': process.env.ADMIN_PASSWORD || 'admin123'
      }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  } finally {
    server.close();
  }
});

test('admin login accepts matching email and password and rejects invalid credentials', async () => {
  const { server, port } = await startServer();

  try {
    const validResponse = await fetch(`http://127.0.0.1:${port}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@bellecure.in',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      })
    });

    assert.equal(validResponse.status, 200);
    const validBody = await validResponse.json();
    assert.equal(validBody.success, true);

    const invalidResponse = await fetch(`http://127.0.0.1:${port}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@email.com',
        password: 'wrong-password'
      })
    });

    assert.equal(invalidResponse.status, 401);
    const invalidBody = await invalidResponse.json();
    assert.equal(invalidBody.success, false);
  } finally {
    server.close();
  }
});
