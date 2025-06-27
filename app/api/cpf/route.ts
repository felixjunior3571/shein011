export async function POST(request: Request) {
  try {
    const { cpf } = await request.json()

    if (!cpf) {
      return Response.json({ error: "CPF é obrigatório" }, { status: 400 })
    }

    // Remove formatação do CPF
    const cpfNumbers = cpf.replace(/\D/g, "")

    if (cpfNumbers.length !== 11) {
      return Response.json({ error: "CPF deve ter 11 dígitos" }, { status: 400 })
    }

    console.log("Consultando CPF:", cpfNumbers)

    // URL da API correta
    const apiUrl = `https://owndata.zip/OwnData/api.php?token=isnwxgTbBZXglGqAgfgBWVqf&modulo=cpf&consulta=${cpfNumbers}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    console.log("Status da API:", response.status)

    if (!response.ok) {
      console.error("Erro HTTP da API:", response.status, response.statusText)
      return Response.json(
        {
          error: `Erro na consulta: ${response.status} ${response.statusText}`,
        },
        { status: 502 },
      )
    }

    const responseText = await response.text()
    console.log("Resposta da API:", responseText)

    let apiData
    try {
      apiData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Erro ao fazer parse:", parseError)
      return Response.json(
        {
          error: "Resposta da API não é um JSON válido",
          rawResponse: responseText.substring(0, 200),
        },
        { status: 502 },
      )
    }

    console.log("Dados parseados:", apiData)

    // Verifica se a API retornou erro
    if (apiData.status !== 200) {
      return Response.json(
        {
          error: "CPF não encontrado ou erro na consulta",
          status: apiData.status,
        },
        { status: 400 },
      )
    }

    // Verifica se existe DadosBasicos
    if (!apiData.DadosBasicos) {
      return Response.json(
        {
          error: "Dados básicos não encontrados na resposta da API",
          availableFields: Object.keys(apiData),
        },
        { status: 400 },
      )
    }

    const dadosBasicos = apiData.DadosBasicos

    // Extrai os campos necessários da estrutura correta
    const resultado = {
      nome: dadosBasicos.nome || "",
      dataNascimento: dadosBasicos.dataNascimento || "",
      nomeMae: dadosBasicos.nomeMae || "",
      cpf: cpfNumbers,
    }

    console.log("Dados extraídos:", resultado)

    // Verifica se pelo menos o nome foi encontrado
    if (!resultado.nome) {
      return Response.json(
        {
          error: "Nome não encontrado nos dados básicos",
          dadosBasicos: dadosBasicos,
        },
        { status: 400 },
      )
    }

    return Response.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error("Erro interno:", error)
    return Response.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
