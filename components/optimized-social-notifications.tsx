"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface Notification {
  id: string
  name: string
  action: string
  location: string
  timeAgo: string
  avatar: string
}

interface OptimizedSocialNotificationsProps {
  maxNotifications?: number
  displayDuration?: number
  intervalRange?: [number, number]
  enableDebug?: boolean
}

export function OptimizedSocialNotifications({
  maxNotifications = 8, // Reduced from 15
  displayDuration = 4000, // Reduced from 6000
  intervalRange = [20000, 35000], // Increased from [8000, 15000]
  enableDebug = false,
}: OptimizedSocialNotificationsProps) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isActive, setIsActive] = useState(true)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isTabActive = !document.hidden
      setIsActive(isTabActive)

      if (enableDebug) {
        console.log(
          `🔔 Social notifications ${isTabActive ? "resumed" : "paused"} - tab ${isTabActive ? "active" : "inactive"}`,
        )
      }

      if (!isTabActive) {
        // Clear current notification when tab becomes inactive
        setCurrentNotification(null)
        if (displayTimeoutRef.current) {
          clearTimeout(displayTimeoutRef.current)
          displayTimeoutRef.current = null
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableDebug])

  const notifications: Notification[] = [
    {
      id: "1",
      name: "Maria Silva",
      action: "recebeu seu Cartão SHEIN",
      location: "São Paulo, SP",
      timeAgo: "2 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "2",
      name: "João Santos",
      action: "ativou a conta digital",
      location: "Rio de Janeiro, RJ",
      timeAgo: "5 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "3",
      name: "Ana Costa",
      action: "fez primeira compra",
      location: "Belo Horizonte, MG",
      timeAgo: "8 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "4",
      name: "Pedro Lima",
      action: "recebeu cashback",
      location: "Salvador, BA",
      timeAgo: "12 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "5",
      name: "Carla Oliveira",
      action: "aprovou o cartão",
      location: "Fortaleza, CE",
      timeAgo: "15 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "6",
      name: "Lucas Ferreira",
      action: "fez PIX sem taxa",
      location: "Porto Alegre, RS",
      timeAgo: "18 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "7",
      name: "Juliana Rocha",
      action: "parcelou sem juros",
      location: "Recife, PE",
      timeAgo: "22 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "8",
      name: "Rafael Alves",
      action: "desbloqueou benefícios",
      location: "Curitiba, PR",
      timeAgo: "25 min atrás",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  const showNotification = () => {
    // Stop if reached max notifications or tab is not active
    if (notificationCount >= maxNotifications || !isActive) {
      if (enableDebug) {
        console.log(`🔔 Stopping notifications - count: ${notificationCount}/${maxNotifications}, active: ${isActive}`)
      }
      return
    }

    // Select random notification
    const randomNotification = notifications[Math.floor(Math.random() * notifications.length)]
    setCurrentNotification(randomNotification)
    setNotificationCount((prev) => prev + 1)

    if (enableDebug) {
      console.log(`🔔 Showing notification ${notificationCount + 1}/${maxNotifications}:`, randomNotification.name)
    }

    // Hide notification after display duration
    displayTimeoutRef.current = setTimeout(() => {
      setCurrentNotification(null)
    }, displayDuration)

    // Schedule next notification
    if (notificationCount < maxNotifications - 1) {
      const nextInterval = Math.random() * (intervalRange[1] - intervalRange[0]) + intervalRange[0]

      timeoutRef.current = setTimeout(() => {
        if (isActive) {
          showNotification()
        }
      }, nextInterval)
    }
  }

  const hideNotification = () => {
    setCurrentNotification(null)
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current)
      displayTimeoutRef.current = null
    }
  }

  // Start notifications after initial delay
  useEffect(() => {
    if (!isActive) return

    const initialDelay = Math.random() * (intervalRange[1] - intervalRange[0]) + intervalRange[0]

    timeoutRef.current = setTimeout(() => {
      if (isActive) {
        showNotification()
      }
    }, initialDelay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current)
      }
    }
  }, [isActive])

  // Reset when tab becomes active again
  useEffect(() => {
    if (isActive && notificationCount >= maxNotifications) {
      // Reset counter after tab becomes active again
      setTimeout(() => {
        setNotificationCount(0)
        if (enableDebug) {
          console.log("🔔 Reset notification counter")
        }
      }, 30000) // Reset after 30 seconds
    }
  }, [isActive, notificationCount, maxNotifications, enableDebug])

  if (!currentNotification || !isActive) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-left duration-500">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <img
            src={currentNotification.avatar || "/placeholder.svg"}
            alt={currentNotification.name}
            className="w-10 h-10 rounded-full bg-gray-200"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">{currentNotification.name}</p>
                <p className="text-sm text-gray-600">{currentNotification.action}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentNotification.location} • {currentNotification.timeAgo}
                </p>
              </div>
              <button onClick={hideNotification} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
