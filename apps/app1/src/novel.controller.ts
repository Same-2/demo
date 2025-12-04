import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { NovelService } from './novel.service';

@Controller()
export class NovelController {
  constructor(
    private readonly authService: AuthService,
    private readonly novelService: NovelService,
  ) {}

  @Post('auth/register')
  register(@Body() body: { email: string; password: string; displayName: string }) {
    return this.authService.register(body);
  }

  @Post('auth/login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Post('novels')
  createNovel(
    @Headers('authorization') token: string,
    @Body()
    body: {
      metadata: {
        title: string;
        genre: string;
        tone: string;
        audience: string;
        tags?: string[];
        description: string;
      };
      aiModel: {
        provider: string;
        apiKey: string;
        modelName: string;
        temperature?: number;
        systemPrompt?: string;
      };
    },
  ) {
    const user = this.authService.requireUser(token);
    return this.novelService.createNovel(user, body);
  }

  @Patch('novels/:id/metadata')
  updateMetadata(
    @Headers('authorization') token: string,
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; genre: string; tone: string; audience: string; tags: string[]; description: string }>,
  ) {
    const user = this.authService.requireUser(token);
    return this.novelService.updateMetadata(user, id, body);
  }

  @Patch('novels/:id/ai-model')
  updateAiModel(
    @Headers('authorization') token: string,
    @Param('id') id: string,
    @Body() body: { provider?: string; apiKey?: string; modelName?: string; temperature?: number; systemPrompt?: string },
  ) {
    const user = this.authService.requireUser(token);
    return this.novelService.updateAiModel(user, id, body);
  }

  @Post('novels/:id/episodes')
  addEpisode(
    @Headers('authorization') token: string,
    @Param('id') id: string,
    @Body() body: { title: string; content: string; draftNotes?: string; order?: number },
  ) {
    const user = this.authService.requireUser(token);
    return this.novelService.addEpisode(user, id, body);
  }

  @Patch('novels/:id/episodes/:episodeId')
  updateEpisode(
    @Headers('authorization') token: string,
    @Param('id') id: string,
    @Param('episodeId') episodeId: string,
    @Body() body: Partial<{ title: string; content: string; draftNotes: string; order: number }>,
  ) {
    const user = this.authService.requireUser(token);
    return this.novelService.updateEpisode(user, id, episodeId, body);
  }

  @Post('novels/:id/publish')
  publishNovel(
    @Headers('authorization') token: string,
    @Param('id') id: string,
    @Body() body: { publish: boolean },
  ) {
    const user = this.authService.requireUser(token);
    return this.novelService.publishNovel(user, id, body);
  }

  @Get('novels/:id')
  viewNovel(@Param('id') id: string, @Headers('authorization') token?: string) {
    const viewer = token ? this.authService.requireUser(token) : undefined;
    return this.novelService.getNovelDetail(id, viewer);
  }

  @Get('home/published')
  listPublished() {
    return this.novelService.listHomeNovels();
  }
}
