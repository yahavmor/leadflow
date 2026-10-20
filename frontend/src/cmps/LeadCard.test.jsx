import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadCard, StatusBadge } from './LeadCard'

const lead = {
  _id: '1',
  name: 'Noa Levi',
  company: 'Levi Physio',
  source: 'make',
  status: 'qualified',
  value: 3200,
  tags: ['hot'],
  createdAt: new Date().toISOString(),
}

describe('LeadCard', () => {
  test('shows the main details', () => {
    render(<LeadCard lead={lead} />)
    expect(screen.getByText('Noa Levi')).toBeInTheDocument()
    expect(screen.getByText('Levi Physio')).toBeInTheDocument()
    expect(screen.getByText('Make')).toBeInTheDocument()
    expect(screen.getByText('Hot')).toBeInTheDocument()
    expect(screen.getByText('₪3,200')).toBeInTheDocument()
    expect(screen.getByText('NL')).toBeInTheDocument()
  })

  test('falls back to the email when there is no name', () => {
    render(<LeadCard lead={{ ...lead, name: '', email: 'x@example.com', value: 0, tags: [] }} />)
    expect(screen.getByText('x@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Hot')).toBeNull()
  })

  test('status badge uses the stage label', () => {
    render(<StatusBadge status="proposal" />)
    expect(screen.getByText('Proposal')).toBeInTheDocument()
  })
})
