import { Navigate, Route, Routes } from "react-router";
import TabLayout from "./layouts/TabLayout";
import MatrixScreen from "./screens/MatrixScreen";
import TaskDetailScreen from "./screens/TaskDetailScreen";
import ComingSoon from "./screens/ComingSoon";
import CalendarScreen from "./screens/CalenderScreen";

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/today" element={<ComingSoon title="Today" />} />
        <Route path="/tasks" element={<MatrixScreen />} />
      
        <Route path="/focus" element={<ComingSoon title="Focus" />} />
        <Route path="/insights" element={<ComingSoon title="Insights" />} />
        <Route path="/calendar" element={<CalendarScreen />}/>
      </Route>
      <Route path="/tasks/:taskId" element={<TaskDetailScreen />} />
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}