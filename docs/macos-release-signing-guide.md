# macOS 릴리즈 빌드 및 Apple 서명 가이드

이 문서는 현재 Tauri 데스크탑 앱을 macOS에서 배포 가능한 형태로 빌드하고, Apple 코드 서명 및 notarization을 적용하기 위해 필요한 작업을 정리한다.

## 현재 프로젝트 상태

현재 데스크탑 앱 설정 파일은 `apps/desktop/src-tauri/tauri.conf.json`이다.

확인된 상태:

- `bundle.active`가 `false`라 릴리즈 번들 생성이 비활성화되어 있다.
- 앱 버전이 `0.0.0`이다.
- macOS 서명 identity 설정이 없다.
- notarization 환경변수 설정이 없다.
- macOS entitlements 파일이 없다.
- 릴리즈 산출물 생성 스크립트가 명시적으로 분리되어 있지 않다.

따라서 현재 상태에서는 개발용 빌드는 가능하지만, 외부 사용자에게 배포하기 위한 서명된 `.app` 또는 `.dmg` 릴리즈 절차는 준비가 필요하다.

## 배포 방식 결정

먼저 배포 방식을 정해야 한다.

### 외부 배포

웹사이트, GitHub Releases, 사내 배포 등 Mac App Store 밖에서 배포하는 방식이다.

필요 항목:

- 유료 Apple Developer Program 계정
- `Developer ID Application` 인증서
- notarization
- stapling

현재 프로젝트에는 이 방식이 가장 현실적이다.

### Mac App Store 배포

Mac App Store에 등록하는 방식이다.

필요 항목:

- 유료 Apple Developer Program 계정
- `Apple Distribution` 인증서
- App Store Connect 앱 등록
- sandbox entitlements 구성
- 심사 대응

현재 TCP 소켓 수신 기능이 포함되어 있으므로, App Store 배포를 선택할 경우 sandbox 권한과 네트워크 권한 검토가 추가로 필요하다.

## Apple Developer 준비

외부 배포 기준으로 다음이 필요하다.

1. Apple Developer Program 유료 계정 가입
2. Apple Developer 계정의 Team ID 확인
3. `Developer ID Application` 인증서 생성
4. 인증서를 빌드 Mac의 Keychain에 설치

인증서 설치 후 다음 명령으로 확인한다.

```bash
security find-identity -v -p codesigning
```

출력에 다음과 같은 identity가 표시되어야 한다.

```text
Developer ID Application: <Team Name> (<Team ID>)
```

Tauri 문서 기준으로 `Developer ID Application` 인증서는 Account Holder 권한에서 생성해야 한다.

## Tauri 설정 변경

`apps/desktop/src-tauri/tauri.conf.json`의 `bundle` 설정을 배포 가능하도록 변경해야 한다.

예시:

```json
{
  "bundle": {
    "active": true,
    "targets": ["app", "dmg"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png"
    ],
    "macOS": {
      "signingIdentity": "Developer ID Application: <Team Name> (<Team ID>)",
      "entitlements": "entitlements.plist"
    }
  }
}
```

로컬 환경마다 signing identity가 달라질 수 있으므로, 설정 파일에 고정하지 않고 환경변수로 전달하는 방식도 가능하다.

```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: <Team Name> (<Team ID>)" \
pnpm --filter @escpos/desktop tauri build --bundles dmg
```

## Entitlements 검토

현재 앱은 TCP 소켓을 열고 ESC/POS 데이터를 수신한다. macOS 직접 배포에서는 App Sandbox가 필수는 아니지만, hardened runtime 및 notarization 과정에서 필요한 권한을 명확히 해야 한다.

초기 entitlements 파일은 최소 구성으로 시작하고, 실제 서명 및 실행 검증 과정에서 필요한 권한만 추가한다.

예시 위치:

```text
apps/desktop/src-tauri/entitlements.plist
```

초기 예시:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
```

만약 sandbox를 활성화하는 배포 방식을 선택한다면 네트워크 서버 권한을 별도로 검토해야 한다.

## 릴리즈 빌드 명령

루트에서 실행한다.

```bash
pnpm --filter @escpos/desktop build
pnpm --filter @escpos/desktop tauri build
```

DMG만 생성할 경우:

```bash
pnpm --filter @escpos/desktop tauri build --bundles dmg
```

산출물은 일반적으로 다음 위치에 생성된다.

```text
apps/desktop/src-tauri/target/release/bundle/
```

## Notarization 설정

`Developer ID Application` 인증서로 외부 배포할 경우 notarization이 필요하다.

Tauri는 App Store Connect API 방식 또는 Apple ID 방식의 인증 정보를 사용할 수 있다.

### App Store Connect API 방식

필요 환경변수:

```bash
APPLE_API_ISSUER="<issuer-id>"
APPLE_API_KEY="<key-id>"
APPLE_API_KEY_PATH="/path/to/AuthKey_<key-id>.p8"
```

### Apple ID 방식

필요 환경변수:

```bash
APPLE_ID="<apple-id-email>"
APPLE_PASSWORD="<app-specific-password>"
APPLE_TEAM_ID="<team-id>"
```

환경변수 설정 후 다시 빌드한다.

```bash
pnpm --filter @escpos/desktop tauri build --bundles dmg
```

초기 검증 과정에서 stapling을 잠시 건너뛰려면 다음 옵션을 사용할 수 있다.

```bash
pnpm --filter @escpos/desktop tauri build --bundles dmg --skip-stapling
```

최종 배포물은 stapling까지 완료되어야 한다.

## 검증 명령

생성된 `.app`에 대해 코드 서명을 검증한다.

```bash
codesign --verify --deep --strict --verbose=2 path/to/ESC-POS\ to\ HTML.app
```

Gatekeeper 평가를 확인한다.

```bash
spctl --assess --type execute --verbose path/to/ESC-POS\ to\ HTML.app
```

DMG를 배포 대상으로 삼는 경우 DMG도 함께 검증한다.

```bash
spctl --assess --type open --verbose path/to/ESC-POS\ to\ HTML.dmg
```

## CI에서 서명할 경우

CI에서 서명하려면 인증서를 `.p12`로 export하고 base64로 저장한 뒤 secret으로 등록한다.

필요 secret 예시:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY`
- `APPLE_API_KEY_PATH` 또는 p8 파일을 복원할 수 있는 secret
- `KEYCHAIN_PASSWORD`

CI에서는 임시 keychain을 생성하고 인증서를 import한 뒤 `tauri build`를 실행한다.

## 프로젝트에 추가하면 좋은 스크립트

루트 또는 `apps/desktop/package.json`에 다음 스크립트를 추가하면 반복 작업이 쉬워진다.

```json
{
  "scripts": {
    "build:release": "tauri build",
    "build:release:dmg": "tauri build --bundles dmg"
  }
}
```

다만 실제 적용 시에는 현재 monorepo 스크립트 구조에 맞춰 `pnpm --filter @escpos/desktop ...` 형태로 호출하는 것이 안전하다.

## 작업 체크리스트

- [ ] 배포 방식 결정: 외부 배포 또는 Mac App Store
- [ ] 앱 이름, bundle identifier, version 확정
- [ ] Apple Developer Team ID 확인
- [ ] `Developer ID Application` 인증서 생성 및 Keychain 설치
- [ ] `security find-identity -v -p codesigning`로 identity 확인
- [ ] `tauri.conf.json`의 `bundle.active` 활성화
- [ ] `bundle.targets`를 `["app", "dmg"]` 등으로 설정
- [ ] signing identity 설정 또는 `APPLE_SIGNING_IDENTITY` 환경변수 사용
- [ ] entitlements 파일 추가 및 권한 최소화
- [ ] `pnpm --filter @escpos/desktop tauri build --bundles dmg` 실행
- [ ] notarization 환경변수 설정
- [ ] notarization 및 stapling 완료
- [ ] `codesign` 검증
- [ ] `spctl` 검증
- [ ] 깨끗한 macOS 환경에서 설치 및 실행 테스트

## 참고 문서

- Tauri macOS Code Signing: https://v2.tauri.app/distribute/sign/macos/
- Apple notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
