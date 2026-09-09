const path = require('path');
const express = require('express');
const cors = require('cors');
const https = require('https');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { connectMongo, getMongoStatus } = require('./config/db');
const Inquiry = require('./models/Inquiry');
const ChatLog = require('./models/ChatLog');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.resolve(__dirname, '../frontend');
const frontendOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || frontendOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

const isEmailConfigured = Boolean(
  process.env.RESEND_API_KEY &&
  process.env.EMAIL_FROM &&
  process.env.EMAIL_TO
);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sendEmailWithResend({ to, from, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ to: [to], from, subject, html });

    const request = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 15000,
      },
      (response) => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });

        response.on('end', () => {
          let data = {};
          try {
            data = body ? JSON.parse(body) : {};
          } catch {
            data = { raw: body };
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
            return;
          }

          const message = data?.message || data?.name || `Resend request failed with status ${response.statusCode}.`;
          const error = new Error(message);
          error.statusCode = response.statusCode;
          error.resend = data;
          reject(error);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('Resend email request timed out.'));
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function normalizeApiKey(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, '') : '';
}

function buildFastReply(message = '') {
  const originalText = String(message || '').trim();
  const text = originalText.toLowerCase();

  // Detect Hindi written in Devanagari
  const isHindiScript = /[\u0900-\u097F]/.test(originalText);

  // Detect common Hinglish words
  const hinglishWords = [
    'hai', 'hain', 'kaise', 'kya', 'kr', 'kar', 'sakte', 'sakti',
    'chahiye', 'banna', 'banna hai', 'chahiye', 'kitna', 'kitne',
    'price', 'rate', 'paani', 'pani', 'bottle', 'distributor',
    'ban', 'bano', 'mil', 'milega', 'milegi', 'apna', 'aapka',
    'aapki', 'kahan', 'kab', 'kyu', 'kyon', 'wala', 'wali'
  ];

  const isHinglish = hinglishWords.some(word => text.includes(word));

  // Hindi / Devanagari response
  if (isHindiScript) {
    if (
      text.includes('साइज़') ||
      text.includes('साइज') ||
      text.includes('बोतल') ||
      text.includes('एमएल') ||
      text.includes('लीटर')
    ) {
      return 'Bellecure में 250 ml, 500 ml और 1 लीटर की बोतलें उपलब्ध हैं।';
    }

    if (
      text.includes('शुद्ध') ||
      text.includes('प्योर') ||
      text.includes('सुरक्षित') ||
      text.includes('गुणवत्ता') ||
      text.includes('क्वालिटी')
    ) {
      return 'Bellecure स्वच्छ और सुरक्षित पेयजल के लिए RO, UV और UF जैसी multi-stage purification process का उपयोग करता है।';
    }

    if (
      text.includes('डिस्ट्रीब्यूटर') ||
      text.includes('डिस्ट्रीब्यूशन') ||
      text.includes('पार्टनर') ||
      text.includes('बिजनेस')
    ) {
      return 'आप Bellecure के distributor या business partner बनने के लिए वेबसाइट के Partner with us form को भर सकते हैं। हमारी टीम आपसे संपर्क करेगी।';
    }

    if (
      text.includes('कीमत') ||
      text.includes('दाम') ||
      text.includes('रेट') ||
      text.includes('प्राइस')
    ) {
      return 'Bellecure की latest pricing और bulk rates के लिए हमारी sales team से संपर्क करें।';
    }

    return 'Bellecure Darbhanga, Bihar का premium packaged drinking water brand है, जो purity, trust और quality पर focused है।';
  }

  // Hinglish response
  if (isHinglish) {
    if (
      text.includes('size') ||
      text.includes('bottle') ||
      text.includes('ml') ||
      text.includes('litre') ||
      text.includes('liter')
    ) {
      return 'Bellecure mein 250 ml, 500 ml aur 1 litre bottle options available hain.';
    }

    if (
      text.includes('purity') ||
      text.includes('safe') ||
      text.includes('quality') ||
      text.includes('clean') ||
      text.includes('shuddh')
    ) {
      return 'Bellecure clean aur safe drinking water ke liye RO, UV aur UF treatment wali multi-stage purification process follow karta hai.';
    }

    if (
      text.includes('distributor') ||
      text.includes('partner') ||
      text.includes('business')
    ) {
      return 'Bilkul! Aap Bellecure ke distributor ya business partner ban sakte hain. Website par Partner with us form fill kijiye, hamari team aapse contact karegi.';
    }

    if (
      text.includes('price') ||
      text.includes('cost') ||
      text.includes('rate') ||
      text.includes('kitna')
    ) {
      return 'Bellecure ki latest pricing aur bulk rates ke liye hamari sales team se contact kijiye.';
    }

    return 'Bellecure Darbhanga, Bihar ka premium packaged drinking water brand hai, jo purity, trust aur quality par focused hai.';
  }

  // English response
  if (
    text.includes('size') ||
    text.includes('bottle') ||
    text.includes('ml') ||
    text.includes('litre') ||
    text.includes('liter')
  ) {
    return 'Bellecure offers 250 ml, 500 ml, and 1 litre bottle options for daily use, travel, and family hydration.';
  }

  if (
    text.includes('purity') ||
    text.includes('safe') ||
    text.includes('quality') ||
    text.includes('clean')
  ) {
    return 'Bellecure follows a multi-stage purification process with RO, UV, and UF treatment to provide clean, safe, and refreshing drinking water.';
  }

  if (
    text.includes('distributor') ||
    text.includes('partner') ||
    text.includes('business')
  ) {
    return 'You can become a Bellecure distributor or partner by filling out the Partner with us form on the website. Our team will contact you.';
  }

  if (
    text.includes('price') ||
    text.includes('cost') ||
    text.includes('rate')
  ) {
    return 'Bellecure offers value-based pricing for households, retail stores, and distributors. Please contact our sales team for the latest bulk and partner rates.';
  }

  return 'Bellecure is a premium packaged drinking water brand from Darbhanga, Bihar, focused on purity, trust, and quality for homes, offices, and business partners.';
}

const genAI = normalizeApiKey(process.env.GEMINI_API_KEY)
  ? new GoogleGenerativeAI(normalizeApiKey(process.env.GEMINI_API_KEY))
  : null;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@bellecure.in').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey || '';
  const email = req.headers['x-admin-email'] || req.query.adminEmail || '';

  const validEmail = String(email).trim().toLowerCase() === String(ADMIN_EMAIL).trim().toLowerCase();
  const validKey = String(key) === String(ADMIN_PASSWORD);

  if (validKey && (!email || validEmail)) {
    return next();
  }

  if (validEmail && validKey) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized access. Invalid admin email or password.'
  });
}

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (normalizedEmail === String(ADMIN_EMAIL).trim().toLowerCase() && String(password) === String(ADMIN_PASSWORD)) {
    return res.json({ success: true, message: 'Login successful.' });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid admin email or password.'
  });
});

app.get('/health', async (req, res) => {
  const mongoStatus = getMongoStatus();
  res.json({
    status: 'ok',
    database: mongoStatus.state,
  });
});

app.get('/db-status', async (req, res) => {
  const status = getMongoStatus();
  res.json({
    success: true,
    database: status,
  });
});

app.get('/api/inquiries', requireAdmin, async (req, res) => {
  try {
    const mongoConnected = await connectMongo();

    if (!mongoConnected) {
      return res.json({
        success: true,
        message: 'MongoDB is not configured yet. No inquiries are stored.',
        data: [],
      });
    }

    const inquiries = await Inquiry.find({}).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      data: inquiries,
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch inquiries.',
      data: [],
    });
  }
});

app.get('/api/chat-logs', requireAdmin, async (req, res) => {
  try {
    const mongoConnected = await connectMongo();

    if (!mongoConnected) {
      return res.json({
        success: true,
        message: 'MongoDB is not configured yet. No chat logs are stored.',
        data: [],
      });
    }

    const logs = await ChatLog.find({}).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching chat logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch chat logs.',
      data: [],
    });
  }
});

app.post('/api/contact', async (req, res) => {
  const { from_name, phone_number, city, state, district, business_type } = req.body || {};

  if (!from_name || !phone_number || !city || !state || !district || !business_type) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const phoneDigits = String(phone_number).replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return res.status(400).json({ success: false, message: 'Please enter a valid Mobile Number.' });
  }

  if (!isEmailConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please add RESEND_API_KEY, EMAIL_FROM, and EMAIL_TO in the environment.'
    });
  }

  try {
    const mongoConnected = await connectMongo();

    if (mongoConnected) {
      await Inquiry.create({
        from_name,
        phone_number,
        city,
        state,
        district,
        business_type,
        source: 'website',
      });
    }

    await sendEmailWithResend({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: 'New Bellecure Distributor Inquiry',
      html: `
        <h3>New Distributor Inquiry</h3>
        <p><strong>Name:</strong> ${escapeHtml(from_name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone_number)}</p>
        <p><strong>City:</strong> ${escapeHtml(city)}</p>
        <p><strong>State:</strong> ${escapeHtml(state)}</p>
        <p><strong>District:</strong> ${escapeHtml(district)}</p>
        <p><strong>Business Type:</strong> ${escapeHtml(business_type)}</p>
      `,
    });

    return res.json({ success: true, message: 'Inquiry sent successfully.' });
  } catch (error) {
    console.error('Resend mail error:', error);
    const message = error.statusCode === 401
      ? 'Resend authentication failed. Please verify the RESEND_API_KEY in Render.'
      : error.statusCode === 403
        ? 'Resend rejected the sender. Please verify your sending domain and EMAIL_FROM address.'
        : error.message === 'Resend email request timed out.'
          ? 'Email service timed out. Please try again.'
          : 'Unable to send inquiry right now.';
    return res.status(500).json({ success: false, message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a message.' });
  }

  const sessionId = req.headers['x-session-id'] || 'anonymous';
  const cleanedMessage = message.trim();
  const fallbackReply = buildFastReply(cleanedMessage);

  if (!genAI) {
    return res.json({
      success: true,
      reply: fallbackReply
    });
  }

  const mongoTask = connectMongo().catch(() => false);

  const saveChatLogs = (replyText) => {
    mongoTask.then((mongoConnected) => {
      if (!mongoConnected) return;

      Promise.all([
        ChatLog.create({
          sessionId,
          sender: 'user',
          message: cleanedMessage,
        }).catch(() => undefined),
        ChatLog.create({
          sessionId,
          sender: 'bot',
          message: replyText,
        }).catch(() => undefined),
      ]).catch(() => undefined);
    }).catch(() => undefined);
  };

  const modelCandidates = ['gemini-3.6-flash'];
  let lastError = null;

  const runWithTimeout = async (promise, timeoutMs = 5000) => {
    let timer = null;

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const generationPromise = model.generateContent([
        `You are a helpful AI assistant for Bellecure Agro Food & Co., a premium packaged drinking water brand from Darbhanga, Bihar.

Language rules:
- Detect the language and style used by the user.
- If the user writes in English, reply in English.
- If the user writes in Hindi, reply in Hindi using Devanagari script.
- If the user writes in Hinglish (Hindi written using English letters), reply naturally in Hinglish using English letters.
- If the user mixes Hindi and English, reply in the same mixed style.
- Never force English when the user is speaking Hindi or Hinglish.
- Keep replies concise, friendly, professional, and easy to understand.

Knowledge rules:
- Answer only about Bellecure, its products, packaged drinking water, quality, distribution, partnership, and information available on the website.
- Do not invent facts, prices, sizes, certifications, locations, or policies.
- If you are unsure about something, clearly say that you are not certain and suggest contacting the Bellecure team.

User question: ${cleanedMessage}`
      ]);

      const result = await runWithTimeout(generationPromise, 5000);
      const responseText = result.response.text();

      saveChatLogs(responseText);
      return res.json({ success: true, reply: responseText });
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.statusCode;
      const isTimeout = error?.message === 'Gemini timeout';

      if (isTimeout || status === 404 || status === 400) {
        console.warn(`Gemini model ${modelName} slow or unavailable, using fallback reply.`);
        saveChatLogs(fallbackReply);
        return res.json({ success: true, reply: fallbackReply });
      }

      console.error(`Gemini model attempt failed for ${modelName}:`, error);
      break;
    }
  }

  console.error('Gemini error:', lastError);
  saveChatLogs(fallbackReply);
  return res.json({ success: true, reply: fallbackReply });
});

app.buildFastReply = buildFastReply;
app.normalizeApiKey = normalizeApiKey;

if (require.main === module) {
  connectMongo().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = app;
