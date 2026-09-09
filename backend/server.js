const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
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

const isEmailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

function normalizeApiKey(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, '') : '';
}

function buildFastReply(message = '') {
  const text = String(message || '').trim().toLowerCase();

  if (text.includes('size') || text.includes('bottle') || text.includes('ml') || text.includes('litre') || text.includes('liter')) {
    return 'Bellecure offers 250 ml, 500 ml, and 1 litre bottle options for daily use, travel, and family hydration.';
  }

  if (text.includes('purity') || text.includes('safe') || text.includes('quality') || text.includes('clean')) {
    return 'Bellecure follows a multi-stage purification process with RO, UV, and UF treatment to provide clean, safe, and refreshing drinking water.';
  }

  if (text.includes('distributor') || text.includes('partner') || text.includes('business')) {
    return 'You can become a Bellecure distributor or partner by contacting our sales team through the website form or by calling +91 8700905571.';
  }

  if (text.includes('price') || text.includes('cost') || text.includes('rate')) {
    return 'Bellecure offers value-based pricing for households, retail stores, and distributors. Please contact our team for the latest bulk and partner rates.';
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

  if (!isEmailConfigured || !transporter) {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please add EMAIL_USER and EMAIL_PASS in the environment.'
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

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      subject: 'New Bellecure Distributor Inquiry',
      html: `
        <h3>New Distributor Inquiry</h3>
        <p><strong>Name:</strong> ${from_name}</p>
        <p><strong>Phone:</strong> ${phone_number}</p>
        <p><strong>City:</strong> ${city}</p>
        <p><strong>State:</strong> ${state}</p>
        <p><strong>District:</strong> ${district}</p>
        <p><strong>Business Type:</strong> ${business_type}</p>
      `,
    });

    return res.json({ success: true, message: 'Inquiry sent successfully.' });
  } catch (error) {
    console.error('Mail error:', error);
    const message = error.code === 'EAUTH'
      ? 'Gmail authentication failed. Please verify your Gmail app password and that 2-factor authentication is enabled.'
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
        `You are a helpful assistant for Bellecure Agro Food & Co., a premium packaged drinking water brand from Darbhanga, Bihar. Answer product and brand questions in a concise, friendly, and professional way. Do not invent facts. If unsure, say you are not certain. User question: ${cleanedMessage}`
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
