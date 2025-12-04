import { Body, Controller, Post } from '@nestjs/common';
import { ScriptService } from './script.service';
import { ExecutionOptions, ExecutionResult } from './types';

interface ExecuteScriptDto extends ExecutionOptions {
  script: string;
}

@Controller('scripts')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('execute')
  execute(@Body() body: ExecuteScriptDto): ExecutionResult {
    return this.scriptService.execute(body.script, body);
  }
}
