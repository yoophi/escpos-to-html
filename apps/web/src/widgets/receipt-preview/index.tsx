import { useEffect, useState } from 'react'
import { Clipboard } from 'lucide-react'
import { type ParseResult } from '@escpos-to-html/escpos'
import { PresetSegment, type PresetSegmentItem } from '@escpos-to-html/ui'
import { ReceiptCanvas } from '@escpos-to-html/ui'
import { ReceiptStage } from '@escpos-to-html/ui'
import { PanelHeader } from '@escpos-to-html/ui'
import { Button } from '@escpos-to-html/ui'
import { Card, CardContent } from '@escpos-to-html/ui'

const receiptPreviewPresets = [
  {
    value: 'pc-seller-42',
    label: '42 columns',
    description: 'PC Seller default',
    columns: 42,
  },
  {
    value: 'pc-seller-21',
    label: '21 columns',
    description: 'Double width',
    columns: 21,
  },
] as const satisfies readonly (PresetSegmentItem<string> & { columns: 21 | 42 })[]

type ReceiptPreviewPresetId = (typeof receiptPreviewPresets)[number]['value']

type ReceiptPreviewProps = {
  result: ParseResult
  html: string
  preferredColumns?: 21 | 42
}

export function ReceiptPreview({ result, html, preferredColumns }: ReceiptPreviewProps) {
  const [presetId, setPresetId] = useState<ReceiptPreviewPresetId>('pc-seller-42')
  const preset = receiptPreviewPresets.find((item) => item.value === presetId) ?? receiptPreviewPresets[0]

  useEffect(() => {
    if (!preferredColumns) return
    setPresetId(preferredColumns === 21 ? 'pc-seller-21' : 'pc-seller-42')
  }, [preferredColumns])

  const copyHtml = async () => {
    await navigator.clipboard.writeText(html)
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <PanelHeader
        className="py-6"
        eyebrow="Preview"
        title="Thermal receipt"
        action={
          <div className="flex items-start gap-2">
            <PresetSegment
              ariaLabel="Receipt width preset"
              items={receiptPreviewPresets}
              value={presetId}
              onValueChange={setPresetId}
            />
            <Button type="button" variant="outline" size="icon" onClick={copyHtml} aria-label="Copy HTML">
              <Clipboard size={18} aria-hidden="true" />
            </Button>
          </div>
        }
      />

      <CardContent className="flex min-h-0 flex-1 px-0 pb-0">
        <ReceiptStage>
          <ReceiptCanvas lines={result.lines} columns={preset.columns} />
        </ReceiptStage>
      </CardContent>
    </Card>
  )
}
