import {
  Condition,
  ExecutionContext,
  ExecutionLog,
  ExecutionOptions,
  ExecutionResult,
  Point,
  ScriptInstruction,
  ScriptProgram,
} from './types';
import { ScriptParser } from './parser';

export class ScriptExecutor {
  private readonly parser = new ScriptParser();

  execute(script: string, options: ExecutionOptions = {}): ExecutionResult {
    const program = this.parser.parse(script);
    const context: ExecutionContext = {
      cursor: options.initialCursor ?? { x: 0, y: 0 },
      mouseLocked: false,
      variables: { ...(options.variables ?? {}) },
      colors: this.buildColorMap(options.colors),
    };

    const logs: ExecutionLog[] = [];
    const loopCounters: Record<number, number> = {};
    let pointer = 0;
    let step = 1;

    while (pointer < program.instructions.length) {
      const instruction = program.instructions[pointer];

      switch (instruction.type) {
        case 'ACTION':
          this.runAction(instruction, context, logs, step++);
          pointer += 1;
          break;
        case 'FOR': {
          const times = instruction.data?.times ?? 0;
          if (loopCounters[pointer] === undefined) {
            loopCounters[pointer] = 0;
          }
          pointer += 1;
          break;
        }
        case 'NEXT': {
          const forIndex: number | undefined = instruction.data?.forIndex;
          if (forIndex === undefined) {
            throw new Error('NEXT encountered without FOR binding.');
          }
          loopCounters[forIndex] = (loopCounters[forIndex] ?? 0) + 1;
          const forTimes = program.instructions[forIndex].data?.times ?? 0;
          if (loopCounters[forIndex] < forTimes) {
            pointer = forIndex + 1;
          } else {
            delete loopCounters[forIndex];
            pointer += 1;
          }
          break;
        }
        case 'IF': {
          const condition: Condition | undefined = instruction.data?.condition;
          const result = this.evaluateCondition(condition, context);
          if (!result) {
            pointer = instruction.jump ?? pointer + 1;
          } else {
            pointer += 1;
          }
          break;
        }
        case 'ELSE': {
          pointer = instruction.jump ?? pointer + 1;
          break;
        }
        case 'END_IF': {
          pointer += 1;
          break;
        }
        case 'GOTO': {
          const label = instruction.data?.label;
          const destination = label ? program.labels[label] : undefined;
          if (destination === undefined) {
            throw new Error(`Label not found: ${label}`);
          }
          pointer = destination;
          break;
        }
        case 'LABEL': {
          pointer += 1;
          break;
        }
        case 'ENDSCRIPT': {
          pointer = program.instructions.length;
          break;
        }
        default:
          pointer += 1;
          break;
      }
    }

    return { logs, cursor: context.cursor, variables: context.variables };
  }

  private runAction(
    instruction: ScriptInstruction,
    context: ExecutionContext,
    logs: ExecutionLog[],
    step: number,
  ): void {
    const action = instruction.data.action;
    switch (action.kind) {
      case 'keyDown':
        this.log(logs, step, instruction.line, `Press key code ${action.keyCode} (${action.times}x)`);
        break;
      case 'keyUp':
        this.log(logs, step, instruction.line, `Release key code ${action.keyCode} (${action.times}x)`);
        break;
      case 'hotkey':
        this.log(logs, step, instruction.line, `Trigger hotkey ${action.keys.join('+')}`);
        break;
      case 'keyPress':
        this.log(logs, step, instruction.line, `Press key ${action.key} (${action.times}x)`);
        break;
      case 'mouseClick':
        this.log(logs, step, instruction.line, `Click ${action.button} button (${action.times}x)`);
        break;
      case 'mouseDown':
        this.log(logs, step, instruction.line, `Mouse ${action.button} down (${action.times}x)`);
        break;
      case 'mouseUp':
        this.log(logs, step, instruction.line, `Mouse ${action.button} up (${action.times}x)`);
        break;
      case 'moveTo':
        if (!context.mouseLocked) {
          context.cursor = { ...action.position };
        }
        this.log(logs, step, instruction.line, `Move to (${context.cursor.x}, ${context.cursor.y})`);
        break;
      case 'moveBy':
        if (!context.mouseLocked) {
          context.cursor = {
            x: context.cursor.x + action.delta.x,
            y: context.cursor.y + action.delta.y,
          };
        }
        this.log(logs, step, instruction.line, `Move by (${action.delta.x}, ${action.delta.y}) to (${context.cursor.x}, ${context.cursor.y})`);
        break;
      case 'mouseWheel':
        this.log(logs, step, instruction.line, `Scroll wheel by ${action.delta}`);
        break;
      case 'saveMousePos':
        context.savedCursor = { ...context.cursor };
        this.log(logs, step, instruction.line, 'Save mouse position');
        break;
      case 'restoreMousePos':
        if (context.savedCursor) {
          context.cursor = { ...context.savedCursor };
        }
        this.log(logs, step, instruction.line, `Restore mouse position to (${context.cursor.x}, ${context.cursor.y})`);
        break;
      case 'lockMouse':
        context.mouseLocked = true;
        this.log(logs, step, instruction.line, 'Lock mouse movement');
        break;
      case 'unlockMouse':
        context.mouseLocked = false;
        this.log(logs, step, instruction.line, 'Unlock mouse movement');
        break;
      case 'waitClick':
        this.log(logs, step, instruction.line, 'Wait for mouse click');
        break;
      case 'getCursorPos':
        context.variables[action.xVar] = context.cursor.x;
        context.variables[action.yVar] = context.cursor.y;
        this.log(logs, step, instruction.line, `Store cursor to ${action.xVar}=${context.cursor.x}, ${action.yVar}=${context.cursor.y}`);
        break;
      case 'delay':
        this.log(logs, step, instruction.line, `Delay ${action.duration} ms`);
        break;
      case 'sayString':
        this.log(logs, step, instruction.line, `Type text: ${action.text}`);
        break;
      case 'setVariable':
        context.variables[action.name] = action.value;
        this.log(logs, step, instruction.line, `Set variable ${action.name}=${action.value}`);
        break;
      case 'getColor': {
        const color = this.getColorAt(context, action.position);
        context.variables[action.target] = color;
        this.log(logs, step, instruction.line, `Sample color at (${action.position.x}, ${action.position.y}) => ${color}`);
        break;
      }
      case 'findColor': {
        const found = this.findColor(context, action.area, action.color);
        if (found) {
          context.variables[action.targetX] = found.x;
          context.variables[action.targetY] = found.y;
          this.log(
            logs,
            step,
            instruction.line,
            `Find color ${action.color} at (${found.x}, ${found.y}) within area`,
          );
        } else {
          context.variables[action.targetX] = null;
          context.variables[action.targetY] = null;
          this.log(logs, step, instruction.line, `Color ${action.color} not found in area`);
        }
        break;
      }
      default:
        break;
    }
  }

  private evaluateCondition(condition: Condition | undefined, context: ExecutionContext): boolean {
    if (!condition) {
      return false;
    }
    if (condition.kind === 'colorEquals') {
      const sampled = this.getColorAt(context, condition.position);
      return sampled.toUpperCase() === condition.color.toUpperCase();
    }
    if (condition.kind === 'variableTruthy') {
      return Boolean(context.variables[condition.name]);
    }
    return false;
  }

  private getColorAt(context: ExecutionContext, position: Point): string {
    const key = `${position.x},${position.y}`;
    return context.colors[key] ?? '000000';
  }

  private findColor(
    context: ExecutionContext,
    area: { left: number; top: number; right: number; bottom: number },
    color: string,
  ): Point | null {
    const normalized = color.toUpperCase();
    for (let x = area.left; x <= area.right; x += 1) {
      for (let y = area.top; y <= area.bottom; y += 1) {
        const key = `${x},${y}`;
        if ((context.colors[key] ?? '').toUpperCase() === normalized) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private buildColorMap(colors?: Array<{ x: number; y: number; color: string }>): Record<string, string> {
    const colorMap: Record<string, string> = {};
    (colors ?? []).forEach((color) => {
      colorMap[`${color.x},${color.y}`] = color.color.toUpperCase();
    });
    return colorMap;
  }

  private log(logs: ExecutionLog[], step: number, instruction: string, detail: string): void {
    logs.push({ step, instruction, detail });
  }
}
