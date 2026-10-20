import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../services/http'

export const fetchMe = createAsyncThunk('auth/me', () => authApi.me())
export const login = createAsyncThunk('auth/login', (creds) => authApi.login(creds))
export const signup = createAsyncThunk('auth/signup', (data) => authApi.signup(data))
export const demoLogin = createAsyncThunk('auth/demo', () => authApi.demo())
export const logout = createAsyncThunk('auth/logout', () => authApi.logout())
export const rotateHookToken = createAsyncThunk('auth/rotateHookToken', () => authApi.rotateHookToken())

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, checked: false, pending: false, error: null },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, { payload }) => { state.user = payload; state.checked = true })
      .addCase(fetchMe.rejected, (state) => { state.user = null; state.checked = true })
      .addCase(logout.fulfilled, (state) => { state.user = null })
      .addCase(rotateHookToken.fulfilled, (state, { payload }) => { state.user = payload })
    for (const thunk of [login, signup, demoLogin]) {
      builder
        .addCase(thunk.pending, (state) => { state.pending = true; state.error = null })
        .addCase(thunk.fulfilled, (state, { payload }) => { state.pending = false; state.user = payload; state.checked = true })
        .addCase(thunk.rejected, (state, { error }) => { state.pending = false; state.error = error.message })
    }
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
