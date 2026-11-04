import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './Layout'
import Home from '../pages/Home'
import Downloads from '../pages/Downloads'
import DocsIndex from '../pages/docs/DocsIndex'
import DocsLinux from '../pages/docs/DocsLinux'
import DocsWindows from '../pages/docs/DocsWindows'
import NotFound from '../pages/NotFound'
import { pageTitle } from '../data/site'

function useDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pageTitle(pathname)
  }, [pathname])
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  useDocumentTitle()
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="downloads" element={<Downloads />} />
          <Route path="docs" element={<DocsIndex />} />
          <Route path="docs/linux" element={<DocsLinux />} />
          <Route path="docs/windows" element={<DocsWindows />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
