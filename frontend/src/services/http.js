import axios from 'axios'

export const http = axios.create({ baseURL: '/api', withCredentials: true })

/** Turns API errors into plain Error objects with the server's message. */
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    const e = new Error(message)
    e.status = err.response?.status
    return Promise.reject(e)
  }
)

export const authApi = {
  me: () => http.get('/auth/me'),
  login: (creds) => http.post('/auth/login', creds),
  signup: (data) => http.post('/auth/signup', data),
  demo: () => http.post('/auth/demo'),
  logout: () => http.post('/auth/logout'),
  rotateHookToken: () => http.post('/auth/hook-token'),
}

export const leadApi = {
  query: (params) => http.get('/lead', { params }),
  get: (id) => http.get(`/lead/${id}`),
  create: (lead) => http.post('/lead', lead),
  update: (id, fields) => http.put(`/lead/${id}`, fields),
  setStatus: (id, status) => http.patch(`/lead/${id}/status`, { status }),
  addNote: (id, text) => http.post(`/lead/${id}/note`, { text }),
  remove: (id) => http.delete(`/lead/${id}`),
}

export const statsApi = {
  get: (days = 14) => http.get('/stats', { params: { days } }),
}

/** Sends a sample lead through the public webhook, exactly like a website form would. */
export const sendTestLead = (hookToken, body) =>
  fetch(`/api/hook/${hookToken}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
