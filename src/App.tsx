import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText,
  Flame, Home, Library, ListChecks, Play, Plus, Search, Settings2, Sparkles,
  Target, Trash2, X,
} from './icons'
import CloudSync from './CloudSync'

export type Passage = {
  id: string
  title: string
  subject: string
  language: string
  text: string
  sections?: string[]
  updated: string
  modifiedAt?: number
  sessions: number
  accuracy: number
  accuracyHistory?: number[]
  practiceDates?: string[]
  practiceHistory?: { date: string; accuracy: number }[]
  due: boolean
}

type Page = 'Home' | 'Library' | 'Revision' | 'Progress'
type PracticeMode = 'hide' | 'first' | 'cloze' | 'type'
type Comparison = { rows: { word: string; ok: boolean }[]; accuracy: number; extras: string[]; missing: number }

const seed: Passage[] = [
  { id: 'p1', title: 'The art of learning', subject: 'Personal growth', language: 'English', text: 'Learning is not attained by chance, it must be sought for with ardor and attended to with diligence. The beautiful thing about learning is nobody can take it away from you.', updated: 'Example', sessions: 0, accuracy: 0, due: true },
  { id: 'p2', title: 'Al-Muqaddimah', subject: 'History', language: 'Arabic', text: 'إن التاريخ في ظاهره لا يزيد على الإخبار، ولكن في باطنه نظر وتحقيق.', updated: 'Example', sessions: 0, accuracy: 0, due: true },
  { id: 'p3', title: 'A short poem', subject: 'Literature', language: 'English', text: 'Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.', updated: 'Example', sessions: 0, accuracy: 0, due: true },
]

const nav: { label: Page; icon: typeof Home }[] = [
  { label: 'Home', icon: Home }, { label: 'Library', icon: Library },
  { label: 'Revision', icon: Clock3 }, { label: 'Progress', icon: Target },
]
const demoIds = new Set(['p1', 'p2', 'p3'])
const wordsOf = (text: string) => text.match(/\s+|[^\s]+/gu) ?? []
const plainTokens = (text: string) => text.match(/\S+/gu) ?? []
const normalize = (word: string) => word.normalize('NFC')
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function compare(expected: string, actual: string): Comparison {
  const source = plainTokens(expected)
  const typed = plainTokens(actual)
  const rows = source.map(word => ({ word, ok: false }))
  const extras: string[] = []
  let i = 0
  let j = 0
  while (i < source.length && j < typed.length) {
    if (normalize(source[i]) === normalize(typed[j])) {
      rows[i].ok = true
      i += 1
      j += 1
    } else if (normalize(source[i + 1] ?? '') === normalize(typed[j])) {
      i += 1
    } else if (normalize(source[i]) === normalize(typed[j + 1] ?? '')) {
      extras.push(typed[j])
      j += 1
    } else {
      i += 1
      j += 1
    }
  }
  while (j < typed.length) extras.push(typed[j++])
  const matched = rows.filter(row => row.ok).length
  return { rows, accuracy: source.length ? Math.round(matched / source.length * 100) : 0, extras, missing: source.length - matched }
}

function readPassages(): Passage[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('tahfeedh.texts') ?? 'null')
    if (!Array.isArray(value)) return seed
    if (!value.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.text === 'string')) return seed
    const originalExamples = [['p1', 8, 84], ['p2', 5, 71], ['p3', 12, 96]] as const
    return (value as Passage[]).map(item => originalExamples.some(([id, sessions, accuracy]) => item.id === id && item.sessions === sessions && item.accuracy === accuracy)
      ? { ...item, sessions: 0, accuracy: 0, accuracyHistory: [], practiceDates: [], practiceHistory: [], due: true, updated: 'Example' }
      : item)
  } catch { return seed }
}

function readDeleted(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('tahfeedh.deleted') ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, number> : {}
  } catch { return {} }
}

export default function App() {
  const [texts, setTexts] = useState<Passage[]>(readPassages)
  const [deleted, setDeleted] = useState<Record<string, number>>(readDeleted)
  const [page, setPage] = useState<Page>('Home')
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All subjects')
  const [sortOrder, setSortOrder] = useState<'recent' | 'title'>('recent')
  const [storageNotice, setStorageNotice] = useState('')
  const [modal, setModal] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Passage | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Personal growth')
  const [language, setLanguage] = useState('English')
  const [body, setBody] = useState('')
  const [editor, setEditor] = useState<Passage | null>(null)
  const [segmentStep, setSegmentStep] = useState(false)
  const [chunks, setChunks] = useState<string[]>([])
  const [active, setActive] = useState<Passage | null>(null)
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null)
  const [stage, setStage] = useState(1)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<Comparison | null>(null)
  const [blankAnswers, setBlankAnswers] = useState<Record<number, string>>({})
  const [blankChecked, setBlankChecked] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    try { localStorage.setItem('tahfeedh.texts', JSON.stringify(texts)); setStorageNotice('') }
    catch { setStorageNotice('This browser could not save your library. Free up storage or export your passages soon.') }
  }, [texts])
  useEffect(() => {
    try { localStorage.setItem('tahfeedh.deleted', JSON.stringify(deleted)) }
    catch { setStorageNotice('This browser could not save sync history. Check available storage.') }
  }, [deleted])
  useEffect(() => {
    if (!active || checked || !startedAt) return
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [active, checked, startedAt])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('passage-search')?.focus()
      }
      if (event.key === 'Escape') {
        if (pendingDelete) setPendingDelete(null)
        if (modal) setModal(false)
        else if (active) exitPractice()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const allSubjects = useMemo(() => [...new Set(texts.map(item => item.subject.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [texts])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return texts
      .filter(item => (subjectFilter === 'All subjects' || item.subject === subjectFilter)
        && (!term || `${item.title} ${item.subject} ${item.text}`.toLocaleLowerCase().includes(term)))
      .sort((a, b) => sortOrder === 'title'
        ? a.title.localeCompare(b.title)
        : (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0))
  }, [texts, query, subjectFilter, sortOrder])
  const practiceDates = useMemo(() => [...new Set(texts.flatMap(item => item.practiceHistory?.map(session => session.date) ?? item.practiceDates ?? []))].sort(), [texts])
  const today = localDateKey()
  const practicedSet = new Set(practiceDates)
  const streak = useMemo(() => {
    const cursor = new Date()
    if (!practicedSet.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    let count = 0
    while (practicedSet.has(localDateKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1) }
    return count
  }, [practiceDates, today])
  const sessionCount = texts.reduce((sum, item) => sum + item.sessions, 0)
  const accuracyValues = texts.flatMap(item => item.practiceHistory?.length ? item.practiceHistory.map(session => session.accuracy) : item.accuracyHistory?.length ? item.accuracyHistory : (item.sessions ? [item.accuracy] : []))
  const averageAccuracy = accuracyValues.length ? Math.round(accuracyValues.reduce((sum, score) => sum + score, 0) / accuracyValues.length) : 0
  const wordCount = texts.reduce((sum, item) => sum + plainTokens(item.text).length, 0)
  const dueCount = texts.filter(item => item.due).length
  const sections = active ? (active.sections?.filter(section => section.trim()) ?? []).length ? active.sections!.filter(section => section.trim()) : [active.text] : []
  const sectionText = sections[sectionIndex] ?? ''
  const wordTokens = useMemo(() => wordsOf(sectionText), [sectionText])
  let wordIndex = 0
  const blankIndexes = wordTokens.flatMap(part => {
    if (/^\s+$/u.test(part)) return []
    const index = wordIndex++
    if (stage !== 3 || !practiceMode || !['hide', 'cloze'].includes(practiceMode)) return []
    return practiceMode === 'hide' ? (index % 2 === 1 ? [index] : []) : (index % 3 === 1 ? [index] : [])
  })
  const sectionPlainTokens = useMemo(() => plainTokens(sectionText), [sectionText])
  const blanksCorrect = blankIndexes.filter(index => normalize(blankAnswers[index] ?? '') === normalize(sectionPlainTokens[index] ?? '')).length
  const currentDay = new Date().toLocaleDateString(undefined, { weekday: 'short' })
  const currentDate = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const splitText = (text: string) => {
    const paragraphs = text.split(/\n\s*\n/u).map(value => value.trim()).filter(Boolean)
    if (paragraphs.length > 1) return paragraphs
    return text.split(/(?<=[.!?؟۔])\s+/u).map(value => value.trim()).filter(Boolean)
  }
  const openAdd = (passage?: Passage) => {
    setEditor(passage ?? null)
    setTitle(passage?.title ?? '')
    setSubject(passage?.subject ?? 'Personal growth')
    setLanguage(passage?.language ?? 'English')
    setBody(passage?.text ?? '')
    setChunks(passage?.sections ?? [])
    setSegmentStep(false)
    setFileError('')
    setModal(true)
  }
  const saveText = () => {
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    const cleanSections = (chunks.length ? chunks : splitText(cleanBody)).map(value => value.trim()).filter(Boolean)
    if (!cleanTitle || !cleanBody || !cleanSections.length) return
    const now = Date.now()
    const passage: Passage = {
      id: editor && !demoIds.has(editor.id) ? editor.id : crypto.randomUUID(), title: cleanTitle, subject: subject.trim() || 'Unsorted',
      language, text: cleanBody, sections: cleanSections, updated: 'Just now', modifiedAt: now,
      sessions: editor?.sessions ?? 0, accuracy: editor?.accuracy ?? 0,
      accuracyHistory: editor?.accuracyHistory, practiceDates: editor?.practiceDates, practiceHistory: editor?.practiceHistory, due: editor?.due ?? true,
    }
    setTexts(old => editor ? old.map(item => item.id === passage.id ? passage : item) : [passage, ...old])
    setDeleted(old => { const next = { ...old }; delete next[passage.id]; return next })
    setModal(false)
  }
  const deletePassage = (passage: Passage) => {
    setPendingDelete(passage)
  }
  const confirmDelete = () => {
    if (!pendingDelete) return
    setTexts(old => old.filter(item => item.id !== pendingDelete.id))
    setDeleted(old => ({ ...old, [pendingDelete.id]: Date.now() }))
    setPendingDelete(null)
  }
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 2_000_000) { setFileError('Choose a text file smaller than 2 MB.'); return }
    try {
      setTitle(value => value || file.name.replace(/\.txt$/i, ''))
      setBody(await file.text())
      setFileError('')
    } catch { setFileError('That file could not be read. Try copying its text into the editor.') }
  }
  const begin = (passage: Passage) => {
    setActive(passage)
    setPracticeMode(null)
    setSectionIndex(0)
    setStage(1)
    setAnswer('')
    setChecked(false)
    setResult(null)
    setElapsed(0)
    setStartedAt(Date.now())
    setBlankAnswers({})
    setBlankChecked(false)
  }
  function exitPractice() {
    setActive(null)
    setPracticeMode(null)
    setChecked(false)
    setResult(null)
    setPage('Home')
  }
  const selectMode = (mode: PracticeMode) => { setPracticeMode(mode); setStage(mode === 'type' ? 4 : 1); setStartedAt(Date.now()); setElapsed(0) }
  const checkBlanks = () => setBlankChecked(true)
  const startRecall = () => { setStage(4); setAnswer(''); setStartedAt(Date.now()) }
  const finish = () => {
    if (!active) return
    const score = compare(sectionText, answer)
    const date = localDateKey()
    setTexts(old => old.map(item => item.id !== active.id ? item : {
      ...item,
      accuracy: score.accuracy,
      accuracyHistory: [...(item.accuracyHistory ?? (item.sessions ? [item.accuracy] : [])), score.accuracy].slice(-20),
      practiceDates: [...new Set([...(item.practiceDates ?? []), date])],
      practiceHistory: [...(item.practiceHistory ?? []), { date, accuracy: score.accuracy }].slice(-100),
      sessions: item.sessions + 1,
      updated: 'Just now',
      modifiedAt: Date.now(),
      due: score.accuracy < 85,
    }))
    setResult(score)
    setChecked(true)
  }
  const nextSection = () => {
    setSectionIndex(index => index + 1)
    setStage(1)
    setAnswer('')
    setChecked(false)
    setResult(null)
    setBlankAnswers({})
    setBlankChecked(false)
    setStartedAt(Date.now())
  }
  const go = (target: Page) => { setPage(target); setActive(null); setPracticeMode(null) }
  const chartDays = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - offset))
    const key = localDateKey(day)
    return { key, label: day.toLocaleDateString(undefined, { weekday: 'short' }), count: texts.reduce((n, item) => n + (item.practiceHistory?.filter(session => session.date === key).length ?? (item.practiceDates?.includes(key) ? 1 : 0)), 0) }
  })

  return <div className="app">
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="#home" onClick={event => { event.preventDefault(); go('Home') }}><span className="brandmark"><Sparkles size={17}/></span><span className="brand-name">tahfeedh</span></a>
      <div className="workspace"><div className="avatar">T</div><span><b>Your workspace</b><small>Private library</small></span></div>
      <button className="add-btn" onClick={() => openAdd()}><Plus size={17}/> Add a passage</button>
      <div className="nav-label">LIBRARY</div>
      <nav className="desktop-nav">{nav.map(({ label, icon: Icon }) => <NavButton key={label} label={label} icon={<Icon size={18}/>} selected={page === label} count={label === 'Revision' ? dueCount : 0} onClick={() => go(label)}/>)}</nav>
      <div className="sidebar-bottom"><div className="streak-card"><span className="streak-icon"><Flame size={17}/></span><div><b>{streak} day{streak === 1 ? '' : 's'} active</b><small>{streak ? 'Nice work. Keep it going.' : 'A short session starts today.'}</small></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="crumb"><span>Your workspace</span><ChevronRight size={14}/><b>{active ? 'Practice' : page}</b></div>
        <div className="top-actions"><label className="search-box"><Search size={16}/><input id="passage-search" placeholder="Search passages" value={query} onChange={event => { setQuery(event.target.value); if (event.target.value) setPage('Library') }}/><kbd>Ctrl K</kbd></label><button className="mobile-add" aria-label="Add a passage" title="Add a passage" onClick={() => openAdd()}><Plus size={19}/></button><div className="sync-area"><CloudSync texts={texts} setTexts={setTexts} deleted={deleted} setDeleted={setDeleted}/></div></div>
      </header>
      {active ? <section className="practice">
        <div className="practice-top"><button className="back-link" onClick={exitPractice}><ChevronLeft size={18}/> Exit practice</button><div className="timer"><Clock3 size={16}/>{formatTime(elapsed)}</div></div>
        <div className="practice-heading"><div className="eyebrow">{active.subject} · {active.language}</div><h1>{active.title}</h1><p>Recall one section at a time, at your own pace.</p></div>
        {!practiceMode ? <div className="mode-picker"><div className="mode-intro"><span className="eyebrow">CHOOSE A PRACTICE</span><h2>How would you like to learn?</h2><p>{sections.length} section{sections.length === 1 ? '' : 's'} · {plainTokens(active.text).length} words</p></div><div className="mode-grid">
          <ModeCard icon={<BookOpen/>} title="Read & reveal" text="Reveal the passage gradually, then recall it from memory." onClick={() => selectMode('hide')}/>
          <ModeCard icon={<ListChecks/>} title="First letters" text="Use each word’s first letter as a gentle prompt." onClick={() => selectMode('first')}/>
          <ModeCard icon={<Target/>} title="Fill the gaps" text="Type the missing words as they appear." onClick={() => selectMode('cloze')}/>
          <ModeCard icon={<FileText/>} title="Type from memory" text="Recall the whole section without seeing the text." onClick={() => selectMode('type')}/>
        </div></div> : !checked ? <>
          <div className="session-progress"><span>SECTION {sectionIndex + 1} OF {sections.length}</span><span>{stage === 4 ? 'FULL RECALL' : `STAGE ${stage} OF 3`}</span><div className="progress-track"><b style={{ width: `${Math.round(((sectionIndex + (stage === 4 ? 1 : stage / 4)) / sections.length) * 100)}%` }}/></div></div>
          <div className={`recall-card ${isRTL(active.language) ? 'rtl' : ''}`} dir={isRTL(active.language) ? 'rtl' : 'auto'}><div className="card-label"><span>{stage === 4 ? 'RECALL FROM MEMORY' : modeLabel(practiceMode)}</span><span className="card-word-count">{plainTokens(sectionText).length} words</span></div>
            {stage === 4 ? <textarea className="recall-input" dir="auto" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Start writing from memory…" autoFocus aria-label="Type the passage from memory"/> : <div className="passage-words">{renderTokens(wordTokens, practiceMode, stage, blankIndexes, blankAnswers, blankChecked, setBlankAnswers, checkBlanks)}</div>}
            <div className="card-foot"><span><FileText size={15}/> Section {sectionIndex + 1} of {sections.length}</span><span>{stage === 4 && answer.trim() ? plainTokens(answer).length : ''}</span></div>
          </div>
          {stage === 3 && blankChecked && <div className={`blank-feedback ${blanksCorrect === blankIndexes.length ? 'all-correct' : ''}`} role="status">{blanksCorrect} of {blankIndexes.length} blanks correct. {blanksCorrect === blankIndexes.length ? 'Ready for full recall?' : 'Review the highlighted words, then continue.'}</div>}
          <div className="practice-controls"><button className="subtle" onClick={() => { setStage(value => Math.max(1, value - 1)); setBlankChecked(false) }} disabled={stage <= 1}><ChevronLeft size={16}/> Easier</button>{stage < 4 && <button className="subtle" onClick={() => { setStage(value => Math.min(3, value + 1)); setBlankChecked(false) }}>Harder <ChevronRight size={16}/></button>}<span className="control-spacer"/><button className="text-button" onClick={() => { setStage(1); setBlankChecked(false); setAnswer('') }}>Show text</button>{stage === 3 && blankIndexes.length > 0 && !blankChecked ? <button className="primary" onClick={checkBlanks}>Check blanks <Check size={16}/></button> : stage < 4 ? <button className="primary" onClick={startRecall}>Try full recall <ChevronRight size={16}/></button> : <button className="primary" onClick={finish} disabled={!answer.trim()}>Check recall <Check size={16}/></button>}</div>
          <div className="encouragement"><Sparkles size={15}/> {practiceMode === 'hide' ? 'Reveal a little less each time.' : practiceMode === 'first' ? 'Use the first letters as gentle clues.' : practiceMode === 'cloze' ? 'Fill each gap before moving on.' : 'Take your time and write what you remember.'}</div>
        </> : <div className="result-card"><div className="result-icon"><Check size={24}/></div><div className="eyebrow">SECTION COMPLETE</div><h2>{(result?.accuracy ?? 0) >= 85 ? 'Nicely recalled.' : 'Good effort. Keep practicing.'}</h2><p>Here’s how your recall compared with the original.</p><div className="result-stats"><div><strong>{result?.accuracy ?? 0}%</strong><span>Accuracy</span></div><div><strong>{formatTime(elapsed)}</strong><span>Time</span></div><div><strong>{plainTokens(sectionText).length}</strong><span>Words</span></div></div><div className="comparison" dir="auto">{result?.rows.map((row, index) => <span key={index} className={row.ok ? 'correct' : 'incorrect'}>{row.word}{index < (result?.rows.length ?? 0) - 1 ? ' ' : ''}</span>)}{result?.extras.length ? <div className="extra-words">Extra words: {result.extras.join(' ')}</div> : null}</div><div className="result-actions">{sectionIndex + 1 < sections.length ? <button className="primary" onClick={nextSection}>Next section <ChevronRight size={16}/></button> : <button className="primary" onClick={exitPractice}>Done <Check size={16}/></button>}<button className="subtle" onClick={() => { setChecked(false); setAnswer(''); setElapsed(0); setStartedAt(Date.now()); setStage(4) }}>Try again</button></div></div>}
      </section> : <div className="content">
        {page === 'Home' && <>
          <div className="welcome-row"><div><div className="eyebrow">{currentDay.toUpperCase()} · {currentDate.toUpperCase()}</div><h1>{greeting} <span className="wave">✳</span></h1><p>A little practice today goes a long way.</p></div><button className="primary desktop-add" onClick={() => openAdd()}><Plus size={17}/> Add a passage</button></div>
          <div className="hero-card"><div className="hero-copy"><div className="hero-kicker"><span className="pulse"/> YOUR DAILY PRACTICE</div><h2>{texts.length ? <>Make today<br/>count.</> : <>Start with<br/>one passage.</>}</h2><p>{texts.length ? dueCount ? `${dueCount} passage${dueCount === 1 ? '' : 's'} ready for review.` : 'Your review list is clear. Add or revisit a passage.' : 'Save something meaningful to begin learning.'}</p>{texts.length ? <button className="hero-button" onClick={() => begin(texts.find(item => item.due) ?? texts[0])}><Play size={15} fill="currentColor"/> Start a practice session <ChevronRight size={15}/></button> : <button className="hero-button" onClick={() => openAdd()}><Plus size={15}/> Add your first passage</button>}</div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-sun"/><div className="art-book"><span/><span/><span/><span/></div><div className="art-star">✳</div><div className="art-dot"/></div><div className="hero-count"><b>{String(dueCount).padStart(2, '0')}</b><span>TO REVIEW</span></div></div>
          <div className="section-head"><div><h2>Your overview</h2><p>A snapshot of your learning so far.</p></div><button className="text-link" onClick={() => go('Progress')}>View progress <ChevronRight size={15}/></button></div><div className="stats-grid"><Stat icon={<BookOpen/>} label="Passages saved" value={String(texts.length).padStart(2, '0')} hint="In your library" color="lavender"/><Stat icon={<ListChecks/>} label="Words collected" value={wordCount.toLocaleString()} hint="Across all passages" color="mint"/><Stat icon={<Target/>} label="Recall accuracy" value={`${averageAccuracy}%`} hint="Average over sessions" color="peach"/><Stat icon={<Flame/>} label="Study streak" value={`${streak} day${streak === 1 ? '' : 's'}`} hint="Based on practice days" color="butter"/></div>
          <div className="section-head passage-head"><div><h2>Pick up where you left off</h2><p>Your passages, ready when you are.</p></div><button className="text-link" onClick={() => go('Library')}>All passages <ChevronRight size={15}/></button></div>{texts.length ? <div className="passage-list">{texts.slice(0, 3).map(item => <PassageRow key={item.id} passage={item} onPractice={() => begin(item)} onEdit={() => openAdd(item)} onDelete={() => deletePassage(item)}/>)}</div> : <EmptyState title="Your library is ready" text="Add a passage you’d like to learn by heart." action="Add a passage" onAction={() => openAdd()}/>}
        </>}
        {page === 'Library' && <>
          <div className="page-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h1>Your library</h1><p>Every passage is a small promise to your future self.</p></div><button className="primary" onClick={() => openAdd()}><Plus size={17}/> Add passage</button></div>
          <div className="filter-row"><span>{filtered.length} passage{filtered.length === 1 ? '' : 's'}</span><label className="filter-select"><ListChecks size={15}/><select aria-label="Filter by subject" value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)}><option>All subjects</option>{allSubjects.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={14}/></label><label className="filter-select"><Settings2 size={15}/><select aria-label="Sort passages" value={sortOrder} onChange={event => setSortOrder(event.target.value as 'recent' | 'title')}><option value="recent">Recently updated</option><option value="title">Title A–Z</option></select><ChevronDown size={14}/></label></div>
          {filtered.length ? <div className="passage-list">{filtered.map(item => <PassageRow key={item.id} passage={item} onPractice={() => begin(item)} onEdit={() => openAdd(item)} onDelete={() => deletePassage(item)}/>)}</div> : <EmptyState title={texts.length ? 'No passages found' : 'Your library is empty'} text={texts.length ? 'Try another search or subject filter.' : 'Add your first passage to start a personal collection.'} action={texts.length ? undefined : 'Add a passage'} onAction={texts.length ? undefined : () => openAdd()}/>}
        </>}
        {page === 'Revision' && <>
          <div className="page-heading"><div><div className="eyebrow">SPACED PRACTICE</div><h1>A moment to remember</h1><p>Short, thoughtful reviews help ideas stay with you.</p></div><div className="revision-badge"><Clock3 size={16}/>{dueCount} due today</div></div>
          {dueCount ? <><div className="revision-banner"><div><span className="eyebrow">YOUR REVIEW QUEUE</span><h2>Ready when you are.</h2><p>Choose a passage to revisit what you’ve learned.</p></div><div className="revision-mark"><Clock3/></div></div><div className="passage-list">{texts.filter(item => item.due).map(item => <PassageRow key={item.id} passage={item} onPractice={() => begin(item)} onEdit={() => openAdd(item)} onDelete={() => deletePassage(item)}/>)}</div></> : <EmptyState title="You’re all caught up" text="New passages and lower-scoring reviews will show up here."/>}
        </>}
        {page === 'Progress' && <>
          <div className="page-heading"><div><div className="eyebrow">YOUR LEARNING JOURNEY</div><h1>Progress, at your pace</h1><p>Every session is a step forward.</p></div></div><div className="stats-grid progress-stats"><Stat icon={<Target/>} label="Average accuracy" value={`${averageAccuracy}%`} hint="Across saved sessions" color="lavender"/><Stat icon={<ListChecks/>} label="Sessions completed" value={sessionCount.toLocaleString()} hint="Keep showing up" color="mint"/><Stat icon={<BookOpen/>} label="Words in your library" value={wordCount.toLocaleString()} hint="Ready to learn" color="peach"/><Stat icon={<Flame/>} label="Current streak" value={`${streak} day${streak === 1 ? '' : 's'}`} hint="Practice days in a row" color="butter"/></div><div className="progress-panel"><h2>Practice rhythm</h2><p>Completed sessions over the last seven days.</p>{sessionCount ? <div className="chart" role="img" aria-label="Practice sessions for the last seven days">{chartDays.map(day => <div className="bar-wrap" key={day.key}><span className="bar-value">{day.count || ''}</span><div className={`bar ${day.key === today ? 'today' : ''}`} style={{ height: `${Math.max(day.count ? 22 : 5, Math.min(100, day.count * 24))}%` }}/><small>{day.label}</small></div>)}</div> : <p className="chart-empty">Your practice history will appear after your first completed session.</p>}</div>
        </>}
      </div>}
      {storageNotice && <div className="storage-notice" role="alert">{storageNotice}</div>}
    </main>
    <nav className="mobile-nav" aria-label="Main navigation">{nav.map(({ label, icon: Icon }) => <NavButton key={label} label={label} icon={<Icon size={19}/>} selected={page === label} count={label === 'Revision' ? dueCount : 0} onClick={() => go(label)}/>)}</nav>
    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(false) }}><section className="modal" aria-labelledby="passage-modal-title" aria-modal="true" role="dialog">
      <div className="modal-title"><div><span className="eyebrow">{segmentStep ? 'SECTION EDITOR' : editor ? 'YOUR LIBRARY' : 'START SOMETHING MEANINGFUL'}</span><h2 id="passage-modal-title">{segmentStep ? 'Shape your sections' : editor ? 'Edit passage' : 'Add a passage'}</h2></div><button className="icon-btn" aria-label="Close dialog" onClick={() => setModal(false)}><X size={20}/></button></div>
      {!segmentStep ? <><label>Passage title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. A thought to remember"/></label><div className="form-row"><label>Subject<input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Personal growth"/></label><label>Language<select value={language} onChange={event => setLanguage(event.target.value)}><option>English</option><option>Arabic</option><option>Urdu</option><option>Malayalam</option><option>Other</option></select></label></div><label>Your text<textarea className="source-input" dir="auto" value={body} onChange={event => setBody(event.target.value)} placeholder="Paste or write the words you’d like to learn…"/></label><div className="import-hint"><FileText size={16}/> Paste text here, or <button type="button" onClick={() => document.getElementById('file-input')?.click()}>choose a .txt file</button><input id="file-input" type="file" accept=".txt,text/plain" hidden onChange={event => void handleImport(event)}/></div>{fileError && <p className="form-error" role="alert">{fileError}</p>}</> : <><p className="segment-intro">Your source passage stays intact. Shape the sections used in practice.</p><div className="segment-tools"><span>{chunks.filter(value => value.trim()).length} sections · {plainTokens(body).length} words</span><button className="filter-button" onClick={() => setChunks(splitText(body))}>Split from source</button><button className="filter-button" onClick={() => setChunks(old => [...old, ''])}><Plus size={14}/> Add section</button></div><div className="segment-list">{chunks.map((chunk, index) => <div className="segment-item" key={index}><div><span>SECTION {String(index + 1).padStart(2, '0')}</span><button disabled={index === chunks.length - 1} title="Merge with next section" aria-label={`Merge section ${index + 1} with the next section`} onClick={() => setChunks(old => old.flatMap((value, item) => item === index ? [`${value} ${old[index + 1]}`.trim()] : item === index + 1 ? [] : [value]))}>Merge ↓</button><button className="remove-section" title="Remove section" aria-label={`Remove section ${index + 1}`} onClick={() => setChunks(old => old.filter((_, item) => item !== index))}><X size={14}/></button></div><textarea dir="auto" value={chunk} onChange={event => setChunks(old => old.map((value, item) => item === index ? event.target.value : value))} aria-label={`Section ${index + 1} text`}/></div>)}</div></>}
      <div className="modal-actions">{segmentStep ? <button className="subtle" onClick={() => setSegmentStep(false)}><ChevronLeft size={17}/> Back</button> : <button className="subtle" onClick={() => setModal(false)}>Cancel</button>}{segmentStep ? <button className="primary" disabled={!chunks.some(value => value.trim())} onClick={saveText}>Save passage <Check size={16}/></button> : <button className="primary" disabled={!title.trim() || !body.trim()} onClick={() => { setChunks(editor?.sections?.length ? editor.sections : splitText(body)); setSegmentStep(true) }}>Continue to sections <ChevronRight size={17}/></button>}</div>
    </section></div>}
    {pendingDelete && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPendingDelete(null) }}><section className="modal confirm-modal" aria-labelledby="delete-dialog-title" aria-modal="true" role="alertdialog"><div className="modal-title"><div><span className="eyebrow">REMOVE PASSAGE</span><h2 id="delete-dialog-title">Delete this passage?</h2></div><button className="icon-btn" aria-label="Close dialog" onClick={() => setPendingDelete(null)}><X size={20}/></button></div><p><strong>{pendingDelete.title}</strong> will be removed from this library and synced to your other devices.</p><div className="modal-actions"><button className="subtle" onClick={() => setPendingDelete(null)}>Keep passage</button><button className="danger-button" onClick={confirmDelete}><Trash2 size={16}/> Delete passage</button></div></section></div>}
  </div>
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` }
function isRTL(language: string) { return language === 'Arabic' || language === 'Urdu' }
function modeLabel(mode: PracticeMode | null) { return mode === 'hide' ? 'READ & RECALL' : mode === 'first' ? 'FIRST LETTERS' : mode === 'cloze' ? 'FILL THE GAPS' : 'RECALL FROM MEMORY' }
function NavButton({ label, icon, selected, count = 0, onClick }: { label: Page; icon: ReactNode; selected: boolean; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${selected ? 'selected' : ''}`} aria-current={selected ? 'page' : undefined} onClick={onClick}>{icon}<span>{label}</span>{count > 0 && <i>{count}</i>}</button>
}
function ModeCard({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return <button className="mode-card" onClick={onClick}><span className="mode-icon">{icon}</span><span><b>{title}</b><small>{text}</small></span><ChevronRight className="mode-arrow" size={17}/></button>
}
function renderTokens(tokens: string[], mode: PracticeMode | null, stage: number, blanks: number[], answers: Record<number, string>, checked: boolean, setAnswers: (update: (value: Record<number, string>) => Record<number, string>) => void, checkBlanks: () => void) {
  let index = 0
  const blankSet = new Set(blanks)
  return tokens.map((part, tokenIndex) => {
    if (/^\s+$/u.test(part)) return part
    const wordIndex = index++
    const hidden = mode === 'hide' ? stage === 2 ? wordIndex % 4 === 2 : false
      : mode === 'first' ? stage >= 2
        : mode === 'cloze' ? stage === 2 && wordIndex % 3 === 1 : false
    const blank = blankSet.has(wordIndex)
    if (blank) return <input key={tokenIndex} aria-label={`Missing word ${wordIndex + 1}`} className={`blank-input ${checked ? (normalize(answers[wordIndex] ?? '') === normalize(part) ? 'is-correct' : 'is-wrong') : ''}`} style={{ width: `${Math.min(12, Math.max(4, [...part].length + 1))}ch` }} dir="auto" value={answers[wordIndex] ?? ''} autoComplete="off" onChange={event => setAnswers(old => ({ ...old, [wordIndex]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') checkBlanks() }}/>
    return <span key={tokenIndex}>{hidden ? mode === 'first' ? `${[...part][0] ?? ''}·` : '＿'.repeat(Math.min(7, Math.max(3, [...part].length))) : part}</span>
  })
}
function Stat({ icon, label, value, hint, color }: { icon: ReactNode; label: string; value: string; hint: string; color: string }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><span className="stat-label">{label}</span><strong>{value}</strong><small>{hint}</small></div>
}
function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><BookOpen size={22}/></span><h2>{title}</h2><p>{text}</p>{action && onAction && <button className="primary" onClick={onAction}><Plus size={17}/>{action}</button>}</div>
}
function PassageRow({ passage, onPractice, onEdit, onDelete }: { passage: Passage; onPractice: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className="passage-row"><div className="passage-symbol"><FileText size={18}/></div><div className="passage-info"><h3 className="passage-title">{passage.title} {passage.due && <span className="due-dot">DUE</span>}</h3><div className="passage-meta"><span>{passage.subject}</span><span>·</span><span>{passage.language}</span><span>·</span><span>{plainTokens(passage.text).length} words</span></div></div><div className="row-progress"><div><span>ACCURACY</span><b>{passage.accuracy}%</b></div><div className="mini-track"><i style={{ width: `${passage.accuracy}%` }}/></div></div><span className="updated">{passage.updated}</span><button className="row-menu" title={`Edit ${passage.title}`} aria-label={`Edit ${passage.title}`} onClick={onEdit}><Settings2 size={17}/></button><button className="row-delete" title={`Delete ${passage.title}`} aria-label={`Delete ${passage.title}`} onClick={onDelete}><Trash2 size={17}/></button><button className="row-play" onClick={onPractice}><Play size={14} fill="currentColor"/><span>Practice</span></button></article>
}
