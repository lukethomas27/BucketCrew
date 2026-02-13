"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Workspace, Subscription } from "@/types"

interface WorkspaceContextValue {
  workspace: Workspace | null
  subscription: Subscription | null
  userId: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  subscription: null,
  userId: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspace = useCallback(async () => {
    try {
      setError(null)
      const supabase = createClient()

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push("/login")
        return
      }

      setUserId(user.id)

      const { data: workspaces, error: wsError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)

      if (wsError) {
        setError("Failed to load workspace")
        return
      }

      if (!workspaces || workspaces.length === 0) {
        setError("No workspace found. Please contact support.")
        return
      }

      const ws = workspaces[0] as Workspace
      setWorkspace(ws)

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", ws.id)
        .single()

      if (sub) {
        setSubscription(sub as Subscription)
      }
    } catch {
      setError("Something went wrong loading your workspace")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        subscription,
        userId,
        loading,
        error,
        refresh: loadWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return ctx
}
