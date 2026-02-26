import React from 'react';
import Sidebar from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import { ChatProvider } from '../context/ChatContext';
import './ChatPage.css';

const ChatPage = () => {
  return (
    <ChatProvider>
      <div className="chat-layout">
        <Sidebar />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
};

export default ChatPage;