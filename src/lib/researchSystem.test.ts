import { describe, expect, it } from 'vitest'
import { buildResearchRun } from './researchSystem'

describe('buildResearchRun', () => {
  it('creates a full collaborative research workflow', () => {
    const run = buildResearchRun(
      'Should we automate support triage with autonomous agents?',
      'Executive decision brief',
      ['scout', 'analyst', 'skeptic', 'strategist'],
    )

    expect(run.retrievals.length).toBe(3)
    expect(run.memory.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        'research.goal',
        'research.topic',
        'evidence.primary_source',
        'decision.confidence',
      ]),
    )
    expect(run.toolCalls.map((item) => item.tool)).toEqual(
      expect.arrayContaining([
        'vector_search',
        'roi_calculator',
        'risk_matrix',
        'decision_writer',
      ]),
    )
    expect(run.recommendation.title).toBe('Proceed with a controlled pilot')
  })

  it('omits tool calls for inactive agents', () => {
    const run = buildResearchRun('Evaluate RAG quality controls', 'Technical plan', [
      'scout',
      'strategist',
    ])

    expect(run.toolCalls.map((item) => item.tool)).toEqual([
      'vector_search',
      'decision_writer',
    ])
    expect(run.agentFindings.map((item) => item.agentId)).toEqual(['scout', 'strategist'])
  })
})
