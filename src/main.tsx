import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StorageProviderRoot } from './storage/StorageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProviderRoot>
      <App />
    </StorageProviderRoot>
  </React.StrictMode>,
);
