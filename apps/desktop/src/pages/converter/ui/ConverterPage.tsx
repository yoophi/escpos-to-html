import { Button } from '@/shared/ui';

export function ConverterPage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">ESC/POS → HTML</h1>
        <p className="mt-2 text-muted-foreground">
          영수증 바이너리를 업로드해 HTML로 변환합니다. (스캐폴딩)
        </p>
      </header>

      <section className="flex gap-3">
        <Button variant="default" disabled>
          파일 열기 (구현 예정)
        </Button>
        <Button variant="outline" disabled>
          HTML 복사 (구현 예정)
        </Button>
      </section>
    </main>
  );
}
