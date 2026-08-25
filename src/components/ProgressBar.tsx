import { Fragment } from 'react'
import { CheckIcon, StageIcon } from './StageIcon'
import { progressTone } from '../lib/schedule'
import type { AgentStatus, Stage } from '../types/database'

type Props = {
  stages: Stage[]
  currentStageId: string
  agentStatus: AgentStatus
  size?: 'sm' | 'lg'
  compactCurrentLabel?: boolean
}

export function ProgressBar({
  stages,
  currentStageId,
  agentStatus,
  size = 'sm',
  compactCurrentLabel = false,
}: Props) {
  const ordered = [...stages].sort((a, b) => a.sort_order - b.sort_order)
  if (ordered.length === 0) return null

  const current = ordered.find((s) => s.id === currentStageId)
  const currentOrder = current?.sort_order ?? 0
  const finished = agentStatus === 'complete'
  const currentIndex = ordered.findIndex((s) => s.id === currentStageId)
  const stalled = agentStatus === 'on_hold' || agentStatus === 'cancelled'

  const large = size === 'lg'
  const nodeSize = large ? 'h-11 w-11' : 'h-7 w-7'
  const glyph = large ? 'h-5 w-5' : 'h-3.5 w-3.5'
  const railHeight = large ? 'h-2' : 'h-1.5'

  return (
    <div className="min-w-0">
      <div className="flex items-center">
        {ordered.map((stage, index) => {
          const tone = progressTone(stage.sort_order, currentOrder, finished)
          const connectorDone = finished || index <= currentIndex
          const connectorLive = !finished && !stalled && index === currentIndex + 1

          return (
            <Fragment key={stage.id}>
              {index > 0 ? (
                <div className={`${railHeight} min-w-2 flex-1`}>
                  <div
                    className={[
                      'rail transition-colors duration-500',
                      connectorDone ? 'rail-done' : '',
                      connectorLive ? 'rail-live' : '',
                    ].join(' ')}
                  />
                </div>
              ) : null}
              <div
                title={stage.name}
                className={[
                  'relative flex shrink-0 items-center justify-center rounded-full transition-all duration-500',
                  nodeSize,
                  tone === 'complete'
                    ? 'bg-brand-600 text-white shadow-brand-600/25 shadow-lg'
                    : '',
                  tone === 'current' && !stalled
                    ? 'node-live bg-brand-500 text-white shadow-brand-500/30 shadow-lg'
                    : '',
                  tone === 'current' && stalled ? 'bg-ink-400 text-white' : '',
                  tone === 'upcoming'
                    ? 'border-ink-200 bg-white text-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-600 border-2'
                    : '',
                ].join(' ')}
              >
                {tone === 'complete' ? (
                  <CheckIcon className={`${glyph} pop`} />
                ) : (
                  <StageIcon index={index} className={glyph} />
                )}
              </div>
            </Fragment>
          )
        })}
      </div>

      <div className={`mt-2 ${large ? 'text-sm' : 'text-xs'}`}>
        {compactCurrentLabel ? (
          <p className="text-brand-700 dark:text-brand-300 font-semibold md:hidden">
            {finished ? 'Complete' : (current?.name ?? '—')}
          </p>
        ) : null}
        <div
          className={compactCurrentLabel ? 'hidden gap-1 md:grid' : 'grid gap-1'}
          style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))` }}
        >
          {ordered.map((stage) => {
            const tone = progressTone(stage.sort_order, currentOrder, finished)
            return (
              <p
                key={stage.id}
                className={[
                  'truncate text-center transition-colors',
                  tone === 'current' ? 'text-brand-700 dark:text-brand-300 font-bold' : '',
                  tone === 'complete' ? 'text-ink-600 dark:text-ink-300 font-medium' : '',
                  tone === 'upcoming' ? 'text-ink-400 dark:text-ink-500' : '',
                ].join(' ')}
              >
                {stage.name}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}
