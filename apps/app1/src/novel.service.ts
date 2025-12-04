import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AiModelConfig, Episode, Novel, NovelMetadata, User } from './models';

interface CreateNovelPayload {
  metadata: Omit<NovelMetadata, 'tags'> & { tags?: string[] };
  aiModel: AiModelConfig;
}

interface UpdateMetadataPayload extends Partial<NovelMetadata> {
  tags?: string[];
}

interface EpisodePayload {
  title: string;
  content: string;
  draftNotes?: string;
  order?: number;
}

interface PublishPayload {
  publish: boolean;
}

interface UpdateAiModelPayload extends Partial<AiModelConfig> {}

@Injectable()
export class NovelService {
  private novels: Map<string, Novel> = new Map();

  createNovel(author: User, payload: CreateNovelPayload) {
    const normalizedMetadata: NovelMetadata = {
      ...payload.metadata,
      tags: payload.metadata.tags ?? [],
    };
    this.validateMetadata(normalizedMetadata);
    this.validateAiModel(payload.aiModel);
    const now = new Date().toISOString();
    const novel: Novel = {
      id: randomUUID(),
      metadata: normalizedMetadata,
      aiModel: payload.aiModel,
      authorId: author.id,
      status: 'draft',
      episodes: [],
      createdAt: now,
      updatedAt: now,
    };
    this.novels.set(novel.id, novel);
    return novel;
  }

  getNovelDetail(id: string, viewer?: User) {
    const novel = this.novels.get(id);
    if (!novel) {
      throw new NotFoundException('未找到对应的小说。');
    }
    if (novel.status === 'draft' && novel.authorId !== viewer?.id) {
      throw new ForbiddenException('该小说尚未发布。');
    }
    return novel;
  }

  updateMetadata(author: User, id: string, payload: UpdateMetadataPayload) {
    const novel = this.assertAuthorOwns(author, id);
    const merged: NovelMetadata = {
      ...novel.metadata,
      ...payload,
      tags: payload.tags ?? novel.metadata.tags,
    };
    this.validateMetadata(merged);
    novel.metadata = merged;
    novel.updatedAt = new Date().toISOString();
    this.novels.set(id, novel);
    return novel;
  }

  updateAiModel(author: User, id: string, payload: UpdateAiModelPayload) {
    const novel = this.assertAuthorOwns(author, id);
    const merged: AiModelConfig = { ...novel.aiModel, ...payload } as AiModelConfig;
    this.validateAiModel(merged);
    novel.aiModel = merged;
    novel.updatedAt = new Date().toISOString();
    this.novels.set(id, novel);
    return novel;
  }

  addEpisode(author: User, id: string, payload: EpisodePayload) {
    const novel = this.assertAuthorOwns(author, id);
    const order = payload.order ?? novel.episodes.length + 1;
    const episode: Episode = {
      id: randomUUID(),
      title: payload.title,
      content: payload.content,
      draftNotes: payload.draftNotes,
      order,
    };
    novel.episodes.push(episode);
    novel.updatedAt = new Date().toISOString();
    this.novels.set(id, novel);
    return episode;
  }

  updateEpisode(
    author: User,
    novelId: string,
    episodeId: string,
    payload: Partial<EpisodePayload>,
  ) {
    const novel = this.assertAuthorOwns(author, novelId);
    const episodeIndex = novel.episodes.findIndex((item) => item.id === episodeId);
    if (episodeIndex === -1) {
      throw new NotFoundException('未找到对应章节。');
    }
    const current = novel.episodes[episodeIndex];
    const updated: Episode = {
      ...current,
      ...payload,
      order: payload.order ?? current.order,
    };
    novel.episodes[episodeIndex] = updated;
    novel.updatedAt = new Date().toISOString();
    this.novels.set(novelId, novel);
    return updated;
  }

  publishNovel(author: User, id: string, payload: PublishPayload) {
    const novel = this.assertAuthorOwns(author, id);
    novel.status = payload.publish ? 'published' : 'draft';
    if (payload.publish) {
      novel.episodes = novel.episodes.map((ep) => ({
        ...ep,
        publishedAt: ep.publishedAt ?? new Date().toISOString(),
      }));
    }
    novel.updatedAt = new Date().toISOString();
    this.novels.set(id, novel);
    return novel;
  }

  listHomeNovels() {
    return [...this.novels.values()]
      .filter((item) => item.status === 'published')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => ({
        id: item.id,
        title: item.metadata.title,
        genre: item.metadata.genre,
        tone: item.metadata.tone,
        tags: item.metadata.tags,
        audience: item.metadata.audience,
        updatedAt: item.updatedAt,
        episodes: item.episodes.length,
      }));
  }

  private assertAuthorOwns(user: User, id: string) {
    const novel = this.novels.get(id);
    if (!novel) {
      throw new NotFoundException('未找到对应的小说。');
    }
    if (novel.authorId !== user.id) {
      throw new ForbiddenException('仅作者可以编辑小说。');
    }
    return novel;
  }

  private validateMetadata(metadata: NovelMetadata) {
    if (!metadata.title || !metadata.genre || !metadata.tone || !metadata.audience) {
      throw new BadRequestException('标题、类型、风格和读者定位为必填。');
    }
  }

  private validateAiModel(aiModel: AiModelConfig) {
    if (!aiModel.provider || !aiModel.apiKey || !aiModel.modelName) {
      throw new BadRequestException('AI 模型配置不完整。');
    }
  }
}
