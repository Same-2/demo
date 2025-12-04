import { Condition, ScriptAction, ScriptInstruction, ScriptProgram } from './types';

export class ScriptParser {
  parse(script: string): ScriptProgram {
    const rawLines = script
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('//'));

    const instructions: ScriptInstruction[] = [];
    const labels: Record<string, number> = {};
    const forStack: number[] = [];
    const ifStack: Array<{ ifIndex: number; elseIndex?: number }> = [];

    rawLines.forEach((line) => {
      const instruction = this.parseLine(line);
      if (!instruction) {
        return;
      }

      if (instruction.type === 'LABEL' && instruction.data?.label) {
        labels[instruction.data.label] = instructions.length;
      }

      instructions.push(instruction);

      if (instruction.type === 'FOR') {
        forStack.push(instructions.length - 1);
      }

      if (instruction.type === 'NEXT') {
        const forIndex = forStack.pop();
        if (forIndex === undefined) {
          throw new Error('NEXT without FOR');
        }
        instruction.data = { ...instruction.data, forIndex };
        instructions[forIndex].jump = instructions.length - 1;
      }

      if (instruction.type === 'IF') {
        ifStack.push({ ifIndex: instructions.length - 1 });
      }

      if (instruction.type === 'ELSE') {
        const stackItem = ifStack[ifStack.length - 1];
        if (!stackItem) {
          throw new Error('ELSE without IF');
        }
        stackItem.elseIndex = instructions.length - 1;
      }

      if (instruction.type === 'END_IF') {
        const stackItem = ifStack.pop();
        if (!stackItem) {
          throw new Error('END IF without IF');
        }
        const endIndex = instructions.length - 1;
        const ifInstruction = instructions[stackItem.ifIndex];
        if (stackItem.elseIndex !== undefined) {
          ifInstruction.jump = stackItem.elseIndex + 1;
          instructions[stackItem.elseIndex].jump = endIndex + 1;
        } else {
          ifInstruction.jump = endIndex + 1;
        }
      }
    });

    if (forStack.length > 0) {
      throw new Error('FOR without matching NEXT');
    }

    if (ifStack.length > 0) {
      throw new Error('IF without matching END IF');
    }

    return { instructions, labels };
  }

  private parseLine(line: string): ScriptInstruction | null {
    const normalized = line.replace(/\s+/g, ' ').trim();

    if (/^Rem\s+/i.test(normalized)) {
      return { type: 'LABEL', line, data: { label: normalized.split(' ')[1] } };
    }

    if (/^Goto\s+/i.test(normalized)) {
      return { type: 'GOTO', line, data: { label: normalized.split(' ')[1] } };
    }

    if (/^EndScript/i.test(normalized)) {
      return { type: 'ENDSCRIPT', line };
    }

    const forMatch = normalized.match(/^For\s+(\d+)/i);
    if (forMatch) {
      return { type: 'FOR', line, data: { times: Number(forMatch[1]) } };
    }

    if (/^Next$/i.test(normalized)) {
      return { type: 'NEXT', line };
    }

    if (/^If\s+/i.test(normalized)) {
      return { type: 'IF', line, data: { condition: this.parseCondition(normalized) } };
    }

    if (/^Else$/i.test(normalized)) {
      return { type: 'ELSE', line };
    }

    if (/^End If$/i.test(normalized) || /^End If$/i.test(normalized)) {
      return { type: 'END_IF', line };
    }

    const action = this.parseAction(normalized);
    if (action) {
      return { type: 'ACTION', line, data: { action } };
    }

    return null;
  }

  private parseAction(line: string): ScriptAction | null {
    const keyDown = line.match(/^KeyDown\s+(\d+),\s*(\d+)/i);
    if (keyDown) {
      return { kind: 'keyDown', keyCode: Number(keyDown[1]), times: Number(keyDown[2]) };
    }

    const keyUp = line.match(/^KeyUp\s+(\d+),\s*(\d+)/i);
    if (keyUp) {
      return { kind: 'keyUp', keyCode: Number(keyUp[1]), times: Number(keyUp[2]) };
    }

    const hotkey = line.match(/^Hotkey\s+"(.+?)"/i);
    if (hotkey) {
      const keys = hotkey[1].split(/","/).map((k) => k.replace(/"/g, ''));
      return { kind: 'hotkey', keys };
    }

    const keyPress = line.match(/^KeyPress\s+"(.+?)",\s*(\d+)/i);
    if (keyPress) {
      return { kind: 'keyPress', key: keyPress[1], times: Number(keyPress[2]) };
    }

    const leftClick = line.match(/^LeftClick\s+(\d+)/i);
    if (leftClick) {
      return { kind: 'mouseClick', button: 'left', times: Number(leftClick[1]) };
    }

    const leftDown = line.match(/^LeftDown\s+(\d+)/i);
    if (leftDown) {
      return { kind: 'mouseDown', button: 'left', times: Number(leftDown[1]) };
    }

    const leftUp = line.match(/^LeftUp\s+(\d+)/i);
    if (leftUp) {
      return { kind: 'mouseUp', button: 'left', times: Number(leftUp[1]) };
    }

    const rightClick = line.match(/^RightClick\s+(\d+)/i);
    if (rightClick) {
      return { kind: 'mouseClick', button: 'right', times: Number(rightClick[1]) };
    }

    const rightDown = line.match(/^RightDown\s+(\d+)/i);
    if (rightDown) {
      return { kind: 'mouseDown', button: 'right', times: Number(rightDown[1]) };
    }

    const rightUp = line.match(/^RightUp\s+(\d+)/i);
    if (rightUp) {
      return { kind: 'mouseUp', button: 'right', times: Number(rightUp[1]) };
    }

    const middleClick = line.match(/^MiddleClick\s+(\d+)/i);
    if (middleClick) {
      return { kind: 'mouseClick', button: 'middle', times: Number(middleClick[1]) };
    }

    const moveTo = line.match(/^MoveTo\s+(-?\d+),\s*(-?\d+)/i);
    if (moveTo) {
      return { kind: 'moveTo', position: { x: Number(moveTo[1]), y: Number(moveTo[2]) } };
    }

    const moveR = line.match(/^MoveR\s+(-?\d+),\s*(-?\d+)/i);
    if (moveR) {
      return { kind: 'moveBy', delta: { x: Number(moveR[1]), y: Number(moveR[2]) } };
    }

    const mouseWheel = line.match(/^MouseWheel\s+(-?\s*\d+)/i);
    if (mouseWheel) {
      return { kind: 'mouseWheel', delta: Number(mouseWheel[1].replace(/\s+/g, '')) };
    }

    if (/^SaveMousePos$/i.test(line)) {
      return { kind: 'saveMousePos' };
    }

    if (/^RestoreMousePos$/i.test(line)) {
      return { kind: 'restoreMousePos' };
    }

    if (/^LockMouse$/i.test(line)) {
      return { kind: 'lockMouse' };
    }

    if (/^UnlockMouse$/i.test(line)) {
      return { kind: 'unlockMouse' };
    }

    if (/^WaitClick$/i.test(line)) {
      return { kind: 'waitClick' };
    }

    const getCursor = line.match(/^GetCursorPos\s+(\w+),\s*(\w+)/i);
    if (getCursor) {
      return { kind: 'getCursorPos', xVar: getCursor[1], yVar: getCursor[2] };
    }

    const delay = line.match(/^Delay\s+(\d+)/i);
    if (delay) {
      return { kind: 'delay', duration: Number(delay[1]) };
    }

    const sayString = line.match(/^SayString\s+"(.+?)"/i);
    if (sayString) {
      return { kind: 'sayString', text: sayString[1] };
    }

    const userVar = line.match(/^UserVar\s+(\w+)=(.+?)(\s+"(.+)")?$/i);
    if (userVar) {
      return {
        kind: 'setVariable',
        name: userVar[1],
        value: this.parseValue(userVar[2]),
        description: userVar[4],
      };
    }

    const getColor = line.match(/^(\w+)\s*=\s*GetPixelColor\(([-\d]+),\s*([-\d]+)\)/i);
    if (getColor) {
      return {
        kind: 'getColor',
        target: getColor[1],
        position: { x: Number(getColor[2]), y: Number(getColor[3]) },
      };
    }

    const findColor = line.match(
      /^FindColor\s+([-\d]+),([-\d]+),([-\d]+),([-\d]+),"([0-9A-Fa-f]{6})",(\w+),(\w+)/i,
    );
    if (findColor) {
      return {
        kind: 'findColor',
        area: {
          left: Number(findColor[1]),
          top: Number(findColor[2]),
          right: Number(findColor[3]),
          bottom: Number(findColor[4]),
        },
        color: findColor[5].toUpperCase(),
        targetX: findColor[6],
        targetY: findColor[7],
      };
    }

    return null;
  }

  private parseCondition(line: string): Condition {
    const ifColor = line.match(
      /^IfColor\s+([-\d]+),\s*([-\d]+),\s*"([0-9A-Fa-f]{6})",\s*(\d+)\s+Then/i,
    );
    if (ifColor) {
      return {
        kind: 'colorEquals',
        position: { x: Number(ifColor[1]), y: Number(ifColor[2]) },
        color: ifColor[3].toUpperCase(),
        tolerant: Number(ifColor[4]),
      };
    }

    const ifVariable = line.match(/^If\s+(\w+)\s+Then/i);
    if (ifVariable) {
      return { kind: 'variableTruthy', name: ifVariable[1] };
    }

    throw new Error(`Unsupported IF condition: ${line}`);
  }

  private parseValue(value: string): any {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
    if (trimmed === 'True') {
      return true;
    }
    if (trimmed === 'False') {
      return false;
    }
    return trimmed.replace(/^"|"$/g, '');
  }
}
