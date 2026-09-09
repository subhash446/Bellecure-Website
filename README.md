# Bellecure

Bellecure is a premium packaged drinking water brand website with a modern customer-facing landing page, product presentation, distributor inquiry form, AI-powered support assistant, and admin-ready backend APIs.

This project is built to give Bellecure a professional online presence, improve customer trust, generate distributor leads, and support future business operations with a scalable web architecture.

## Overview

The application includes:

- a premium public-facing homepage
- product and quality showcase sections
- distributor inquiry form with validation
- AI assistant for product and brand questions
- admin login support for internal access
- MongoDB-backed storage for inquiry and chat data
- email notification support for website inquiries

## Tech Stack

- HTML5
- CSS / Tailwind CSS
- JavaScript
- Node.js
- Express.js
- MongoDB + Mongoose
- Google Generative AI (Gemini)
- Nodemailer
- dotenv

## Project Structure

```text
Bellecure2/
├── frontend/
│   ├── index.html
│   ├── admin.html
│   ├── script.js
│   ├── admin.js
│   ├── images/
│   └── logo.jpeg
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── Inquiry.js
│   │   └── ChatLog.js
│   ├── tests/
│   │   └── server.test.js
│   └── utils/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── docs/
```

## Features

- Responsive landing page for a premium brand
- Product-focused hero section and sales messaging
- Distributor inquiry form with mobile validation and state/district handling
- AI assistant with fallback responses when the API is unavailable
- MongoDB integration for storing inquiries and chat logs
- Admin login endpoint using email and password
- Email sending for new business inquiries
- Health and database status endpoints

## Local Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd Bellecure2
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
copy .env.example .env
```

4. Update values in `.env` with your local configuration.

5. Start the application:

```bash
npm start
```

6. Open the website in your browser:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env` file based on `.env.example` and fill in the values:

```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=contact@bellecure.in
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bellecure
ADMIN_EMAIL=admin@bellecure.in
ADMIN_PASSWORD=your_secure_admin_password
```

## Available Scripts

```bash
npm start
npm test
```

## Deployment Overview

This project is designed for a clean production setup:

- frontend can be hosted on Netlify
- backend can be hosted on Render or Railway
- MongoDB can be hosted on MongoDB Atlas
- environment variables should be managed in the hosting platform, not committed to the repository

## Notes

- If `GEMINI_API_KEY` is missing or invalid, the assistant automatically falls back to a predefined brand-safe response.
- The contact form submits inquiry details and sends an email notification.
- MongoDB is optional during early local development but recommended for production use.
- Admin access is protected using email and password validation.

## Production Considerations

- Keep all credentials in environment variables
- Never commit `.env` files to GitHub
- Use MongoDB Atlas for secure database access in production
- Use HTTPS in deployed environments
- Configure proper CORS rules for frontend and backend domains

## Future Improvements

- advanced admin dashboard with analytics
- lead management and export features
- product catalog admin panel
- better SEO and metadata optimization
- deployment automation and CI/CD setup
- enhanced AI answer personalization and brand messaging

## License

This project is intended for Bellecure brand usage and internal business deployment. Update licensing terms as needed before public distribution.
