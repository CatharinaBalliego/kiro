import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App';
import { WalletProvider } from './context/WalletContext';
import { DashboardProvider } from './context/DashboardContext';
import { QuoteProvider } from './context/QuoteContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { UserProfileProvider } from './context/UserProfileContext';
import './index.css';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'apple'],
        appearance: {
          theme: 'dark',
          accentColor: '#00FF87',
          logo: '/logo.png',
          landingHeader: 'Entrar no Kiro',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <BrowserRouter>
        <UserProfileProvider>
          <WalletProvider>
            <DashboardProvider>
              <QuoteProvider>
                <NotificationsProvider>
                  <App />
                </NotificationsProvider>
              </QuoteProvider>
            </DashboardProvider>
          </WalletProvider>
        </UserProfileProvider>
      </BrowserRouter>
    </PrivyProvider>
  </>,
);
