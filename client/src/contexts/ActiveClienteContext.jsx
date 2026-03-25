import { createContext, useContext, useState, useCallback } from 'react'

const ActiveClienteContext = createContext(null)

export function ActiveClienteProvider({ children }) {
  const [clienteAttivo, setClienteAttivo] = useState(null)
  // { nome, cognome, codiceCliente, numeroLicenza, comuneRilascioLicenza, targa }

  const setActive = useCallback((data) => setClienteAttivo(data), [])
  const clearActive = useCallback(() => setClienteAttivo(null), [])

  return (
    <ActiveClienteContext.Provider value={{ clienteAttivo, setActive, clearActive }}>
      {children}
    </ActiveClienteContext.Provider>
  )
}

export function useActiveCliente() {
  return useContext(ActiveClienteContext)
}
