import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import ChatInterface from './components/ChatInterface';
import FigmaInspector from './components/FigmaInspector';
import useThemeStore from './store/theme-store';

function App() {
  const { theme } = useThemeStore();
  
  // Apply theme class to document body
  useEffect(() => {
    // First, remove all theme classes
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-default');
    
    // Then add the appropriate class
    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'default') {
      document.body.classList.add('theme-default');
    }
  }, [theme]);
  
  return (
    <div className="min-h-screen bg-primary">
      {!(window as any).showFigmaInspector ? <ChatInterface></ChatInterface> : <FigmaInspector></FigmaInspector>}
    </div>
  );
}

export default App;
