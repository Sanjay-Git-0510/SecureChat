import React, {
  createContext, useContext,
  useState, useEffect, useCallback, useRef
} from 'react';
import { useAuth } from './AuthContext';
import { messagesAPI, usersAPI, roomsAPI } from '../services/api';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { socket, user } = useAuth();

  const [messages,     setMessages]     = useState([]);
  const [activeChat,   setActiveChat]   = useState(null);
  const [onlineUsers,  setOnlineUsers]  = useState([]); // string[] of userIds
  const [typingUsers,  setTypingUsers]  = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [allUsers,     setAllUsers]     = useState([]);
  const [allRooms,     setAllRooms]     = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);

  // Keep a ref so socket callbacks always read the latest activeChat
  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // ── isOnline helper ──
  const isOnline = useCallback(
    (userId) => onlineUsers.includes(String(userId)),
    [onlineUsers]
  );

  // ── Load users + rooms ──
  useEffect(() => {
    (async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          usersAPI.getAll(),
          roomsAPI.getAll(),
        ]);
        setAllUsers(uRes.data);
        setAllRooms(rRes.data);
      } catch (e) {
        console.error('Initial load error:', e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // ── Refresh users every 10 s so isOnline stays fresh ──
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { data } = await usersAPI.getAll();
        setAllUsers(data);
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, []);

  // ── Load messages when active chat changes ──
  const loadMessages = useCallback(async (chat) => {
    if (!chat) return;
    setMessages([]);
    try {
      const { data } = chat.type === 'direct'
        ? await messagesAPI.getDirect(chat.data._id)
        : await messagesAPI.getRoom(chat.data._id);
      setMessages(data);
      // Join socket room channel for group chats
      if (chat.type === 'room') {
        socket?.emit('room:join', chat.data._id);
      }
    } catch (e) {
      console.error('loadMessages error:', e);
    }
  }, [socket]);

  useEffect(() => {
    if (!activeChat) return;
    loadMessages(activeChat);
    // Clear unread for this chat
    const key = activeChat.type === 'direct'
      ? String(activeChat.data._id)
      : `room:${activeChat.data._id}`;
    setUnreadCounts(prev => ({ ...prev, [key]: 0 }));
  }, [activeChat, loadMessages]);

  // ── Socket event listeners ──
  useEffect(() => {
    if (!socket) return;

    // Request current online list as soon as socket is ready
    socket.emit('get:online_users');

    // Incoming message
    const onMessage = (msg) => {
      const chat = activeChatRef.current;
      const senderId   = String(msg.sender?._id   ?? msg.sender   ?? '');
      const receiverId = String(msg.receiver?._id ?? msg.receiver ?? '');
      const roomId     = String(msg.room?._id     ?? msg.room     ?? '');

      const isActive = chat && (
        (chat.type === 'direct' &&
          (senderId === String(chat.data._id) || receiverId === String(chat.data._id))
        ) ||
        (chat.type === 'room' && roomId === String(chat.data._id))
      );

      if (isActive) {
        setMessages(prev =>
          prev.some(m => m._id === msg._id) ? prev : [...prev, msg]
        );
      } else {
        // Unread counter
        const myId = String(user?._id ?? '');
        const key  = roomId
          ? `room:${roomId}`
          : senderId !== myId ? senderId : null;
        if (key) setUnreadCounts(c => ({ ...c, [key]: (c[key] || 0) + 1 }));
      }
    };

    // Full online list refresh
    const onOnlineList = (ids) => {
      const list = ids.map(String);
      setOnlineUsers(list);
    };

    // Single user came online
    const onUserOnline = ({ userId }) => {
      const id = String(userId);
      setOnlineUsers(prev => prev.includes(id) ? prev : [...prev, id]);
    };

    // Single user went offline
    const onUserOffline = ({ userId }) => {
      const id = String(userId);
      setOnlineUsers(prev => prev.filter(x => x !== id));
    };

    const onTypingStart = ({ userId, username }) =>
      setTypingUsers(p => ({ ...p, [userId]: username }));

    const onTypingStop = ({ userId }) =>
      setTypingUsers(p => { const n = { ...p }; delete n[userId]; return n; });

    socket.on('message:new',  onMessage);
    socket.on('online:users', onOnlineList);
    socket.on('user:online',  onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop',  onTypingStop);

    return () => {
      socket.off('message:new',  onMessage);
      socket.off('online:users', onOnlineList);
      socket.off('user:online',  onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop',  onTypingStop);
    };
  }, [socket, user]);

  // ── Send message ──
  const sendMessage = useCallback((content) => {
    if (!socket || !content.trim() || !activeChat) return;
    if (activeChat.type === 'direct') {
      socket.emit('message:direct', { receiverId: activeChat.data._id, content });
    } else {
      socket.emit('message:room', { roomId: activeChat.data._id, content });
    }
  }, [socket, activeChat]);

  // ── Join a room (API + update local list) ──
  const joinRoom = useCallback(async (room) => {
    try {
      const { data } = await roomsAPI.join(room._id);
      setAllRooms(prev =>
        prev.some(r => r._id === room._id)
          ? prev.map(r => r._id === room._id ? { ...r, ...data } : r)
          : [data, ...prev]
      );
      return data;
    } catch {
      return room;
    }
  }, []);

  // ── Add newly created room to list ──
  const addRoom = useCallback((room) => {
    setAllRooms(prev =>
      prev.some(r => r._id === room._id) ? prev : [room, ...prev]
    );
  }, []);

  return (
    <ChatContext.Provider value={{
      messages, setMessages,
      activeChat, setActiveChat,
      onlineUsers, isOnline,
      typingUsers,
      unreadCounts,
      sendMessage,
      allUsers, allRooms,
      loadingData,
      joinRoom, addRoom,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);