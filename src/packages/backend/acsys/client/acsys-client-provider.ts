import { type IAcsysOptions, type IAppLogger, isPublishEnv, AppConfig } from '@golobe-demo/shared';
import { UserRoleEnum, type IAcsysClientProvider, type IAcsysClientBase, type IAcsysClientAdministrator, type IAcsysClientStandard, type IAcsysClientViewer } from './interfaces';
import { AcsysClientAdministrator } from './acsys-client-administrator';
import { AcsysClientStandard } from './acsys-client-standard';
import { AcsysClientViewer } from './acsys-client-viewer';

export class AcsysClientProvider implements IAcsysClientProvider {
  private readonly logger: IAppLogger;
  private readonly clientViewer: IAcsysClientViewer;
  private readonly clientStandard: IAcsysClientStandard;
  private readonly clientAdministrator: IAcsysClientAdministrator;

  public static inject = ['acsysModuleOptions', 'logger'] as const;
  constructor (moduleOptions: IAcsysOptions, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'AcsysClientProvider' });
    const siteUrl = AppConfig.siteUrl;
    const baseUrl = isPublishEnv() ? `${siteUrl}:${moduleOptions.port}` : `http://localhost:${moduleOptions.port}`;
    this.clientViewer = new AcsysClientViewer(baseUrl, moduleOptions.users.viewer, logger, UserRoleEnum.Viewer);
    this.clientStandard = new AcsysClientStandard(baseUrl, moduleOptions.users.standard, logger, UserRoleEnum.Standard);
    this.clientAdministrator = new AcsysClientAdministrator(baseUrl, moduleOptions.users.admin, logger);
  }

  getClient = <
    TUserRole extends UserRoleEnum = UserRoleEnum,
    TResClient extends IAcsysClientBase = 
    TUserRole extends UserRoleEnum.Administrator ? IAcsysClientAdministrator : (TUserRole extends UserRoleEnum.Standard ? IAcsysClientStandard : IAcsysClientViewer)
  >(mode: TUserRole): TResClient => {
    this.logger.debug('get', mode);
    if(mode === UserRoleEnum.Administrator) {
      return this.clientAdministrator as any;
    } else if(mode === UserRoleEnum.Standard) {
      return this.clientStandard as any;
    } else {
      return this.clientViewer as any;
    }
  };

  onClientUsersReady = () => {
    this.logger.debug('client users ready');
    [this.clientViewer, this.clientStandard, this.clientAdministrator].forEach(c => c.onClientUsersReady());
  };
}
