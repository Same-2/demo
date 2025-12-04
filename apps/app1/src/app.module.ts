import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth.service';
import { NovelController } from './novel.controller';
import { NovelService } from './novel.service';

@Module({
  imports: [],
  controllers: [AppController, NovelController],
  providers: [AppService, AuthService, NovelService],
})
export class AppModule {}
