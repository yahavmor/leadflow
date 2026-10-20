import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { leadApi } from '../services/http'

export const fetchLeads = createAsyncThunk('leads/fetch', () => leadApi.query({ limit: 200, sort: '-statusChangedAt' }))
export const createLead = createAsyncThunk('leads/create', (lead) => leadApi.create(lead))
export const updateLead = createAsyncThunk('leads/update', ({ id, fields }) => leadApi.update(id, fields))
export const addNote = createAsyncThunk('leads/addNote', ({ id, text }) => leadApi.addNote(id, text))
export const deleteLead = createAsyncThunk('leads/delete', async (id) => { await leadApi.remove(id); return id })

/** Optimistic: the card moves right away and moves back if the server says no. */
export const moveLead = createAsyncThunk('leads/move', ({ id, status }) => leadApi.setStatus(id, status))

const upsert = (state, lead) => {
  const i = state.items.findIndex((l) => l._id === lead._id)
  if (i === -1) state.items.unshift(lead)
  else state.items[i] = lead
}

const leadsSlice = createSlice({
  name: 'leads',
  initialState: { items: [], loaded: false, loading: false, error: null, prevStatus: {} },
  reducers: {
    leadUpserted: (state, { payload }) => upsert(state, payload),
    leadRemoved: (state, { payload }) => { state.items = state.items.filter((l) => l._id !== payload._id) },
    reset: () => ({ items: [], loaded: false, loading: false, error: null, prevStatus: {} }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => { state.loading = true })
      .addCase(fetchLeads.fulfilled, (state, { payload }) => {
        state.items = payload.leads
        state.loading = false
        state.loaded = true
      })
      .addCase(fetchLeads.rejected, (state, { error }) => { state.loading = false; state.error = error.message })
      .addCase(moveLead.pending, (state, { meta }) => {
        const lead = state.items.find((l) => l._id === meta.arg.id)
        if (!lead) return
        state.prevStatus[lead._id] = lead.status
        lead.status = meta.arg.status
        lead.statusChangedAt = new Date().toISOString()
      })
      .addCase(moveLead.fulfilled, (state, { payload }) => {
        delete state.prevStatus[payload._id]
        upsert(state, payload)
      })
      .addCase(moveLead.rejected, (state, { meta }) => {
        const lead = state.items.find((l) => l._id === meta.arg.id)
        if (lead && state.prevStatus[lead._id]) lead.status = state.prevStatus[lead._id]
        delete state.prevStatus[meta.arg.id]
      })
      .addCase(deleteLead.fulfilled, (state, { payload }) => { state.items = state.items.filter((l) => l._id !== payload) })
    for (const thunk of [createLead, updateLead, addNote]) {
      builder.addCase(thunk.fulfilled, (state, { payload }) => upsert(state, payload))
    }
  },
})

export const { leadUpserted, leadRemoved, reset } = leadsSlice.actions
export default leadsSlice.reducer
