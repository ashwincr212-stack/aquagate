import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout.jsx'
import PublicLayout from './components/PublicLayout.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminPrograms from './pages/AdminPrograms.jsx'
import AdminQuestions from './pages/AdminQuestions.jsx'
import AdminRules from './pages/AdminRules.jsx'
import AdminSubmissions from './pages/AdminSubmissions.jsx'
import Assessment from './pages/Assessment.jsx'
import Enroll from './pages/Enroll.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Result from './pages/Result.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/enroll/:programSlug" element={<Enroll />} />
          <Route path="/register/:programSlug" element={<Register />} />
          <Route path="/assessment/:programSlug" element={<Assessment />} />
          <Route path="/result/:submissionId" element={<Result />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="programs" element={<AdminPrograms />} />
          <Route path="questions" element={<AdminQuestions />} />
          <Route path="rules" element={<AdminRules />} />
          <Route path="submissions" element={<AdminSubmissions />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
