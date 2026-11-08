const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Initialize environment variables from root and backend .env before loading any other modules
const rootEnvPath = path.resolve(__dirname, '../.env');
const backendEnvPath = path.resolve(__dirname, '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
dotenv.config();

const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./config/db');
const { connectMongo, getMongoStatus } = db;
const Inquiry = require('./models/Inquiry');
const ChatLog = require('./models/ChatLog');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.resolve(__dirname, '../frontend');
const frontendOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (frontendOrigins.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'bellecure.co.in' || hostname.endsWith('.bellecure.co.in')) return true;
    if (hostname.endsWith('.netlify.app')) return true;
    if (hostname.endsWith('.onrender.com')) return true;
  } catch {
    return false;
  }

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
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

function getEmailConfig() {
  const apiKey = typeof process.env.RESEND_API_KEY === 'string' ? process.env.RESEND_API_KEY.trim() : '';
  const from = typeof process.env.EMAIL_FROM === 'string' ? process.env.EMAIL_FROM.trim() : '';
  const to = typeof process.env.EMAIL_TO === 'string' ? process.env.EMAIL_TO.trim() : '';

  const missing = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!from) missing.push('EMAIL_FROM');
  if (!to) missing.push('EMAIL_TO');

  return {
    apiKey,
    from,
    to,
    isConfigured: missing.length === 0,
    missing,
  };
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sendEmailWithResend({ to, from, subject, html }) {
  const { apiKey } = getEmailConfig();

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ to: [to], from, subject, html });

    const request = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
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

function buildFastReply(message = '', history = []) {
  const originalText = String(message || '').trim();
  const text = originalText.toLowerCase();

  // Detect Hindi written in Devanagari script
  const isHindiScript = /[\u0900-\u097F]/.test(originalText);

  // Detect common Hinglish words
  const hinglishKeywords = [
    'hai', 'hain', 'kaise', 'kya', 'kr', 'kar', 'sakte', 'sakti', 'skte',
    'chahiye', 'chahie', 'banna', 'kitna', 'kitne', 'paani', 'pani', 'bano',
    'mil', 'milega', 'milegi', 'apna', 'aapka', 'aapki', 'kahan', 'kab',
    'kyu', 'kyon', 'wala', 'wali', 'madad', 'batao', 'bataiye', 'dena',
    'namaste', 'kaun', 'kaunsa', 'kaunsi', 'badhiya', 'theek', 'karo'
  ];

  const isHinglish = hinglishKeywords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
  const lang = isHindiScript ? 'hi' : (isHinglish ? 'hinglish' : 'en');

  // Check recent conversation turns for context
  const recentContext = Array.isArray(history)
    ? history.slice(-4).map(h => String(h.content || '').toLowerCase()).join(' ')
    : '';

  // 1. Greetings (Hi, Hello, Namaste, etc.)
  const isGreeting = (
    /^(hi|hello|hey|namaste|namaskar|pranam|ram ram|good morning|good afternoon|good evening)[!.,\s]*$/i.test(text) ||
    (/(नमस्ते|नमस्कार|प्रणाम|हेलो|हाय)/.test(originalText) && originalText.length <= 25) ||
    (/\b(hi|hello|hey)\b/i.test(text) && text.length <= 15)
  );
  if (isGreeting) {
    if (lang === 'hi') {
      return 'नमस्ते! Bellecure में आपका स्वागत है 😊 आज मैं आपकी क्या सहायता कर सकता हूँ?';
    }
    if (lang === 'hinglish') {
      return 'Hi! Bellecure mein aapka swagat hai 😊 Main aapki kya madad kar sakta hoon?';
    }
    return 'Hi! Welcome to Bellecure 😊 How can I help you today?';
  }

  // 2. Pleasantries (How are you, Kaise ho, etc.)
  const isPleasantry = (
    /\b(how are you|how r u|how do you do|how is it going|how are things)\b/i.test(text) ||
    /\b(kaise ho|kese ho|kya haal|aap kaise|sab theek)\b/i.test(text) ||
    /(कैसे\s*हो|कैसा\s*है|क्या\s*हाल)/.test(originalText)
  );
  if (isPleasantry) {
    if (lang === 'hi') {
      return 'मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! आज मैं Bellecure के बारे में आपकी क्या सहायता कर सकता हूँ?';
    }
    if (lang === 'hinglish') {
      return "I'm doing well, thank you! Aaj main aapki Bellecure ke baare mein kya madad kar sakta hoon?";
    }
    return "I'm doing well, thank you! How can I help you with Bellecure today?";
  }

  // 3. Capabilities (What can you do, Kya help kar sakte ho, etc.)
  const isCapabilities = (
    /\b(what can you do|how can you help|what help|capabilities|what do you do)\b/i.test(text) ||
    /\b(kya help|kya madad|kya kar sakte|kya kr skte|kya kar skte|kya kar sakti)\b/i.test(text) ||
    /(क्या\s*मदद|क्या\s*कर\s*सकते|क्या\s*सहायता)/.test(originalText)
  );
  if (isCapabilities) {
    if (lang === 'hi') {
      return 'मैं Bellecure के बोतल साइज़ (250ml, 500ml, 1L), जल शुद्धिकरण प्रक्रिया, बल्क ऑर्डर और डिस्ट्रीब्यूटर पार्टनरशिप में आपकी मदद कर सकता हूँ। आप किस बारे में जानना चाहते हैं?';
    }
    if (lang === 'hinglish') {
      return 'Main Bellecure ke bottle sizes (250ml, 500ml, 1L), water quality & purification process, bulk orders aur distributor opportunities ke baare mein help kar sakta hoon. Aap kis baare mein jaanna chahte hain?';
    }
    return 'I can help you with Bellecure bottle sizes (250ml, 500ml, 1L), water purity & purification process, bulk orders, and dealership opportunities. What would you like to know?';
  }

  // 4. Bottle Size Follow-up / Specific Size Selection (e.g. "500ml chahiye", "250ml chahiye", "1L")
  const mentions500ml = /\b(500\s*ml|500ml)\b/i.test(text);
  const mentions250ml = /\b(250\s*ml|250ml)\b/i.test(text);
  const mentions1L = /\b(1\s*l|1l|1\s*litre|1\s*liter|1000\s*ml)\b/i.test(text);
  const isSpecificSizeWant = text.includes('chahiye') || text.includes('chahie') || text.includes('need') || text.includes('want') || text.includes('order') || recentContext.includes('size');

  if (mentions500ml && isSpecificSizeWant) {
    if (lang === 'hi') {
      return 'Bellecure 500ml दैनिक ऑफिस और व्यक्तिगत उपयोग के लिए सबसे लोकप्रिय पैक है। ऑर्डर या बल्क सप्लाई के लिए आप वेबसाइट पर इंक्वायरी फॉर्म भर सकते हैं या WhatsApp (+91 8700905571) पर हमारी टीम से संपर्क कर सकते हैं।';
    }
    if (lang === 'hinglish') {
      return '500ml daily office aur personal hydration ke liye perfect pack hai! Bulk order ya supply ke liye aap website inquiry form bhar sakte hain ya WhatsApp (+91 8700905571) par direct baat kar sakte hain.';
    }
    return 'Our 500ml pack is ideal for daily hydration and office use. To place an order or inquire about supply, please submit our website contact form or message our sales team on WhatsApp at +91 8700905571.';
  }

  if (mentions250ml && isSpecificSizeWant) {
    if (lang === 'hi') {
      return 'Bellecure 250ml यात्रा, शादियों और कार्यक्रमों के लिए उत्तम है। ऑर्डर के लिए कृपया वेबसाइट फॉर्म भरें या WhatsApp (+91 8700905571) पर संपर्क करें।';
    }
    if (lang === 'hinglish') {
      return '250ml pack travel, events aur quick hydration ke liye ideal hai. Order aur supply ke liye website inquiry form fill karein ya WhatsApp (+91 8700905571) par connect karein.';
    }
    return 'Our 250ml compact pack is perfect for travel, meetings, and events. To order, please fill out our website inquiry form or reach out on WhatsApp at +91 8700905571.';
  }

  if (mentions1L && isSpecificSizeWant) {
    if (lang === 'hi') {
      return 'Bellecure 1 लीटर पैक परिवार और डाइनिंग के लिए सबसे उपयुक्त है। ऑर्डर या सप्लाई के लिए वेबसाइट फॉर्म भरें या WhatsApp (+91 8700905571) पर संपर्क करें।';
    }
    if (lang === 'hinglish') {
      return '1 Litre pack family hydration aur dining ke liye best hai. Supply aur bulk orders ke liye website form submit karein ya WhatsApp (+91 8700905571) par message karein.';
    }
    return 'Our 1 Litre pack is ideal for home, family, and dining hydration. For orders and bulk rates, please submit our inquiry form or contact us on WhatsApp at +91 8700905571.';
  }

  // 5. Vague inquiry ("mujhe chahiye", "need water", "pani chahiye", etc.)
  const isVagueWant = (
    /\b(mujhe chahiye|chahiye|chahie|need water|want water|paani chahiye|pani chahiye|order karna|kharidna)\b/i.test(text) ||
    /(चाहिए|पानी\s*चाहिए|ऑर्डर\s*करना)/.test(originalText)
  );
  if (isVagueWant) {
    if (lang === 'hi') {
      return 'क्या आपको व्यक्तिगत/दैनिक उपयोग के लिए पानी चाहिए या बल्क डिस्ट्रीब्यूशन के लिए? और आप कौन सा साइज़ पसंद करेंगे — 250ml, 500ml या 1 लीटर?';
    }
    if (lang === 'hinglish') {
      return 'Aapko kis purpose ke liye water chahiye — personal/daily use ya bulk/dealership? Aur kaun sa size chahiye: 250ml, 500ml ya 1L?';
    }
    return 'Would you like water for personal/office use or bulk dealership? Please let us know your preferred bottle size: 250ml, 500ml, or 1 Litre.';
  }

  // 6. Bottle Sizes General Information
  const isSizeInquiry = (
    text.includes('size') || text.includes('bottle') || text.includes('ml') ||
    text.includes('litre') || text.includes('liter') || text.includes('साइज़') ||
    text.includes('साइज') || text.includes('बोतल') || text.includes('लीटर')
  );
  if (isSizeInquiry) {
    if (lang === 'hi') {
      return 'Bellecure में 3 सुविधाजनक बोतल साइज़ उपलब्ध हैं: 250 ml (इवेंट्स और यात्रा), 500 ml (दैनिक ऑफिस उपयोग), और 1 लीटर (परिवार और डाइनिंग)। आपको कौन सा साइज़ चाहिए?';
    }
    if (lang === 'hinglish') {
      return 'Bellecure mein 3 convenient bottle sizes available hain: 250ml (travel aur events ke liye), 500ml (daily office aur personal hydration ke liye), aur 1 Litre (family aur dining ke liye). Aapko kaun sa size chahiye?';
    }
    return 'Bellecure offers 3 convenient bottle sizes: 250ml (travel and events), 500ml (daily office and personal hydration), and 1 Litre (family and dining). Which size do you need?';
  }

  // 7. Purity / Quality / Water Treatment
  const isPurityInquiry = (
    text.includes('purity') || text.includes('safe') || text.includes('quality') ||
    text.includes('clean') || text.includes('shuddh') || text.includes('filter') ||
    text.includes('शुद्ध') || text.includes('सुरक्षित') || text.includes('गुणवत्ता') ||
    text.includes('प्योर') || text.includes('क्वालिटी')
  );
  if (isPurityInquiry) {
    if (lang === 'hi') {
      return 'Bellecure स्वच्छ और सुरक्षित पेयजल के लिए RO, UV और UF जैसी multi-stage purification प्रक्रिया का उपयोग करता है, जिसमें आवश्यक मिनरल्स संतुलित रहते हैं।';
    }
    if (lang === 'hinglish') {
      return 'Bellecure clean aur safe drinking water ke liye RO, UV aur UF multi-stage purification process follow karta hai, jisme essential minerals balanced rehte hain.';
    }
    return 'Bellecure follows a multi-stage purification process with RO, UV, and UF treatment, retaining balanced essential minerals under strict BIS/FSSAI packaged drinking water standards.';
  }

  // 8. Distributor / Dealership / Business Partnership
  const isDistributorInquiry = (
    text.includes('distributor') || text.includes('dealership') || text.includes('partner') ||
    text.includes('business') || text.includes('agency') || text.includes('डिस्ट्रीब्यूटर') ||
    text.includes('डिस्ट्रीब्यूशन') || text.includes('पार्टनर') || text.includes('बिजनेस') ||
    text.includes('डीलरशिप')
  );
  if (isDistributorInquiry) {
    if (lang === 'hi') {
      return 'आप Bellecure के डिस्ट्रीब्यूटर या बिज़नेस पार्टनर बनने के लिए वेबसाइट के "Partner with us" फॉर्म को भर सकते हैं या सीधे WhatsApp (+91 8700905571) पर हमारी टीम से संपर्क कर सकते हैं।';
    }
    if (lang === 'hinglish') {
      return 'Bellecure ke saath distributor ya business partner banne ke liye website par "Partner with us" form fill karein ya direct WhatsApp (+91 8700905571) par connect karein.';
    }
    return 'You can become a Bellecure distributor or business partner by filling out the "Partner with us" form on our website or contacting our team directly on WhatsApp at +91 8700905571.';
  }

  // 9. Pricing / Rates / Bulk Cost
  const isPriceInquiry = (
    text.includes('price') || text.includes('cost') || text.includes('rate') ||
    text.includes('kitna') || text.includes('kitne') || text.includes('कीमत') ||
    text.includes('दाम') || text.includes('रेट') || text.includes('प्राइस')
  );
  if (isPriceInquiry) {
    if (lang === 'hi') {
      return 'Bellecure की लेटेस्ट प्राइसिंग और बल्क रेट्स के लिए वेबसाइट फॉर्म भरें या हमारी सेल्स टीम से WhatsApp (+91 8700905571) पर संपर्क करें।';
    }
    if (lang === 'hinglish') {
      return 'Bellecure retail aur bulk orders ke liye value pricing offer karta hai. Latest rate card aur bulk discounts ke liye website inquiry form fill karein ya WhatsApp (+91 8700905571) par connect karein.';
    }
    return 'Bellecure offers value-based pricing for retail, institutional, and bulk orders. Please contact our sales team via WhatsApp (+91 8700905571) or the website inquiry form for our latest rates.';
  }

  // 10. About / Location / Plant / Company Background
  const isAboutInquiry = (
    text.includes('about') || text.includes('company') || text.includes('plant') ||
    text.includes('factory') || text.includes('darbhanga') || text.includes('bihar') ||
    text.includes('kahan') || text.includes('kidhar') || text.includes('bellecure kya')
  );
  if (isAboutInquiry) {
    if (lang === 'hi') {
      return 'Bellecure Agro Food & Co. दरभंगा, बिहार का प्रीमियम पैकेज्ड ड्रिंकिंग वॉटर ब्रांड है, जो शुद्धता, विश्वास और गुणवत्ता के साथ सुरक्षित पेयजल प्रदान करता है।';
    }
    if (lang === 'hinglish') {
      return 'Bellecure Agro Food & Co. Darbhanga, Bihar ka premium packaged drinking water brand hai, jo purity, trust aur highest quality hydration par focused hai.';
    }
    return 'Bellecure Agro Food & Co. is a premium packaged drinking water brand based in Darbhanga, Bihar, dedicated to delivering pure, safe, and quality drinking water.';
  }

  // 11. Conversational Fallback (helpful guidance instead of robotic slogan)
  if (lang === 'hi') {
    return 'मैं Bellecure के बोतल साइज़ (250ml, 500ml, 1L), जल शुद्धता, बल्क ऑर्डर या डिस्ट्रीब्यूटर पार्टनरशिप में आपकी सहायता कर सकता हूँ। कृपया बताएं आप क्या जानना चाहते हैं?';
  }
  if (lang === 'hinglish') {
    return 'Main Bellecure ke bottle sizes (250ml, 500ml, 1L), water purity, bulk orders ya dealership ke baare mein madad kar sakta hoon. Aap kis baare mein jaanna chahte hain?';
  }
  return 'I can assist you with Bellecure bottle sizes (250ml, 500ml, 1L), water purity, bulk orders, or dealership inquiries. What would you like to know?';
}

const genAI = normalizeApiKey(process.env.GEMINI_API_KEY)
  ? new GoogleGenerativeAI(normalizeApiKey(process.env.GEMINI_API_KEY))
  : null;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@bellecure.in').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || '';
  const email = req.headers['x-admin-email'] || '';

  const validEmail = String(email).trim().toLowerCase() === String(ADMIN_EMAIL).trim().toLowerCase();
  const validKey = String(key) === String(ADMIN_PASSWORD);

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
  const status = db.getMongoStatus();
  res.json({
    success: true,
    database: status,
  });
});

app.get('/api/inquiries', requireAdmin, async (req, res) => {
  try {
    const mongoConnected = await db.connectMongo();

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
    const mongoConnected = await db.connectMongo();

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

  let mongoConnected = false;
  let mongoSaved = false;

  try {
    mongoConnected = await db.connectMongo();
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
      mongoSaved = true;
    }
  } catch (dbErr) {
    console.error('MongoDB inquiry save error:', dbErr);
  }

  const emailConfig = getEmailConfig();

  if (!emailConfig.isConfigured) {
    if (mongoSaved) {
      return res.json({
        success: true,
        message: 'Inquiry received successfully! Our team will contact you shortly.',
      });
    }

    console.warn(`[Contact Form] Email service is unconfigured. Missing variables: ${emailConfig.missing.join(', ')}`);

    return res.status(503).json({
      success: false,
      message: `Email service is not configured. Please add ${emailConfig.missing.join(', ')} in the environment.`,
      missing: emailConfig.missing,
    });
  }

  try {
    await sendEmailWithResend({
      from: emailConfig.from,
      to: emailConfig.to,
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
    if (mongoSaved) {
      console.warn('Email notification failed, but inquiry was safely persisted to MongoDB.');
      return res.json({
        success: true,
        message: 'Inquiry received successfully! Our team will contact you shortly.',
      });
    }

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

function formatGeminiHistory(rawHistory = []) {
  if (!Array.isArray(rawHistory)) return [];
  const formatted = [];
  let expectedRole = 'user';

  for (const item of rawHistory) {
    if (!item || typeof item.content !== 'string' || !item.content.trim()) continue;
    const role = (item.role === 'model' || item.role === 'bot' || item.role === 'assistant') ? 'model' : 'user';

    if (role === expectedRole) {
      formatted.push({
        role,
        parts: [{ text: item.content.trim() }]
      });
      expectedRole = role === 'user' ? 'model' : 'user';
    }
  }

  if (formatted.length > 0 && formatted[formatted.length - 1].role === 'user') {
    formatted.pop();
  }

  return formatted.slice(-8);
}

const SYSTEM_INSTRUCTION = `You are the Bellecure AI Assistant for Bellecure Agro Food & Co., a premium packaged drinking water brand based in Darbhanga, Bihar.

BRAND & PRODUCT SPECIFICATIONS:
- Brand Name: Bellecure Agro Food & Co.
- Headquarters & Production: Darbhanga, Bihar, India.
- Available Bottle Sizes:
  * 250 ml: Travel size, conferences, weddings, events, single-serve hydration.
  * 500 ml: Daily hydration, office desks, meetings, personal on-the-go use.
  * 1 Litre (1000 ml): Home, family dining, hospitality, all-day hydration.
- Water Quality & Purification: Multi-stage purification including Reverse Osmosis (RO), Ultraviolet (UV) disinfection, and Ultrafiltration (UF) treatment with balanced essential minerals, meeting strict BIS and FSSAI packaged drinking water quality standards.
- Dealership & Distribution: Actively expanding distribution across Bihar and neighbouring regions. Direct interested partners, distributors, and wholesalers to fill out the "Partner with us" inquiry form on the website or message via WhatsApp at +91 8700905571.
- Orders & Pricing: Value-based pricing for retail, corporate, and wholesale supply. For rate cards or custom bulk orders, direct users to the website contact form or WhatsApp (+91 8700905571).
- STRICT ACCURACY RULES: Do not fabricate fixed retail prices, do not promise guaranteed delivery times (e.g. "within 1 hour"), and do not simulate an online shopping cart or direct checkout.

CONVERSATIONAL INTELLIGENCE & INTENT RULES:
1. Natural Conversation:
   - "Hi" / "Hello" -> Warm greeting, introducing yourself as Bellecure Assistant, asking how you can help today.
   - "How are you" -> Polite, friendly reply, then asking how to assist with Bellecure.
   - "Kya help kar sakte ho" / "What can you do" -> Clearly explain capabilities (bottle sizes 250ml/500ml/1L, purity and RO+UV+UF process, bulk orders, dealership).
   - "Mujhe chahiye" / Vague requests -> Politely clarify whether they need water for personal/office use or bulk dealership, and ask for preferred bottle size (250ml, 500ml, 1L).
   - Follow-up context: Use conversation history to resolve bottle sizes and pronouns. If discussing bottle sizes and user replies "500ml chahiye", acknowledge the 500ml pack and guide them to order via WhatsApp or website form.
2. Tone & Conciseness:
   - Friendly, professional, concise (1 to 4 sentences).
   - Never repeat the same generic company slogan for different questions.
3. Language Matching:
   - English -> English.
   - Hindi (Devanagari) -> Hindi in Devanagari script.
   - Hinglish (Latin alphabet) -> natural conversational Hinglish in Latin script.
   - Mixed -> mirror user's language style.`;

const LEGACY_RENDER_FALLBACKS = [
  'Bellecure mein 250 ml, 500 ml aur 1 litre bottle options available hain.',
  'Bellecure offers 250 ml, 500 ml, and 1 litre bottle options for daily use, travel, and family hydration.',
  'Bellecure में 250 ml, 500 ml और 1 लीटर की बोतलें उपलब्ध हैं।',
  'Bellecure clean aur safe drinking water ke liye RO, UV aur UF treatment wali multi-stage purification process follow karta hai.',
  'Bellecure follows a multi-stage purification process with RO, UV, and UF treatment to provide clean, safe, and refreshing drinking water.',
  'Bellecure स्वच्छ और सुरक्षित पेयजल के लिए RO, UV और UF जैसी multi-stage purification process का उपयोग करता है।',
  'Bilkul! Aap Bellecure ke distributor ya business partner ban sakte hain. Website par Partner with us form fill kijiye, hamari team aapse contact karegi.',
  'You can become a Bellecure distributor or partner by filling out the Partner with us form on the website. Our team will contact you.',
  'आप Bellecure के distributor या business partner बनने के लिए वेबसाइट के Partner with us form को भर सकते हैं। हमारी टीम आपसे संपर्क करेगी।',
  'Bellecure ki latest pricing aur bulk rates ke liye hamari sales team se contact kijiye.',
  'Bellecure offers value-based pricing for households, retail stores, and distributors. Please contact our sales team for the latest bulk and partner rates.',
  'Bellecure की latest pricing और bulk rates के लिए हमारी sales team से संपर्क करें।'
];

function isLegacyRenderFallback(reply) {
  if (typeof reply !== 'string') return false;
  const trimmed = reply.trim();
  if (LEGACY_RENDER_FALLBACKS.includes(trimmed)) return true;
  if (trimmed.includes('focused on purity, trust, and quality') || trimmed.includes('jo purity, trust aur quality par focused hai')) return true;
  return false;
}

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a message.' });
  }

  const sessionId = req.headers['x-session-id'] || 'anonymous';
  const cleanedMessage = message.trim();
  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
  const fallbackReply = buildFastReply(cleanedMessage, safeHistory);

  if (!genAI) {
    try {
      const renderRes = await fetch('https://bellecure-website.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ message: cleanedMessage, history: safeHistory }),
      });
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        if (renderData && renderData.reply) {
          if (!isLegacyRenderFallback(renderData.reply)) {
            return res.json({ success: true, reply: renderData.reply });
          }
        }
      }
    } catch {
      // Fall through to fast reply if offline or unreachable
    }

    return res.json({
      success: true,
      reply: fallbackReply
    });
  }

  const mongoTask = db.connectMongo().catch(() => false);

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

  const configuredModel = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
  const modelCandidates = [configuredModel || 'gemini-3.6-flash'];
  let lastError = null;

  const runWithTimeout = async (promise, timeoutMs = 10000) => {
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
      let responseText = '';
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_INSTRUCTION
        });
        const formattedHistory = formatGeminiHistory(safeHistory);
        const chat = model.startChat({ history: formattedHistory });
        const result = await runWithTimeout(chat.sendMessage(cleanedMessage), 10000);
        responseText = result.response.text();
      } catch (startChatError) {
        const model = genAI.getGenerativeModel({ model: modelName });
        const contextStr = safeHistory.length > 0
          ? '\n\nConversation history:\n' + safeHistory.map(h => `${h.role === 'model' || h.role === 'bot' || h.role === 'assistant' ? 'Assistant' : 'User'}: ${h.content}`).join('\n')
          : '';
        const prompt = `${SYSTEM_INSTRUCTION}${contextStr}\n\nUser: ${cleanedMessage}`;
        const result = await runWithTimeout(model.generateContent(prompt), 10000);
        responseText = result.response.text();
      }

      if (responseText) {
        saveChatLogs(responseText);
        return res.json({ success: true, reply: responseText });
      }
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.statusCode;
      const isTimeout = error?.message === 'Gemini timeout';

      console.warn(`Gemini model ${modelName} unavailable (status: ${status || 'unknown'}, timeout: ${isTimeout}), trying next candidate...`);
      continue;
    }
  }

  console.error('Gemini error:', lastError);
  saveChatLogs(fallbackReply);
  return res.json({ success: true, reply: fallbackReply });
});
app.buildFastReply = buildFastReply;
app.normalizeApiKey = normalizeApiKey;
app.getEmailConfig = getEmailConfig;

if (require.main === module) {
  db.connectMongo().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = app;
