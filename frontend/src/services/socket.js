import { io } from 'socket.io-client'

let socket = null

/** One socket per logged-in session; the server puts it in the user's private room. */
export function connectSocket(handlers) {
  disconnectSocket()
  socket = io({ withCredentials: true, transports: ['websocket', 'polling'] })
  for (const [event, fn] of Object.entries(handlers)) socket.on(event, fn)
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
