import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import client from '../api/client'

export default function AddEndpoint() {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [pollInterval, setPollInterval] = useState(60)
  const [tsInterface, setTsInterface] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/endpoints', {
        name, url, method, pollInterval,
        tsInterface: tsInterface || null
      })
      navigate('/dashboard')
    } catch {
      setError('Failed to add endpoint. Check the details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Back
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <span className="text-white font-semibold text-sm">Add Endpoint</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Register an endpoint</h2>
          <p className="text-slate-400 text-sm mt-1">We'll poll it on a schedule and alert you when the shape changes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. User Profile API"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-28">
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-300 block mb-1.5">URL</label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://api.example.com/users"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium text-slate-300 block mb-1.5">Poll interval (minutes)</label>
              <input
                type="number"
                value={pollInterval}
                onChange={e => setPollInterval(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <label className="text-sm font-medium text-slate-300 block mb-1">
              TypeScript Interface{' '}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Paste your frontend interface. We'll alert you if the API response no longer matches it.
            </p>
            <textarea
              value={tsInterface}
              onChange={e => setTsInterface(e.target.value)}
              placeholder={`interface User {\n  id: number\n  name: string\n  email: string\n}`}
              rows={7}
              className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors duration-200"
          >
            {loading ? 'Adding...' : 'Add Endpoint'}
          </button>
        </form>
      </div>
    </div>
  )
}
