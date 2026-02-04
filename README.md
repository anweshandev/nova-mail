<p align="center">
  <img src="frontend/public/images/nova-logo.svg" alt="NovaMail Logo" width="120" height="120">
</p>

<h1 align="center">✨ NovaMail</h1>

<p align="center">
  <strong>A blazing-fast, open-source email client for the modern web</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg">
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg">
  <img alt="Open Source" src="https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red">
</p>

---

## 🌟 Overview

**NovaMail** is a sleek, self-hosted email client designed to give you a Gmail-like experience with any IMAP/SMTP mail server. Built for developers, privacy enthusiasts, and anyone who wants full control over their email workflow.

Whether you're running [docker-mailserver](https://docker-mailserver.github.io/docker-mailserver/), your own Postfix setup, or connecting to any standard mail server, NovaMail provides a beautiful, responsive interface that just works.

### Why NovaMail?

- 🔓 **Fully Open Source** - MIT licensed, forever free
- 🏠 **Self-Hosted** - Your data, your server, your rules
- 🚀 **Modern Stack** - React + Node.js + Express
- 🔌 **Universal Compatibility** - Works with any IMAP/SMTP server
- 🎨 **Beautiful UI** - Clean, responsive Gmail-inspired design
- 🌙 **Dark Mode** - Easy on the eyes, day or night
- ⚡ **Blazing Fast** - Optimized for performance

## ✨ Features

### 📧 Core Email Features
- **Compose & Send** - Rich text editor with HTML support
- **Read & Reply** - Threaded conversations and inline replies
- **Attachments** - Upload, download, and preview files
- **Search** - Full-text search across all emails
- **Labels & Folders** - Organize with custom labels and folders
- **Star & Archive** - Quick actions for email management

### 🔐 Security & Authentication
- **JWT Authentication** - Secure token-based auth
- **TLS/SSL Support** - Encrypted connections to mail servers
- **No Password Storage** - Credentials encrypted in tokens only
- **Rate Limiting** - Built-in protection against abuse

### 🎨 User Experience
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Themes** - System-aware theming
- **Keyboard Shortcuts** - Navigate like a pro
- **Auto-Configuration** - Automatic server discovery via Mozilla Autoconfig

### 🐳 Deployment
- **Docker Ready** - One-command deployment
- **Docker Compose** - Full stack in seconds
- **Environment Config** - Easy configuration via `.env`
- **Health Checks** - Built-in monitoring endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Access to an IMAP/SMTP mail server

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/novamail.git
cd novamail

# Configure environment
cp backend/.env.example backend/.env
# Edit .env with your settings

# Launch the stack
docker-compose up -d

# Access NovaMail at http://localhost:5173
```

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/novamail.git
cd novamail

# Backend Setup
cd backend
pnpm install
cp .env.example .env
# Edit .env with your JWT_SECRET and mail server settings
pnpm dev

# Frontend Setup (new terminal)
cd frontend
pnpm install
pnpm dev

# Access NovaMail at http://localhost:5173
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NovaMail Stack                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────┐ │
│  │              │     │                  │     │             │ │
│  │   Frontend   │────▶│     Backend      │────▶│ Mail Server │ │
│  │   (React)    │◀────│   (Express.js)   │◀────│ (IMAP/SMTP) │ │
│  │              │     │                  │     │             │ │
│  └──────────────┘     └──────────────────┘     └─────────────┘ │
│        :5173                 :3001              :993/:587      │
│                                │                               │
│                    ┌───────────┴───────────┐                   │
│                    │                       │                   │
│              ┌─────▼─────┐           ┌─────▼─────┐             │
│              │   IMAP    │           │   SMTP    │             │
│              │  Service  │           │  Service  │             │
│              └───────────┘           └───────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, Tailwind CSS, Zustand |
| **Backend** | Node.js, Express.js, IMAPFlow |
| **Auth** | JWT (JSON Web Tokens) |
| **Protocols** | IMAP (receiving), SMTP (sending) |
| **Containerization** | Docker, Docker Compose |

## 📁 Project Structure

```
novamail/
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── store/           # Zustand state management
│   └── public/              # Static assets
│
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # IMAP/SMTP services
│   │   └── middleware/      # Auth, rate limiting
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── LICENSE.md
└── README.md
```

## 📖 Documentation

### Configuration

#### Environment Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3001` |
| `JWT_SECRET` | Secret for JWT signing | (required) |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `DEFAULT_IMAP_HOST` | Default IMAP server | - |
| `DEFAULT_IMAP_PORT` | Default IMAP port | `993` |
| `DEFAULT_SMTP_HOST` | Default SMTP server | - |
| `DEFAULT_SMTP_PORT` | Default SMTP port | `587` |

#### Environment Variables (Frontend)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `VITE_APP_NAME` | Application name | `NovaMail` |

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate with email credentials |
| `POST` | `/api/auth/verify` | Verify JWT token |
| `POST` | `/api/auth/autoconfig` | Auto-discover mail server settings |

#### Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/emails` | List emails in folder |
| `GET` | `/api/emails/:folder/:uid` | Get single email |
| `POST` | `/api/emails/send` | Send new email |
| `PATCH` | `/api/emails/:folder/:uid/read` | Mark read/unread |
| `DELETE` | `/api/emails/:folder/:uid` | Delete email |

#### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/folders` | List all folders |
| `POST` | `/api/folders` | Create new folder |
| `DELETE` | `/api/folders/:path` | Delete folder |

### Using with docker-mailserver

NovaMail pairs perfectly with [docker-mailserver](https://docker-mailserver.github.io/docker-mailserver/):

```env
# In your .env file
DEFAULT_IMAP_HOST=mail.yourdomain.com
DEFAULT_IMAP_PORT=993
DEFAULT_SMTP_HOST=mail.yourdomain.com
DEFAULT_SMTP_PORT=587
```

For same Docker network deployment:

```env
DEFAULT_IMAP_HOST=mailserver
DEFAULT_SMTP_HOST=mailserver
```

## 🤝 Contributing

We love contributions! NovaMail is built by the community, for the community.

### Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-username/novamail.git`
3. **Create** a branch: `git checkout -b feature/amazing-feature`
4. **Make** your changes
5. **Test** your changes
6. **Commit**: `git commit -m 'feat: add amazing feature'`
7. **Push**: `git push origin feature/amazing-feature`
8. **Open** a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### Development Tips

```bash
# Run frontend in dev mode
cd frontend && pnpm dev

# Run backend in dev mode (with auto-reload)
cd backend && pnpm dev

# Run linting
pnpm lint
```

## 🐛 Troubleshooting

### Common Issues

#### Connection Refused
```
Error: Connection refused to mail server
```
**Solution**: Verify your IMAP/SMTP host and port settings. Check firewall rules.

#### Authentication Failed
```
Error: Invalid credentials
```
**Solution**: Double-check your email password. Some providers require app-specific passwords.

#### CORS Errors
```
Error: CORS policy blocked
```
**Solution**: Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL.

### Debug Mode

Enable verbose logging:

```env
NODE_ENV=development
```

## 📄 License

NovaMail is open-source software licensed under the [MIT License](LICENSE.md).

```
MIT License

Copyright (c) 2024 NovaMail Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<p align="center">
  <strong>✨ Made with ❤️ by the NovaMail community ✨</strong>
</p>

<p align="center">
  <a href="https://github.com/yourusername/novamail/issues">Report Bug</a> •
  <a href="https://github.com/yourusername/novamail/issues">Request Feature</a> •
  <a href="https://github.com/yourusername/novamail/stargazers">⭐ Star Us</a>
</p>
