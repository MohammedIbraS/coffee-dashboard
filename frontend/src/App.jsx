import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { MenuDashboard } from "./components/Menu/MenuDashboard";
import { ChatPanel } from "./components/Chatbot/ChatPanel";
import "./App.css";

function App() {
  const [tab, setTab] = useState("analytics");
  const [pinnedCharts, setPinnedCharts] = useState([]);
  const [pinnedMenuCharts, setPinnedMenuCharts] = useState([]);
  const [toast, setToast] = useState(null); // null | string
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleChartGenerated = (spec) => {
    const entry = { id: Date.now(), spec };
    if (spec.dataset === "menu") {
      setPinnedMenuCharts((prev) => [...prev, entry]);
      setTab("menu");
      setToast("Chart pinned to Menu dashboard");
    } else {
      setPinnedCharts((prev) => [...prev, entry]);
      setTab("analytics");
      setToast("Chart pinned to Analytics dashboard");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleReorderCharts = (reordered) => setPinnedCharts(reordered);
  const handleRenameChart = (id, title) =>
    setPinnedCharts((p) => p.map((c) => c.id === id ? { ...c, spec: { ...c.spec, title } } : c));

  const handleReorderMenuCharts = (reordered) => setPinnedMenuCharts(reordered);
  const handleRenameMenuChart = (id, title) =>
    setPinnedMenuCharts((p) => p.map((c) => c.id === id ? { ...c, spec: { ...c.spec, title } } : c));

  return (
    <div className="app-layout">
      <div className="dashboard-area">
        <div className="tab-bar">
          <button className={`tab-btn ${tab === "analytics" ? "tab-active" : ""}`} onClick={() => setTab("analytics")}>
            ☕ Analytics
          </button>
          <button className={`tab-btn ${tab === "menu" ? "tab-active" : ""}`} onClick={() => setTab("menu")}>
            📋 Menu Profitability
          </button>
          <div style={{ flex: 1 }} />
          <button className="tab-btn" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        <div className="tab-content">
          {tab === "analytics" ? (
            <Dashboard
              pinnedCharts={pinnedCharts}
              onDismissChart={(id) => setPinnedCharts((p) => p.filter((c) => c.id !== id))}
              onClearAllCharts={() => setPinnedCharts([])}
              onReorderCharts={handleReorderCharts}
              onRenameChart={handleRenameChart}
            />
          ) : (
            <MenuDashboard
              pinnedCharts={pinnedMenuCharts}
              onDismissChart={(id) => setPinnedMenuCharts((p) => p.filter((c) => c.id !== id))}
              onClearAllCharts={() => setPinnedMenuCharts([])}
              onReorderCharts={handleReorderMenuCharts}
              onRenameChart={handleRenameMenuChart}
            />
          )}
        </div>
      </div>
      <ChatPanel onChartGenerated={handleChartGenerated} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
