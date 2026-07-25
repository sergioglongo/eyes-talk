import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      useTransitions={false}: por defecto BrowserRouter envuelve cada cambio de
      location en React.startTransition, que corre en un lane de baja prioridad.
      El loop de tracking emite updates de prioridad normal a 60fps, así que la
      transition quedaba postergada indefinidamente: la URL cambiaba pero la
      pantalla no, hasta que un evento de mouse forzaba el flush.
      La app no usa loaders ni estados de navegación pendiente, así que no
      necesita transitions.
    */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
