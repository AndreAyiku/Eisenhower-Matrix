import { Outlet } from "react-router";
import BottomNav from "../components/BottomNav";

export default function TabLayout() {
  return (
    <div className="app">
      <Outlet />
      <BottomNav />
    </div>
  );
}