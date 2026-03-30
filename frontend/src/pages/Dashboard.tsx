import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import client from '../api/client'
import EndpointCard from '../components/EndpointCard'

interface Endpoint {
  id: string
  name: string
  url: string
  method: string
  pollInterval: number
  lastCheckedAt: string | null
  createdAt: string
}

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    client.get<Endpoint[]>('/endpoints')
      .then(({ data }) => setEndpoints(data))
      .catch(() => {})
      .then(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  async function handleDelete(id: string) {
    await client.delete(`/endpoints/${id}`)
    setEndpoints(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm shadow-lg shadow-indigo-500/30">
              🔭
            </div>
            <span className="text-white font-semibold">API Drift Observatory</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/alerts"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Alerts
            </Link>
            <Link
              to="/add"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Endpoint
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">My Endpoints</h2>
          <p className="text-slate-400 text-sm mt-1">
            {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} being monitored
          </p>
        </div>

        {loading && (
          <div className="text-slate-400 text-sm">Loading...</div>
        )}

        {!loading && endpoints.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
            <div className="text-4xl mb-4">📡</div>
            <p className="text-slate-400 mb-4">No endpoints yet.</p>
            <Link
              to="/add"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Add your first endpoint
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {endpoints.map(endpoint => (
            <EndpointCard
              key={endpoint.id}
              endpoint={endpoint}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
