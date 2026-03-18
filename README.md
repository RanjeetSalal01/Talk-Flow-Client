# 💬 TalkFlow

> **Your conversations, beautifully simple.**

TalkFlow is a full-stack real-time messaging and calling application built with **Angular** and **TypeScript**. Connect with friends, send instant messages, share media, and make crystal-clear voice & video calls — all in one clean, intuitive interface.

🌐 **Live App:** [talk-flow-client.vercel.app](https://talk-flow-client.vercel.app)

---

## ✨ Features

### 💬 Real-Time Messaging
- Instant messaging powered by **WebSockets**
- **Typing indicators** — see when the other person is typing
- **Seen / Unseen read receipts** — know when your message has been read
- Message timestamps and conversation previews
- Search conversations easily

### 📞 Voice & Video Calling
- **HD voice and video calls** using **WebRTC**
- Full **call history** with date, time, and duration
- One-click callback from call history

### 🖼️ Media Sharing
- Share images and files directly in chat
- In-chat media preview

### 👥 Friend System
- Send and receive **friend requests in real-time**
- Accept or decline incoming requests via the **Requests** tab
- Real-time notification when someone sends you a request

### 🔍 Find People
- Search for users by username
- View user bios and online status
- Send friend requests directly from search results

### 👤 Profile Management
- Customizable display name and username
- Personal bio / status
- Avatar support
- Edit profile anytime

### 🟢 Presence System
- Live **online / offline** status indicators
- Status updates in real-time across all connected clients

### ⚙️ Settings
- Change password securely
- Logout with confirmation dialog
- Clean account management

### 🔐 Authentication
- Secure sign-in with email and password
- Account registration for new users
- JWT with Angular **HTTP Interceptors** for auth headers
- Route protection via **Angular Guards**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular + TypeScript |
| Real-time | WebSockets |
| Calling | WebRTC |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Auth | JWT + Angular Interceptors |
| Styling | Custom CSS (UI designed with Lovable) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/talkflow.git

# Navigate to the client directory
cd talkflow/Client

# Install dependencies
npm install

# Start the development server
ng serve
```

### Environment Variables

Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000'
};
```

For production (`environment.prod.ts`):

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://talk-flow-server.onrender.com/api',
  socketUrl: 'https://talk-flow-server.onrender.com'
};
```

---

## 📁 Project Structure

```
Client/
├── src/
│   └── app/
│       ├── core/
│       │   ├── config/           # App configuration
│       │   ├── guards/           # Route guards (auth protection)
│       │   ├── interceptors/     # HTTP interceptors (JWT auth)
│       │   └── services/         # Core services (socket, auth, etc.)
│       │
│       ├── features/
│       │   ├── auth/             # Login & registration
│       │   ├── call/             # WebRTC voice & video calling
│       │   ├── chat/             # Real-time messaging
│       │   ├── profile/          # User profile management
│       │   ├── request/          # Friend requests (real-time)
│       │   ├── search/           # Find people
│       │   └── setting/          # App settings
│       │
│       ├── layout/
│       │   ├── auth-layout/      # Layout for auth pages
│       │   └── main-layout/      # Layout for app pages
│       │
│       ├── shared/
│       │   ├── components/       # Reusable UI components
│       │   └── shared.module.ts
│       │
│       ├── app.config.ts
│       ├── app.routes.ts
│       └── app.html
└── package.json
```

---

## 🔧 Key Technical Implementations

- **WebSocket integration** for real-time messaging, typing indicators, read receipts, online presence, and friend requests — all running simultaneously
- **WebRTC peer-to-peer calling** for voice and video with signaling handled over WebSockets
- **Angular Guards** for protecting authenticated routes
- **HTTP Interceptors** for automatically attaching JWT tokens to every API request
- **Feature-based Angular architecture** for scalability and clean separation of concerns
- **Media sharing pipeline** for in-chat file and image transfers
- **Real-time friend request system** with instant UI updates across clients

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Ranjeet Singh**
- Built with ❤️ and ☕

---

*TalkFlow — Connect with friends and family through seamless messaging and crystal-clear calls.*
