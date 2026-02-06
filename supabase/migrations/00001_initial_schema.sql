-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced from Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notebooks
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '제목 없는 노트북',
  emoji TEXT DEFAULT '📓',
  description TEXT,
  is_shared BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  source_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notebooks_user_created ON public.notebooks(user_id, created_at DESC);
CREATE INDEX idx_notebooks_share_token ON public.notebooks(share_token) WHERE share_token IS NOT NULL;

-- Sources
CREATE TYPE source_type AS ENUM ('pdf', 'text', 'url', 'youtube', 'google_doc', 'google_slide', 'google_sheet', 'image', 'audio');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type source_type NOT NULL,
  title TEXT NOT NULL,
  original_url TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  extracted_text TEXT,
  summary TEXT,
  -- embedding vector(1536), -- pgvector 미지원으로 비활성화
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  processing_status processing_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sources_notebook_order ON public.sources(notebook_id, sort_order);
CREATE INDEX idx_sources_notebook_enabled ON public.sources(notebook_id, is_enabled);
-- CREATE INDEX idx_sources_embedding ON public.sources USING ivfflat (embedding vector_cosine_ops); -- pgvector 미지원으로 비활성화

-- Chat Messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chat_notebook_created ON public.chat_messages(notebook_id, created_at ASC);

-- Studio Outputs
CREATE TYPE studio_output_type AS ENUM ('audio_overview', 'video_overview', 'mind_map', 'report', 'flashcard', 'quiz', 'infographic', 'slide_deck', 'data_table');
CREATE TYPE generation_status AS ENUM ('pending', 'generating', 'completed', 'failed');

CREATE TABLE public.studio_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type studio_output_type NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  generation_status generation_status DEFAULT 'pending',
  error_message TEXT,
  source_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_studio_notebook_type ON public.studio_outputs(notebook_id, type, created_at DESC);

-- Notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notes_notebook ON public.notes(notebook_id, pinned DESC, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY users_select ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_update ON public.users FOR UPDATE USING (auth.uid() = id);

-- Notebooks
CREATE POLICY notebooks_select ON public.notebooks FOR SELECT USING (
  user_id = auth.uid() OR (is_shared = true AND share_token IS NOT NULL)
);
CREATE POLICY notebooks_insert ON public.notebooks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY notebooks_update ON public.notebooks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notebooks_delete ON public.notebooks FOR DELETE USING (user_id = auth.uid());

-- Sources
CREATE POLICY sources_select ON public.sources FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sources_insert ON public.sources FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY sources_update ON public.sources FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY sources_delete ON public.sources FOR DELETE USING (user_id = auth.uid());

-- Chat Messages
CREATE POLICY chat_select ON public.chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY chat_insert ON public.chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

-- Studio Outputs
CREATE POLICY studio_select ON public.studio_outputs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY studio_insert ON public.studio_outputs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY studio_update ON public.studio_outputs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY studio_delete ON public.studio_outputs FOR DELETE USING (user_id = auth.uid());

-- Notes
CREATE POLICY notes_select ON public.notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notes_insert ON public.notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY notes_update ON public.notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notes_delete ON public.notes FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notebooks_updated_at BEFORE UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER studio_outputs_updated_at BEFORE UPDATE ON public.studio_outputs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update source_count on notebooks
CREATE OR REPLACE FUNCTION update_source_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.notebooks SET source_count = source_count + 1 WHERE id = NEW.notebook_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.notebooks SET source_count = source_count - 1 WHERE id = OLD.notebook_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_count_trigger
  AFTER INSERT OR DELETE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION update_source_count();
