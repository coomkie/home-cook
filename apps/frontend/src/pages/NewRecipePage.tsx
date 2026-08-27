import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Difficulty, Ingredient, User } from '../types'

const emptyIngredient = (): Ingredient => ({ name: '', amount: '' })

export function NewRecipePage() {
  const navigate = useNavigate()
  const [chefs, setChefs] = useState<User[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [cookTimeMinutes, setCookTimeMinutes] = useState(30)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    emptyIngredient(),
  ])
  const [stepsText, setStepsText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api.getUsers()
        if (!alive) return
        setChefs(data)
        if (data[0]) setAuthorId(data[0].id)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Lỗi tải chefs')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    const cleanIngredients = ingredients.filter(
      (i) => i.name.trim() && i.amount.trim(),
    )

    if (!authorId) {
      setError('Cần chọn đầu bếp. Tạo ở trang Đầu bếp trước.')
      return
    }
    if (cleanIngredients.length === 0) {
      setError('Thêm ít nhất 1 nguyên liệu.')
      return
    }
    if (steps.length === 0) {
      setError('Thêm ít nhất 1 bước (mỗi dòng một bước).')
      return
    }

    setSaving(true)
    try {
      const recipe = await api.createRecipe({
        title: title.trim(),
        description: description.trim(),
        ingredients: cleanIngredients,
        steps,
        cookTimeMinutes: Number(cookTimeMinutes),
        difficulty,
        authorId,
      })
      navigate(`/recipes/${recipe.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Link to="/" className="back">
        ← Công thức
      </Link>
      <h1>Thêm món</h1>
      <p className="lede">
        Submit → gateway → recipe-service → (HTTP) user-service kiểm tra author.
      </p>

      {chefs.length === 0 && (
        <div className="banner error">
          Chưa có đầu bếp.{' '}
          <Link to="/chefs">Tạo đầu bếp</Link> trước khi thêm món.
        </div>
      )}

      <form className="form form--wide" onSubmit={onSubmit}>
        <label>
          Tiêu đề
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            placeholder="Phở bò"
          />
        </label>

        <label>
          Mô tả
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            rows={3}
            placeholder="Phở bò truyền thống Hà Nội…"
          />
        </label>

        <div className="row">
          <label>
            Đầu bếp
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              required
            >
              {chefs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thời gian (phút)
            <input
              type="number"
              min={1}
              value={cookTimeMinutes}
              onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Độ khó
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Dễ</option>
              <option value="medium">Vừa</option>
              <option value="hard">Khó</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend>Nguyên liệu</legend>
          {ingredients.map((ing, i) => (
            <div className="row" key={i}>
              <input
                placeholder="Tên"
                value={ing.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
              />
              <input
                placeholder="Số lượng"
                value={ing.amount}
                onChange={(e) =>
                  updateIngredient(i, { amount: e.target.value })
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() => setIngredients((p) => [...p, emptyIngredient()])}
          >
            + Nguyên liệu
          </button>
        </fieldset>

        <label>
          Các bước (mỗi dòng một bước)
          <textarea
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={5}
            placeholder={'Hầm xương 6 tiếng\nTrụng bánh phở\nChan nước dùng'}
          />
        </label>

        {error && <div className="banner error">{error}</div>}

        <button
          className="btn primary"
          type="submit"
          disabled={saving || chefs.length === 0}
        >
          {saving ? 'Đang lưu…' : 'Lưu công thức'}
        </button>
      </form>
    </section>
  )
}
