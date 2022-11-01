import React from 'react'
import logo from './logo.svg'
import './App.css'
import StudentPage from './pages/Dao'
import RankPage from './pages/rank'
import { Routes, Route } from 'react-router-dom'
function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentPage />} />
      <Route path="/ranking" element={<RankPage />} />
    </Routes>
  )
}

export default App
