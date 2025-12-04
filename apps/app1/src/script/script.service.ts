import { Injectable } from '@nestjs/common';
import { ExecutionOptions, ExecutionResult } from './types';
import { ScriptExecutor } from './executor';

@Injectable()
export class ScriptService {
  private readonly executor = new ScriptExecutor();

  execute(script: string, options?: ExecutionOptions): ExecutionResult {
    return this.executor.execute(script, options);
  }
}
