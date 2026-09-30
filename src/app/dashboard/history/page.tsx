'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, CheckCircle, AlertCircle, Clock, Loader2, Filter } from 'lucide-react'

interface Log {
  id: string
  stage: string
  status: string
  message: string | null
  createdAt: string
  person: { id: string; name: string; isSynthetic: boolean } | null
}

const stageColors: Record<string, string> = {
  ingestion: 'badge-sand',
  analysis: 'badge-sage',
  dating: 'badge-charcoal',
  ranking: 'badge-coral',
}

const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="w-3.5 h-3.5 text-[#7a9e8e]" />,
  running: <Loader2 className="w-3.5 h-3.5 text-[#e8a000] animate-spin" />,
  failed: <AlertCircle className="w-3.5 h-3.5 text-[#e85d4a]" />,
  skipped: <Clock className="w-3.5 h-3.5 text-[#c4a882]" />,
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (stageFilter) params.set('stage', stageFilter)
    if (statusFilter) params.set('status', statusFilter)

    const res = await fetch(`/api/logs?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)

      // Group stats by stage
      const grouped: Record<string, Record<string, number>> = {}
      for (const stat of data.stats) {
        if (!grouped[stat.stage]) grouped[stat.stage] = {}
        grouped[stat.stage][stat.status] = stat._count.id
      }
      setStats(grouped)
    }
    setLoading(false)
  }, [stageFilter, statusFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const stages = ['ingestion', 'analysis', 'dating', 'ranking']
  const statuses = ['success', 'failed', 'running', 'skipped']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-display text-[#1a1612] mb-1">Run History & Errors</h1>
        <p className="text-[#8a7d6e] text-sm">{total} total log entries across all stages</p>
      </div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {stages.map((stage) => {
          const stageStats = stats[stage] || {}
          const success = stageStats.success || 0
          const failed = stageStats.failed || 0
          const total = Object.values(stageStats).reduce((a, b) => a + b, 0)
          return (
            <div key={stage} className="card p-4">
              <div className="text-xs font-medium text-[#8a7d6e] uppercase tracking-wide mb-2">{stage}</div>
              <div className="text-2xl font-semibold text-[#1a1612]">{total}</div>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-[#4a7a6a]">✓ {success}</span>
                {failed > 0 && <span className="text-xs text-[#c94535]">✗ {failed}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex gap-1 p-1 bg-[#f5f0e8] rounded-xl">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!stageFilter ? 'bg-white text-[#1a1612] shadow-sm' : 'text-[#8a7d6e]'}`}
          >
            All Stages
          </button>
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(stageFilter === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${stageFilter === s ? 'bg-white text-[#1a1612] shadow-sm' : 'text-[#8a7d6e]'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-[#f5f0e8] rounded-xl">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!statusFilter ? 'bg-white text-[#1a1612] shadow-sm' : 'text-[#8a7d6e]'}`}
          >
            All Status
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${statusFilter === s ? 'bg-white text-[#1a1612] shadow-sm' : 'text-[#8a7d6e]'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Logs table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <History className="w-12 h-12 mx-auto mb-4 text-[#c4a882]" />
          <h3 className="text-display text-lg text-[#1a1612] mb-2">No Logs Found</h3>
          <p className="text-[#8a7d6e] text-sm">
            {stageFilter || statusFilter ? 'No logs match the selected filters.' : 'Run analysis, sessions, or rankings to see activity here.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e0d4] bg-[#faf7f2]">
                <th className="text-left text-xs font-medium text-[#8a7d6e] px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-[#8a7d6e] px-4 py-3">Stage</th>
                <th className="text-left text-xs font-medium text-[#8a7d6e] px-4 py-3">Person</th>
                <th className="text-left text-xs font-medium text-[#8a7d6e] px-4 py-3">Message</th>
                <th className="text-left text-xs font-medium text-[#8a7d6e] px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={`border-b border-[#e8e0d4] ${i % 2 === 0 ? '' : 'bg-[#faf7f2]/50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {statusIcons[log.status] || statusIcons.skipped}
                      <span className="text-xs text-[#4a4035] capitalize">{log.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${stageColors[log.stage] || 'badge-charcoal'} text-[10px]`}>
                      {log.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.person ? (
                      <span className="text-xs text-[#4a4035]">{log.person.name}</span>
                    ) : (
                      <span className="text-xs text-[#8a7d6e]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#4a4035] line-clamp-1">{log.message}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#8a7d6e] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()} {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
