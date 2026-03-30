interface Endpoint {
  id: string
  name: string
  url: string
  method: string
  pollInterval: number
  lastCheckedAt: string | null
}

interface Props {
  endpoint: Endpoint
  onDelete: (id: string) => void
}

export default function EndpointCard({ endpoint, onDelete }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {endpoint.method}
            </span>
            <h3 className="text-white font-semibold truncate">{endpoint.name}</h3>
          </div>
          <p className="text-slate-400 text-sm truncate mb-3 font-mono">{endpoint.url}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span>⏱</span> Every {endpoint.pollInterval} min
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${endpoint.lastCheckedAt ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              {endpoint.lastCheckedAt
                ? `Last checked ${new Date(endpoint.lastCheckedAt).toLocaleString()}`
                : 'Not checked yet'}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(endpoint.id)}
          className="opacity-0 group-hover:opacity-100 ml-4 text-slate-500 hover:text-red-400 transition-all duration-200 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
