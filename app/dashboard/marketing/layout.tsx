"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Library, Megaphone, Newspaper, Lightbulb, CalendarDays, Settings2 } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard/marketing",            label: "Hub",          icon: LayoutDashboard },
  { href: "/dashboard/marketing/biblioteca", label: "Biblioteca",   icon: Library },
  { href: "/dashboard/marketing/campanhas",  label: "Campanhas",    icon: Megaphone },
  { href: "/dashboard/marketing/calendario", label: "Calendário",   icon: CalendarDays },
  { href: "/dashboard/marketing/sugestoes",  label: "Sugestões IA", icon: Lightbulb },
  { href: "/dashboard/marketing/noticias",   label: "Notícias",     icon: Newspaper },
];

const ADMIN_NAV = { href: "/dashboard/marketing/admin", label: "Admin", icon: Settings2 };

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "FRANQUEADORA";

  const navItems = isAdmin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <div className="min-h-full">
      {/* Header do Marketing Hub */}
      <div className="bg-[#0D2B5C] text-white px-4 py-4 mb-4 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">📣 Marketing Hub</h1>
            <p className="text-blue-200 text-xs mt-0.5">Centro de Marketing Inteligente da Rede Smarter</p>
          </div>
          <span className="bg-[#F4B400] text-[#0D2B5C] text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
            {isAdmin ? "Admin" : "Franqueado"}
          </span>
        </div>

        {/* Sub-navegação */}
        <div className="flex gap-1 mt-4 overflow-x-auto scrollbar-none pb-0.5">
          {navItems.map(item => {
            const active = path === item.href || (item.href !== "/dashboard/marketing" && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                  active
                    ? "bg-[#F4B400] text-[#0D2B5C]"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon size={13} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
