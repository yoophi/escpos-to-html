import { type ReactNode } from 'react'

type ReceiptStageProps = {
  children: ReactNode
}

export function ReceiptStage({ children }: ReceiptStageProps) {
  return (
    <div className="flex min-h-[clamp(520px,68svh,720px)] w-full flex-1 items-start justify-center overflow-auto bg-[#d8d2c3] bg-[linear-gradient(90deg,rgba(29,29,29,0.05)_1px,transparent_1px),linear-gradient(rgba(29,29,29,0.05)_1px,transparent_1px)] bg-[length:22px_22px] px-6 py-[34px] [overscroll-behavior:contain]">
      {children}
    </div>
  )
}
