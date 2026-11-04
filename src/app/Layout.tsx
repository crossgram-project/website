import { NavLink, Outlet } from 'react-router-dom'
import { nav, site } from '../data/site'
import './layout.css'

function Mark() {
  return (
    <svg className="brand-mark" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 1.8v16.4M1.8 10h16.4" stroke="var(--brand)" strokeWidth="1.5" />
    </svg>
  )
}

function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <div className="nav-shell">
          <NavLink to="/" className="brand" aria-label="CrossGram 首页">
            <Mark />
            <span className="brand-name">CrossGram</span>
          </NavLink>
          <nav className="site-nav" aria-label="主导航">
            {nav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <a className="nav-link external" href={site.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="footer-brand">
          <Mark />
          <span className="meta">© {new Date().getFullYear()} CrossGram</span>
        </div>
        <nav className="footer-links" aria-label="页脚导航">
          <NavLink to="/downloads">下载</NavLink>
          <NavLink to="/docs">部署文档</NavLink>
          <a href={site.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
