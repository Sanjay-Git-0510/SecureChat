import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Avatar from '../UI/Avatar';
import toast from 'react-hot-toast';
import './Admin.css';

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{ '--card-color': color }}>
    <div className="stat-icon">{icon}</div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, rRes, mRes] = await Promise.all([
        adminAPI.getStats(), adminAPI.getUsers(), adminAPI.getRooms(), adminAPI.getMessages(),
      ]);
      setStats(sRes.data); setUsers(uRes.data); setRooms(rRes.data); setMessages(mRes.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await adminAPI.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u._id === userId ? data : u));
      toast.success('Role updated!');
    } catch { toast.error('Failed to update role'); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room and all its messages?')) return;
    try {
      await adminAPI.deleteRoom(roomId);
      setRooms(prev => prev.filter(r => r._id !== roomId));
      toast.success('Room deleted');
    } catch { toast.error('Failed to delete room'); }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="brand-icon">⚡</span>
          <h1>NexusChat Admin</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-user-tag">👑 {user?.username}</span>
          <button className="btn-ghost" onClick={() => navigate('/')}>← Back to Chat</button>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-nav">
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'users', icon: '👥', label: `Users (${users.length})` },
            { id: 'rooms', icon: '💬', label: `Rooms (${rooms.length})` },
            { id: 'messages', icon: '📨', label: 'Messages' },
          ].map(item => (
            <button key={item.id} className={`admin-nav-btn ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <main className="admin-content">
          {tab === 'overview' && stats && (
            <div className="fade-in">
              <h2>Dashboard Overview</h2>
              <div className="stats-grid">
                <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="#6c63ff" />
                <StatCard icon="🟢" label="Online Now" value={stats.onlineUsers} color="#23d18b" />
                <StatCard icon="💬" label="Total Rooms" value={stats.totalRooms} color="#63d4ff" />
                <StatCard icon="📨" label="Messages Sent" value={stats.totalMessages} color="#ff63c5" />
              </div>
              <div className="admin-section">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {messages.slice(0, 10).map(msg => (
                    <div key={msg._id} className="activity-item">
                      <Avatar user={msg.sender} size={30} />
                      <div className="activity-content">
                        <span className="activity-user">{msg.sender?.username}</span>
                        <span className="activity-msg">{msg.content}</span>
                      </div>
                      <span className="activity-time">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="fade-in">
              <h2>User Management</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td><div className="table-user"><Avatar user={u} size={28} /><span>{u.username}</span></div></td>
                        <td className="text-muted">{u.email}</td>
                        <td>
                          <select className="role-select" value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td><span className={`status-badge ${u.isOnline ? 'online' : 'offline'}`}>{u.isOnline ? 'Online' : 'Offline'}</span></td>
                        <td className="text-muted">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                        <td><button className="danger-btn" onClick={() => handleDeleteUser(u._id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'rooms' && (
            <div className="fade-in">
              <h2>Room Management</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Room</th><th>Created By</th><th>Members</th><th>Visibility</th><th>Created</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r._id}>
                        <td><strong># {r.name}</strong></td>
                        <td className="text-muted">{r.createdBy?.username}</td>
                        <td className="text-muted">{r.members?.length}</td>
                        <td><span className={`status-badge ${r.isPrivate ? 'offline' : 'online'}`}>{r.isPrivate ? 'Private' : 'Public'}</span></td>
                        <td className="text-muted">{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                        <td><button className="danger-btn" onClick={() => handleDeleteRoom(r._id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'messages' && (
            <div className="fade-in">
              <h2>Message Logs</h2>
              <div className="messages-log">
                {messages.map(msg => (
                  <div key={msg._id} className="log-item">
                    <Avatar user={msg.sender} size={32} />
                    <div className="log-content">
                      <div className="log-header">
                        <span className="log-user">{msg.sender?.username}</span>
                        <span className="log-meta">{msg.room ? '🏠 Room' : '👤 DM'} · {format(new Date(msg.createdAt), 'MMM d, HH:mm')}</span>
                      </div>
                      <p className="log-text">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;