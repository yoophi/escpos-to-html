# app 레이어

FSD 최상위 레이어. 앱 부트스트랩, 전역 프로바이더, 라우팅, 전역 스타일을 둔다.

- `App.tsx` — 루트 컴포넌트
- `providers/` — 전역 컨텍스트 (Theme, QueryClient 등)
- `styles/` — Tailwind 진입 CSS 및 토큰
- `router/` — (필요 시) 라우팅 정의

규칙: 다른 레이어를 자유롭게 import 가능. 다른 레이어는 app을 import하지 않는다.
