# NovaMail Backend

A Node.js backend API for the NovaMail email client, providing IMAP/SMTP connectivity for a Gmail-like experience.

## Overview

NovaMail Backend serves as the bridge between your frontend email client and mail servers. It handles all email operations through IMAP for reading/managing emails and SMTP for sending. The server maintains secure connections to mail servers on behalf of authenticated users, providing a RESTful API interface.

### How It Works

1. **Authentication Flow**: Users authenticate with their email credentials. The backend validates these against the IMAP server and issues a JWT token containing encrypted connection details.

2. **Connection Pooling**: IMAP connections are managed per-user session, allowing efficient reuse of connections for multiple operations.

3. **Email Operations**: All email operations (read, send, move, delete) are proxied through the backend, which translates REST API calls into IMAP/SMTP commands.

4. **Autoconfig Support**: The backend can automatically discover mail server settings using Mozilla Autoconfig or Microsoft Autodiscover protocols.

## Features

- 📧 **IMAP Integration** - Full mailbox access (read, search, organize emails)
- 📤 **SMTP Support** - Send emails, reply, forward with attachments
- 🔐 **JWT Authentication** - Secure token-based authentication
- 📁 **Folder Management** - Create, rename, delete mailboxes
- 🏷️ **Labels & Flags** - Star, mark as read/unread, importance
- 📎 **Attachments** - Upload and download file attachments
- 🔍 **Search** - Full-text email search
- 🐳 **Docker Ready** - Easy deployment with Docker

## Architecture

```
┌─────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  NovaMail Backend │────▶│   Mail Server   │
│  (Vue/React)│◀────│    (Express.js)   │◀────│  (IMAP/SMTP)    │
└─────────────┘     └───────────────────┘     └─────────────────┘
							│
					┌───────┴───────┐
					│               │
			  ┌─────▼─────┐   ┌─────▼─────┐
			  │   IMAP    │   │   SMTP    │
			  │  Service  │   │  Service  │
			  └───────────┘   └───────────┘
```

## Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Access to an IMAP/SMTP mail server (e.g., docker-mailserver)

## Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# At minimum, set JWT_SECRET to a secure random string

# Start development server (with auto-reload)
pnpm dev

# Or start production server
pnpm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f novamail-api

# Stop
docker-compose down
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `DEFAULT_IMAP_HOST` | Default IMAP server | `mail.yourexampledomain.com` |
| `DEFAULT_IMAP_PORT` | Default IMAP port | `993` |
| `DEFAULT_SMTP_HOST` | Default SMTP server | `mail.yourexampledomain.com` |
| `DEFAULT_SMTP_PORT` | Default SMTP port | `587` |
| `AUTOCONFIG_URL` | Mozilla autoconfig endpoint | - |
| `AUTODISCOVER_URL` | Autodiscover endpoint | - |

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with email credentials |
| `POST` | `/api/auth/logout` | Logout (client-side token removal) |
| `POST` | `/api/auth/verify` | Verify token validity |
| `POST` | `/api/auth/autoconfig` | Get server config for email domain |

### Emails

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/emails` | List emails in folder |
| `GET` | `/api/emails/search` | Search emails |
| `GET` | `/api/emails/:folder/:uid` | Get single email |
| `GET` | `/api/emails/:folder/:uid/attachment/:id` | Download attachment |
| `POST` | `/api/emails/send` | Send new email |
| `POST` | `/api/emails/:folder/:uid/reply` | Reply to email |
| `POST` | `/api/emails/:folder/:uid/forward` | Forward email |
| `POST` | `/api/emails/draft` | Save as draft |
| `PATCH` | `/api/emails/:folder/:uid/read` | Mark read/unread |
| `PATCH` | `/api/emails/:folder/:uid/star` | Toggle star |
| `POST` | `/api/emails/:folder/:uid/move` | Move to folder |
| `POST` | `/api/emails/:folder/:uid/copy` | Copy to folder |
| `DELETE` | `/api/emails/:folder/:uid` | Delete email |
| `POST` | `/api/emails/batch/read` | Batch mark read |
| `POST` | `/api/emails/batch/delete` | Batch delete |
| `POST` | `/api/emails/batch/move` | Batch move |

### Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | List all folders |
| `GET` | `/api/folders/:path/status` | Get folder counts |
| `POST` | `/api/folders` | Create folder |
| `PATCH` | `/api/folders/:path` | Rename folder |
| `DELETE` | `/api/folders/:path` | Delete folder |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get user settings |
| `PATCH` | `/api/settings` | Update settings |
| `GET` | `/api/settings/labels` | Get labels |
| `POST` | `/api/settings/labels` | Create label |

## Usage with docker-mailserver

This backend is designed to work seamlessly with [docker-mailserver](https://docker-mailserver.github.io/docker-mailserver/).

Configure your environment:

```env
DEFAULT_IMAP_HOST=mail.yourdomain.com
DEFAULT_IMAP_PORT=993
DEFAULT_SMTP_HOST=mail.yourdomain.com
DEFAULT_SMTP_PORT=587
AUTOCONFIG_URL=https://autoconfig.yourdomain.com
```

If both services run on the same Docker network, you can use internal hostnames:

```env
DEFAULT_IMAP_HOST=mailserver
DEFAULT_SMTP_HOST=mailserver
```

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Express app entry point
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── errorHandler.js   # Global error handling
│   │   └── rateLimiter.js    # Rate limiting
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── emails.js         # Email operations
│   │   ├── folders.js        # Folder management
│   │   └── settings.js       # User settings
│   └── services/
│       ├── imap.js           # IMAP operations
│       └── smtp.js           # SMTP operations
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Key Components

### IMAP Service (`src/services/imap.js`)

Handles all read operations:
- Connecting to IMAP servers with TLS
- Fetching mailbox lists and email headers
- Retrieving full email content and attachments
- Managing flags (read, starred, etc.)
- Moving/copying emails between folders

### SMTP Service (`src/services/smtp.js`)

Handles all send operations:
- Connecting to SMTP servers with STARTTLS
- Composing and sending emails
- Handling attachments (base64 encoding)
- Reply/forward with proper threading headers

### Authentication Middleware (`src/middleware/auth.js`)

- Validates JWT tokens on protected routes
- Extracts user credentials for mail server connections
- Handles token refresh logic

## Security Considerations

1. **JWT Secret**: Always use a strong, unique secret in production
2. **HTTPS**: Deploy behind a reverse proxy with TLS
3. **Credentials**: User passwords are stored in JWT tokens, which are signed but not encrypted. Consider additional encryption for production use
4. **Rate Limiting**: Default rate limiting is enabled (100 req/min)
5. **CORS**: Configure `CORS_ORIGIN` to match your frontend domain

## Troubleshooting

### Connection Issues

```bash
# Test IMAP connectivity
openssl s_client -connect mail.yourdomain.com:993

# Test SMTP connectivity
openssl s_client -starttls smtp -connect mail.yourdomain.com:587
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Mail server unreachable | Check host/port configuration |
| `AUTHENTICATIONFAILED` | Invalid credentials | Verify email/password |
| `Certificate error` | Self-signed cert | Set `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only) |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
