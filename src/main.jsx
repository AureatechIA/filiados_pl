import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { supabase } from './lib/supabase'

async function bootstrap() {
  // Auth Warm-Up: Await session confirmation before rendering anything
  await supabase.auth.getSession();

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap();
