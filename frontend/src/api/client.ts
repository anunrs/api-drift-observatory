// api/client.ts — Pre-configured axios instance for all API calls.
// Automatically attaches the JWT from localStorage to every request.

import axios from 'axios'

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000'
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
