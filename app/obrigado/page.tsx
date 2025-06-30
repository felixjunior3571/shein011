import { CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ObrigadoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">Pagamento Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">Seu pagamento foi processado com sucesso via SuperPay.</p>
          <p className="text-sm text-gray-500">Você receberá uma confirmação por email em breve.</p>

          <div className="pt-4">
            <Link href="/checkout">
              <Button className="w-full">Fazer Novo Pagamento</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
