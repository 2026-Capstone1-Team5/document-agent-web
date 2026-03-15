"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Home, FileSearch, Files, Key, Settings, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Parse",
    url: "/upload",
    icon: FileSearch,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: Files,
  },
]

const subItems = [
  {
    title: "API Keys",
    url: "#",
    icon: Key,
    badge: "Soon",
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
    badge: "Later",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-zinc-200 dark:border-zinc-800">
      <SidebarHeader className="px-2 py-4">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <span className="text-xl font-bold">D</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">DocMate</span>
            <span className="text-xs text-zinc-500">document-agent-web</span>
          </div>
        </div>
        <div className="px-2 mt-4">
          <SidebarMenuButton 
            render={<Link href="/upload" />} 
            className={cn(
              "w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg flex items-center justify-center gap-2 shadow-sm",
              pathname === "/upload" && "shadow-lg ring-2 ring-primary/20"
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold text-sm">New Upload</span>
          </SidebarMenuButton>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    render={<Link href={item.url} />} 
                    tooltip={item.title}
                    className={cn(
                      "h-10 px-4 rounded-lg transition-all",
                      isActive 
                        ? "bg-white dark:bg-zinc-800 shadow-md text-primary font-bold border border-zinc-100 dark:border-zinc-700" 
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-zinc-400")} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-4">
          <SidebarMenu>
            {subItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  render={<Link href={item.url} />} 
                  tooltip={item.title}
                  className="h-10 px-4 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <item.icon className="h-4 w-4 text-zinc-400" />
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 leading-none bg-zinc-50 text-zinc-500 border-zinc-200">
                      {item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Avatar className="h-9 w-9 border border-zinc-200">
            <AvatarImage src="" />
            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">N</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">Guest User</span>
            <span className="text-[10px] text-zinc-500 truncate">로그인 기능 연결 예정</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
