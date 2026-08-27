import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ChefsPage } from './pages/ChefsPage'
import { NewRecipePage } from './pages/NewRecipePage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipesPage } from './pages/RecipesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<RecipesPage />} />
          <Route path="recipes/new" element={<NewRecipePage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="chefs" element={<ChefsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
