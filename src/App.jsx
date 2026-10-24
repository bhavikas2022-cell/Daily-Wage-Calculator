import { useState, useEffect, useRef } from 'react'
import telephoneData from 'country-telephone-data'
import './App.css'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COUNTRIES = telephoneData.allCountries
const TITLES = {
  Manager: 1500,
  'Jr. Manager': 1000,
  Clerk: 800,
  'Sales Executive': 500,
}

const defaultDays = [true, true, true, true, true, false, false]

function createProfileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  phoneCountry: 'in',
  phoneCode: '91',
  address: '',
  title: 'Manager',
  salary: '1500',
  period: 'day',
  hours: '8',
  days: [...defaultDays],
}

function normalizeProfile(profile) {
  const validTitle = TITLES[profile?.title] ? profile.title : 'Manager'
  const validSalary = Number(profile?.salary)
  const validHours = Number(profile?.hours)
  const normalizedDays = Array.isArray(profile?.days) && profile.days.length === 7
    ? profile.days.map((day) => Boolean(day))
    : [...defaultDays]

  return {
    ...emptyForm,
    ...profile,
    id: profile?.id || createProfileId(),
    name: typeof profile?.name === 'string' ? profile.name : '',
    email: typeof profile?.email === 'string' ? profile.email : '',
    phone: typeof profile?.phone === 'string' ? profile.phone : '',
    phoneCountry: typeof profile?.phoneCountry === 'string' ? profile.phoneCountry : 'in',
    phoneCode: typeof profile?.phoneCode === 'string' ? profile.phoneCode : '91',
    address: typeof profile?.address === 'string' ? profile.address : '',
    title: validTitle,
    salary: Number.isFinite(validSalary) && validSalary > 0 ? validSalary : TITLES[validTitle],
    period: profile?.period === 'week' || profile?.period === 'month' ? profile.period : 'day',
    hours: Number.isFinite(validHours) && validHours > 0 ? validHours : 8,
    days: normalizedDays,
    doj: isoToDmy(profile?.doj),
    dop: isoToDmy(profile?.dop),
    leaves: Number(profile?.leaves) || 0,
  }
}

/* ---------- date helpers (dd-mm-yyyy) ---------- */
function isoToDmy(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v || ''
}

function parseDmy(str) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(str || '')
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  if (y < 1900) return null
  const t = Date.UTC(y, mo - 1, d)
  const c = new Date(t)
  if (
    c.getUTCFullYear() !== y ||
    c.getUTCMonth() !== mo - 1 ||
    c.getUTCDate() !== d
  )
    return null
  return t
}

function dmyToIso(str) {
  return parseDmy(str) === null
    ? ''
    : `${str.slice(6)}-${str.slice(3, 5)}-${str.slice(0, 2)}`
}

function dailyRate(p) {
  const workingDays = p.days.filter(Boolean).length || 1
  if (p.period === 'day') return p.salary
  if (p.period === 'week') return p.salary / workingDays
  return p.salary / (workingDays * (52 / 12)) // month
}

const money = (n) =>
  '₹ ' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

/* ---------- date input with visible calendar button ---------- */
function DateField({ value, onChange }) {
  const pickerRef = useRef(null)

  const handleText = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length > 4)
      out = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4)
    else if (digits.length > 2) out = digits.slice(0, 2) + '-' + digits.slice(2)
    onChange(out)
  }

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }

  const handlePicked = (e) => {
    if (e.target.value) onChange(isoToDmy(e.target.value))
  }

  return (
    <div className="date-field">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        value={value}
        onChange={handleText}
      />
      <button
        type="button"
        className="cal-btn"
        onClick={openPicker}
        aria-label="Open calendar"
        title="Open calendar"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        className="hidden-date"
        tabIndex={-1}
        aria-hidden="true"
        value={dmyToIso(value)}
        onChange={handlePicked}
      />
    </div>
  )
}

export default function App() {
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wage-profiles')) || []
      return Array.isArray(saved) ? saved.map(normalizeProfile) : []
    } catch {
      return []
    }
  })
  const [selectedId, setSelectedId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [profileToDelete, setProfileToDelete] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState(null)
  const [calcError, setCalcError] = useState('')

  useEffect(() => {
    localStorage.setItem('wage-profiles', JSON.stringify(profiles))
  }, [profiles])

  const selected = profiles.find((p) => p.id === selectedId)
  const safeSelectedName = selected?.name?.trim() || 'Employee'

  // ---------- form handlers ----------
  const setField = (key, value) => setForm({ ...form, [key]: value })

  const changeTitle = (title) =>
    setForm({
      ...form,
      title,
      salary: String(TITLES[title]),
      period: 'day',
      hours: '8',
    })

  const changeHours = (value) => {
    if (value === '') return setField('hours', '')
    const n = Math.min(24, Math.max(0, Number(value))) // never above 24
    setField('hours', String(n))
  }

  const toggleDay = (i) =>
    setForm({ ...form, days: form.days.map((d, idx) => (idx === i ? !d : d)) })

  const openForm = () => {
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  const discardChanges = () => {
    setForm(emptyForm)
    setFormError('')
    setShowForm(false)
  }

  const saveChanges = () => {
    if (!form.name.trim()) return setFormError('Please enter the full name.')
    if (!(Number(form.salary) > 0)) return setFormError('Please enter a salary.')
    if (!(Number(form.hours) > 0 && Number(form.hours) <= 24))
      return setFormError('Hours must be between 1 and 24.')
    if (!form.days.some(Boolean))
      return setFormError('Select at least one working day.')

    const profile = {
      ...form,
      id: createProfileId(),
      salary: Number(form.salary),
      hours: Number(form.hours),
      doj: '',
      dop: '',
      leaves: 0,
    }
    setProfiles((currentProfiles) => [...currentProfiles, profile])
    setSelectedId(profile.id)
    setResult(null)
    setShowForm(false)
  }

  const deleteProfile = () => {
    if (!profileToDelete) return
    setProfiles((currentProfiles) =>
      currentProfiles.filter((profile) => profile.id !== profileToDelete.id)
    )
    if (profileToDelete.id === selectedId) {
      setSelectedId('')
      setResult(null)
      setCalcError('')
    }
    setProfileToDelete(null)
  }

  // ---------- selected profile handlers ----------
  const updateSelected = (key, value) => {
    setProfiles((currentProfiles) =>
      currentProfiles.map((p) => (p.id === selectedId ? { ...p, [key]: value } : p))
    )
    setResult(null)
    setCalcError('')
  }

  const selectProfile = (id) => {
    setSelectedId(id)
    setResult(null)
    setCalcError('')
  }

  const calculate = () => {
    if (!selected) return setCalcError('Please select a profile before calculating.')

    const start = parseDmy(selected.doj)
    const end = parseDmy(selected.dop)
    if (start === null || end === null)
      return setCalcError('Please enter valid dates in dd-mm-yyyy format.')
    const diff = Math.round((end - start) / 86400000)
    if (diff < 0)
      return setCalcError('Date of payment cannot be before date of joining.')
    const leaves = Number(selected.leaves) || 0
    const worked = Math.max(0, diff - leaves)
    const rate = dailyRate(selected)
    setCalcError('')
    setResult({
      doj: selected.doj,
      dop: selected.dop,
      diff,
      leaves,
      worked,
      rate,
      total: worked * rate,
    })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Daywork home">
          <span className="brand-mark">d</span>
          <span>daywork<span className="brand-dot">.</span></span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <div className="nav-item nav-item-active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>
          Payroll overview
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">YOUR TEAM <span>{profiles.length}</span></div>
          <div className="profile-list">
            {profiles.map((profile, index) => (
              <div className="profile-row" key={profile.id}>
                <button
                  className={`profile-option${profile.id === selectedId ? ' profile-option-active' : ''}`}
                  onClick={() => selectProfile(profile.id)}
                >
                  <span className={`mini-avatar avatar-tone-${index % 4}`}>
                    {(profile.name.trim()[0] || '?').toUpperCase()}
                  </span>
                  <span className="profile-option-copy">
                    <strong>{profile.name || 'Unnamed employee'}</strong>
                    <small>{profile.title}</small>
                  </span>
                  {profile.id === selectedId && <span className="selected-indicator" />}
                </button>
                <button
                  className="profile-delete-button"
                  onClick={() => setProfileToDelete(profile)}
                  aria-label={`Delete ${profile.name || 'employee'} profile`}
                  title="Delete profile"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button className="add-profile-link" onClick={openForm}>
            <span>+</span> Add an employee
          </button>
        </div>

        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="note-spark">✳</span>
          <strong>Good work deserves<br />great pay.</strong>
          <span>Simple, thoughtful payroll for your whole team.</span>
        </div>
        <div className="sidebar-footer">
          <span className="footer-avatar">DW</span>
          <span><strong>Daywork</strong><small>Personal workspace</small></span>
          <span className="footer-menu">•••</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Payroll</strong></div>
          <div className="topbar-right">
            <span className="today-label">DAILY WAGE CALCULATOR</span>
            <span className="topbar-avatar">DW</span>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow"><span className="live-dot" /> YOUR PAYROLL, AT A GLANCE</p>
              <h1>Payroll overview</h1>
              <p className="page-subtitle">A little clarity goes a long way. Manage your team and calculate pay with ease.</p>
            </div>
            <button className="btn primary create-button" onClick={openForm}>
              <span className="button-plus">+</span> New employee
            </button>
          </section>

          {!selected ? (
            <section className="empty-state">
              <div className="empty-art">
                <span className="empty-art-card empty-art-back" />
                <span className="empty-art-card empty-art-front">
                  <span className="empty-art-avatar" />
                  <span className="empty-art-line" />
                  <span className="empty-art-line short" />
                  <span className="empty-art-coin">₹</span>
                </span>
                <span className="empty-art-spark">✳</span>
              </div>
              <span className="empty-kicker">A FRESH START</span>
              <h2>{profiles.length ? 'Choose someone from your team' : 'Your team starts here'}</h2>
              <p>{profiles.length ? 'Select an employee in the sidebar to see their details and calculate their pay.' : 'Add your first employee to set up their wage details and calculate their take-home pay.'}</p>
              {profiles.length === 0 && (
                <button className="btn primary" onClick={openForm}>
                  <span className="button-plus">+</span> Create first profile
                </button>
              )}
            </section>
          ) : (
            <>
              <section className="overview-strip">
                <div className="strip-card strip-card-highlight">
                  <span className="strip-icon">₹</span>
                  <div><span>AGREED WAGE</span><strong>{money(selected.salary)}</strong><small>per {selected.period}</small></div>
                </div>
                <div className="strip-card">
                  <span className="strip-icon strip-icon-lime">◷</span>
                  <div><span>WORKING HOURS</span><strong>{selected.hours}<small className="inline-unit"> hrs</small></strong><small>per working day</small></div>
                </div>
                <div className="strip-card">
                  <span className="strip-icon strip-icon-peach">▦</span>
                  <div><span>WORK SCHEDULE</span><strong>{selected.days.filter(Boolean).length}<small className="inline-unit"> days</small></strong><small>per week</small></div>
                </div>
              </section>

              <div className="content-grid">
                <div className="main-column">
                  <section className="employee-card">
                    <div className="employee-card-top">
                      <div className="employee-identity">
                        <div className="avatar">{safeSelectedName[0].toUpperCase()}</div>
                        <div>
                          <span className="employee-caption">EMPLOYEE PROFILE</span>
                          <h2 className="profile-name">{safeSelectedName}</h2>
                          <span className="badge">{selected.title}</span>
                        </div>
                      </div>
                      <button className="remove-button" onClick={() => setProfileToDelete(selected)} aria-label="Delete profile" title="Delete profile">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></svg>
                      </button>
                    </div>
                    <div className="employee-details">
                      <div className="contact-item">
                        <span className="contact-icon">@</span>
                        <div><small>EMAIL ADDRESS</small><strong>{selected.email || 'Not added yet'}</strong></div>
                      </div>
                      <div className="contact-item">
                        <span className="contact-icon">⌕</span>
                        <div><small>PHONE NUMBER</small><strong>{selected.phone ? `${selected.phoneCode ? `+${selected.phoneCode} ` : ''}${selected.phone}` : 'Not added yet'}</strong></div>
                      </div>
                      <div className="contact-item contact-address">
                        <span className="contact-icon">⌖</span>
                        <div><small>HOME ADDRESS</small><strong>{selected.address || 'Not added yet'}</strong></div>
                      </div>
                    </div>
                  </section>

                  <section className="schedule-card">
                    <div className="section-heading">
                      <div><span className="section-kicker">THE WEEK AHEAD</span><h3>Working schedule</h3></div>
                      <span className="schedule-count">{selected.days.filter(Boolean).length} days / week</span>
                    </div>
                    <div className="schedule-days">
                      {DAY_NAMES.map((day, i) => (
                        <div key={day} className={`schedule-day${selected.days[i] ? ' schedule-day-on' : ''}`}>
                          <span>{day.slice(0, 1)}</span>
                          <small>{day}</small>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="calculator-card">
                    <div className="section-heading calculator-heading">
                      <div><span className="section-kicker">LET'S GET THE NUMBERS RIGHT</span><h3>Calculate payroll</h3></div>
                      <span className="calculator-mark">₹</span>
                    </div>
                    <p className="calculator-description">Enter the pay period and any leave taken to work out the total salary.</p>
                    <div className="grid calculator-fields">
                      <label>
                        Date of joining
                        <DateField value={selected.doj} onChange={(v) => updateSelected('doj', v)} />
                      </label>
                      <label>
                        Payment date
                        <DateField value={selected.dop} onChange={(v) => updateSelected('dop', v)} />
                      </label>
                      <label>
                        Leave days
                        <input type="number" min="0" value={selected.leaves} onChange={(e) => updateSelected('leaves', e.target.value)} />
                      </label>
                    </div>
                    <div className="calculation-hint"><span>i</span> Pay is based on calendar days between the dates, minus leave days.</div>
                    <button className="btn primary calculate-button" onClick={calculate}>
                      Calculate salary <span>→</span>
                    </button>
                    {calcError && <p className="error">{calcError}</p>}
                  </section>
                </div>

                <aside className="pay-column">
                  {result ? (
                    <section className="result-card">
                      <span className="result-kicker"><span /> PAYROLL SUMMARY</span>
                      <p className="result-intro">Here's what {safeSelectedName.split(' ')[0]} earned</p>
                      <strong className="result-total">{money(result.total)}</strong>
                      <span className="result-period">{result.doj} <span>→</span> {result.dop}</span>
                      <div className="result-divider" />
                      <div className="result-row"><span>Days between dates</span><strong>{result.diff}</strong></div>
                      <div className="result-row"><span>Leave days</span><strong>{result.leaves}</strong></div>
                      <div className="result-row"><span>Paid working days</span><strong>{result.worked}</strong></div>
                      <div className="result-row"><span>Rate per day <small>({selected.hours} hrs)</small></span><strong>{money(result.rate)}</strong></div>
                      <div className="result-equation"><span>{result.worked} days × {money(result.rate)}</span><span>=</span></div>
                      <p className="result-footnote">Calculated from the salary and schedule on this profile.</p>
                    </section>
                  ) : (
                    <section className="pay-placeholder">
                      <div className="placeholder-icon">₹</div>
                      <span className="section-kicker">YOUR PAY ESTIMATE</span>
                      <h3>Ready when you are</h3>
                      <p>Fill in the dates and hit calculate to see a clear breakdown of this pay period.</p>
                      <div className="placeholder-rule"><span /><span /><span /></div>
                      <div className="placeholder-sample"><span>Take-home total</span><strong>₹ —</strong></div>
                    </section>
                  )}
                  <div className="privacy-note"><span>✓</span><p>Your employee details stay saved in this browser.</p></div>
                </aside>
              </div>
            </>
          )}
          <footer className="page-footer"><span>Made for the people who make it happen.</span><span>DAYWORK <b>·</b> PAYROLL</span></footer>
        </div>
      </main>

      {showForm && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) discardChanges() }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><span className="section-kicker">BUILD YOUR TEAM</span><h3 id="modal-title">Add an employee</h3><p>Set up a profile to make payroll a little simpler.</p></div>
              <button className="modal-close" onClick={discardChanges} aria-label="Close dialog">×</button>
            </div>

            <div className="form-section-label">PERSONAL DETAILS</div>
            <div className="grid2">
              <label>
                Full name
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </label>
              <label>
                Position
                <select value={form.title} onChange={(e) => changeTitle(e.target.value)}>
                  {Object.keys(TITLES).map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>
                Email address
                <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </label>
              <label>
                Phone number
                <div className="phone-input">
                  <select
                    aria-label="Country calling code"
                    value={form.phoneCountry}
                    onChange={(e) => {
                      const country = COUNTRIES.find((entry) => entry.iso2 === e.target.value)
                      if (country) setForm({ ...form, phoneCountry: country.iso2, phoneCode: country.dialCode })
                    }}
                  >
                    {COUNTRIES.map((country) => <option key={country.iso2} value={country.iso2}>{country.name} (+{country.dialCode})</option>)}
                  </select>
                  <input type="tel" inputMode="tel" placeholder="Phone number" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </div>
              </label>
            </div>
            <label>
              Home address
              <input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </label>

            <div className="form-section-label compensation-label">PAY & SCHEDULE</div>
            <div className="grid2">
              <label>
                Wage amount (₹)
                <input type="number" min="0" value={form.salary} onChange={(e) => setField('salary', e.target.value)} />
              </label>
              <label>
                Pay frequency
                <select value={form.period} onChange={(e) => setField('period', e.target.value)}>
                  <option value="day">Per day</option>
                  <option value="week">Per week</option>
                  <option value="month">Per month</option>
                </select>
              </label>
            </div>
            <label>
              Working hours per day <span className="label-hint">Maximum 24 hours</span>
              <input type="number" min="1" max="24" value={form.hours} onChange={(e) => changeHours(e.target.value)} />
            </label>
            <div className="working-days-field">
              <p className="label-text">Working days</p>
              <div className="days">
                {DAY_LETTERS.map((l, i) => (
                  <button type="button" key={i} title={DAY_NAMES[i]} aria-label={`${DAY_NAMES[i]}${form.days[i] ? ', working day' : ', day off'}`} aria-pressed={form.days[i]} className={'day-chip' + (form.days[i] ? ' on' : '')} onClick={() => toggleDay(i)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="error">{formError}</p>}
            <div className="actions">
              <button className="btn ghost" onClick={discardChanges}>Cancel</button>
              <button className="btn primary" onClick={saveChanges}>Save employee <span>→</span></button>
            </div>
          </div>
        </div>
      )}

      {profileToDelete && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setProfileToDelete(null) }}>
          <div className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <div className="delete-dialog-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></svg>
            </div>
            <h3 id="delete-title">Remove this employee?</h3>
            <p id="delete-description">The profile and its saved payroll details for <strong>{profileToDelete.name.trim() || 'this employee'}</strong> will be permanently removed from this browser.</p>
            <div className="delete-dialog-actions">
              <button className="btn ghost" onClick={() => setProfileToDelete(null)}>Keep profile</button>
              <button className="btn delete-confirm-button" onClick={deleteProfile}>Yes, remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App
