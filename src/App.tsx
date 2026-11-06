import { Navigate, Route, Routes } from "react-router";
import TabLayout from "./layouts/TabLayout";
import TodayScreen from "./screens/TodayScreen";
import MatrixScreen from "./screens/MatrixScreen";
import TaskDetailScreen from "./screens/TaskDetailScreen";
import CalendarScreen from "./screens/CalendarScreen";
import FocusScreen from "./screens/FocusScreen";

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/tasks" element={<MatrixScreen />} />
        <Route path="/calendar" element={<CalendarScreen />} />
      </Route>
      <Route path="/focus" element={<FocusScreen />} />
      <Route path="/tasks/:taskId" element={<TaskDetailScreen />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}