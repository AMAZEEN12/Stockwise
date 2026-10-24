import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';
import '@fontsource/syne/latin-800.css';
import '@fontsource/inter-tight/latin-400.css';
import '@fontsource/inter-tight/latin-500.css';
import '@fontsource/inter-tight/latin-600.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './styles/app.css';
import { store } from './app/store/store';
import { router } from './app/router/router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Provider store={store}><RouterProvider router={router} /></Provider></React.StrictMode>,
);
