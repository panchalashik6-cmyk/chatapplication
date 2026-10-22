import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API,
});

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function App() {

  const [token, setToken] = useState(
    localStorage.getItem("chat_token") || ""
  );

  const [me, setMe] = useState(() => {
    return JSON.parse(localStorage.getItem("chat_user") || "null");
  });
  const [mode, setMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [online, setOnline] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);


  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    async function getUsers() {
      try {
        const response = await api.get("/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUsers(response.data);
      } catch (error) {
        setError(
          error.response?.data?.message || "Could not load users."
        );
      }
    }

    getUsers();
  }, [token]);

  useEffect(() => {
    if (!token || !me) return;

    const socket = io(SOCKET_URL, {
      auth: {
        token: token,
      },
    });

    socketRef.current = socket;

    socket.on("online_users", (users) => {
      setOnline(users);
    });

   
    socket.on("receive_message", (message) => {
      const currentUserId = activeUser?._id;

      if (!currentUserId) return;

      const isCurrentConversation =
        (message.sender === currentUserId &&
          message.receiver === me._id) ||
        (message.sender === me._id &&
          message.receiver === currentUserId);

      if (isCurrentConversation) {
        setMessages((oldMessages) => {
          const alreadyExists = oldMessages.some(
            (item) => item._id === message._id
          );

          if (alreadyExists) {
            return oldMessages;
          }

          return [...oldMessages, message];
        });
      }
    });

  
    socket.on("connect_error", () => {
      setError("Live connection failed. Check the backend.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, me, activeUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

 
  async function submitAuth(event) {
    event.preventDefault();
    setError("");

    try {
      let endpoint = "/auth/login";

      if (mode === "register") {
        endpoint = "/auth/register";
      }

      const response = await api.post(endpoint, authForm);

      const userToken = response.data.token;
      const userData = response.data.user;

      localStorage.setItem("chat_token", userToken);
      localStorage.setItem("chat_user", JSON.stringify(userData));

      setToken(userToken);
      setMe(userData);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Something went wrong. Is the backend running?"
      );
    }
  }

  
  function logout() {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_user");

    setToken("");
    setMe(null);
    setUsers([]);
    setActiveUser(null);
    setMessages([]);
    setOnline([]);
    setError("");
  }

  async function openConversation(user) {
    setActiveUser(user);
    setMessages([]);
    setError("");
    setLoadingMessages(true);

    try {
      const response = await api.get(`/messages/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessages(response.data);
    } catch (error) {
      setError(
        error.response?.data?.message || "Could not load messages."
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  function sendMessage(event) {
    event.preventDefault();

    const cleanText = text.trim();

    if (!cleanText || !activeUser || !socketRef.current) {
      return;
    }

    setError("");

    socketRef.current.emit(
      "send_message",
      {
        receiverId: activeUser._id,
        text: cleanText,
      },
      (response) => {
        if (!response?.ok) {
          setError(
            response?.message || "Message failed to send."
          );
        }
      }
    );

    setText("");
  }


  if (!token || !me) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-mark">C</div>

          <p className="eyebrow">CHATSPACE</p>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p className="muted">
            A simple place to have real conversations.
          </p>

          <form onSubmit={submitAuth} className="auth-form">
            {mode === "register" && (
              <label>
                Full name

                <input
                  required
                  minLength="2"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email address

              <input
                type="email"
                required
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    email: event.target.value,
                  })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password

              <input
                type="password"
                required
                minLength="6"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    password: event.target.value,
                  })
                }
                placeholder="At least 6 characters"
              />
            </label>

            {error && <p className="error-text">{error}</p>}

            <button className="primary-btn" type="submit">
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="switch-auth">
            {mode === "login"
              ? "New to ChatSpace?"
              : "Already have an account?"}

            <button
              onClick={() => {
                setMode(
                  mode === "login" ? "register" : "login"
                );

                setError("");
              }}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </section>

        <p className="footer-note">
          Real-time messaging · Built with React and Socket.IO
        </p>
      </main>
    );
  }

  // 9. Main Chat UI
  return (
    <main className="app-shell">
      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark small">C</div>

          <div>
            <strong>ChatSpace</strong>
            <span>Messages that matter</span>
          </div>
        </div>

        <div className="profile">
          <div className="avatar">
            {me.name?.charAt(0).toUpperCase()}
          </div>

          <span>{me.name}</span>

          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="chat-layout">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">YOUR SPACE</p>
              <h2>Messages</h2>
            </div>

            <span className="count-pill">{users.length}</span>
          </div>

          <div className="search-note">
            Choose a person to start chatting
          </div>

          <div className="user-list">
            {users.map((user) => (
              <button
                key={user._id}
                className={`user-row ${
                  activeUser?._id === user._id ? "selected" : ""
                }`}
                onClick={() => openConversation(user)}
              >
                <div className="avatar user-avatar">
                  {user.name.charAt(0).toUpperCase()}

                  <i
                    className={
                      online.includes(user._id)
                        ? "online-dot active"
                        : "online-dot"
                    }
                  />
                </div>

                <div className="user-info">
                  <strong>{user.name}</strong>

                  <span>
                    {online.includes(user._id)
                      ? "Online now"
                      : "Start a conversation"}
                  </span>
                </div>

                <span className="row-arrow">›</span>
              </button>
            ))}

            {users.length === 0 && (
              <div className="empty-users">
                <div className="empty-icon">＋</div>

                <strong>No other users yet</strong>

                <p>
                  Create another account in a second browser to test
                  chat.
                </p>
              </div>
            )}
          </div>

          <div className="sidebar-bottom">
            <span className="status-dot" />
            Connected as {me.email}
          </div>
        </aside>
        <section className="conversation">
          <div className="conversation-head">
            {activeUser ? (
              <>
                <div className="avatar">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3>{activeUser.name}</h3>

                  <p>
                    <span
                      className={
                        online.includes(activeUser._id)
                          ? "status-dot"
                          : "status-dot offline"
                      }
                    />

                    {online.includes(activeUser._id)
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </>
            ) : (
              <div className="conversation-placeholder">
                <div className="placeholder-icon">✦</div>

                <div>
                  <h3>Your conversations</h3>
                  <p>Select a person from the list to begin.</p>
                </div>
              </div>
            )}
          </div>
          <div className="message-area">
            {!activeUser ? (
              <div className="welcome-empty">
                <div className="chat-illustration">
                  <span>•••</span>
                </div>

                <h2>Say hello to someone</h2>

                <p>
                  Your next great conversation starts with one
                  message.
                </p>
              </div>
            ) : loadingMessages ? (
              <p className="center-note">
                Loading conversation…
              </p>
            ) : messages.length === 0 ? (
              <div className="welcome-empty compact">
                <div className="chat-illustration">
                  <span>✉</span>
                </div>

                <h2>It's a fresh start</h2>

                <p>Send {activeUser.name} the first message.</p>
              </div>
            ) : (
              messages.map((message) => {
                const myMessage = message.sender === me._id;

                return (
                  <div
                    key={message._id}
                    className={`message-line ${
                      myMessage ? "mine" : ""
                    }`}
                  >
                    <div className="bubble">
                      <p>{message.text}</p>

                      <time>
                        {timeLabel(message.createdAt)}
                      </time>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>
          {error && <p className="inline-error">{error}</p>}

          <form className="composer" onSubmit={sendMessage}>
            <input
              aria-label="Message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={
                activeUser
                  ? `Message ${activeUser.name}…`
                  : "Select a conversation first"
              }
              disabled={!activeUser}
              maxLength="3000"
            />

            <button
              type="submit"
              disabled={!activeUser || !text.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>

          <p className="privacy-note">
            Be kind. Your messages are saved to the conversation
            history.
          </p>
        </section>
      </section>

      <footer className="app-footer">
        CHATSPACE <span>•</span> YOUR PERSONAL CHAT ROOM
      </footer>
    </main>
  );
}

export default App;