export type IAccount = {
  id: string
  name: string
}

export type IUser = {
  id: string
  username: string
  email: string
}

export interface IAccountManagerService {
  listAccounts(): Promise<IAccount[]>
}

export interface IUserManagerService {
  listUsers(): Promise<IUser[]>
}

export interface IRedisService {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
}
