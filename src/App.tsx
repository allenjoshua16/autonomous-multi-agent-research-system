import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileJson,
  Gauge,
  KeyRound,
  Loader2,
  RefreshCcw,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import './App.css'

type AgentAnswer = {
  summary: string
  reasoning: string[]
  actions: string[]
  risk_level: 'low' | 'medium' | 'high'
  confidence: number
}

type AgentStep = {
  name: string
  status: 'ok' | 'fallback' | 'error'
  detail: string
  latency_ms: number
}

type AgentRunResponse = {
  run_id: string
  cached: boolean
  fallback_used: boolean
  answer: AgentAnswer
  steps: AgentStep[]
  token_usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
  }
  latency_ms: number
  created_at: string
}

const examples = [
  'Create a production rollout plan for a customer-support AI agent.',
  'Evaluate cost and latency risks for an LLM API used by 10,000 users.',
  'Design observability metrics for a multi-user AI backend service.',
]

function App() {
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8000')
  const [apiKey, setApiKey] = useState('local-dev-key')
  const [prompt, setPrompt] = useState(examples[0])
  const [result, setResult] = useState<AgentRunResponse | null>(null)
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [showJson, setShowJson] = useState(false)

  const statusLabel = useMemo(() => {
    if (!result) return 'Ready'
    if (result.fallback_used) return 'Fallback response'
    if (result.cached) return 'Cached response'
    return 'Live model response'
  }, [result])

  async function runAgent(event?: FormEvent) {
    event?.preventDefault()
    setError('')
    setIsRunning(true)

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/v1/agent/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Request failed with ${response.status}`)
      }

      const data = (await response.json()) as AgentRunResponse
      setResult(data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Request failed')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div className="hero-copy">
          <div className="product-mark">
            <Bot size={30} />
          </div>
          <p className="eyebrow">Production Agentic AI Backend</p>
          <h1>Run, monitor, and inspect AI agent requests from one web console.</h1>
          <p className="hero-subtitle">
            Send prompts to the FastAPI service, see structured answers, track latency and token
            cost, and confirm caching, fallback handling, and observability behavior.
          </p>
        </div>

        <div className="status-panel" aria-label="Service quick links">
          <StatusItem icon={<Server size={18} />} label="API" value={apiUrl} />
          <StatusItem icon={<ShieldCheck size={18} />} label="Auth" value="X-API-Key required" />
          <StatusItem icon={<Gauge size={18} />} label="State" value={statusLabel} />
          <div className="quick-links">
            <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">
              API docs
            </a>
            <a href={`${apiUrl}/metrics`} target="_blank" rel="noreferrer">
              Metrics
            </a>
            <a href={`${apiUrl}/healthz`} target="_blank" rel="noreferrer">
              Health
            </a>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <form className="request-panel" onSubmit={runAgent}>
          <div className="panel-heading">
            <Sparkles size={19} />
            <h2>Agent request</h2>
          </div>

          <div className="connection-grid">
            <label>
              <span>Backend URL</span>
              <input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} />
            </label>
            <label>
              <span>API key</span>
              <div className="key-input">
                <KeyRound size={17} />
                <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
              </div>
            </label>
          </div>

          <label className="prompt-field">
            <span>Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              placeholder="Ask the agent to plan, evaluate, summarize, or troubleshoot..."
            />
          </label>

          <div className="example-row" aria-label="Prompt examples">
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => setPrompt(example)}>
                {example}
              </button>
            ))}
          </div>

          <button className="primary-action" type="submit" disabled={isRunning || !prompt.trim()}>
            {isRunning ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            {isRunning ? 'Running agent' : 'Run agent'}
          </button>

          {error && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </form>

        <section className="answer-panel" aria-live="polite">
          <div className="panel-heading split">
            <div>
              <Activity size={19} />
              <h2>Agent response</h2>
            </div>
            <button className="secondary-action" type="button" onClick={() => setShowJson((v) => !v)}>
              <FileJson size={17} />
              {showJson ? 'Hide JSON' : 'Show JSON'}
            </button>
          </div>

          {!result ? (
            <div className="empty-state">
              <Bot size={42} />
              <h3>No run yet</h3>
              <p>Submit a prompt to see the backend response, timing, cache status, and steps.</p>
            </div>
          ) : (
            <div className="response-stack">
              <div className={`run-state ${result.fallback_used ? 'fallback' : 'ok'}`}>
                {result.fallback_used ? <RefreshCcw size={18} /> : <CheckCircle2 size={18} />}
                <span>{statusLabel}</span>
              </div>

              <h3>{result.answer.summary}</h3>

              <MetricGrid result={result} />

              <ResponseList title="Reasoning" items={result.answer.reasoning} />
              <ResponseList title="Recommended actions" items={result.answer.actions} />

              <div className="step-list">
                <h3>Execution steps</h3>
                {result.steps.map((step) => (
                  <article key={`${step.name}-${step.latency_ms}`}>
                    <strong>{step.name}</strong>
                    <span>{step.status}</span>
                    <p>{step.detail}</p>
                    <small>{step.latency_ms.toFixed(1)} ms</small>
                  </article>
                ))}
              </div>

              {showJson && <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

function MetricGrid({ result }: { result: AgentRunResponse }) {
  const metrics = [
    {
      icon: <Clock3 size={18} />,
      label: 'Latency',
      value: `${result.latency_ms.toFixed(0)} ms`,
    },
    {
      icon: <Database size={18} />,
      label: 'Cache',
      value: result.cached ? 'Hit' : 'Miss',
    },
    {
      icon: <BarChart3 size={18} />,
      label: 'Tokens',
      value: result.token_usage.total_tokens.toLocaleString(),
    },
    {
      icon: <Gauge size={18} />,
      label: 'Cost',
      value: `$${result.token_usage.estimated_cost_usd.toFixed(6)}`,
    },
  ]

  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <article key={metric.label}>
          {metric.icon}
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </div>
  )
}

function ResponseList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="response-list">
      <h3>{title}</h3>
      {items.map((item) => (
        <div key={item} className="response-row">
          <CheckCircle2 size={17} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

function StatusItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="status-item">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
