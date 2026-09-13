import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Hotel,
  Users,
  ShieldCheck,
  Settings,
  UserRound,
  CalendarRange,
  BedDouble,
  Tags,
  DollarSign,
  CalendarCheck,
  Briefcase,
  UserPlus,
  FileText,
  MessageSquare,
  Plug,
  ListTree,
  RefreshCw,
  Webhook,
  History,
  Bell,
  FolderOpen,
  Sparkles,
  BookOpen,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Core",
    items: [
      { label: "Organizations", href: "/organizations", icon: Building2 },
      { label: "Properties", href: "/properties", icon: Hotel },
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
      { label: "System Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    title: "Master Data",
    items: [
      { label: "Guests", href: "/guests", icon: UserRound },
      { label: "Reservations", href: "/reservations", icon: CalendarRange },
      { label: "Rooms", href: "/rooms", icon: BedDouble },
      { label: "Room Types", href: "/room-types", icon: Tags },
      { label: "Rate Engine", href: "/rates", icon: DollarSign },
      { label: "Availability", href: "/availability", icon: CalendarCheck },
      { label: "Agents & Companies", href: "/agents", icon: Briefcase },
    ],
  },
  {
    title: "CRM & Sales",
    items: [
      { label: "Leads & Inquiries", href: "/leads", icon: UserPlus },
      { label: "AI Inbox", href: "/ai-inquiries", icon: Sparkles },
      { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
      { label: "Quotations", href: "/quotations", icon: FileText },
      { label: "Communications", href: "/communications", icon: MessageSquare },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "App Connections", href: "/integrations/connections", icon: Plug },
      { label: "Event Logs", href: "/integrations/events", icon: ListTree },
      { label: "Sync Monitor", href: "/integrations/sync", icon: RefreshCw },
      { label: "Webhooks & API", href: "/integrations/api", icon: Webhook },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Audit Logs", href: "/audit-logs", icon: History },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Files & Documents", href: "/files", icon: FolderOpen },
    ],
  },
];
