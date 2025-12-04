export type MouseButton = 'left' | 'right' | 'middle';

export interface Point {
  x: number;
  y: number;
}

export interface ExecutionLog {
  step: number;
  instruction: string;
  detail: string;
}

export interface ExecutionContext {
  cursor: Point;
  savedCursor?: Point;
  mouseLocked: boolean;
  variables: Record<string, any>;
  colors: Record<string, string>;
}

export interface ExecutionOptions {
  initialCursor?: Point;
  variables?: Record<string, any>;
  colors?: Array<{ x: number; y: number; color: string }>;
}

export interface ExecutionResult {
  logs: ExecutionLog[];
  cursor: Point;
  variables: Record<string, any>;
}

export type ScriptAction =
  | { kind: 'keyDown'; keyCode: number; times: number }
  | { kind: 'keyUp'; keyCode: number; times: number }
  | { kind: 'hotkey'; keys: string[] }
  | { kind: 'keyPress'; key: string; times: number }
  | { kind: 'mouseClick'; button: MouseButton; times: number }
  | { kind: 'mouseDown'; button: MouseButton; times: number }
  | { kind: 'mouseUp'; button: MouseButton; times: number }
  | { kind: 'moveTo'; position: Point }
  | { kind: 'moveBy'; delta: Point }
  | { kind: 'mouseWheel'; delta: number }
  | { kind: 'saveMousePos' }
  | { kind: 'restoreMousePos' }
  | { kind: 'lockMouse' }
  | { kind: 'unlockMouse' }
  | { kind: 'waitClick' }
  | { kind: 'getCursorPos'; xVar: string; yVar: string }
  | { kind: 'delay'; duration: number }
  | { kind: 'sayString'; text: string }
  | { kind: 'setVariable'; name: string; value: any; description?: string }
  | { kind: 'getColor'; target: string; position: Point }
  | { kind: 'findColor'; area: { left: number; top: number; right: number; bottom: number }; color: string; targetX: string; targetY: string };

export type Condition =
  | { kind: 'colorEquals'; position: Point; color: string; tolerant: number }
  | { kind: 'variableTruthy'; name: string };

export type InstructionType =
  | 'ACTION'
  | 'FOR'
  | 'NEXT'
  | 'IF'
  | 'ELSE'
  | 'END_IF'
  | 'LABEL'
  | 'GOTO'
  | 'ENDSCRIPT';

export interface ScriptInstruction {
  type: InstructionType;
  line: string;
  data?: any;
  jump?: number;
}

export interface ScriptProgram {
  instructions: ScriptInstruction[];
  labels: Record<string, number>;
}
