# Deployment Guide

## Recommended Deployment Options

- Render
- Railway
- Vercel for front-end-only hosting, with backend proxying if needed
- VPS or cloud instance with Node.js support

## Production Setup

Before deploying, make sure the following environment variables are set in the hosting platform:

```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=contact@bellecure.in
```

## Deployment Checklist

- Set environment variables securely
- Ensure HTTPS is enabled
- Confirm Gmail app password is valid
- Verify Gemini API key is active
- Test the contact form and assistant in production
- Ensure static assets in `images/` are available

## Recommended Next Steps

- Add a database for inquiry tracking
- Add an admin panel or dashboard
- Set up automated deployment with GitHub
- Add analytics for user behavior and conversion tracking
