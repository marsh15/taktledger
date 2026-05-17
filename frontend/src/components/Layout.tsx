import { BarChart3, ClipboardCheck, History, UploadCloud, Warehouse } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/history", label: "History", icon: History },
  { to: "/records", label: "Records", icon: ClipboardCheck }
];

export function Layout() {
  return (
    <div className="min-h-screen bg-[#EEF1EB] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-[#FAFBF7] p-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
            <Warehouse size={21} />
          </div>
          <div>
            <div className="text-lg font-semibold">TaktLedger</div>
            <div className="text-xs uppercase tracking-wide text-steel">Shop-floor records</div>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-ink text-white" : "text-steel hover:bg-[#E7EBE2] hover:text-ink"
                  }`
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-[#FAFBF7]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink text-white">
              <Warehouse size={19} />
            </div>
            <div className="font-semibold">TaktLedger</div>
          </div>
          <nav className="grid grid-cols-4 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex h-10 items-center justify-center rounded-md ${
                      isActive ? "bg-ink text-white" : "bg-[#E7EBE2] text-steel"
                    }`
                  }
                  title={item.label}
                >
                  <Icon size={18} />
                </NavLink>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
