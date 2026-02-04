# pmail

A comprehensive email solution for modern applications.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

pmail is a robust, scalable email management solution designed to streamline email operations for developers and organizations. Built with performance and reliability in mind, pmail provides a complete toolkit for sending, receiving, and managing emails programmatically.

## Features

### Core Features

- **Email Sending**: Send plain text and HTML emails with attachments
- **Email Receiving**: IMAP/POP3 support for retrieving emails
- **Template Engine**: Built-in templating system for dynamic email content
- **Queue Management**: Asynchronous email processing with queue support
- **Attachment Handling**: Support for multiple file types and sizes

### Advanced Features

- **Rate Limiting**: Configurable rate limits to prevent spam detection
- **Retry Logic**: Automatic retry mechanism for failed deliveries
- **Logging & Analytics**: Comprehensive logging and delivery tracking
- **Multi-Provider Support**: Compatible with SMTP, SendGrid, Mailgun, AWS SES
- **Encryption**: TLS/SSL support for secure communications

## Installation

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0 or yarn >= 1.22.0

### Package Installation

```bash
# Using npm
npm install pmail

# Using yarn
yarn add pmail
```

### From Source

```bash
git clone https://github.com/username/pmail.git
cd pmail
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
PMAIL_SMTP_HOST=smtp.example.com
PMAIL_SMTP_PORT=587
PMAIL_SMTP_USER=your-username
PMAIL_SMTP_PASSWORD=your-password
PMAIL_FROM_EMAIL=noreply@example.com
PMAIL_FROM_NAME=Your Application
PMAIL_TLS_ENABLED=true
PMAIL_DEBUG=false
```

### Configuration File

Alternatively, create a `pmail.config.js`:

```javascript
module.exports = {
	smtp: {
		host: 'smtp.example.com',
		port: 587,
		secure: false,
		auth: {
			user: 'your-username',
			pass: 'your-password'
		}
	},
	defaults: {
		from: '"Your Application" <noreply@example.com>'
	},
	queue: {
		enabled: true,
		concurrency: 5,
		retryAttempts: 3,
		retryDelay: 5000
	},
	logging: {
		level: 'info',
		file: './logs/pmail.log'
	}
};
```

## Usage

### Basic Email Sending

```javascript
const pmail = require('pmail');

// Initialize the client
const mailer = new pmail.Client();

// Send a simple email
await mailer.send({
	to: 'recipient@example.com',
	subject: 'Hello from pmail',
	text: 'This is a plain text email.',
	html: '<h1>Hello!</h1><p>This is an HTML email.</p>'
});
```

### Using Templates

```javascript
const pmail = require('pmail');

const mailer = new pmail.Client();

// Register a template
mailer.registerTemplate('welcome', {
	subject: 'Welcome to {{appName}}!',
	html: `
		<h1>Welcome, {{userName}}!</h1>
		<p>Thank you for joining {{appName}}.</p>
		<a href="{{confirmLink}}">Confirm your email</a>
	`
});

// Send using template
await mailer.sendTemplate('welcome', {
	to: 'newuser@example.com',
	data: {
		appName: 'My Application',
		userName: 'John Doe',
		confirmLink: 'https://example.com/confirm/abc123'
	}
});
```

### Sending Attachments

```javascript
await mailer.send({
	to: 'recipient@example.com',
	subject: 'Document Attached',
	text: 'Please find the document attached.',
	attachments: [
		{
			filename: 'document.pdf',
			path: './files/document.pdf'
		},
		{
			filename: 'data.json',
			content: JSON.stringify({ key: 'value' }),
			contentType: 'application/json'
		}
	]
});
```

### Bulk Email Sending

```javascript
const recipients = [
	{ email: 'user1@example.com', name: 'User 1' },
	{ email: 'user2@example.com', name: 'User 2' },
	{ email: 'user3@example.com', name: 'User 3' }
];

await mailer.sendBulk({
	recipients,
	subject: 'Newsletter',
	template: 'newsletter',
	data: {
		date: new Date().toLocaleDateString()
	}
});
```

## API Reference

### Client Class

#### Constructor

```javascript
new pmail.Client(options?)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Object` | Optional configuration object |
| `options.config` | `string` | Path to configuration file |
| `options.provider` | `string` | Email provider (smtp, sendgrid, mailgun, ses) |

#### Methods

##### `send(message)`

Sends an email message.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message.to` | `string \| string[]` | Yes | Recipient email(s) |
| `message.cc` | `string \| string[]` | No | CC recipient(s) |
| `message.bcc` | `string \| string[]` | No | BCC recipient(s) |
| `message.subject` | `string` | Yes | Email subject |
| `message.text` | `string` | No | Plain text body |
| `message.html` | `string` | No | HTML body |
| `message.attachments` | `Attachment[]` | No | File attachments |

**Returns**: `Promise<SendResult>`

##### `sendTemplate(templateName, options)`

Sends an email using a registered template.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateName` | `string` | Yes | Name of registered template |
| `options.to` | `string \| string[]` | Yes | Recipient email(s) |
| `options.data` | `Object` | No | Template variables |

**Returns**: `Promise<SendResult>`

##### `registerTemplate(name, template)`

Registers an email template.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Template identifier |
| `template.subject` | `string` | Yes | Subject template |
| `template.html` | `string` | No | HTML template |
| `template.text` | `string` | No | Text template |

##### `verify()`

Verifies the SMTP connection.

**Returns**: `Promise<boolean>`

### Types

```typescript
interface SendResult {
	messageId: string;
	accepted: string[];
	rejected: string[];
	response: string;
}

interface Attachment {
	filename: string;
	content?: string | Buffer;
	path?: string;
	contentType?: string;
	encoding?: string;
}
```

## Architecture

```
pmail/
├── src/
│   ├── client/
│   │   ├── Client.js          # Main client class
│   │   └── index.js
│   ├── providers/
│   │   ├── SMTPProvider.js    # SMTP implementation
│   │   ├── SendGridProvider.js
│   │   ├── MailgunProvider.js
│   │   └── SESProvider.js
│   ├── templates/
│   │   ├── Engine.js          # Template engine
│   │   └── helpers.js
│   ├── queue/
│   │   ├── Queue.js           # Queue manager
│   │   └── Worker.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validator.js
│   │   └── sanitizer.js
│   └── index.js
├── tests/
├── examples/
├── docs/
├── package.json
└── README.md
```

### Component Overview

| Component | Description |
|-----------|-------------|
| **Client** | Main entry point for all email operations |
| **Providers** | Adapters for different email service providers |
| **Templates** | Mustache-based templating system |
| **Queue** | Background job processing for async emails |
| **Utils** | Helper functions and utilities |

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/pmail.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Install dependencies: `npm install`
5. Make your changes
6. Run tests: `npm test`
7. Commit: `git commit -m "Add your feature"`
8. Push: `git push origin feature/your-feature`
9. Open a Pull Request

### Code Style

- Use ESLint configuration provided
- Follow existing code patterns
- Add JSDoc comments for public methods
- Write unit tests for new features

### Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Client"

# Watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── unit/
│   ├── client.test.js
│   ├── providers.test.js
│   └── templates.test.js
├── integration/
│   └── smtp.test.js
└── fixtures/
		└── emails.json
```

## Troubleshooting

### Common Issues

#### Connection Timeout

```
Error: Connection timeout
```

**Solution**: Check your SMTP host and port settings. Ensure firewall allows outbound connections on the specified port.

#### Authentication Failed

```
Error: Invalid login
```

**Solution**: Verify your credentials. For Gmail, enable "Less secure app access" or use App Passwords.

#### Rate Limiting

```
Error: Too many requests
```

**Solution**: Enable queue mode and configure appropriate rate limits:

```javascript
const mailer = new pmail.Client({
	queue: {
		enabled: true,
		rateLimit: {
			max: 100,
			duration: 60000 // 100 emails per minute
		}
	}
});
```

#### TLS Certificate Errors

```
Error: self signed certificate
```

**Solution**: For development, you can disable TLS verification (not recommended for production):

```javascript
const mailer = new pmail.Client({
	smtp: {
		tls: {
			rejectUnauthorized: false
		}
	}
});
```

### Debug Mode

Enable debug logging for detailed information:

```javascript
const mailer = new pmail.Client({
	debug: true,
	logging: {
		level: 'debug'
	}
});
```

## License

MIT License

Copyright (c) 2024 pmail

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
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Made with ❤️ by the pmail team**

[Report Bug](https://github.com/username/pmail/issues) · [Request Feature](https://github.com/username/pmail/issues) · [Documentation](https://pmail.dev/docs)