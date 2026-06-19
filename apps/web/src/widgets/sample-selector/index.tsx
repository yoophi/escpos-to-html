import { type EscposSample, samples } from '../../entities/sample'
import { Button } from '@escpos-to-html/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@escpos-to-html/ui'
import { ScrollArea, ScrollBar } from '@escpos-to-html/ui'

type SampleSelectorProps = {
  selectedSample: EscposSample
  onSelect: (sampleId: string) => void
}

export function SampleSelector({ selectedSample, onSelect }: SampleSelectorProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.6fr)_minmax(0,1fr)]" aria-label="Sample receipts">
      <Card>
        <CardHeader>
          <CardDescription>Samples</CardDescription>
          <CardTitle>{selectedSample.title}</CardTitle>
          <CardDescription>{selectedSample.description}</CardDescription>
        </CardHeader>
      </Card>
      <Card className="py-3">
        <CardContent className="px-3">
          <ScrollArea>
            <div className="flex min-w-max gap-2">
              {samples.map((sample) => (
                <Button
                  type="button"
                  key={sample.id}
                  variant={sample.id === selectedSample.id ? 'default' : 'outline'}
                  className="h-16 min-w-36 justify-start"
                  onClick={() => onSelect(sample.id)}
                >
                  {sample.title}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  )
}
