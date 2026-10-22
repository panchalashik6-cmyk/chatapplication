# Chat Application Assessment

A beginner-friendly real-time chat application using React + Vite, Node.js, Express, Socket.IO, MongoDB, and JWT authentication.

## Features
- Register and log in with JWT authentication
- List registered users
- One-to-one conversations
- Real-time messages with Socket.IO
- Conversation history saved in MongoDB
- Responsive basic UI

## Requirements
- Node.js 20+ (Node.js 22 recommended)
- MongoDB local installation or MongoDB Atlas connection string

## 1. Configure backend
Open a terminal:
```bash
cd backend
npm install
```
Copy `.env.example` to `.env`, then set `MONGO_URI` and a long random `JWT_SECRET`.

Start backend:
```bash
npm run dev
```
Backend runs at `http://localhost:8000`.

## 2. Configure frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## 3. Test it
1. Register two different accounts in two separate browser windows (one can be an incognito window).
2. Log in with one account and select the other user.
3. Send messages. Keep both accounts open to see real-time updates.

## API overview
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — log in
- `GET /api/users` — list users (JWT required)
- `GET /api/messages/:userId` — load conversation (JWT required)
- Socket event `send_message` — send a real-time message
- Socket event `receive_message` — incoming message

## Assessment notes
This is an educational starter project. For production, add input validation, rate limiting, refresh-token/session strategy, pagination, moderation/reporting, secure deployment configuration, and stronger error monitoring. Never commit `.env` or real secrets.
