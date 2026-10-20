import { createSlice } from '@reduxjs/toolkit'

let nextId = 1

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [], live: false },
  reducers: {
    toastAdded: {
      reducer: (state, { payload }) => { state.toasts.push(payload) },
      prepare: (toast) => ({ payload: { id: nextId++, kind: 'info', ...toast } }),
    },
    toastDismissed: (state, { payload }) => { state.toasts = state.toasts.filter((t) => t.id !== payload) },
    liveChanged: (state, { payload }) => { state.live = payload },
  },
})

export const { toastAdded, toastDismissed, liveChanged } = uiSlice.actions
export default uiSlice.reducer
