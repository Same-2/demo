import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScriptController } from './script/script.controller';
import { ScriptService } from './script/script.service';

@Module({
  imports: [],
  controllers: [AppController, ScriptController],
  providers: [AppService, ScriptService],
})
export class AppModule {}
