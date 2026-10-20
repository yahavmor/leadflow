import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice'
import leads from './leadsSlice'
import ui from './uiSlice'

export const createAppStore = (preloadedState) => configureStore({ reducer: { auth, leads, ui }, preloadedState })
export const store = createAppStore()
