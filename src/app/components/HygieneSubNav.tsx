import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/app/hygiene/scan", label: "Scan" },
  { to: "/app/hygiene/queue", label: "Action Queue" },
  { to: "/app/hygiene/history", label: "History" },
];

export const HygieneSubNav = () => (
  <div className="flex gap-1 mb-6 border-b border-border">
    {tabs.map((t) => (
      <NavLink
        key={t.to}
        to={t.to}
        className={({ isActive }) =>
          `px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            isActive
              ? "border-cyan-400 text-cyan-300"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`
        }
      >
        {t.label}
      </NavLink>
    ))}
  </div>
);
