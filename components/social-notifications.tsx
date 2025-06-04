"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, CreditCard, Package, CheckCircle, Truck } from "lucide-react"

interface Notification {
  id: string
  name: string
  state: string
  action: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
}

const names = [
  "Maria Silva",
  "João Santos",
  "Ana Costa",
  "Pedro Oliveira",
  "Carla Souza",
  "Lucas Ferreira",
  "Juliana Lima",
  "Rafael Alves",
  "Fernanda Rocha",
  "Bruno Martins",
  "Camila Pereira",
  "Diego Ribeiro",
  "Larissa Cardoso",
  "Thiago Nascimento",
  "Gabriela Dias",
  "Rodrigo Barbosa",
  "Patrícia Gomes",
  "Marcelo Araújo",
  "Vanessa Correia",
  "Felipe Monteiro",
  "Beatriz Castro",
  "Gustavo Ramos",
  "Priscila Moreira",
  "André Cavalcanti",
  "Renata Freitas",
  "Leonardo Pinto",
  "Mariana Teixeira",
  "Vinícius Lopes",
  "Isabela Mendes",
  "Fábio Carvalho",
]

const states = [
  "São Paulo - SP",
  "Rio de Janeiro - RJ",
  "Belo Horizonte - MG",
  "Salvador - BA",
  "Fortaleza - CE",
  "Brasília - DF",
  "Curitiba - PR",
  "Recife - PE",
  "Porto Alegre - RS",
  "Manaus - AM",
  "Belém - PA",
  "Goiânia - GO",
  "Guarulhos - SP",
  "Campinas - SP",
  "São Luís - MA",
  "São Gonçalo - RJ",
  "Maceió - AL",
  "Duque de Caxias - RJ",
  "Natal - RN",
  "Teresina - PI",
  "Campo Grande - MS",
  "Nova Iguaçu - RJ",
  "São Bernardo do Campo - SP",
  "João Pessoa - PB",
  "Santo André - SP",
  "Osasco - SP",
  "Jaboatão dos Guararapes - PE",
  "Contagem - MG",
  "Aracaju - SE",
  "Cuiabá - MT",
  "Sorocaba - SP",
  "Uberlândia - MG",
  "Feira de Santana - BA",
]

const actions = [
  {
    text: "Acabou de receber o cartão SHEIN",
    icon: <CreditCard className="w-4 h-4" />,
    bgColor: "bg-green-500",
    textColor: "text-green-700",
  },
  {
    text: "Efetuou o primeiro pagamento com o cartão SHEIN",
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: "bg-blue-500",
    textColor: "text-blue-700",
  },
  {
    text: "Teve o cartão SHEIN enviado para produção",
    icon: <Package className="w-4 h-4" />,
    bgColor: "bg-purple-500",
    textColor: "text-purple-700",
  },
  {
    text: "Recebeu aprovação instantânea do cartão SHEIN",
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: "bg-emerald-500",
    textColor: "text-emerald-700",
  },
  {
    text: "Teve o cartão SHEIN enviado pelos Correios",
    icon: <Truck className="w-4 h-4" />,
    bgColor: "bg-orange-500",
    textColor: "text-orange-700",
  },
]

export function SocialNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isVisible, setIsVisible] = useState(true)

  const generateNotification = (): Notification => {
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomState = states[Math.floor(Math.random() * states.length)]
    const randomAction = actions[Math.floor(Math.random() * actions.length)]

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: randomName,
      state: randomState,
      action: randomAction.text,
      icon: randomAction.icon,
      bgColor: randomAction.bgColor,
      textColor: randomAction.textColor,
    }
  }

  useEffect(() => {
    if (!isVisible) return

    // Primeira notificação após 3 segundos
    const firstTimeout = setTimeout(() => {
      const notification = generateNotification()
      setNotifications([notification])

      // Remove a notificação após 6 segundos
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }, 6000)
    }, 3000)

    // Notificações subsequentes a cada 8-15 segundos
    const interval = setInterval(
      () => {
        const notification = generateNotification()
        setNotifications((prev) => {
          // Mantém apenas a notificação mais recente
          return [notification]
        })

        // Remove a notificação após 6 segundos
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
        }, 6000)
      },
      Math.random() * 7000 + 8000,
    ) // Entre 8-15 segundos

    return () => {
      clearTimeout(firstTimeout)
      clearInterval(interval)
    }
  }, [isVisible])

  const handleClose = () => {
    setIsVisible(false)
    setNotifications([])
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-left-5 duration-500"
        >
          <div className="flex items-start space-x-3">
            <div className={`${notification.bgColor} rounded-full p-2 flex-shrink-0`}>
              <div className="text-white">{notification.icon}</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{notification.name}</p>
                  <p className="text-xs text-gray-500 mb-1">{notification.state}</p>
                  <p className={`text-xs ${notification.textColor} font-medium`}>{notification.action}</p>
                </div>

                <button onClick={handleClose} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-400">há {Math.floor(Math.random() * 5) + 1} minutos</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
