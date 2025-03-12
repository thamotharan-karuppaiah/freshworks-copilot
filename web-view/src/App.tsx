import React from 'react';
import logo from './logo.svg';
import './App.css';
import ChatInterface from './components/ChatInterface';
import FigmaInspector from './components/FigmaInspector';
import useThemeStore from './store/theme-store';

function App() {
  const { theme } = useThemeStore();
  
  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white'
    }`}>
      {!(window as any).showFigmaInspector ? <ChatInterface></ChatInterface> : <FigmaInspector></FigmaInspector>}
    </div>
  );
}

export default App;
