import React from 'react';
import './Avatar.css';

const COLORS = [
  '#6c63ff', '#ff63c5', '#63d4ff', '#23d18b', '#f0c67b',
  '#ff5c7c', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'
];

const getColor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];

const Avatar = ({ user, size = 36, isOnline }) => {
  const initial = user?.username?.charAt(0).toUpperCase() || '?';
  const color = getColor(user?.username);

  return (
    <div className="avatar-wrap" style={{ width: size, height: size, flexShrink: 0 }}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user.username} className="avatar-img" />
      ) : (
        <div
          className="avatar-initial"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: size * 0.4 }}
        >
          {initial}
        </div>
      )}
      {isOnline !== undefined && (
        <span className={`avatar-badge ${isOnline ? 'online' : 'offline'}`} />
      )}
    </div>
  );
};

export default Avatar;