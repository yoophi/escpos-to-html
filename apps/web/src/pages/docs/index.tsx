import { Link } from 'react-router-dom'
import { Braces, ReceiptText } from 'lucide-react'
import { defaultSample } from '../../entities/sample'
import { Button } from '../../shared/ui/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/shadcn/card'

export function DocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-6 lg:py-8">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link to={`/samples/${defaultSample.id}`}>
            <ReceiptText size={18} aria-hidden="true" />
            Previewer
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardDescription className="inline-flex items-center gap-2">
            <Braces size={18} aria-hidden="true" />
            Data model
          </CardDescription>
          <CardTitle className="text-3xl lg:text-5xl">ESC/POS 파싱 중간 데이터 모델</CardTitle>
          <CardDescription className="max-w-3xl text-base">
            상세 계획 문서는 <code>docs/parsing-data-model.md</code>에 있습니다. 앱은 ESC/POS 바이트를 HTML로 바로
            바꾸지 않고, 먼저 검사와 테스트가 쉬운 <code>ParseResult</code> 모델로 정규화합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="ParseResult"
            description="전체 파싱 결과입니다. 출력 줄, 제어 이벤트, 경고, 디코딩된 바이트 배열을 함께 보관합니다."
            code={`type ParseResult = {
  lines: ReceiptLine[]
  events: ControlEvent[]
  warnings: string[]
  bytes: number[]
}`}
          />
          <DocCard
            title="ReceiptLine"
            description="영수증 한 줄의 정렬과 스타일 span 목록을 담습니다."
            code={`type ReceiptLine = {
  align: 'left' | 'center' | 'right'
  spans: ReceiptSpan[]
}`}
          />
          <DocCard
            title="ReceiptSpan"
            description="같은 스타일을 공유하는 최소 텍스트 범위입니다."
            code={`type ReceiptSpan = {
  text: string
  style: TextStyle
}`}
          />
          <DocCard
            title="ControlEvent"
            description="컷, 피드, 비프, 금전함 펄스처럼 화면 텍스트가 아닌 명령을 보존합니다."
            code={`type ControlEvent = {
  type: 'cut' | 'drawer' | 'beep' | 'feed' | 'unknown'
  label: string
  offset: number
}`}
          />
        </CardContent>
      </Card>
    </main>
  )
}

function DocCard({ title, description, code }: { title: string; description: string; code: string }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-md bg-muted p-3 text-sm">{code}</pre>
      </CardContent>
    </Card>
  )
}
