export type SourceType =
  | "pdf"
  | "text"
  | "url"
  | "youtube"
  | "google_doc"
  | "google_slide"
  | "google_sheet"
  | "image"
  | "audio";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export type StudioOutputType =
  | "audio_overview"
  | "video_overview"
  | "mind_map"
  | "report"
  | "flashcard"
  | "quiz"
  | "infographic"
  | "slide_deck"
  | "data_table";

export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      notebooks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          emoji: string;
          description: string | null;
          is_shared: boolean;
          share_token: string | null;
          source_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          emoji?: string;
          description?: string | null;
        };
        Update: {
          title?: string;
          emoji?: string;
          description?: string | null;
          is_shared?: boolean;
          share_token?: string | null;
          updated_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          notebook_id: string;
          user_id: string;
          type: SourceType;
          title: string;
          original_url: string | null;
          file_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          extracted_text: string | null;
          summary: string | null;
          metadata: Record<string, unknown>;
          sort_order: number;
          is_enabled: boolean;
          processing_status: ProcessingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          user_id: string;
          type: SourceType;
          title: string;
          original_url?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          extracted_text?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          title?: string;
          extracted_text?: string | null;
          summary?: string | null;
          sort_order?: number;
          is_enabled?: boolean;
          processing_status?: ProcessingStatus;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          notebook_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          citations: Array<{
            source_id: string;
            text_snippet: string;
            page_number?: number;
          }>;
          model: string | null;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          citations?: Array<{
            source_id: string;
            text_snippet: string;
            page_number?: number;
          }>;
          model?: string | null;
          tokens_used?: number | null;
        };
        Update: {
          content?: string;
          citations?: Array<{
            source_id: string;
            text_snippet: string;
            page_number?: number;
          }>;
        };
      };
      studio_outputs: {
        Row: {
          id: string;
          notebook_id: string;
          user_id: string;
          type: StudioOutputType;
          title: string;
          content: Record<string, unknown>;
          image_urls: string[];
          settings: Record<string, unknown>;
          generation_status: GenerationStatus;
          error_message: string | null;
          source_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          user_id: string;
          type: StudioOutputType;
          title: string;
          content?: Record<string, unknown>;
          image_urls?: string[];
          settings?: Record<string, unknown>;
          source_ids?: string[];
        };
        Update: {
          title?: string;
          content?: Record<string, unknown>;
          image_urls?: string[];
          generation_status?: GenerationStatus;
          error_message?: string | null;
          updated_at?: string;
        };
      };
      design_themes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          primary_color: string;
          mood: string;
          style: string;
          thumbnail_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          primary_color?: string;
          mood?: string;
          style?: string;
          thumbnail_url?: string | null;
          sort_order?: number;
        };
        Update: {
          name?: string;
          primary_color?: string;
          mood?: string;
          style?: string;
          thumbnail_url?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          notebook_id: string;
          user_id: string;
          content: string;
          pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          user_id: string;
          content: string;
          pinned?: boolean;
        };
        Update: {
          content?: string;
          pinned?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Notebook = Tables<"notebooks">;
export type Source = Tables<"sources">;
export type ChatMessage = Tables<"chat_messages">;
export type StudioOutput = Tables<"studio_outputs">;
export type Note = Tables<"notes">;
export type DesignThemeRow = Tables<"design_themes">;
