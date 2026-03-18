# 💬 TalkFlow

> **Your conversations, beautifully simple.**

TalkFlow is a full-stack real-time messaging and calling application built for seamless communication. Connect with friends, send instant messages, share media, and make crystal-clear voice calls — all in one clean, intuitive interface.

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
- Session / JWT management

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js |
| Real-time | WebSockets |
| Calling | WebRTC |
| Deployment | Vercel |
| Auth | JWT / Session-based |
| Styling | Custom CSS (UI designed with Lovable) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/talkflow.git

# Navigate to the project directory
cd talkflow

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=your_backend_api_url
VITE_SOCKET_URL=your_websocket_url
```

---

## 📁 Project Structure

```
talkflow/
├── src/
│   ├── pages/
│   │   ├── Chats.jsx         # Chat list & real-time messaging
│   │   ├── Search.jsx        # Find people
│   │   ├── Requests.jsx      # Friend requests (real-time)
│   │   ├── Calls.jsx         # Call history
│   │   ├── Profile.jsx       # User profile
│   │   └── Settings.jsx      # App settings
│   ├── components/
│   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   ├── ChatWindow.jsx    # Messaging UI + typing indicator
│   │   ├── CallUI.jsx        # WebRTC call interface
│   │   └── ...
│   ├── hooks/
│   │   ├── useSocket.js      # WebSocket connection
│   │   ├── useWebRTC.js      # WebRTC calling logic
│   │   └── ...
│   └── App.jsx
├── public/
└── package.json
```

---

## 🔧 Key Technical Implementations

- **WebSocket integration** for real-time messaging, typing indicators, read receipts, online presence, and friend requests — all running simultaneously
- **WebRTC peer-to-peer calling** for voice and video with signaling handled over WebSockets
- **Media sharing pipeline** for in-chat file and image transfers
- **JWT-based authentication** with protected routes
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

**Rahul Sharma**
- Username: `@rahul_sharma_7332`
- Built with ❤️ and ☕

---

*TalkFlow — Connect with friends and family through seamless messaging and crystal-clear calls.*
