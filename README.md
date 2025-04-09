# Nuvigo Weather AI API

A modern, type-safe Fastify API that provides weather information with AI-powered natural language responses. Built with TypeScript, Prisma, and OpenAI.

## Features

- 🌤️ Real-time weather data from Tomorrow.io
- 🤖 AI-powered natural language weather descriptions
- 🔐 JWT-based authentication with refresh tokens
- 📧 Email verification system
- 🔑 Password reset functionality
- 💬 Chat history tracking with time-based sessions
- 📝 Swagger API documentation
- 🔍 Type-safe API with Zod validation
- 🗄️ PostgreSQL database with Prisma ORM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT with refresh tokens
- **API Documentation**: Swagger/OpenAPI
- **Validation**: Zod
- **AI Integration**: OpenAI
- **Weather Data**: Tomorrow.io API

## Prerequisites

- Node.js (v22 or higher)
- PostgreSQL
- PNPM package manager
- Tomorrow.io API key
- OpenAI API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nuvigo"
TOMORROW_API_KEY="your-tomorrow-api-key"
OPENAI_API_KEY="your-openai-api-key"
JWT_SECRET="your-super-secret-key"
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nuvigo-api.git
cd nuvigo-api
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up the database:
```bash
pnpm prisma generate
pnpm prisma db push
```

4. Start the development server:
```bash
pnpm dev
```

5. Access the API documentation:
```bash
open http://localhost:3333/documentation
```

## API Documentation

The API documentation is available through Swagger UI at `/documentation` when the server is running. This interactive documentation provides:

- Detailed endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Try-it-out functionality

You can access the documentation at:
- Development: http://localhost:3333/documentation
- Production: https://api.nuvigo.com.br/documentation

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email and password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and invalidate refresh token
- `POST /auth/verify-email` - Verify user email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/me` - Get current authenticated user information

### Users

- `POST /users` - Create a new user
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Weather

- `GET /weather` - Get weather information for a location and saves the query/response to the active chat session
  - Query parameters:
    - `location`: Location name or coordinates
    - `language`: Response language (en/pt)

### Chat Sessions

- `GET /sessions` - Get all chat sessions for the authenticated user
- `GET /sessions/:sessionId` - Get a specific chat session by ID (includes messages)
- `DELETE /sessions/:sessionId` - Delete a specific chat session and all its messages

### Chat Messages

- `POST /chats` - Create a new chat message within a session (requires `chatSessionId`)
- `GET /chats/:chatId` - Get a specific chat message by ID
- `PUT /chats/:chatId` - Update a specific chat message
- `DELETE /chats/:chatId` - Delete a specific chat message

## Database Schema

### User
- UUID primary key
- Email (unique)
- Password (hashed)
- Name (optional)
- Email verification status
- Timestamps
- Relations to chat sessions and tokens

### ChatSession
- UUID primary key
- User relation
- Optional title (e.g., generated from first query)
- Timestamps (createdAt, updatedAt - used for session activity)
- Relation to chats within the session

### Chat
- UUID primary key
- ChatSession relation (links message to a session)
- Location
- Temperature
- Weather conditions
- Natural language response
- Timestamps

### Tokens
- Refresh tokens
- Email verification tokens
- Password reset tokens
- All with expiration and user relations

## Development

### Project Structure

```