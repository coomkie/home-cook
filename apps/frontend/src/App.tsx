import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { I18nProvider } from './i18n/I18nContext'
import { ChefsPage } from './pages/ChefsPage'
import { ExplorePage } from './pages/ExplorePage'
import { LoginPage } from './pages/LoginPage'
import { ModerationPage } from './pages/ModerationPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipesPage } from './pages/RecipesPage'
import { RegisterPage } from './pages/RegisterPage'
import { StudioEditorPage } from './pages/StudioEditorPage'
import { StudioPage } from './pages/StudioPage'

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            richColors
            closeButton
            duration={3200}
            toastOptions={{ className: 'app-toast' }}
          />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<RecipesPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="studio" element={<StudioPage />} />
              <Route path="studio/recipes/:id" element={<StudioEditorPage />} />
              <Route path="studio/moderation" element={<ModerationPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="recipes/new" element={<Navigate to="/studio" replace />} />
              <Route path="recipes/:id" element={<RecipeDetailPage />} />
              <Route path="chefs" element={<ChefsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}
