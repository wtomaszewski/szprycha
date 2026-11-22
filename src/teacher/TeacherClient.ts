import { z } from 'zod';
import { classInfo, teacherBoard, teacherToken } from '../content/classes';
import { rankingRequest } from '../rankings/request';

const list = z.array(classInfo);
const session = z.strictObject({ token: teacherToken });

export class TeacherClient {
  private token?: string;
  private readonly base: URL;

  constructor(url: string) {
    this.base = new URL(url);
    this.base.pathname = this.base.pathname.replace(/\/?$/, '/');
  }

  async signIn(email: string, password: string, register: boolean) {
    const auth = await this.request(register ? 'register' : 'login', 'POST', {
      email,
      password,
      ...(register ? { adult: true } : {}),
    });
    this.token = session.parse(await auth.json()).token;
  }

  async logout() {
    try {
      await this.request('session', 'DELETE');
    } finally {
      this.clearSession();
    }
  }

  async deleteAccount() {
    await this.request('account', 'DELETE');
    this.clearSession();
  }

  clearSession() {
    this.token = undefined;
  }

  async classes() {
    return list.parse(await (await this.request('classes')).json());
  }

  async create(name: string) {
    return classInfo.parse(
      await (await this.request('classes', 'POST', { name })).json(),
    );
  }

  async board(id: string) {
    return teacherBoard.parse(
      await (await this.request('classes/' + id)).json(),
    );
  }

  async reset(id: string) {
    await this.request('classes/' + id + '/reset', 'POST');
  }

  async code(id: string, open: boolean) {
    return classInfo.parse(
      await (
        await this.request('classes/' + id + '/code', open ? 'POST' : 'DELETE')
      ).json(),
    );
  }

  async deleteClass(id: string) {
    await this.request('classes/' + id, 'DELETE');
  }

  private request(path: string, method = 'GET', data?: object) {
    return rankingRequest(
      this.base,
      '/v1/teacher/' + path,
      {
        method,
        body: data && JSON.stringify(data),
      },
      this.token,
    );
  }
}
