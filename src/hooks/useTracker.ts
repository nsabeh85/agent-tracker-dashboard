import { useCallback, useEffect, useState } from 'react'
import { isDemoMode, supabase } from '../lib/supabase'
import {
  demoAgentSubsteps,
  demoAgents,
  demoComments,
  demoDepartments,
  demoOwners,
  demoStages,
  demoSubsteps,
} from '../lib/demoData'
import { parsePublicAgent, type PublicAgent } from '../lib/tracking'
import type {
  AgentStage,
  AgentSubstep,
  AgentWithStages,
  Comment,
  Stage,
  Substep,
} from '../types/database'

const TRACKER_TABLES = [
  'agents',
  'agent_owners',
  'agent_stages',
  'agent_stage_owners',
  'agent_substeps',
  'comments',
  'departments',
  'owners',
] as const

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
  const [owners, setOwners] = useState(isDemoMode ? demoOwners : [])
  const [departments, setDepartments] = useState(isDemoMode ? demoDepartments : [])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (isDemoMode) return
    const [stageRes, substepRes, ownerRes, departmentRes] = await Promise.all([
      supabase.from('stages').select('*').order('sort_order'),
      supabase.from('substeps').select('*').order('sort_order'),
      supabase.from('owners').select('*').order('sort_order').order('full_name'),
      supabase.from('departments').select('*').order('sort_order').order('name'),
    ])
    if (stageRes.error) setError(stageRes.error.message)
    else setStages(stageRes.data)
    if (substepRes.error) setError(substepRes.error.message)
    else setSubsteps(substepRes.data)
    if (ownerRes.error) setError(ownerRes.error.message)
    else setOwners(ownerRes.data)
    if (departmentRes.error) setError(departmentRes.error.message)
    else setDepartments(departmentRes.data)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  return { stages, substeps, owners, departments, error, reload }
}

export function useAgents(tick: number) {
  const [agents, setAgents] = useState<AgentWithStages[]>(isDemoMode ? demoAgents : [])
  const [loading, setLoading] = useState(!isDemoMode)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (isDemoMode) return
    const { data, error: queryError } = await supabase
      .from('agents')
      .select(
        '*, agent_owners(owner_id, owner:owners(*)), agent_stages(*, agent_stage_owners(owner_id, owner:owners(*)))',
      )
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
      supabase
        .from('agents')
        .select(
          '*, agent_owners(owner_id, owner:owners(*)), agent_stages(*, agent_stage_owners(owner_id, owner:owners(*)))',
        )
        .eq('id', agentId)
        .maybeSingle(),
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

function toPublicAgent(
  agent: AgentWithStages,
  substeps: AgentSubstep[],
  comments: Comment[] = [],
): PublicAgent {
  return {
    title: agent.title,
    description: agent.description,
    source_url: agent.source_url,
    requester_name: agent.requester_name,
    requester_department: agent.requester_department,
    priority: agent.priority,
    status: agent.status,
    owners: agent.assigned_to,
    current_stage_id: agent.current_stage_id,
    target_go_live: agent.target_go_live,
    created_at: agent.created_at,
    stages: agent.agent_stages.map((row) => {
      const catalog = demoStages.find((stage) => stage.id === row.stage_id)
      return {
        id: row.id,
        stage_id: row.stage_id,
        name: catalog?.name ?? row.stage_id,
        sort_order: catalog?.sort_order ?? 0,
        status: row.status,
        expected_duration_days: row.expected_duration_days,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
      }
    }),
    substeps: substeps.map((step) => ({
      id: step.id,
      agent_stage_id: step.agent_stage_id,
      name: step.name,
      sort_order: step.sort_order,
      status: step.status,
    })),
    comments: comments.map((comment) => ({
      id: comment.id,
      author_name: comment.author_name,
      body: comment.body,
      created_at: comment.created_at,
      agent_stage_id: comment.agent_stage_id,
    })),
  }
}

export function usePublicAgent(token: string | undefined) {
  const [agent, setAgent] = useState<PublicAgent | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!token) {
      setAgent(null)
      setLoading(false)
      return
    }

    if (isDemoMode) {
      const match = demoAgents.find((row) => row.public_token === token) ?? null
      setAgent(
        match
          ? toPublicAgent(
              match,
              demoAgentSubsteps.filter((row) => row.agent_id === match.id),
              demoComments.filter((row) => row.agent_id === match.id),
            )
          : null,
      )
      setError(null)
      setLoading(false)
      return
    }

    const { data, error: rpcError } = await supabase.rpc('get_public_agent', {
      p_token: token,
    })
    if (rpcError) {
      setError(rpcError.message)
      setAgent(null)
      setLoading(false)
      return
    }
    setError(null)
    setAgent(parsePublicAgent(data))
    setLoading(false)
  }, [token])

  useEffect(() => {
    void reload()
  }, [reload])

  return { agent, loading, error, reload }
}

export function orderedAgentStages<T extends AgentStage>(
  agentStages: T[],
  stages: Stage[],
): Array<T & { stage: Stage }> {
  const byId = new Map(stages.map((s) => [s.id, s]))
  return [...agentStages]
    .map((row) => {
      const stage = byId.get(row.stage_id)
      return stage ? { ...row, stage } : null
    })
    .filter((row): row is T & { stage: Stage } => row !== null)
    .sort((a, b) => a.stage.sort_order - b.stage.sort_order)
}
