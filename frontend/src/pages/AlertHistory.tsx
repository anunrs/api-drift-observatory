import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import SchemaDiffViewer from '../components/SchemaDiffViewer'

interface Alert {
  id: string
  type: 'DRIFT' | 'CONTRACT_VIOLATION'
  diff: Record<string, string[]>
  seen: boolean
  createdAt: string
  endpoint: { name: string; url: string }
}

export default function AlertHistory() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get<Alert[]>('/alerts')
      .then(({ data }) => setAlerts(data))
      .catch(() => {})
      .then(() => setLoading(false))
  }, [])

  async function markSeen(id: string) {
    await client.put(`/alerts/${id}/seen`)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, seen: true } : a))
  }

  const unseen = alerts.filter(a => !a.seen).length

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <span className="text-white font-semibold text-sm">Alert History</span>
          {unseen > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unseen} new
            </span>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Alert History</h2>
          <p className="text-slate-400 text-sm mt-1">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} detected
          </p>
        </div>

        {loading && <p className="text-slate-400 text-sm">Loading...</p>}

        {!loading && alerts.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-slate-400">No alerts yet. Your endpoints look stable.</p>
          </div>
        )}

        <div className="space-y-4">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-slate-900 border rounded-xl p-5 transition-all duration-200 ${
                alert.seen
                  ? 'border-slate-800 opacity-60'
                  : alert.type === 'CONTRACT_VIOLATION'
                  ? 'border-amber-500/40'
                  : 'border-red-500/40'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                    alert.type === 'CONTRACT_VIOLATION'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {alert.type === 'CONTRACT_VIOLATION' ? '⚠ CONTRACT VIOLATION' : '⚡ DRIFT'}
                  </span>
                  <div>
                    <span className="text-white font-medium text-sm">{alert.endpoint.name}</span>
                    <span className="text-slate-500 text-xs ml-2">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!alert.seen && (
                  <button
                    onClick={() => markSeen(alert.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Mark seen
                  </button>
                )}
              </div>
              <div className="bg-slate-800/50 rounded-lg px-4 py-3">
                <SchemaDiffViewer diff={alert.diff} type={alert.type} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
