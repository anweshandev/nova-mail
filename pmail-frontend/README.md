# pmail-frontend

A modern frontend application for pmail - your personal email solution.

## Overview

pmail-frontend is the client-side application that provides a user-friendly interface for managing emails, contacts, and communication.

## Features

- 📧 Email composition and management
- 📥 Inbox with real-time updates
- 🔍 Search functionality
- 📁 Folder organization
- 👤 Contact management
- 🎨 Responsive design

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pmail-frontend.git

# Navigate to the project directory
cd pmail-frontend

# Install dependencies
npm install
```

## Development

```bash
# Start the development server
npm run dev
```

## Build

```bash
# Create a production build
npm run build
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
pmail-frontend/
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   └── styles/        # Global styles
├── public/            # Static assets
├── tests/             # Test files
└── package.json
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=pmail
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.