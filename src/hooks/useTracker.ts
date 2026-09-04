import { useCallback, useEffect, useState } from 'react'
import { isDemoMode, supabase } from '../lib/supabase'
import { isUuid } from '../lib/tracking'
import {
  demoAgentSubsteps,
  demoAgents,
  demoComments,
  demoStages,
  demoSubsteps,
} from '../lib/demoData'
import type {
  AgentStage,
  AgentSubstep,
  AgentWithStages,
  Comment,
  Stage,
  Substep,
} from '../types/database'

const TRACKER_TABLES = ['agents', 'agent_stages', 'agent_substeps', 'comments'] as const

export function useRealtimeTick(): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (isDemoMode) return
    const channel = supabase.channel('agent-tracker')
    for (const table of TRACKER_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => setTick((n) => n + 1),
      )
    }
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return tick
}

export function useCatalog(tick: number) {
  const [stages, setStages] = useState<Stage[]>(isDemoMode ? demoStages : [])
  const [substeps, setSubsteps] = useState<Substep[]>(isDemoMode ? demoSubsteps : [])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (isDemoMode) return
    const [stageRes, substepRes] = await Promise.all([
      supabase.from('stages').select('*').order('sort_order'),
      supabase.from('substeps').select('*').order('sort_order'),
    ])
    if (stageRes.error) setError(stageRes.error.message)
    else setStages(stageRes.data)
    if (substepRes.error) setError(substepRes.error.message)
    else setSubsteps(substepRes.data)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  return { stages, substeps, error, reload }
}

export function useAgents(tick: number) {
  const [agents, setAgents] = useState<AgentWithStages[]>(isDemoMode ? demoAgents : [])
  const [loading, setLoading] = useState(!isDemoMode)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (isDemoMode) return
    const { data, error: queryError } = await supabase
      .from('agents')
      .select('*, agent_stages(*)')
      .order('updated_at', { ascending: false })
    if (queryError) {
      setError(queryError.message)
      setAgents([])
    } else {
      setError(null)
      setAgents((data ?? []) as AgentWithStages[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  return { agents, loading, error, reload }
}

export function useAgentDetail(agentId: string | undefined, tick: number) {
  const [agent, setAgent] = useState<AgentWithStages | null>(null)
  const [substeps, setSubsteps] = useState<AgentSubstep[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    if (isDemoMode) {
      setAgent(demoAgents.find((row) => row.id === agentId) ?? null)
      setSubsteps(demoAgentSubsteps.filter((row) => row.agent_id === agentId))
      setComments(demoComments.filter((row) => row.agent_id === agentId))
      setLoading(false)
      return
    }

    const [agentRes, subRes, commentRes] = await Promise.all([
      supabase.from('agents').select('*, agent_stages(*)').eq('id', agentId).maybeSingle(),
      supabase.from('agent_substeps').select('*').eq('agent_id', agentId).order('sort_order'),
      supabase
        .from('comments')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false }),
    ])
    if (agentRes.error) setError(agentRes.error.message)
    else setAgent((agentRes.data as AgentWithStages | null) ?? null)
    if (subRes.error) setError(subRes.error.message)
    else setSubsteps(subRes.data ?? [])
    if (commentRes.error) setError(commentRes.error.message)
    else setComments(commentRes.data ?? [])
    setLoading(false)
  }, [agentId])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  return { agent, substeps, comments, loading, error, reload }
}

export function usePublicAgent(token: string | undefined, tick: number) {
  const [agent, setAgent] = useState<AgentWithStages | null>(null)
  const [substeps, setSubsteps] = useState<AgentSubstep[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    if (isDemoMode) {
      const match =
        demoAgents.find((row) => row.public_token === token || row.id === token) ?? null
      setAgent(match)
      setSubsteps(match ? demoAgentSubsteps.filter((row) => row.agent_id === match.id) : [])
      setComments(match ? demoComments.filter((row) => row.agent_id === match.id) : [])
      setLoading(false)
      return
    }

    const select = '*, agent_stages(*)'
    let agentRes = await supabase.from('agents').select(select).eq('public_token', token).maybeSingle()

    // Before the public_token migration the column is absent, so fall back to the request id.
    if ((agentRes.error || !agentRes.data) && isUuid(token)) {
      agentRes = await supabase.from('agents').select(select).eq('id', token).maybeSingle()
    }

    if (agentRes.error) {
      setError(agentRes.error.message)
      setAgent(null)
      setSubsteps([])
      setComments([])
      setLoading(false)
      return
    }

    const matched = (agentRes.data as AgentWithStages | null) ?? null
    if (!matched) {
      setError(null)
      setAgent(null)
      setSubsteps([])
      setComments([])
      setLoading(false)
      return
    }

    const [subRes, commentRes] = await Promise.all([
      supabase.from('agent_substeps').select('*').eq('agent_id', matched.id).order('sort_order'),
      supabase
        .from('comments')
        .select('*')
        .eq('agent_id', matched.id)
        .order('created_at', { ascending: false }),
    ])
    setAgent(matched)
    setError(subRes.error?.message ?? commentRes.error?.message ?? null)
    if (!subRes.error) setSubsteps(subRes.data ?? [])
    if (!commentRes.error) setComments(commentRes.data ?? [])
    setLoading(false)
  }, [token])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  return { agent, substeps, comments, loading, error, reload }
}

export function orderedAgentStages(
  agentStages: AgentStage[],
  stages: Stage[],
): Array<AgentStage & { stage: Stage }> {
  const byId = new Map(stages.map((s) => [s.id, s]))
  return [...agentStages]
    .map((row) => {
      const stage = byId.get(row.stage_id)
      return stage ? { ...row, stage } : null
    })
    .filter((row): row is AgentStage & { stage: Stage } => row !== null)
    .sort((a, b) => a.stage.sort_order - b.stage.sort_order)
}
