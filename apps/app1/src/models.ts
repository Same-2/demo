export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface AiModelConfig {
  provider: string;
  apiKey: string;
  modelName: string;
  temperature?: number;
  systemPrompt?: string;
}

export interface NovelMetadata {
  title: string;
  genre: string;
  tone: string;
  audience: string;
  tags: string[];
  description: string;
}

export interface Episode {
  id: string;
  title: string;
  content: string;
  draftNotes?: string;
  order: number;
  publishedAt?: string;
}

export interface Novel {
  id: string;
  metadata: NovelMetadata;
  aiModel: AiModelConfig;
  authorId: string;
  status: 'draft' | 'published';
  episodes: Episode[];
  createdAt: string;
  updatedAt: string;
}
