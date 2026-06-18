import { Navigate, Route, Routes } from 'react-router-dom'
import { DocsPage } from '../pages/docs'
import { WorkbenchPage } from '../pages/workbench'
import { defaultSample } from '../entities/sample'
import './styles.css'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/samples/${defaultSample.id}`} replace />} />
      <Route path="/samples/:sampleId" element={<WorkbenchPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="*" element={<Navigate to={`/samples/${defaultSample.id}`} replace />} />
    </Routes>
  )
}
