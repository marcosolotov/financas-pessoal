import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { MonthProvider } from './context/MonthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import './styles/globals.css';
import './styles/components.css';
import './styles/modals.css';
import './styles/auth.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <MonthProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </MonthProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);