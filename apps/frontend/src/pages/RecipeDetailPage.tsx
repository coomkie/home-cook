import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Recipe } from '../types'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    ;(async () => {
      try {
        const data = await api.getRecipe(id)
        if (alive) setRecipe(data)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Không tải được')
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  if (error) return <div className="banner error">{error}</div>
  if (!recipe) return <p className="muted">Đang tải…</p>

  return (
    <article className="detail">
      <Link to="/" className="back">
        ← Công thức
      </Link>
      <h1>{recipe.title}</h1>
      <p className="lede">{recipe.description}</p>
      <p className="detail__meta">
        {recipe.authorName ?? 'Ẩn danh'} · {recipe.cookTimeMinutes} phút ·{' '}
        {recipe.difficulty}
      </p>

      <h2>Nguyên liệu</h2>
      <ul className="ingredients">
        {recipe.ingredients.map((ing, i) => (
          <li key={`${ing.name}-${i}`}>
            <span>{ing.name}</span>
            <span>{ing.amount}</span>
          </li>
        ))}
      </ul>

      <h2>Các bước</h2>
      <ol className="steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </article>
  )
}
