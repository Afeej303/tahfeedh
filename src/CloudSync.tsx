import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import { Check, Cloud, CloudOff, LoaderCircle, LogOut, RefreshCw, X } from './icons'
import type { Passage } from './App'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
const demoIds = new Set(['p1', 'p2', 'p3'])
type CloudRow = { id: string; payload: Passage; modified_at: number; deleted_at: number | null }
type Props = { texts: Passage[]; setTexts: Dispatch<SetStateAction<Passage[]>>; deleted: Record<string, number>; setDeleted: Dispatch<SetStateAction<Record<string, number>>> }

export default function CloudSync({ texts, setTexts, deleted, setDeleted }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [open, setOpen] = useState(false)
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'off'|'signed-out'|'syncing'|'synced'|'error'>(supabase?'signed-out':'off')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const busy = useRef(false)
  const textRef = useRef(texts)
  const deletedRef = useRef(deleted)
  const cloudRowsRef = useRef<CloudRow[]>([])
  textRef.current = texts
  deletedRef.current = deleted
  const textsKey = JSON.stringify(texts)
  const deletedKey = JSON.stringify(deleted)

  const writeRows = useCallback(async (userId: string, nextTexts: Passage[], nextDeleted: Record<string, number>) => {
    if (!supabase) return
    const liveRows = nextTexts.filter(p => !demoIds.has(p.id)).map(p => {
      const modifiedAt = p.modifiedAt ?? Date.now()
      return { user_id: userId, id: p.id, payload: { ...p, modifiedAt }, modified_at: modifiedAt, deleted_at: null }
    })
    const deletedRows = Object.entries(nextDeleted).map(([id, deletedAt]) => ({ user_id: userId, id, payload: {}, modified_at: deletedAt, deleted_at: deletedAt }))
    const { error } = await supabase.from('passages').upsert([...liveRows, ...deletedRows], { onConflict: 'user_id,id' })
    if (error) throw error
  }, [])

  const synchronize = useCallback(async (activeSession: Session) => {
    if (!supabase || busy.current) return
    busy.current = true
    setStatus('syncing')
    try {
      const { data, error } = await supabase.from('passages').select('id,payload,modified_at,deleted_at')
      if (error) throw error
      const cloudRows = (data ?? []) as CloudRow[]
      cloudRowsRef.current = cloudRows
      const localById = new Map(textRef.current.filter(p => !demoIds.has(p.id)).map(p => [p.id, p]))
      const nextDeleted = { ...deletedRef.current }
      for (const row of cloudRows) {
        const local = localById.get(row.id)
        const localModified = local?.modifiedAt ?? 0
        if (row.deleted_at !== null) {
          if (local && localModified > row.deleted_at) {
            nextDeleted[row.id] && delete nextDeleted[row.id]
          } else {
            localById.delete(row.id)
            nextDeleted[row.id] = Math.max(nextDeleted[row.id] ?? 0, row.deleted_at)
          }
        } else if ((nextDeleted[row.id] ?? 0) > row.modified_at) {
          localById.delete(row.id)
        } else if (!local || row.modified_at >= localModified) {
          localById.set(row.id, { ...row.payload, modifiedAt: row.modified_at })
          if (nextDeleted[row.id]) delete nextDeleted[row.id]
        }
      }
      const merged = [...localById.values()]
      const before = JSON.stringify(textRef.current)
      const after = JSON.stringify(merged)
      const beforeDeleted = JSON.stringify(deletedRef.current)
      const afterDeleted = JSON.stringify(nextDeleted)
      if (before !== after) setTexts(merged)
      if (beforeDeleted !== afterDeleted) setDeleted(nextDeleted)
      await writeRows(activeSession.user.id, merged, nextDeleted)
      setReady(true)
      setStatus('synced')
      setMessage('Your passages are up to date on this device.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Sync failed. Check your connection and try again.')
    } finally {
      busy.current = false
    }
  }, [setDeleted, setTexts, writeRows])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) { setReady(false); setStatus('signed-out') }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) return
    void synchronize(session)
    const timer = window.setInterval(() => void synchronize(session), 15_000)
    const onFocus = () => { if (document.visibilityState === 'visible') void synchronize(session) }
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onFocus) }
  }, [session, synchronize])

  useEffect(() => {
    if (!session || !ready || !supabase) return
    const timer = window.setTimeout(async () => {
      try { await writeRows(session.user.id, texts, deleted) }
      catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Could not save changes to the cloud.') }
    }, 650)
    return () => window.clearTimeout(timer)
  }, [session, ready, textsKey, deletedKey, texts, deleted, writeRows])

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setStatus('syncing'); setMessage('')
    const result = signup
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error) { setStatus('signed-out'); setMessage(result.error.message); return }
    if (signup && !result.data.session) setMessage('Check your email to confirm your account, then sign in here.')
    else { setSession(result.data.session); setMessage('Account connected. Syncing your passages…') }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null); setReady(false); setStatus('signed-out'); setMessage('Signed out. This device keeps its local copy.')
  }
  const label = status === 'synced' ? 'Synced' : status === 'syncing' ? 'Syncing' : status === 'error' ? 'Sync issue' : status === 'off' ? 'Sync setup' : 'Connect sync'
  const Icon = status === 'synced' ? Check : status === 'off' ? CloudOff : status === 'syncing' ? LoaderCircle : Cloud

  return <>
    <button className={`sync-pill ${status}`} onClick={() => setOpen(true)}><Icon size={14}/><span>{label}</span></button>
    {open && <div className="modal-backdrop sync-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}><section className="modal sync-modal" aria-labelledby="sync-title" aria-modal="true" role="dialog">
      <div className="modal-title"><div><span className="eyebrow">TAHFEEDH CLOUD</span><h2 id="sync-title">Sync your passages</h2></div><button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}><X size={19}/></button></div>
      {!supabase ? <><p className="sync-copy">Cloud sync is ready to connect, but this deployment has no Supabase project configured yet. Add the two public project values to the Vercel environment to turn on accounts and sync.</p><div className="sync-setup"><b>Required Vercel variables</b><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><small>Then run the SQL in <strong>supabase/schema.sql</strong> once in your Supabase project.</small></div></> : session ? <><div className="connected-card"><span className="connected-icon"><Cloud size={18}/></span><div><b>Connected account</b><small>{session.user.email}</small></div></div><div className="sync-state"><span className={`sync-indicator ${status}`}/>{status === 'synced' ? 'Your passages are syncing across devices.' : status === 'error' ? 'Sync needs attention.' : 'Syncing your library…'}</div><div className="sync-actions"><button className="subtle" onClick={() => void synchronize(session)}><RefreshCw size={14}/> Sync now</button><button className="subtle signout" onClick={() => void signOut()}><LogOut size={14}/> Sign out</button></div></> : <><p className="sync-copy">Create an account or sign in on each device to keep one shared library.</p><form className="sync-form" onSubmit={submitAuth}><label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={8} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="primary" type="submit">{signup?'Create account':'Sign in'} <Check size={15}/></button></form><button className="sync-switch" onClick={()=>{setSignup(!signup);setMessage('')}}>{signup?'Already have an account? Sign in':'New to Tahfeedh sync? Create an account'}</button></>}
      {message&&<p className={`sync-message ${status==='error'?'error':''}`}>{message}</p>}
      {session&&<p className="sync-footnote">Your passages are private to your account. Sign in with the same email on your other devices.</p>}
    </section></div>}
  </>
}
