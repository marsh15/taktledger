import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import RecordsPage from "./pages/RecordsPage";
import ReviewPage from "./pages/ReviewPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/uploads/:uploadId/review" element={<ReviewPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
