# features 레이어

사용자 행위 단위 (파일 업로드, HTML 복사, 인쇄 미리보기 등).

- entities/shared만 import.
- 비즈니스 로직은 application 레이어(Rust)로 위임하고, 여기서는 UI/상호작용/Tauri invoke 호출만.
