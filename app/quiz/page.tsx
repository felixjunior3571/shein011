export default function QuizPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 flex justify-center border-b flex-shrink-0">
        <div className="text-2xl sm:text-3xl font-bold tracking-widest">SHEIN</div>
      </header>

      {/* Quiz Content */}
      <div className="flex-1 p-4 pt-8">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mx-auto">
          <h1 className="text-xl font-bold mb-6 leading-tight text-center">
            O que é mais importante para você em um cartão de crédito?
          </h1>

          <div className="grid grid-cols-2 gap-3">
            {/* Option 1 */}
            <a
              href="/quiz/question2"
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-black transition-colors min-h-[120px]"
            >
              <div className="mb-3 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 3.33334C17.8113 3.33334 16.0367 5.10801 16.0367 7.29668C16.0367 9.48534 17.8113 11.26 20 11.26C22.1887 11.26 23.9633 9.48534 23.9633 7.29668C23.9633 5.10801 22.1887 3.33334 20 3.33334Z"
                    fill="black"
                  />
                  <path
                    d="M30 13.3333H10C8.15905 13.3333 6.66667 14.8257 6.66667 16.6667V30C6.66667 31.841 8.15905 33.3333 10 33.3333H30C31.841 33.3333 33.3333 31.841 33.3333 30V16.6667C33.3333 14.8257 31.841 13.3333 30 13.3333Z"
                    fill="black"
                  />
                  <path
                    d="M26.6667 8.33334C26.6667 7.41286 25.9205 6.66667 25 6.66667H15C14.0795 6.66667 13.3333 7.41286 13.3333 8.33334V13.3333H26.6667V8.33334Z"
                    fill="black"
                  />
                </svg>
              </div>
              <span className="font-medium text-center text-sm">Limite alto</span>
            </a>

            {/* Option 2 */}
            <a
              href="/quiz/question2"
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-black transition-colors min-h-[120px]"
            >
              <div className="mb-3 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 3.33334L8.33334 13.3333H16.6667V30H23.3333V13.3333H31.6667L20 3.33334Z" fill="black" />
                  <path d="M31.6667 33.3333H8.33334V36.6667H31.6667V33.3333Z" fill="black" />
                </svg>
              </div>
              <span className="font-medium text-center text-sm">Crédito imediato</span>
            </a>

            {/* Option 3 */}
            <a
              href="/quiz/question2"
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-black transition-colors min-h-[120px]"
            >
              <div className="mb-3 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="16.6667" fill="black" />
                  <rect x="10" y="18.3333" width="20" height="3.33333" fill="white" />
                </svg>
              </div>
              <span className="font-medium text-center text-xs leading-tight">
                Não consultar
                <br />
                SPC/Serasa
              </span>
            </a>

            {/* Option 4 */}
            <a
              href="/quiz/question2"
              className="border rounded-lg p-4 flex flex-col items-center justify-center hover:border-black transition-colors min-h-[120px]"
            >
              <div className="mb-3 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M31.6667 5H8.33333C6.49238 5 5 6.49238 5 8.33333V31.6667C5 33.5076 6.49238 35 8.33333 35H31.6667C33.5076 35 35 33.5076 35 31.6667V8.33333C35 6.49238 33.5076 5 31.6667 5Z"
                    fill="black"
                  />
                  <path d="M11.6667 15H15V18.3333H11.6667V15Z" fill="white" />
                  <path d="M18.3333 15H21.6667V18.3333H18.3333V15Z" fill="white" />
                  <path d="M25 15H28.3333V18.3333H25V15Z" fill="white" />
                  <path d="M11.6667 21.6667H15V25H11.6667V21.6667Z" fill="white" />
                  <path d="M18.3333 21.6667H21.6667V25H18.3333V21.6667Z" fill="white" />
                  <path d="M25 21.6667H28.3333V25H25V21.6667Z" fill="white" />
                </svg>
              </div>
              <span className="font-medium text-center text-sm">Sem anuidade</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
