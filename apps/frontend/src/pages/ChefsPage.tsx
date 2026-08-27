import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { User } from '../types'

export function ChefsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await api.getUsers()
    setUsers(data)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Lỗi tải users')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setSaving(true)
    try {
      await api.createUser({
        name: name.trim(),
        email: email.trim(),
        bio: bio.trim() || undefined,
      })
      setName('')
      setEmail('')
      setBio('')
      setOk('Đã tạo đầu bếp.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="split">
      <div>
        <h1>Đầu bếp</h1>
        <p className="lede">
          Data từ <code>user-service</code> / <code>users_db</code>.
        </p>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Tên
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Lan Nguyen"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="lan@cook.dev"
            />
          </label>
          <label>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Thích món Việt…"
            />
          </label>
          {error && <div className="banner error">{error}</div>}
          {ok && <div className="banner ok">{ok}</div>}
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Tạo đầu bếp'}
          </button>
        </form>
      </div>

      <div>
        <h2>Danh sách</h2>
        {users.length === 0 ? (
          <p className="muted">Chưa có ai.</p>
        ) : (
          <ul className="chef-list">
            {users.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong>
                <span>{u.email}</span>
                {u.bio && <p>{u.bio}</p>}
                <code className="id">{u.id}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
