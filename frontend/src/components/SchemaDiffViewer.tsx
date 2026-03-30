interface Props {
  diff: Record<string, string[]>
  type: 'DRIFT' | 'CONTRACT_VIOLATION'
}

export default function SchemaDiffViewer({ diff, type }: Props) {
  if (type === 'DRIFT') {
    return (
      <div className="space-y-1.5 font-mono text-xs">
        {diff.added?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold shrink-0">+</span>
            <span className="text-slate-300">
              <span className="text-emerald-400">Added: </span>
              {diff.added.join(', ')}
            </span>
          </div>
        )}
        {diff.removed?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold shrink-0">−</span>
            <span className="text-slate-300">
              <span className="text-red-400">Removed: </span>
              {diff.removed.join(', ')}
            </span>
          </div>
        )}
        {diff.typeChanged?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">~</span>
            <span className="text-slate-300">
              <span className="text-amber-400">Type changed: </span>
              {diff.typeChanged.join(', ')}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5 font-mono text-xs">
      {diff.missingFromApi?.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-red-400 font-bold shrink-0">✕</span>
          <span className="text-slate-300">
            <span className="text-red-400">Missing from API: </span>
            {diff.missingFromApi.join(', ')}
          </span>
        </div>
      )}
      {diff.unexpectedInApi?.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-slate-500 font-bold shrink-0">?</span>
          <span className="text-slate-400">
            <span className="text-slate-400">Unexpected in API: </span>
            {diff.unexpectedInApi.join(', ')}
          </span>
        </div>
      )}
      {diff.typeMismatch?.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-amber-400 font-bold shrink-0">~</span>
          <span className="text-slate-300">
            <span className="text-amber-400">Type mismatch: </span>
            {diff.typeMismatch.join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}
