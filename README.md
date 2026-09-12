<div align="center">

# 💧 Bellecure — Premium Packaged Drinking Water Website

**Bellecure Agro Food & Co.**

A production-ready, full-stack website for a premium packaged drinking water brand — featuring an AI-powered customer support assistant, a business inquiry system, and an admin dashboard.

[![Live Website](https://img.shields.io/badge/Live-bellecure.co.in-2ea44f?style=for-the-badge)](https://bellecure.co.in)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge)](https://bellecure-website.onrender.com)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey?style=for-the-badge)](#-license)

[Live Website](https://bellecure.co.in) • [GitHub Repository](https://github.com/subhash446/Bellecure-Website) • [Report an Issue](https://github.com/subhash446/Bellecure-Website/issues)

</div>

---

## 📌 About the Project

**Bellecure** is a full-stack business website built for **Bellecure Agro Food & Co.**, a packaged drinking water brand based in Darbhanga, Bihar.

The platform gives the brand a professional digital presence and lets customers, retailers, and potential distributors interact with the business through product information, inquiry forms, WhatsApp communication, and an AI-powered customer-support assistant.

The project includes a responsive customer-facing website, REST APIs, MongoDB-backed data storage, an admin login and dashboard, email notifications, WhatsApp integration, and Google Gemini AI integration.

---

## 🌐 Live Links

| Environment | URL |
|---|---|
| 🖥️ Website (Frontend) | [https://bellecure.co.in](https://bellecure.co.in) |
| ⚙️ API (Backend) | [https://bellecure-website.onrender.com](https://bellecure-website.onrender.com) |

---

## ✨ Features

### 🛍️ Customer Website
- Responsive, mobile-friendly design
- Premium brand-focused landing page
- Product showcase
- Water quality and purification information
- Business/distributor inquiry form with validation
- WhatsApp contact integration
- AI-powered customer-support assistant

### 🤖 AI Customer Support
- Google Gemini API integration
- Handles product and brand-related queries
- Supports **English**, **Hindi**, and **Hinglish**
- Automatic language/style-aware responses
- Predefined fallback responses when the Gemini API is unavailable or quota-limited

### 🔑 Admin Dashboard
- Secure admin login (email + password authentication)
- Protected admin routes
- Distributor inquiry management
- Customer interaction visibility
- Backend API integration

### 📩 Business Inquiry System
- Distributor and partnership inquiry form
- Client-side and server-side validation
- MongoDB storage for all inquiries
- Email notifications via Resend API
- WhatsApp communication option
- Centralized error handling and API validation

### 🗄️ Database
- MongoDB Atlas integration
- Mongoose-based data models
- Persistent inquiry storage
- Chat interaction logging

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="25%">

**Frontend**
- HTML5
- CSS3
- JavaScript
- Tailwind CSS

</td>
<td valign="top" width="25%">

**Backend**
- Node.js
- Express.js
- REST APIs
- CORS
- dotenv

</td>
<td valign="top" width="25%">

**Database & AI**
- MongoDB / Atlas
- Mongoose
- Google Gemini API

</td>
<td valign="top" width="25%">

**Tools & Deployment**
- Git & GitHub
- Postman
- Netlify (Frontend)
- Render (Backend)
- Resend API
- WhatsApp Integration

</td>
</tr>
</table>

---

## 📁 Project Structure

```text
Bellecure-Website/
│
├── frontend/
│   ├── index.html
│   ├── admin.html
│   ├── script.js
│   ├── admin.js
│   ├── images/
│   └── logo.jpeg
│
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── Inquiry.js
│   │   └── ChatLog.js
│   └── tests/
│       └── server.test.js
│
├── docs/
│   ├── deployment.md
│   ├── project-overview.md
│   └── setup.md
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Local Setup

Follow the steps below to run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/subhash446/Bellecure-Website.git
cd Bellecure-Website
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and add the required configuration:

```env
PORT=3000

MONGODB_URI=your_mongodb_connection_string

GEMINI_API_KEY=your_gemini_api_key

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender_email
EMAIL_TO=your_recipient_email

ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

FRONTEND_URL=http://localhost:3000
```

> ⚠️ **Important:** Never commit `.env` files, API keys, passwords, or other sensitive credentials to GitHub.

### 4. Start the Application

```bash
npm start
```

The application will be available at:

```
http://localhost:3000
```

---

## 🧪 Testing

The project includes backend tests for verifying application functionality.

```bash
npm test
```

API endpoints can also be tested using **Postman**.

---

## 🔌 API Endpoints

The backend exposes REST APIs for website functionality, AI support, business inquiries, and administration.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the website |
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/db-status` | MongoDB connection status |
| `POST` | `/api/chat` | AI customer-support assistant |
| `POST` | `/api/contact` | Submit a distributor/business inquiry |
| `POST` | `/api/admin/login` | Admin authentication |

---

## 🔐 Security & Reliability

The application follows several security and reliability practices:

- Sensitive credentials stored using environment variables
- `.env` excluded from version control
- CORS configuration
- Client-side and server-side request validation
- HTML escaping for user-submitted content
- Protected admin access
- Centralized API error handling
- AI fallback handling for API downtime/quota limits
- Database connection monitoring
- HTTPS enforced in production

---

## 🚀 Production Architecture

```text
                         Customer
                            │
                            ▼
                  ┌──────────────────┐
                  │     Netlify      │
                  │    Frontend      │
                  └────────┬─────────┘
                           │
                        REST API
                           │
                           ▼
                  ┌──────────────────┐
                  │      Render      │
                  │  Node + Express  │
                  └───────┬───┬──────┘
                          │   │
              ┌───────────┘   └────────────┐
              ▼                            ▼
     ┌─────────────────┐          ┌──────────────────┐
     │  MongoDB Atlas  │          │  Google Gemini    │
     │ Inquiry + Chats │          │  AI Assistant     │
     └─────────────────┘          └──────────────────┘
                          │
                          ▼
                  ┌─────────────────┐
                  │   Resend API    │
                  │ Email Delivery  │
                  └─────────────────┘
```

---

## 💡 Key Learning & Implementation Areas

This project provided hands-on experience with:

- Full-stack web development
- Frontend and backend integration
- REST API design and development
- Node.js and Express.js
- MongoDB and Mongoose
- Admin authentication
- Third-party API integration (Gemini, Resend, WhatsApp)
- API testing with Postman
- Production debugging
- CORS configuration
- Environment variable management
- Cloud deployment (Netlify, Render, Atlas)
- Handling third-party API failures and quota limitations

---

## 🔮 Future Improvements

- [ ] Advanced admin analytics
- [ ] Inquiry search and filtering
- [ ] Inquiry export functionality
- [ ] Product management through admin dashboard
- [ ] Role-based admin access
- [ ] Customer inquiry status tracking
- [ ] Improved SEO and metadata
- [ ] CI/CD automation
- [ ] Enhanced AI knowledge base
- [ ] Business analytics and reporting

---

## 👨‍💻 Developer

**Subhash Kumar Yadav**
B.Tech — Information Technology

[![GitHub](https://img.shields.io/badge/GitHub-subhash446-181717?style=flat-square&logo=github)](https://github.com/subhash446)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-subhash--kumar--yadav-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/subhash-kumar-yadav)

---

## 📄 License

This project was developed for **Bellecure Agro Food & Co.**
The website and application are intended for Bellecure's business use and deployment. All rights reserved.

<div align="center">

Made with 💧 for **Bellecure Agro Food & Co.**

</div>
