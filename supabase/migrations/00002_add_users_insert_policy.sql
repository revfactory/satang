-- users 테이블에 INSERT 정책 추가 (클라이언트에서 upsert 허용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_insert' AND tablename = 'users'
  ) THEN
    CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;
