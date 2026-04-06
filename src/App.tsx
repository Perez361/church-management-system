import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { MembersPage } from "@/pages/members/MembersPage";
import { TithePage } from "@/pages/tithe/TithePage";
import { OfferingsPage } from "@/pages/offerings/OfferingsPage";
import { WelfarePage } from "@/pages/welfare/WelfarePage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/tithe" element={<TithePage />} />
          <Route path="/offerings" element={<OfferingsPage />} />
          <Route path="/welfare" element={<WelfarePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;