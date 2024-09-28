import type { EntityId } from '@golobe-demo/shared';
import type { SourceCollection, IViewColumnSettings, IViewDisplayProps, IViewInfo } from './views';

export enum UserRoleEnum 
{
  Administrator = 'Administrator',
  Viewer = 'Viewer',
  Standard = 'Standard User'
};
export type UserRole = keyof typeof UserRoleEnum;
export const AvailableUserRoles = Object.values(UserRoleEnum).map(x => x.valueOf());

export type AuthStatus = 'authenticated' | 'pending' | 'failed';

export enum ApiResponseTypes {
  json,
  text,
  bytes
}

export interface IAcsysAuthState {
  getAuthStatus: () => AuthStatus,
  ensureAuthenticated: (acceptPendingStatus?: boolean) => Promise<void>
}

export type UserData = {
  password: string,
  email: string,
  username: string,
  role: UserRoleEnum,
  mode: UserRoleEnum
};

export interface IAcsysClientBase {
  getClientType(): UserRoleEnum,
  isConnected: () => Promise<boolean>,
  onClientUsersReady: () => void,
  hasAdmin: () => Promise<boolean>,
  sendInitialLocalDatabaseConfig: (projectName: string) => Promise<boolean>,
  register: (adminUser: UserData) => Promise<boolean>
}

export interface IAcsysClientViewerMethods {
  getFileInfos: (fileIds: EntityId[]) => Promise<{ id: EntityId, mimeType: string, lastModifiedUtc: Date }[]>
  readFile: (fileId: EntityId) => Promise<{ mimeType: string, bytes: Buffer, lastModifiedUtc: Date }>
}
export interface IAcsysClientStandardMethods {
  uploadFile: (fileId: EntityId, mimeType: string, bytes: Buffer) => Promise<void>
}

/** Administrator API */
export interface IAcsysClientAdministratorMethods {
  createUser: (userData: UserData) => Promise<'created' | 'exists'>;
  findViewInfo: (sourceCollection: SourceCollection) => Promise<IViewInfo | undefined>;
  getViewDisplayProps: (viewId: EntityId) => Promise<IViewDisplayProps>;
  setViewDisplayProps: (viewId: EntityId, props: IViewDisplayProps) => Promise<void>;
  getViewColumnSettings: (viewId: EntityId) => Promise<IViewColumnSettings[]>;
  setViewColumnSettings: (viewId: EntityId, sourceCollection: SourceCollection, settings: Omit<IViewColumnSettings, 'id'>[]) => Promise<void>;
  getDropDownColumnValues: (viewId: EntityId, columnId: EntityId) => Promise<string[] | undefined>;
  setDropDownColumnValues: (viewId: EntityId, columnId: EntityId, columnName: string, values: string[]) => Promise<void>;
  createView: (sourceCollection: SourceCollection, name: string, description: string) => Promise<EntityId>;
}

export type IAcsysClientViewer = IAcsysClientViewerMethods & IAcsysClientBase;
export type IAcsysClientStandard = IAcsysClientViewerMethods & IAcsysClientStandardMethods & IAcsysClientBase;
export type IAcsysClientAdministrator = IAcsysClientViewerMethods & IAcsysClientStandardMethods & IAcsysClientAdministratorMethods & IAcsysClientBase;

export interface IAcsysClientProvider {
  getClient: <TUserRole extends UserRoleEnum = UserRoleEnum,
   TResClient extends IAcsysClientBase = 
    TUserRole extends UserRoleEnum.Administrator ? IAcsysClientAdministrator : (TUserRole extends UserRoleEnum.Standard ? IAcsysClientStandard : IAcsysClientViewer)>
      (mode: TUserRole) => TResClient
  onClientUsersReady: () => void
}
