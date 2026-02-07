# KakaoBook

> **Claude Code로 노트북LM 클론 서비스를 기획부터 배포까지 1시간?!**

Google NotebookLM에서 영감을 받은 AI 기반 지식 노트북 서비스입니다.
이 프로젝트는 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)를 활용하여 얼마나 빠르게 실제 서비스를 구축할 수 있는지 실험하기 위해 만들어졌습니다.

## 개발 과정

| 단계 | 내용 |
|------|------|
| **1. 기획** | 노트북LM 서비스의 주요 화면을 스크린샷으로 캡처 |
| **2. Spec 정의** | Claude Code의 Spec 생성 스킬로 전체 프로젝트 스펙 문서 작성 |
| **3. 개발** | Spec 문서를 검토한 뒤 Claude Code와 함께 개발 시작 |
| **4. 테스트 & 디자인** | 생성된 서비스를 테스트하고, AI에게 디자인 리뷰 및 개선 요청 |
| **5. 배포** | 배포 설정 후 서비스 배포 |

## 서비스 화면

### 노트북 목록
노트북을 생성하고 관리하는 홈 화면입니다. 그리드/리스트 뷰 전환과 탭 필터링을 지원합니다.

![노트북 목록](service_images/01_북리스트.png)

### 소스 추가
PDF, 웹페이지 URL, 텍스트 등 다양한 형식의 소스를 노트북에 추가할 수 있습니다.

![소스 추가](service_images/02_소스추가.png)

### 소스 확인 & AI 채팅
추가된 소스의 내용을 확인하고, AI와 대화하며 소스 기반 질의응답을 수행합니다.

![소스 확인](service_images/03_소스확인.png)

### 인포그래픽 생성
소스 내용을 바탕으로 언어, 방향, 세부정보 수준 등을 설정하여 인포그래픽을 생성합니다.

![인포그래픽 생성](service_images/04_인포그래픽생성.png)

### 인포그래픽 확인
생성된 인포그래픽을 확인하고 다운로드할 수 있습니다.

![인포그래픽 확인](service_images/05_인포그래픽확인.png)

### 슬라이드 생성
소스 내용을 기반으로 형식, 언어, 깊이를 설정하여 슬라이드 자료를 생성합니다.

![슬라이드 생성](service_images/06_슬라이드생성.png)

### 슬라이드 확인
생성된 슬라이드를 확인하고 다운로드할 수 있습니다.

![슬라이드 확인](service_images/07_슬라이드확인.png)

## 주요 기능

- **노트북 관리** - 노트북 생성, 이름 변경, 삭제, 그리드/리스트 뷰
- **소스 관리** - PDF, URL, 텍스트 업로드 및 AI 자동 요약/텍스트 추출
- **AI 채팅** - 소스 기반 질의응답, 스트리밍 응답, 추천 질문
- **스튜디오** - 인포그래픽 & 슬라이드 자료 자동 생성
- **모바일 대응** - 데스크톱 3패널 / 모바일 탭 레이아웃

## 기술 스택

| 영역 | 기술 |
|------|------|
| **프레임워크** | Next.js 16 (Turbopack) |
| **언어** | TypeScript |
| **스타일링** | Tailwind CSS v4 + shadcn/ui |
| **상태 관리** | TanStack React Query + Zustand |
| **백엔드** | Supabase (PostgreSQL + Auth + Storage) |
| **AI** | Google Gemini |
| **이미지 생성** | Nano Banana Pro |
| **인증** | Google OAuth (Supabase Auth) |

## 시작하기

### 사전 요구사항

- Node.js 18+
- Supabase 프로젝트
- Google Gemini API 키

### 설치

```bash
git clone https://github.com/revfactory/kakaobook.git
cd kakaobook
npm install
```

### 환경 변수

`.env.local` 파일을 생성하고 아래 내용을 설정합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### Supabase 설정

#### 1. 프로젝트 생성

[Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.

#### 2. 데이터베이스 스키마

Supabase 대시보드의 **SQL Editor**에서 마이그레이션 파일을 순서대로 실행합니다.

```
supabase/migrations/00001_initial_schema.sql
supabase/migrations/00002_add_users_insert_policy.sql
```

생성되는 테이블:

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 프로필 (Auth 연동 자동 생성) |
| `notebooks` | 노트북 |
| `sources` | 소스 (PDF, URL, 텍스트 등) |
| `chat_messages` | 채팅 메시지 |
| `studio_outputs` | 스튜디오 생성 콘텐츠 |
| `notes` | 메모 |

모든 테이블에 RLS(Row Level Security)가 적용되어 있으며, 사용자별 데이터 격리가 자동으로 이루어집니다.

#### 3. Google OAuth 인증 설정

1. [Google Cloud Console](https://console.cloud.google.com)에서 OAuth 2.0 클라이언트 ID를 생성합니다.
2. 승인된 리디렉션 URI에 아래 주소를 추가합니다:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. Supabase 대시보드 → **Authentication** → **Providers** → **Google**에서 Client ID와 Client Secret을 입력합니다.

#### 4. Storage 버킷 설정

Supabase 대시보드 → **Storage**에서 아래 버킷을 생성합니다.

| 버킷명 | 공개 여부 | 용도 |
|--------|-----------|------|
| `sources` | Private | 소스 파일 (PDF 등) 저장 |
| `studio` | Public | 생성된 인포그래픽/슬라이드 이미지 |

`studio` 버킷의 RLS 정책 (SQL Editor에서 실행):

```sql
-- 인증된 사용자 업로드 허용
CREATE POLICY "studio_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio');

-- 공개 읽기 허용
CREATE POLICY "studio_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'studio');
```

### 실행

```bash
npm run dev
```

`http://localhost:3000`에서 서비스를 확인할 수 있습니다.

## 라이선스

MIT
