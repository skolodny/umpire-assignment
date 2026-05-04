import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { Toast } from '@heroui/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/umpire-assignment">
      <Toast.Provider placement='top' />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
