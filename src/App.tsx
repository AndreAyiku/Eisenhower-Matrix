import { Navigate, Route, Routes } from "react-router";
import TabLayout from "./layouts/TabLayout";
import MatrixScreen from "./screens/MatrixScreen";
import ComingSoon from "./screens/ComingSoon";

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/today" element={<ComingSoon title="Today" />} />
        <Route path="/tasks" element={<MatrixScreen />} />
        <Route path="/calendar" element={<ComingSoon title="Calendar" />} />
        <Route path="/focus" element={<ComingSoon title="Focus" />} />
        <Route path="/insights" element={<ComingSoon title="Insights" />} />
      </Route>
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}