import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth }        from '../../context/AuthContext';
import { useChat }        from '../../context/ChatContext';
import { messagesAPI }    from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';
import Avatar             from '../UI/Avatar';
import toast              from 'react-hot-toast';


const TYPING_DELAY = 1500;

/* ─── Single message bubble ─── */
const Bubble = ({ msg, isOwn, showAvatar, onDelete }) => {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const time = format(new Date(msg.createdAt), 'h:mm a');

  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  return (
    <div className={`msg-row ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="msg-avatar">
          {showAvatar ? <Avatar user={msg.sender} size={28} /> : null}
        </div>
      )}

      <div className="msg-col">
        {!isOwn && showAvatar && (
          <span className="msg-sender">{msg.sender?.username}</span>
        )}

        <div className={`bubble ${isOwn ? 'b-own' : 'b-other'} ${msg.isDeleted ? 'b-deleted' : ''}`}>
          <p>{msg.content}</p>

          <div className="bubble-footer">
            <span className="bubble-time">{time}</span>
            {isOwn && !msg.isDeleted && <span className="bubble-tick">✓✓</span>}
          </div>

          {/* Options button — only own, non-deleted */}
          {isOwn && !msg.isDeleted && (
            <button className="bubble-opts" onClick={() => setMenu(v => !v)}>⋯</button>
          )}

          {menu && (
            <div className="bubble-menu" ref={menuRef}>
              <button
                className="bm-item danger"
                onClick={() => { onDelete(msg._id); setMenu(false); }}
              >
                🗑️ Delete message
              </button>
              <button className="bm-item" onClick={() => setMenu(false)}>
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Date divider ─── */
const DateDivider = ({ date }) => {
  const d = new Date(date);
  const label = isToday(d) ? 'Today'
    : isYesterday(d) ? 'Yesterday'
    : format(d, 'MMMM d, yyyy');
  return (
    <div className="date-div">
      <div className="date-line" />
      <span className="date-label">{label}</span>
      <div className="date-line" />
    </div>
  );
};

/* ─── Welcome screen (no chat selected) ─── */
const WelcomeScreen = ({ username }) => (
  <div className="cw-welcome">
    <div className="cw-welcome-inner">
      <div className="cw-eyebrow">⚡ Real-time Chat</div>
      <h2 className="cw-welcome-title">
        Welcome back{username ? `, ${username}` : ''}!
      </h2>
      <p className="cw-welcome-sub">
        Select a conversation from the sidebar, or start a new one below.
      </p>

      <p className="cw-steps-label">How to use NexusChat</p>
      <div className="cw-steps">
        <div className="cw-step">
          <div className="cw-step-num" style={{background:'linear-gradient(135deg,#6979f8,#a78bfa)'}}>1</div>
          <div className="cw-step-body">
            <div className="cw-step-title">Send a Direct Message</div>
            <div className="cw-step-desc">
              Click the <em>People</em> tab on the left → select any user → type your message and press <em>Enter</em> to send instantly
            </div>
          </div>
        </div>
        <div className="cw-step">
          <div className="cw-step-num" style={{background:'linear-gradient(135deg,#2dd4a0,#06b6d4)'}}>2</div>
          <div className="cw-step-body">
            <div className="cw-step-title">Join or Create a Room</div>
            <div className="cw-step-desc">
              Click the <em>Rooms</em> tab → click any room marked <em>Tap to Join</em>, or click <em>Create a Room</em> to start your own group chat
            </div>
          </div>
        </div>
        <div className="cw-step">
          <div className="cw-step-num" style={{background:'linear-gradient(135deg,#f04f70,#f59e0b)'}}>3</div>
          <div className="cw-step-body">
            <div className="cw-step-title">Chat in Real-time</div>
            <div className="cw-step-desc">
              Experience lightning-fast communication with secure, real-time message delivery designed for effortless conversations.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Empty chat screen ─── */
const EmptyChat = ({ name, isRoom }) => (
  <div className="cw-empty">
    <div className="cw-empty-icon">{isRoom ? '🏠' : '👋'}</div>
    <p className="cw-empty-title">
      {isRoom ? `You joined #${name}` : `Chat with ${name}`}
    </p>
    <p className="cw-empty-sub">
      {isRoom
        ? 'Be the first to say something!'
        : 'Send a message — the other person sees it in real-time!'}
    </p>
  </div>
);

/* ═══════════════════════════════════════
   MAIN CHAT WINDOW
═══════════════════════════════════════ */
const ChatWindow = () => {
  const { user, socket }                           = useAuth();
  const { activeChat, messages, setMessages,
          typingUsers, sendMessage }               = useChat();
  const [input,    setInput]    = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const typingTimer = useRef(null);

  // Scroll to newest message
  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollBottom(); }, [messages, scrollBottom]);

  // Focus + clear input when chat changes
  useEffect(() => {
    setInput('');
    inputRef.current?.focus();
  }, [activeChat]);

  // Typing indicator
  const handleChange = (e) => {
    setInput(e.target.value);
    if (!socket || !activeChat) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', {
        to: activeChat.data._id,
        isRoom: activeChat.type === 'room',
      });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', {
        to: activeChat.data._id,
        isRoom: activeChat.type === 'room',
      });
    }, TYPING_DELAY);
  };

  // Send
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
    clearTimeout(typingTimer.current);
    setIsTyping(false);
    if (socket && activeChat) {
      socket.emit('typing:stop', {
        to: activeChat.data._id,
        isRoom: activeChat.type === 'room',
      });
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [input, sendMessage, socket, activeChat]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Delete
  const handleDelete = async (id) => {
    try {
      await messagesAPI.delete(id);
      setMessages(prev => prev.map(m =>
        m._id === id
          ? { ...m, isDeleted: true, content: '🚫 This message was deleted' }
          : m
      ));
    } catch {
      toast.error('Could not delete message');
    }
  };

  const typingList = Object.values(typingUsers).filter(Boolean);

  /* ── No chat selected ── */
  if (!activeChat) return <WelcomeScreen username={user?.username} />;

  const isRoom   = activeChat.type === 'room';
  const chatName = isRoom ? activeChat.data.name : activeChat.data.username;

  /* Group messages by date */
  const grouped = messages.reduce((acc, msg) => {
    const day = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div className="chat-window">

      {/* ── Top bar ── */}
      <div className="cw-header">
        <div className="cw-header-left">
          {isRoom
            ? <div className="cw-room-icon">{chatName.charAt(0).toUpperCase()}</div>
            : <Avatar user={activeChat.data} isOnline={true} size={36} />
          }
          <div>
            <h3 className="cw-header-name">
              {isRoom ? `# ${chatName}` : chatName}
            </h3>
            <span className="cw-header-sub">
              {isRoom
                ? `Group Room · ${activeChat.data.members?.length || 0} members`
                : 'Direct Message · online'}
            </span>
          </div>
        </div>
        <div className="cw-header-chip">
          {isRoom ? '🏠 Room' : '💬 DM'}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="cw-messages">
        {messages.length === 0 ? (
          <EmptyChat name={chatName} isRoom={isRoom} />
        ) : (
          Object.entries(grouped).map(([day, msgs]) => (
            <div key={day}>
              <DateDivider date={day} />
              {msgs.map((msg, i) => {
                const isOwn = String(msg.sender?._id ?? msg.sender) === String(user?._id);
                const showAvatar = String(msgs[i - 1]?.sender?._id ?? msgs[i - 1]?.sender)
                  !== String(msg.sender?._id ?? msg.sender);
                return (
                  <Bubble
                    key={msg._id}
                    msg={msg}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          ))
        )}

        {typingList.length > 0 && (
          <div className="cw-typing fade-in">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
            <span className="typing-label">
              {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="cw-input-bar">
        <span className="cw-input-hint">
          <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline
        </span>
        <div className="cw-input-row">
          <div className="cw-input-wrap">
            <input
              ref={inputRef}
              type="text"
              className="cw-input"
              value={input}
              onChange={handleChange}
              onKeyDown={handleKey}
              placeholder={isRoom ? `Message #${chatName}…` : `Message ${chatName}…`}
              autoComplete="off"
              maxLength={2000}
            />
            {input.length > 1800 && (
              <span className="cw-char-count">{2000 - input.length}</span>
            )}
          </div>
          <button
            className={`cw-send-btn ${input.trim() ? 'ready' : ''}`}
            onClick={handleSend}
            disabled={!input.trim()}
            title="Send (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;