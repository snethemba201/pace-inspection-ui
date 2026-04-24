import { useState } from "react";
import DynamicForm from "./DynamicForm";

import RENTAL from "./rental.json";
import SUPPLIER from "./supplier.json";
import SITE from "./site.json";

const inspections = [
  {
    id: "rental",
    name: "Rental Inspection",
    icon: "🚗",
    subtitle: "Complete vehicle rental checks",
    data: RENTAL,
  },
  {
    id: "supplier",
    name: "Supplier Inspection",
    icon: "🚚",
    subtitle: "Complete supplier checks",
    data: SUPPLIER,
  },
  {
    id: "site",
    name: "Site Inspection",
    icon: "🏢",
    subtitle: "Complete site inspection checks",
    data: SITE,
  },
];

export default function App() {
  const [selected, setSelected] = useState(inspections[0]);
  const [menuOpen, setMenuOpen] = useState(true);
  const [menuMode, setMenuMode] = useState("all");

  const visibleMenuItems = menuMode === "all" ? inspections : [selected];

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      background: "#0b141a",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {menuOpen && (
        <div style={{
          width: 340,
          background: "#111b21",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <div style={{
            background: "#1B365D",
            color: "#fff",
            padding: "18px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
              }}
            >
              ☰
            </button>

            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Pace Auto Group
              </div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                Inspection Management System
              </div>
            </div>
          </div>

          {menuMode === "current" && (
            <div
              onClick={() => setMenuMode("all")}
              style={{
                padding: "13px 16px",
                color: "#F37A1F",
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ← All inspections
            </div>
          )}

          {visibleMenuItems.map(item => (
            <div
              key={item.id}
              onClick={() => {
                setSelected(item);
                setMenuMode("current");
                setMenuOpen(false);
              }}
              style={{
                display: "flex",
                gap: 12,
                padding: "16px",
                cursor: "pointer",
                background: selected.id === item.id ? "#2a3942" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#F37A1F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}>
                {item.icon}
              </div>

              <div>
                <div style={{
                  color: "#e9edef",
                  fontWeight: 700,
                  fontSize: 15,
                }}>
                  {item.name}
                </div>

                <div style={{
                  color: "rgba(233,237,239,0.6)",
                  fontSize: 12,
                  marginTop: 4,
                }}>
                  {item.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        {!menuOpen && (
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 20,
              width: 42,
              height: 42,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#1B365D",
              color: "#fff",
              fontSize: 22,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            ☰
          </button>
        )}

        <DynamicForm key={selected.id} data={selected.data} />
      </div>
    </div>
  );
}