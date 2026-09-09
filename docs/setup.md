# Setup Guide

## Requirements

- Node.js 18 or newer
- npm
- A Gmail account for SMTP support
- A Google Gemini API key for the AI assistant

## Installation

```bash
npm install
```

## Configure Environment

Copy the sample environment file:

```bash
copy .env.example .env
```

Then update the values in `.env`.

## Run the Project

```bash
npm start
```

The project will run at:

```text
http://localhost:3000
```

## Run Tests

```bash
npm test
```

## Common Notes

- If `GEMINI_API_KEY` is missing, the assistant will still respond with a fallback message.
- If Gmail credentials are missing or invalid, the contact form will fail gracefully with an error response.
