"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Activity, Download, RefreshCw, Eye, Phone, Mail, MapPin } from "lucide-react"

interface Lead {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  step: string
  status: string
  created_at: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

interface Session {
  id: string
  session_id: string
  current_page: string
  user_agent: string
  ip_address: string
  last_activity: string
  created_at: string
}

interface Event {
  id: string
  session_id: string
  event_type: string
  page: string
  timestamp: string
  event_data: any
}

interface Stats {
  totalLeads: number
  todayLeads: number
  onlineUsers: number
  conversionRate: number
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    todayLeads: 0,
    onlineUsers: 0,
    conversionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "sessions" | "events">("overview")

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch leads
      const leadsResponse = await fetch("/api/leads")
      const leadsData = await leadsResponse.json()
      setLeads(leadsData.leads || [])

      // Fetch sessions
      const sessionsResponse = await fetch("/api/sessions")
      const sessionsData = await sessionsResponse.json()
      setSessions(sessionsData.sessions || [])

      // Fetch events
      const eventsResponse = await fetch("/api/events")
      const eventsData = await eventsResponse.json()
      setEvents(eventsData.events || [])

      // Calculate stats
      const today = new Date().toDateString()
      const todayLeads =
        leadsData.leads?.filter((lead: Lead) => new Date(lead.created_at).toDateString() === today).length || 0

      const totalLeads = leadsData.leads?.length || 0
      const onlineUsers = sessionsData.count || 0
      const conversionRate = totalLeads > 0 ? (todayLeads / totalLeads) * 100 : 0

      setStats({
        totalLeads,
        todayLeads,
        onlineUsers,
        conversionRate,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Auto refresh a cada 10 segundos para usuários online
    const interval = setInterval(() => {
      fetchData()
      console.log("🔄 Admin: Atualizando dados...")
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const exportLeads = () => {
    const csvContent = [
      ["Nome", "Email", "CPF", "Telefone", "Etapa", "Status", "Data", "UTM Source", "UTM Medium", "UTM Campaign"],
      ...leads.map((lead) => [
        lead.name || "",
        lead.email || "",
        lead.cpf || "",
        lead.phone || "",
        lead.step || "",
        lead.status || "",
        new Date(lead.created_at).toLocaleString("pt-BR"),
        lead.utm_source || "",
        lead.utm_medium || "",
        lead.utm_campaign || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `leads_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const getStepBadgeColor = (step: string) => {
    const colors: { [key: string]: string } = {
      home: "bg-blue-100 text-blue-800",
      quiz: "bg-purple-100 text-purple-800",
      form: "bg-orange-100 text-orange-800",
      approved: "bg-green-100 text-green-800",
      completed: "bg-emerald-100 text-emerald-800",
    }
    return colors[step] || "bg-gray-100 text-gray-800"
  }

  const formatUserAgent = (userAgent: string) => {
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      return "📱 Mobile"
    }
    if (userAgent.includes("Chrome")) return "🌐 Chrome"
    if (userAgent.includes("Firefox")) return "🦊 Firefox"
    if (userAgent.includes("Safari")) return "🧭 Safari"
    return "💻 Desktop"
  }

  console.log("📊 Admin Stats:", {
    totalLeads: stats.totalLeads,
    todayLeads: stats.todayLeads,
    onlineUsers: stats.onlineUsers,
    sessionsCount: sessions.length,
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-gray-600">Monitore leads e usuários online em tempo real</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={exportLeads} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Online</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.onlineUsers}</div>
              <p className="text-xs text-muted-foreground">Ativos nos últimos 5 min</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Todos os tempos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Hoje</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.todayLeads}</div>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Hoje vs total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "Visão Geral", icon: Activity },
                { id: "leads", label: "Leads", icon: UserPlus },
                { id: "sessions", label: "Usuários Online", icon: Users },
                { id: "events", label: "Eventos", icon: Eye },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Últimos Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {leads.slice(0, 5).map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{lead.name || "Nome não informado"}</p>
                            <p className="text-sm text-gray-600">{lead.email}</p>
                          </div>
                          <Badge className={getStepBadgeColor(lead.step)}>{lead.step}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usuários Online Agora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{session.current_page || "Página inicial"}</p>
                            <p className="text-sm text-gray-600">{formatUserAgent(session.user_agent)}</p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.last_activity).toLocaleTimeString("pt-BR")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "leads" && (
              <Card>
                <CardHeader>
                  <CardTitle>Todos os Leads ({leads.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Telefone</th>
                          <th className="text-left p-2">Etapa</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Data</th>
                          <th className="text-left p-2">UTM Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => (
                          <tr key={lead.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div className="flex items-center">
                                <UserPlus className="w-4 h-4 mr-2 text-gray-400" />
                                {lead.name || "N/A"}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                {lead.email || "N/A"}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                {lead.phone || "N/A"}
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge className={getStepBadgeColor(lead.step)}>{lead.step}</Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline">{lead.status}</Badge>
                            </td>
                            <td className="p-2 text-gray-600">{new Date(lead.created_at).toLocaleString("pt-BR")}</td>
                            <td className="p-2 text-gray-600">{lead.utm_source || "Direto"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "sessions" && (
              <Card>
                <CardHeader>
                  <CardTitle>Usuários Online ({sessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Página Atual</th>
                          <th className="text-left p-2">Dispositivo</th>
                          <th className="text-left p-2">IP</th>
                          <th className="text-left p-2">Última Atividade</th>
                          <th className="text-left p-2">Sessão Iniciada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((session) => (
                          <tr key={session.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-2 text-gray-400" />
                                {session.current_page || "/"}
                              </div>
                            </td>
                            <td className="p-2">{formatUserAgent(session.user_agent)}</td>
                            <td className="p-2">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                {session.ip_address}
                              </div>
                            </td>
                            <td className="p-2 text-gray-600">
                              {new Date(session.last_activity).toLocaleString("pt-BR")}
                            </td>
                            <td className="p-2 text-gray-600">
                              {new Date(session.created_at).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "events" && (
              <Card>
                <CardHeader>
                  <CardTitle>Últimos Eventos ({events.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Tipo de Evento</th>
                          <th className="text-left p-2">Página</th>
                          <th className="text-left p-2">Sessão</th>
                          <th className="text-left p-2">Data/Hora</th>
                          <th className="text-left p-2">Dados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((event) => (
                          <tr key={event.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <Badge variant="outline">{event.event_type}</Badge>
                            </td>
                            <td className="p-2">{event.page || "N/A"}</td>
                            <td className="p-2 font-mono text-xs">{event.session_id.substring(0, 8)}...</td>
                            <td className="p-2 text-gray-600">{new Date(event.timestamp).toLocaleString("pt-BR")}</td>
                            <td className="p-2 text-xs text-gray-500">
                              {JSON.stringify(event.event_data).substring(0, 50)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
