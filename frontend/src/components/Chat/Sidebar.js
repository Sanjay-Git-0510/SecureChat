import React, { useState } from 'react';
import { useAuth }  from '../../context/AuthContext';
import { useChat }  from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { roomsAPI } from '../../services/api';
import toast        from 'react-hot-toast';
import Avatar       from '../UI/Avatar';
import './Sidebar.css';

/* ══════════════════════════════════════
   CREATE ROOM MODAL
══════════════════════════════════════ */
const CreateRoomModal = ({ onClose, onCreated }) => {
  const [name,    setName]    = useState('');
  const [desc,    setDesc]    = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await roomsAPI.create({
        name: name.trim(),
        description: desc.trim(),
      });
      toast.success(`Room #${data.name} created! 🎉`);
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-head-icon">🏠</span>
          <div className="modal-head-text">
            <h3>Create a New Room</h3>
            <p>A group chat where multiple people can talk</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="mf-group">
            <label>Room name <span className="mf-req">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. general, random, team-chat"
              autoFocus
              required
            />
          </div>
          <div className="mf-group">
            <label>Description <span className="mf-opt">(optional)</span></label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What is this room for?"
            />
          </div>
          <div className="modal-foot">
            <button type="button" className="mf-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="mf-create" disabled={loading || !name.trim()}>
              {loading ? <span className="mf-spin" /> : '+ Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   MAIN SIDEBAR
══════════════════════════════════════ */
const Sidebar = () => {
  const { user, logout }       = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    setActiveChat, activeChat,
    isOnline, unreadCounts,
    allUsers, allRooms, loadingData,
    joinRoom, addRoom,
  } = useChat();

  const [tab,            setTab]            = useState('people');
  const [search,         setSearch]         = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const q           = search.toLowerCase().trim();
  const filtUsers   = allUsers.filter(u => u.username.toLowerCase().includes(q));
  const filtRooms   = allRooms.filter(r => r.name.toLowerCase().includes(q));
  const onlineList  = filtUsers.filter(u => isOnline(u._id));
  const offlineList = filtUsers.filter(u => !isOnline(u._id));
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const openDM = (u) => setActiveChat({ type: 'direct', data: u });

  const openRoom = async (room) => {
    const updated = await joinRoom(room);
    setActiveChat({ type: 'room', data: updated });
  };

  const onRoomCreated = (room) => {
    addRoom(room);
    setActiveChat({ type: 'room', data: room });
  };

  // Check membership — compare both string and ObjectId forms
  const isMember = (room) => {
    if (!room?.members || !user?._id) return false;
    const myId = String(user._id);
    return room.members.some(m => {
      const memberId = typeof m === 'object' ? String(m._id) : String(m);
      return memberId === myId;
    });
  };

  const switchTab = (t) => { setTab(t); setSearch(''); };

  return (
    <>
      <aside className="sidebar">

        {/* ══ HEADER ══ */}
        <div className="sb-header">
          <div className="sb-brand">
            <span className="sb-brand-icon">⚡</span>
            <span className="sb-brand-name">NexusChat</span>
          </div>
          <div className="sb-header-right">
            <button className="sb-theme-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="sb-logout-btn" onClick={logout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* ══ PROFILE ══ */}
        <div className="sb-profile">
          <Avatar user={user} isOnline={true} size={40} />
          <div className="sb-profile-info">
            <span className="sb-profile-name">{user?.username}</span>
            <span className="sb-profile-status">
              {user?.role === 'admin' ? '👑 Admin' : '● Active now'}
            </span>
          </div>
          {user?.role === 'admin' && (
            <a href="/admin" className="sb-admin-btn" title="Admin Panel">👑</a>
          )}
        </div>

        {/* ══ SEARCH ══ */}
        <div className="sb-search">
          <div className="sb-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={tab === 'people' ? 'Search people…' : 'Search rooms…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="sb-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="sb-tabs">
          <button
            className={`sb-tab ${tab === 'people' ? 'active' : ''}`}
            onClick={() => switchTab('people')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            People
            {totalUnread > 0 && (
              <span className="sb-badge-red">{totalUnread > 99 ? '99+' : totalUnread}</span>
            )}
          </button>

          <button
            className={`sb-tab ${tab === 'rooms' ? 'active' : ''}`}
            onClick={() => switchTab('rooms')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Rooms
            {allRooms.length > 0 && (
              <span className="sb-badge-grey">{allRooms.length}</span>
            )}
          </button>
        </div>

        {/* ══ LIST ══ */}
        <div className="sb-list">

          {/* ─── PEOPLE TAB ─── */}
          {tab === 'people' && (
            <>
              {loadingData ? (
                <Skeletons />
              ) : filtUsers.length === 0 ? (
                <EmptyPeople />
              ) : (
                <>
                  {onlineList.length > 0 && (
                    <>
                      <div className="sb-section-label">
                        <span className="sb-dot green" />
                        Online — {onlineList.length}
                      </div>
                      {onlineList.map(u => (
                        <UserRow
                          key={u._id}
                          u={u}
                          online={true}
                          active={
                            activeChat?.type === 'direct' &&
                            String(activeChat.data._id) === String(u._id)
                          }
                          unread={unreadCounts[String(u._id)] || 0}
                          onClick={() => openDM(u)}
                        />
                      ))}
                    </>
                  )}

                  {offlineList.length > 0 && (
                    <>
                      <div className="sb-section-label">
                        <span className="sb-dot grey" />
                        Offline — {offlineList.length}
                      </div>
                      {offlineList.map(u => (
                        <UserRow
                          key={u._id}
                          u={u}
                          online={false}
                          active={
                            activeChat?.type === 'direct' &&
                            String(activeChat.data._id) === String(u._id)
                          }
                          unread={unreadCounts[String(u._id)] || 0}
                          onClick={() => openDM(u)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── ROOMS TAB ─── */}
          {tab === 'rooms' && (
            <>
              {/* CREATE ROOM — always visible at top */}
              <button
                className="sb-create-room"
                onClick={() => setShowCreateRoom(true)}
              >
                <span className="sb-create-room-plus">＋</span>
                <div className="sb-create-room-text">
                  <span className="sb-create-room-title">Create a Room</span>
                  <span className="sb-create-room-sub">Start a new group chat</span>
                </div>
              </button>

              {loadingData ? (
                <Skeletons count={3} />
              ) : filtRooms.length === 0 ? (
                <EmptyRooms />
              ) : (
                <>
                  <div className="sb-section-label">
                    <span className="sb-dot grey" />
                    All Rooms — {filtRooms.length}
                  </div>
                  {filtRooms.map(room => (
                    <RoomRow
                      key={room._id}
                      room={room}
                      member={isMember(room)}
                      active={
                        activeChat?.type === 'room' &&
                        String(activeChat.data._id) === String(room._id)
                      }
                      unread={unreadCounts[`room:${room._id}`] || 0}
                      onClick={() => openRoom(room)}
                    />
                  ))}
                </>
              )}
            </>
          )}

        </div>
      </aside>

      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onCreated={onRoomCreated}
        />
      )}
    </>
  );
};

/* ─── Skeleton loader ─── */
const Skeletons = ({ count = 5 }) => (
  <div className="sb-skeletons">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="sb-skeleton" style={{ animationDelay: `${i * 0.07}s` }} />
    ))}
  </div>
);

/* ─── Empty: people ─── */
const EmptyPeople = () => (
  <div className="sb-empty">
    <span className="sb-empty-icon">👤</span>
    <p className="sb-empty-title">No other users yet</p>
    <p className="sb-empty-hint">
      Open an <strong>incognito window</strong> →<br />
      go to <code>localhost:3000/register</code><br />
      to create a second account.<br />
      They'll appear here instantly!
    </p>
  </div>
);

/* ─── Empty: rooms ─── */
const EmptyRooms = () => (
  <div className="sb-empty">
    <span className="sb-empty-icon">💬</span>
    <p className="sb-empty-title">No rooms yet</p>
    <p className="sb-empty-hint">
      Click <strong>"Create a Room"</strong> above to start a group chat!
    </p>
  </div>
);

/* ─── User row ─── */
const UserRow = ({ u, online, active, unread, onClick }) => (
  <div
    className={`sb-row ${active ? 'active' : ''}`}
    onClick={onClick}
    title={`Chat with ${u.username}`}
  >
    <Avatar user={u} isOnline={online} size={38} />
    <div className="sb-row-body">
      <div className="sb-row-top">
        <span className="sb-row-name">{u.username}</span>
        {u.role === 'admin' && <span className="sb-role-pill">admin</span>}
      </div>
      <span className={`sb-row-sub ${online ? 'is-online' : ''}`}>
        {online ? '● Online now' : '○ Offline'}
      </span>
    </div>
    <div className="sb-row-right">
      {unread > 0
        ? <span className="sb-unread-badge">{unread > 99 ? '99+' : unread}</span>
        : <span className="sb-hint">{active ? '›' : 'Chat →'}</span>
      }
    </div>
  </div>
);

/* ─── Room row ─── */
const RoomRow = ({ room, member, active, unread, onClick }) => (
  <div
    className={`sb-row ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <div className="sb-room-avatar">
      {room.name.charAt(0).toUpperCase()}
    </div>
    <div className="sb-row-body">
      <div className="sb-row-top">
        <span className="sb-row-name"># {room.name}</span>
        {/* Clearly show Join or Joined status */}
        {member
          ? <span className="sb-pill-joined">✓ Joined</span>
          : <span className="sb-pill-join">Tap to Join</span>
        }
      </div>
      <span className="sb-row-sub">
        {room.members?.length || 0} member{room.members?.length !== 1 ? 's' : ''}
        {room.description ? ` · ${room.description}` : ''}
      </span>
    </div>
    <div className="sb-row-right">
      {unread > 0
        ? <span className="sb-unread-badge">{unread}</span>
        : member
          ? <span className="sb-hint active-hint">Open →</span>
          : <span className="sb-hint join-hint">Join →</span>
      }
    </div>
  </div>
);

export default Sidebar;