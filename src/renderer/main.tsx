import React from 'react';
import { createRoot } from 'react-dom/client';
import './theme/tokens.css';
import { App } from './App';
import { initTooltip } from './tooltip';

initTooltip();
createRoot(document.getElementById('root')!).render(<App />);
