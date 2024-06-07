import React from 'react';
import logo from './logo.svg';
import './App.css';
import ChatInterface from './components/ChatInterface';
import FigmaInspector from './components/FigmaInspector';

function App() {
  return (
    <>
      {!(window as any).showFigmaInspector ? <ChatInterface></ChatInterface> : <FigmaInspector></FigmaInspector>}
    </>
  );
}

export default App;
