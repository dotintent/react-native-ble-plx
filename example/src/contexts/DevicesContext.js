import React, { useState } from 'react'
import { createContext } from 'react'

export const DevicesContext = createContext([])

export const DevicesContextProvider = (props) => {
  const [devices, setDevices] = useState([])

  return (
    <DevicesContext.Provider value={[devices, setDevices]}>
      {props.children}
    </DevicesContext.Provider>
  )
}
