import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Recipe } from '../types'

const difficultyLabel: Record<Recipe['difficulty'], string> = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
}

export function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api.getRecipes()
        if (alive) setRecipes(data)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Lỗi tải recipes')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <p className="muted">Đang tải công thức…</p>
  if (error) {
    return (
      <div className="banner error">
        <strong>Không gọi được API.</strong> {error}
        <p className="hint">
          Kiểm tra gateway (:3000) và Vite proxy <code>/api</code>.
        </p>
      </div>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Công thức</h1>
          <p className="lede">Danh sách món từ recipe-service qua api-gateway.</p>
        </div>
        <Link className="btn primary" to="/recipes/new">
          Thêm món
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="muted">
          Chưa có công thức. Tạo đầu bếp rồi{' '}
          <Link to="/recipes/new">thêm món đầu tiên</Link>.
        </p>
      ) : (
        <ul className="recipe-grid">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link to={`/recipes/${r.id}`} className="recipe-card">
                <div className="recipe-card__meta">
                  <span className={`pill difficulty-${r.difficulty}`}>
                    {difficultyLabel[r.difficulty]}
                  </span>
                  <span>{r.cookTimeMinutes} phút</span>
                </div>
                <h2>{r.title}</h2>
                <p>{r.description}</p>
                <footer>
                  {r.authorName ?? 'Ẩn danh'} · {r.ingredients.length} nguyên liệu
                </footer>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
