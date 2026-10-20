/** Generates a realistic-looking pipeline for the demo account. Deterministic, so screenshots stay stable. */
const PEOPLE = [
  ['Noa Levi', 'Levi Physio'], ['Daniel Cohen', 'Cohen & Co. Accounting'], ['Maya Friedman', 'Studio Flow Pilates'],
  ['Amit Shapiro', 'Shapiro Law'], ['Yael Mizrahi', 'Bright Smile Dental'], ['Omer Katz', 'Katz Realty'],
  ['Tamar Avraham', 'Avraham Nutrition'], ['Itai Ben David', 'North Fitness'], ['Shira Peretz', 'Peretz Design'],
  ['Eitan Golan', 'Golan Insurance'], ['Lior Biton', 'Biton Clinic'], ['Michal Dahan', 'Dahan Tax Advisors'],
  ['Roni Azulay', 'Urban Yoga TLV'], ['Gal Hadad', 'Hadad Home Renovations'], ['Neta Rosen', 'Rosen Family Law'],
  ['Yonatan Erez', 'Erez Properties'], ['Adi Weiss', 'Weiss Dermatology'], ['Ido Malka', 'Malka Moving'],
  ['Hila Barak', 'Barak Coaching'], ['Ofir Segal', 'Segal Accounting'], ['Dana Klein', 'Klein Speech Therapy'],
  ['Ariel Nachmani', 'Nachmani Media'], ['Keren Oz', 'Oz Boutique'], ['Avi Tal', 'Tal Electric'],
  ['Inbar Shalev', 'Shalev Vet Clinic'], ['Yuval Amar', 'Amar Real Estate'],
]
const MESSAGES = [
  'Inquiries from our website get lost between WhatsApp and email. Can you help?',
  'Looking for automatic appointment reminders for our patients.',
  'We want every new lead to get a reply within minutes, even after hours.',
  'Need a simple CRM for our small office. Is a call possible this week?',
  'Interested in syncing our forms with Google Sheets and sending confirmations.',
  'Can you connect our Facebook lead ads to a follow-up sequence?',
]
const SOURCES = ['website', 'website', 'website', 'make', 'facebook', 'referral', 'instagram', 'webhook']
const PLAN = ['new', 'new', 'new', 'new', 'new', 'contacted', 'contacted', 'contacted', 'contacted', 'qualified', 'qualified', 'qualified',
  'proposal', 'proposal', 'proposal', 'won', 'won', 'won', 'won', 'lost', 'lost', 'contacted', 'new', 'qualified', 'won', 'proposal']
const VALUES = [0, 1800, 2500, 3200, 4500, 6000, 900, 1200]

const HOUR = 3600 * 1000

export function buildDemoLeads(ownerId, now = new Date()) {
  return PEOPLE.map(([name, company], i) => {
    const status = PLAN[i % PLAN.length]
    const createdAt = new Date(now.getTime() - ((i * 37) % 20) * 24 * HOUR - (i % 7) * 3 * HOUR - 2 * HOUR)
    const contacted = status !== 'new'
    const firstContactAt = contacted ? new Date(createdAt.getTime() + (0.4 + (i % 5) * 1.3) * HOUR) : null
    const statusChangedAt = contacted ? new Date(firstContactAt.getTime() + (i % 4) * 20 * HOUR) : createdAt
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '.')
    const activity = [{ type: 'created', source: SOURCES[i % SOURCES.length], at: createdAt }]
    if (contacted) activity.push({ type: 'status', from: 'new', to: status, at: statusChangedAt })
    const notes = contacted ? [{ _id: `n${i}`, text: i % 2 ? 'Called, sending a short proposal.' : 'Intro call booked for Thursday.', by: 'Demo User', at: firstContactAt }] : []
    return {
      ownerId,
      name,
      email: `${slug}@example.com`,
      phone: `05${(i % 9) + 1}-${String(4100000 + i * 7919).slice(0, 7)}`,
      company,
      message: MESSAGES[i % MESSAGES.length],
      page: '',
      utm: i % 3 === 0 ? { source: 'google', medium: 'cpc', campaign: 'clinics-q4' } : {},
      value: ['qualified', 'proposal', 'won'].includes(status) ? VALUES[(i % (VALUES.length - 1)) + 1] : 0,
      source: SOURCES[i % SOURCES.length],
      status,
      tags: i % 4 === 0 ? ['hot'] : [],
      notes,
      activity,
      createdAt,
      updatedAt: statusChangedAt,
      statusChangedAt,
      firstContactAt,
    }
  })
}

/** Wipes the demo account's leads and loads a fresh pipeline. */
export async function resetDemo(store, user) {
  await store.deleteLeadsByOwner(user._id)
  await store.insertLeads(buildDemoLeads(user._id))
}
