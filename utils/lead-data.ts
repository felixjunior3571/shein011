interface LeadData {
  nome: string
  cpf: string
  email: string
  telefone: string
  dataNascimento?: string
  nomeMae?: string
  endereco: {
    rua: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
    cep: string
  }
}

export function getLeadData(): LeadData | null {
  if (typeof window === "undefined") return null

  try {
    // Dados do CPF
    const cpfDataStr = localStorage.getItem("cpfConsultaData")
    const cpfData = cpfDataStr ? JSON.parse(cpfDataStr) : {}

    // Email
    const userEmail = localStorage.getItem("userEmail") || ""

    // WhatsApp
    const userWhatsApp = localStorage.getItem("userWhatsApp") || ""

    // Endereço
    const deliveryAddressStr = localStorage.getItem("deliveryAddress")
    const deliveryAddress = deliveryAddressStr ? JSON.parse(deliveryAddressStr) : {}

    // Verificar se temos os dados mínimos
    if (!cpfData.nome || !userEmail || !userWhatsApp) {
      console.warn("⚠️ Dados incompletos do lead:", {
        nome: !!cpfData.nome,
        email: !!userEmail,
        whatsapp: !!userWhatsApp,
      })
      return null
    }

    return {
      nome: cpfData.nome,
      cpf: cpfData.cpf || "",
      email: userEmail,
      telefone: userWhatsApp,
      dataNascimento: cpfData.dataNascimento || "",
      nomeMae: cpfData.nomeMae || "",
      endereco: {
        rua: deliveryAddress.street || "",
        numero: deliveryAddress.number || "",
        complemento: deliveryAddress.complement || "",
        bairro: deliveryAddress.neighborhood || "",
        cidade: deliveryAddress.city || "",
        estado: deliveryAddress.state || "",
        cep: deliveryAddress.zipCode?.replace(/\D/g, "") || "",
      },
    }
  } catch (error) {
    console.error("❌ Erro ao carregar dados do lead:", error)
    return null
  }
}

export function validateLeadData(data: LeadData): boolean {
  const required = [data.nome, data.email, data.telefone, data.endereco.rua, data.endereco.cidade, data.endereco.estado]

  return required.every((field) => field && field.trim().length > 0)
}
