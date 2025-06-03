import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d"

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case "1d":
        startDate = new Date(now.setDate(now.getDate() - 1))
        break
      case "30d":
        startDate = new Date(now.setDate(now.getDate() - 30))
        break
      case "90d":
        startDate = new Date(now.setDate(now.getDate() - 90))
        break
      case "7d":
      default:
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
    }

    const startDateStr = startDate.toISOString()
    const today = new Date().toISOString().split("T")[0]

    // Get total leads
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("id, created_at, step")
      .gte("created_at", startDateStr)

    if (leadsError) throw leadsError

    // Get today's leads
    const todayLeads =
      leadsData?.filter((lead) => new Date(lead.created_at).toISOString().split("T")[0] === today) || []

    // Get online users
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("active_sessions")
      .select("id")
      .gte("last_activity", fiveMinutesAgo)

    if (sessionsError) throw sessionsError

    // Get funnel steps
    const funnelSteps = [
      { name: "Página Inicial", step: "home" },
      { name: "Quiz", step: "quiz" },
      { name: "Formulário", step: "form" },
      { name: "Aprovação", step: "approved" },
      { name: "Confirmação", step: "completed" },
    ]

    const funnel = funnelSteps.map(({ name, step }) => {
      const count = leadsData?.filter((lead) => lead.step === step).length || 0
      const percentage = leadsData?.length ? Math.round((count / leadsData.length) * 100) : 0
      return { name, count, percentage }
    })

    // Get daily conversions
    const dailyData: Record<string, number> = {}
    const daysInPeriod = period === "1d" ? 1 : period === "30d" ? 30 : period === "90d" ? 90 : 7

    for (let i = 0; i < daysInPeriod; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      dailyData[dateStr] = 0
    }

    leadsData?.forEach((lead) => {
      const dateStr = new Date(lead.created_at).toISOString().split("T")[0]
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr]++
      }
    })

    const dailyConversions = Object.entries(dailyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get events by type
    const { data: eventsData, error: eventsError } = await supabase
      .from("funnel_events")
      .select("event_type")
      .gte("timestamp", startDateStr)

    if (eventsError) throw eventsError

    const eventCounts: Record<string, number> = {}
    eventsData?.forEach((event) => {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1
    })

    const eventsByType = Object.entries(eventCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    // Get UTM sources
    const { data: utmData, error: utmError } = await supabase
      .from("leads")
      .select("utm_source")
      .not("utm_source", "is", null)
      .gte("created_at", startDateStr)

    if (utmError) throw utmError

    const utmCounts: Record<string, number> = {}
    utmData?.forEach((lead) => {
      if (lead.utm_source) {
        utmCounts[lead.utm_source] = (utmCounts[lead.utm_source] || 0) + 1
      }
    })

    // Add "direct" for null utm_source
    const directCount = leadsData?.length - (utmData?.length || 0)
    if (directCount > 0) {
      utmCounts["direct"] = directCount
    }

    const utmSources = Object.entries(utmCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate conversion rate
    const conversionRate = leadsData?.length ? Math.round((todayLeads.length / leadsData.length) * 100) : 0

    return NextResponse.json({
      summary: {
        totalLeads: leadsData?.length || 0,
        leadsToday: todayLeads.length,
        onlineUsers: sessionsData?.length || 0,
        conversionRate,
        period: period,
      },
      funnel,
      dailyConversions,
      eventsByType,
      utmSources,
    })
  } catch (error) {
    console.error("Error in stats API:", error)
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 })
  }
}
