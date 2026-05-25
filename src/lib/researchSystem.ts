export type AgentId = 'scout' | 'analyst' | 'skeptic' | 'strategist'

export type Agent = {
  id: AgentId
  name: string
  mission: string
}

export type CorpusSource = {
  id: string
  title: string
  type: string
  content: string
  tags: string[]
}

export type Retrieval = {
  title: string
  excerpt: string
  relevance: number
}

export type MemoryItem = {
  key: string
  value: string
}

export type ToolCall = {
  agent: string
  tool: string
  result: string
}

export type AgentFinding = {
  agentId: AgentId
  heading: string
  detail: string
}

export type ResearchRun = {
  id: string
  mode: 'local' | 'ai'
  topic: string
  objective: string
  confidence: number
  retrievals: Retrieval[]
  memory: MemoryItem[]
  toolCalls: ToolCall[]
  agentFindings: AgentFinding[]
  recommendation: {
    title: string
    summary: string
    actions: string[]
  }
  timeline: Array<{ title: string; detail: string }>
}

export const AGENTS: Agent[] = [
  {
    id: 'scout',
    name: 'Scout',
    mission: 'Retrieves relevant evidence from internal and external knowledge.',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    mission: 'Compares evidence, quantifies tradeoffs, and extracts operating signals.',
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    mission: 'Challenges assumptions, identifies failure modes, and requests missing proof.',
  },
  {
    id: 'strategist',
    name: 'Strategist',
    mission: 'Turns research into a decision, sequence, and ownership model.',
  },
]

export const SAMPLE_CORPUS: CorpusSource[] = [
  {
    id: 'support-benchmark',
    title: 'Support Automation Benchmark',
    type: 'Market report',
    content:
      'Companies adopting support agents see the best results when they start with narrow high-volume workflows, connect the agent to trusted knowledge, and use human review for edge cases.',
    tags: ['support', 'automation', 'agent', 'workflow'],
  },
  {
    id: 'rag-playbook',
    title: 'RAG Quality Playbook',
    type: 'Architecture note',
    content:
      'Reliable retrieval augmented generation depends on source freshness, chunk quality, citations, observability, and evaluation sets that include common and adversarial questions.',
    tags: ['rag', 'retrieval', 'quality', 'evaluation'],
  },
  {
    id: 'memory-patterns',
    title: 'Agent Memory Patterns',
    type: 'Engineering memo',
    content:
      'Durable memory should separate user preferences, workflow state, source summaries, and decisions. Every write needs provenance, expiry, and a clear reason for reuse.',
    tags: ['memory', 'agents', 'governance', 'state'],
  },
  {
    id: 'tool-safety',
    title: 'Tool Calling Safety Review',
    type: 'Risk review',
    content:
      'Tool-enabled agents require scoped permissions, audit logs, confirmation thresholds, retry policies, and sandboxed execution for irreversible operations.',
    tags: ['tools', 'risk', 'governance', 'audit'],
  },
  {
    id: 'roi-model',
    title: 'Automation ROI Model',
    type: 'Finance model',
    content:
      'Automation projects become attractive when deflection saves more than integration, monitoring, evaluation, and exception handling costs over two quarters.',
    tags: ['roi', 'finance', 'decision', 'automation'],
  },
]

const agentNames: Record<AgentId, string> = {
  scout: 'Scout',
  analyst: 'Analyst',
  skeptic: 'Skeptic',
  strategist: 'Strategist',
}

export function buildResearchRun(
  topic: string,
  objective: string,
  selectedAgents: AgentId[],
): ResearchRun {
  const normalizedTopic = topic.trim() || 'Untitled research question'
  const normalizedObjective = objective.trim() || 'Clear decision recommendation'
  const retrievals = retrieveSources(normalizedTopic)
  const confidence = scoreConfidence(selectedAgents, retrievals)
  const memory = buildMemory(normalizedTopic, normalizedObjective, retrievals, confidence)
  const toolCalls = buildToolCalls(selectedAgents, retrievals, confidence)
  const agentFindings = buildAgentFindings(selectedAgents, retrievals, confidence)

  return {
    id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
    mode: 'local',
    topic: normalizedTopic,
    objective: normalizedObjective,
    confidence,
    retrievals,
    memory,
    toolCalls,
    agentFindings,
    recommendation: buildRecommendation(normalizedTopic, normalizedObjective, confidence),
    timeline: [
      {
        title: 'Plan',
        detail: 'Break question into retrieval, analysis, risk, and decision tasks.',
      },
      {
        title: 'Retrieve',
        detail: 'Rank corpus sources and extract evidence snippets for the active agents.',
      },
      {
        title: 'Remember',
        detail: 'Write reusable facts, assumptions, and decision context to shared memory.',
      },
      {
        title: 'Call tools',
        detail: 'Run search, calculator, evaluator, and policy checks with audit output.',
      },
      {
        title: 'Decide',
        detail: 'Merge agent findings into an accountable recommendation.',
      },
    ],
  }
}

function retrieveSources(topic: string): Retrieval[] {
  const queryTerms = tokenize(topic)

  return SAMPLE_CORPUS.map((source) => {
    const searchable = tokenize(`${source.title} ${source.content} ${source.tags.join(' ')}`)
    const overlap = queryTerms.filter((term) => searchable.includes(term)).length
    const relevance = Math.min(98, 54 + overlap * 11 + source.tags.length)

    return {
      title: source.title,
      excerpt: source.content,
      relevance,
    }
  })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 3)
}

function scoreConfidence(selectedAgents: AgentId[], retrievals: Retrieval[]) {
  const teamCoverage = Math.min(24, selectedAgents.length * 6)
  const evidenceStrength = Math.round(
    retrievals.reduce((sum, item) => sum + item.relevance, 0) / Math.max(1, retrievals.length) / 2,
  )
  return Math.min(94, 28 + teamCoverage + evidenceStrength)
}

function buildMemory(
  topic: string,
  objective: string,
  retrievals: Retrieval[],
  confidence: number,
): MemoryItem[] {
  return [
    {
      key: 'research.goal',
      value: objective,
    },
    {
      key: 'research.topic',
      value: topic,
    },
    {
      key: 'evidence.primary_source',
      value: retrievals[0]?.title ?? 'No matching source',
    },
    {
      key: 'decision.confidence',
      value: `${confidence}% based on team coverage and evidence relevance`,
    },
  ]
}

function buildToolCalls(
  selectedAgents: AgentId[],
  retrievals: Retrieval[],
  confidence: number,
): ToolCall[] {
  const calls: ToolCall[] = []

  if (selectedAgents.includes('scout')) {
    calls.push({
      agent: 'Scout',
      tool: 'vector_search',
      result: `Retrieved ${retrievals.length} high-signal documents from the knowledge base.`,
    })
  }
  if (selectedAgents.includes('analyst')) {
    calls.push({
      agent: 'Analyst',
      tool: 'roi_calculator',
      result: `Estimated evidence strength supports a ${confidence}% decision confidence score.`,
    })
  }
  if (selectedAgents.includes('skeptic')) {
    calls.push({
      agent: 'Skeptic',
      tool: 'risk_matrix',
      result: 'Flagged permission scope, evaluation coverage, and exception handling as controls.',
    })
  }
  if (selectedAgents.includes('strategist')) {
    calls.push({
      agent: 'Strategist',
      tool: 'decision_writer',
      result: 'Converted findings into phased recommendation and accountable next actions.',
    })
  }

  return calls
}

function buildAgentFindings(
  selectedAgents: AgentId[],
  retrievals: Retrieval[],
  confidence: number,
): AgentFinding[] {
  return selectedAgents.map((agentId) => {
    if (agentId === 'scout') {
      return {
        agentId,
        heading: 'Evidence is strongest around constrained workflows',
        detail: `${agentNames[agentId]} found "${retrievals[0]?.title}" as the strongest match and prioritized sources with operational controls.`,
      }
    }
    if (agentId === 'analyst') {
      return {
        agentId,
        heading: 'The business case depends on deflection quality',
        detail: `${agentNames[agentId]} recommends measuring saved effort against integration, evaluation, and escalation costs before scaling.`,
      }
    }
    if (agentId === 'skeptic') {
      return {
        agentId,
        heading: 'Governance is the main adoption risk',
        detail: `${agentNames[agentId]} requires scoped tool permissions, auditability, and human approval for irreversible actions.`,
      }
    }
    return {
      agentId,
      heading: 'Proceed through a staged operating model',
      detail: `${agentNames[agentId]} would launch a bounded pilot, review confidence at ${confidence}%, and expand only after evaluation passes.`,
    }
  })
}

function buildRecommendation(topic: string, objective: string, confidence: number) {
  const shouldProceed = confidence >= 72
  return {
    title: shouldProceed ? 'Proceed with a controlled pilot' : 'Delay broad rollout until evidence improves',
    summary: `${objective}: for "${topic}", the agent team recommends ${
      shouldProceed ? 'a scoped deployment with measurement gates' : 'more discovery before production commitment'
    }. The conclusion is grounded in retrieved evidence, shared memory, tool-call checks, and cross-agent critique.`,
    actions: shouldProceed
      ? [
          'Select one high-volume, low-risk workflow with a documented escalation path.',
          'Build a RAG index from approved knowledge and evaluate it against real support questions.',
          'Enable tool-calling behind permission scopes, audit logs, and human confirmation thresholds.',
          'Review pilot metrics after two operating cycles before expanding scope.',
        ]
      : [
          'Collect stronger workflow volume, cost, and failure-mode evidence.',
          'Create an evaluation set before connecting tools or writing durable memory.',
          'Run a smaller agent-in-the-loop simulation before production exposure.',
        ],
  }
}
