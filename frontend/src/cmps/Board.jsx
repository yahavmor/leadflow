import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import { LeadCard } from './LeadCard'
import { moveLead } from '../store/leadsSlice'
import { toastAdded } from '../store/uiSlice'
import { STATUSES, STATUS, money } from '../utils/format'

const FRESH_MS = 2 * 60 * 1000

function DraggableCard({ lead, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead._id, data: { lead } })
  const fresh = Date.now() - new Date(lead.createdAt).getTime() < FRESH_MS
  return (
    <LeadCard
      ref={setNodeRef}
      lead={lead}
      fresh={fresh}
      dragging={isDragging}
      role="button"
      aria-roledescription="draggable lead"
      aria-label={`${lead.name}, ${STATUS[lead.status].label}. Press space to move, enter to open.`}
      onClick={() => onOpen(lead._id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(lead._id) }}
      {...attributes}
      {...listeners}
    />
  )
}

function Column({ status, leads, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  const total = leads.reduce((sum, l) => sum + (l.value || 0), 0)
  return (
    <section ref={setNodeRef} className={`column${isOver ? ' over' : ''}`} aria-label={`${status.label} column`}>
      <header className="column-head">
        <span className="dot" style={{ background: status.color }} />
        <h2>{status.label}</h2>
        <span className="count">{leads.length}</span>
        {total > 0 && <span className="sum">{money(total)}</span>}
      </header>
      <div className="column-list">
        {leads.map((lead) => <DraggableCard key={lead._id} lead={lead} onOpen={onOpen} />)}
        {!leads.length && <div className="column-empty">Drop a lead here</div>}
      </div>
    </section>
  )
}

export function Board({ leads, onOpen }) {
  const dispatch = useDispatch()
  const [active, setActive] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(STATUSES.map((s) => [s.id, []]))
    for (const lead of leads) groups[lead.status]?.push(lead)
    for (const list of Object.values(groups)) list.sort((a, b) => new Date(b.statusChangedAt) - new Date(a.statusChangedAt))
    return groups
  }, [leads])

  const onDragEnd = ({ active: a, over }) => {
    setActive(null)
    const lead = a.data.current?.lead
    if (!over || !lead || over.id === lead.status) return
    dispatch(moveLead({ id: lead._id, status: over.id }))
      .unwrap()
      .catch((err) => dispatch(toastAdded({ kind: 'error', text: `Could not move the lead: ${err.message}` })))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active: a }) => setActive(a.data.current?.lead)}
      onDragCancel={() => setActive(null)}
      onDragEnd={onDragEnd}
    >
      <div className="board">
        {STATUSES.map((s) => <Column key={s.id} status={s} leads={byStatus[s.id]} onOpen={onOpen} />)}
      </div>
      <DragOverlay dropAnimation={null}>{active ? <LeadCard lead={active} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}
