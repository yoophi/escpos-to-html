# shared 레이어

재사용 가능한 비-비즈니스 모듈. UI 키트(shadcn/ui), 유틸, 설정, Tauri API 래퍼.

- 다른 레이어를 import하지 않는다. (의존성 단방향)
- 하위 슬라이스: `ui/`, `lib/`, `api/`, `config/`.
