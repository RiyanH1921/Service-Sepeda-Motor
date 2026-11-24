import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AndroidPreview from './AndroidPreview.jsx';
import './styles.css';
import './android.css';

const preview = new URLSearchParams(window.location.search).get('mode') === 'android';
createRoot(document.getElementById('root')).render(<React.StrictMode>{preview ? <AndroidPreview /> : <App />}</React.StrictMode>);
