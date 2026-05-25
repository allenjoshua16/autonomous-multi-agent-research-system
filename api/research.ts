import {
  AGENTS,
  SAMPLE_CORPUS,
  buildResearchRun,
  type AgentId,
  type ResearchRun,
} from '../src/lib/researchSystem'

type ResearchRequest = {
  topic?: unknown
  objective?: unknown
  selectedAgents?: unknown
}

type JsonResponse = {
  status: number
  body: unknown
}

const openAiResponsesUrl = 'https://api.openai.com/v1/responses'
const defaultModel = 'gpt-5.4-mini'

const agentIds = new Set(AGENTS.map((agent) => agent.id))

export async function createResearchResponse(payload: ResearchRequest): Promise<JsonResponse> {
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : ''
  const objective = typeof payload.objective === 'string' ? payload.objective.trim() : ''
  const selectedAgents = normalizeAgents(payload.selectedAgents)

  if (!topic || !objective) {
    return {
      status: 400,
      body: { error: 'Research question and decision objective are required.' },
    }
  }

  const localRun = buildResearchRun(topic, objective, selectedAgents)
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: 'OPENAI_API_KEY is not configured. Using local simulation fallback.',
        fallbackRun: localRun,
      },
    }
  }

  try {
    const model = process.env.OPENAI_MODEL || defaultModel
    const response = await fetch(openAiResponsesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content:
              'You are an autonomous multi-agent research orchestrator. Return only valid JSON that matches the requested schema. Keep recommendations practical, cautious, and evidence-linked.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              topic,
              objective,
              selectedAgents,
              availableAgents: AGENTS,
              knowledgeBase: SAMPLE_CORPUS,
              localBaseline: localRun,
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'research_run',
            strict: true,
            schema: researchRunSchema,
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        status: response.status,
        body: {
          error: 'OpenAI request failed. Using local simulation fallback.',
          detail: errorText.slice(0, 600),
          fallbackRun: localRun,
        },
      }
    }

    const data = (await response.json()) as OpenAiResponse
    const parsedRun = parseResearchRun(data, localRun)

    return {
      status: 200,
      body: {
        run: {
          ...parsedRun,
          id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
          mode: 'ai',
          topic,
          objective,
        },
        model,
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        error: 'AI research failed. Using local simulation fallback.',
        detail: error instanceof Error ? error.message : 'Unknown error',
        fallbackRun: localRun,
      },
    }
  }
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const result = await createResearchResponse(req.body as ResearchRequest)
  res.status(result.status).json(result.body)
}

function normalizeAgents(value: unknown): AgentId[] {
  if (!Array.isArray(value)) return ['scout', 'analyst', 'skeptic', 'strategist']

  const validAgents = value.filter((agent): agent is AgentId => {
    return typeof agent === 'string' && agentIds.has(agent as AgentId)
  })

  return validAgents.length >= 2 ? validAgents : ['scout', 'analyst', 'skeptic', 'strategist']
}

function parseResearchRun(data: OpenAiResponse, fallbackRun: ResearchRun): ResearchRun {
  const outputText =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? '')
      .join('')

  if (!outputText) return fallbackRun

  const parsed = JSON.parse(outputText) as ResearchRun
  return {
    ...fallbackRun,
    ...parsed,
    mode: 'ai',
    retrievals: parsed.retrievals?.length ? parsed.retrievals : fallbackRun.retrievals,
    memory: parsed.memory?.length ? parsed.memory : fallbackRun.memory,
    toolCalls: parsed.toolCalls?.length ? parsed.toolCalls : fallbackRun.toolCalls,
    agentFindings: parsed.agentFindings?.length ? parsed.agentFindings : fallbackRun.agentFindings,
    recommendation: parsed.recommendation ?? fallbackRun.recommendation,
    timeline: fallbackRun.timeline,
  }
}

type OpenAiResponse = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
    }>
  }>
}

type VercelRequestLike = {
  method?: string
  body?: unknown
}

type VercelResponseLike = {
  status: (code: number) => {
    json: (body: unknown) => void
  }
}

const researchRunSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'mode',
    'topic',
    'objective',
    'confidence',
    'retrievals',
    'memory',
    'toolCalls',
    'agentFindings',
    'recommendation',
    'timeline',
  ],
  properties: {
    id: { type: 'string' },
    mode: { type: 'string', enum: ['ai'] },
    topic: { type: 'string' },
    objective: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    retrievals: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'excerpt', 'relevance'],
        properties: {
          title: { type: 'string' },
          excerpt: { type: 'string' },
          relevance: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
    memory: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'value'],
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    toolCalls: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['agent', 'tool', 'result'],
        properties: {
          agent: { type: 'string' },
          tool: { type: 'string' },
          result: { type: 'string' },
        },
      },
    },
    agentFindings: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['agentId', 'heading', 'detail'],
        properties: {
          agentId: { type: 'string', enum: ['scout', 'analyst', 'skeptic', 'strategist'] },
          heading: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'summary', 'actions'],
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        actions: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: { type: 'string' },
        },
      },
    },
    timeline: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
  },
} as const
