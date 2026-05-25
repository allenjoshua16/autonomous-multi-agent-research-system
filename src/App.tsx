import { useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSearch,
  GitBranch,
  Layers3,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import {
  AGENTS,
  SAMPLE_CORPUS,
  buildResearchRun,
  type AgentId,
  type ResearchRun,
} from './lib/researchSystem'
import './App.css'

const agentTone: Record<AgentId, string> = {
  scout: 'Retrieval',
  analyst: 'Analysis',
  skeptic: 'Risk',
  strategist: 'Decision',
}

function App() {
  const [topic, setTopic] = useState(
    'Should a mid-market SaaS company invest in autonomous support agents this quarter?',
  )
  const [objective, setObjective] = useState('Board-ready recommendation with risks and next actions')
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>([
    'scout',
    'analyst',
    'skeptic',
    'strategist',
  ])
  const [activeStep, setActiveStep] = useState(4)
  const [runs, setRuns] = useState<ResearchRun[]>(() => [
    buildResearchRun(
      'Should a mid-market SaaS company invest in autonomous support agents this quarter?',
      'Board-ready recommendation with risks and next actions',
      ['scout', 'analyst', 'skeptic', 'strategist'],
    ),
  ])

  const currentRun = runs[0]
  const visibleSteps = currentRun.timeline.slice(0, activeStep + 1)
  const activeAgentIds = useMemo(() => new Set(selectedAgents), [selectedAgents])

  function toggleAgent(agentId: AgentId) {
    setSelectedAgents((current) => {
      if (current.includes(agentId) && current.length > 2) {
        return current.filter((id) => id !== agentId)
      }
      if (!current.includes(agentId)) {
        return [...current, agentId]
      }
      return current
    })
  }

  function runWorkflow() {
    const nextRun = buildResearchRun(topic, objective, selectedAgents)
    setRuns((current) => [nextRun, ...current].slice(0, 4))
    setActiveStep(nextRun.timeline.length - 1)
  }

  return (
    <main className="app-shell">
      <section className="top-band">
        <div className="brand-mark">
          <Network size={28} />
        </div>
        <div>
          <p className="eyebrow">Autonomous Multi-agent Research System</p>
          <h1>Collaborative AI agents for RAG research, memory, tools, and decisions</h1>
        </div>
        <button className="primary-action" type="button" onClick={runWorkflow}>
          <Play size={18} />
          Run agents
        </button>
      </section>

      <section className="control-grid" aria-label="Research controls">
        <div className="query-panel">
          <label htmlFor="topic">Research question</label>
          <textarea
            id="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            rows={4}
          />
          <label htmlFor="objective">Decision objective</label>
          <input
            id="objective"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
        </div>

        <div className="agent-panel">
          <div className="panel-heading">
            <BrainCircuit size={18} />
            <h2>Agent team</h2>
          </div>
          <div className="agent-list">
            {AGENTS.map((agent) => (
              <button
                className={activeAgentIds.has(agent.id) ? 'agent-card selected' : 'agent-card'}
                key={agent.id}
                type="button"
                onClick={() => toggleAgent(agent.id)}
                aria-pressed={activeAgentIds.has(agent.id)}
              >
                <span className="agent-initial">{agent.name.charAt(0)}</span>
                <span>
                  <strong>{agent.name}</strong>
                  <small>{agentTone[agent.id]} agent</small>
                </span>
                {activeAgentIds.has(agent.id) && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="system-grid">
        <aside className="pipeline-panel">
          <div className="panel-heading">
            <GitBranch size={18} />
            <h2>Run pipeline</h2>
          </div>
          <div className="timeline">
            {currentRun.timeline.map((step, index) => (
              <button
                className={index <= activeStep ? 'timeline-step complete' : 'timeline-step'}
                key={step.title}
                type="button"
                onClick={() => setActiveStep(index)}
              >
                <span>{index + 1}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="brief-panel">
          <div className="brief-header">
            <div>
              <p className="eyebrow">Decision brief</p>
              <h2>{currentRun.recommendation.title}</h2>
            </div>
            <div className="confidence">
              <strong>{currentRun.confidence}%</strong>
              <span>confidence</span>
            </div>
          </div>

          <div className="status-strip">
            {visibleSteps.map((step) => (
              <span key={step.title}>
                <Activity size={14} />
                {step.title}
              </span>
            ))}
          </div>

          <p className="brief-summary">{currentRun.recommendation.summary}</p>

          <div className="insight-grid">
            {currentRun.agentFindings.map((finding) => (
              <article className="insight-card" key={finding.agentId}>
                <div>
                  <span className="agent-initial compact">
                    {AGENTS.find((agent) => agent.id === finding.agentId)?.name.charAt(0)}
                  </span>
                  <h3>{finding.heading}</h3>
                </div>
                <p>{finding.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="evidence-grid">
        <WorkspacePanel
          icon={<FileSearch size={18} />}
          title="RAG retrieval"
          items={currentRun.retrievals.map((item) => ({
            title: item.title,
            detail: `${item.relevance}% match · ${item.excerpt}`,
          }))}
        />
        <WorkspacePanel
          icon={<Database size={18} />}
          title="Shared memory"
          items={currentRun.memory.map((item) => ({
            title: item.key,
            detail: item.value,
          }))}
        />
        <WorkspacePanel
          icon={<Wrench size={18} />}
          title="Tool calls"
          items={currentRun.toolCalls.map((item) => ({
            title: item.tool,
            detail: `${item.agent}: ${item.result}`,
          }))}
        />
      </section>

      <section className="decision-grid">
        <div className="decision-panel">
          <div className="panel-heading">
            <ShieldCheck size={18} />
            <h2>Recommendation logic</h2>
          </div>
          {currentRun.recommendation.actions.map((action) => (
            <div className="action-row" key={action}>
              <ChevronRight size={17} />
              <span>{action}</span>
            </div>
          ))}
        </div>

        <div className="source-panel">
          <div className="panel-heading">
            <Layers3 size={18} />
            <h2>Knowledge base</h2>
          </div>
          <div className="source-list">
            {SAMPLE_CORPUS.map((source) => (
              <article key={source.id}>
                <strong>{source.title}</strong>
                <span>{source.type}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="history-panel">
          <div className="panel-heading">
            <Sparkles size={18} />
            <h2>Recent runs</h2>
          </div>
          {runs.map((run) => (
            <button
              className="history-item"
              key={run.id}
              type="button"
              onClick={() => {
                setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)])
                setActiveStep(run.timeline.length - 1)
              }}
            >
              <strong>{run.topic}</strong>
              <span>{run.confidence}% confidence</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function WorkspacePanel({
  icon,
  title,
  items,
}: {
  icon: ReactNode
  title: string
  items: Array<{ title: string; detail: string }>
}) {
  return (
    <div className="workspace-panel">
      <div className="panel-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="workspace-list">
        {items.map((item) => (
          <article key={`${title}-${item.title}`}>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export default App
