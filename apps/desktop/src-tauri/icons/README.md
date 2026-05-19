# icons

현재 디렉토리에는 **빌드 통과를 위한 단색 placeholder PNG**가 들어있다.

- `32x32.png`, `128x128.png`, `128x128@2x.png` — Tauri `generate_context!` 가 컴파일 타임에 임베드.

`tauri.conf.json` 의 `bundle.active` 는 `false` 라서, 배포용 인스톨러는 만들어지지 않는다 (`tauri build` 시 바이너리만 생성).

## 배포용 아이콘으로 교체하기

1. 1024x1024 PNG 소스 준비 (예: `app-icon.png`).
2. 아이콘 일괄 생성:
   ```bash
   pnpm --filter @escpos/desktop tauri icon ./path/to/app-icon.png
   ```
   다음 파일들이 이 디렉토리에 채워진다:
   - `32x32.png`, `128x128.png`, `128x128@2x.png`
   - `icon.icns` (macOS), `icon.ico` (Windows)
   - 기타 Windows Store 사이즈
3. `tauri.conf.json` 의 `bundle.icon` 배열에 `icons/icon.icns`, `icons/icon.ico` 추가.
4. `bundle.active` 를 `true` 로 변경.
