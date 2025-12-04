import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { User } from './models';

interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, string> = new Map();

  register(payload: RegisterPayload) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if ([...this.users.values()].some((u) => u.email === normalizedEmail)) {
      throw new UnauthorizedException('邮箱已经被注册，请尝试登录。');
    }
    const id = randomUUID();
    const newUser: User = {
      id,
      email: normalizedEmail,
      displayName: payload.displayName.trim() || normalizedEmail,
      passwordHash: this.hashPassword(payload.password),
    };
    this.users.set(id, newUser);
    return this.issueSession(newUser);
  }

  login(payload: LoginPayload) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = [...this.users.values()].find(
      (item) => item.email === normalizedEmail,
    );
    if (!user) {
      throw new UnauthorizedException('未找到该邮箱，请先注册。');
    }
    const hashed = this.hashPassword(payload.password);
    if (hashed !== user.passwordHash) {
      throw new UnauthorizedException('密码错误。');
    }
    return this.issueSession(user);
  }

  requireUser(token?: string): User {
    if (!token) {
      throw new UnauthorizedException('缺少登录凭证。');
    }
    const cleaned = token.replace('Bearer ', '').trim();
    const userId = this.sessions.get(cleaned);
    if (!userId) {
      throw new UnauthorizedException('登录状态已失效，请重新登录。');
    }
    const user = this.users.get(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在。');
    }
    return user;
  }

  private hashPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }

  private issueSession(user: User) {
    const token = randomUUID();
    this.sessions.set(token, user.id);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }
}
