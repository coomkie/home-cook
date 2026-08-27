import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Bếp Nhà
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Công thức
          </NavLink>
          <NavLink
            to="/recipes/new"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Thêm món
          </NavLink>
          <NavLink
            to="/chefs"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Đầu bếp
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
