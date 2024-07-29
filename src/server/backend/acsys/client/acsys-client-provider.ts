import { type IAppLogger } from './../../app-facade/interfaces';
import { isPublishEnv } from './../../app-facade/implementation';
import { UserRoleEnum, type IAcsysClientProvider, type IAcsysClientBase, type IAcsysClientAdministrator, type IAcsysClientStandard, type IAcsysClientViewer } from './interfaces';
import { type IAcsysModuleOptions } from './../../../../appconfig';
import type { H3Event } from 'h3';
import { AcsysClientAdministrator } from './acsys-client-administrator';
import { AcsysClientStandard } from './acsys-client-standard';
import { AcsysClientViewer } from './acsys-client-viewer';

export class AcsysClientProvider implements IAcsysClientProvider {
  private readonly logger: IAppLogger;
  private readonly clientViewer: IAcsysClientViewer;
  private readonly clientStandard: IAcsysClientStandard;
  private readonly clientAdministrator: IAcsysClientAdministrator;

  public static inject = ['acsysModuleOptions', 'logger'] as const;
  constructor (moduleOptions: IAcsysModuleOptions, logger: IAppLogger) {
    this.logger = logger;
    const baseUrl = isPublishEnv() ? `${(useSiteConfig()).url}:${moduleOptions.port}` : `http://localhost:${moduleOptions.port}`;
    this.clientViewer = new AcsysClientViewer(baseUrl, moduleOptions.users.viewer, logger, UserRoleEnum.Viewer);
    this.clientStandard = new AcsysClientStandard(baseUrl, moduleOptions.users.standard, logger, UserRoleEnum.Standard);
    this.clientAdministrator = new AcsysClientAdministrator(baseUrl, moduleOptions.users.admin, logger);
  }

  getClient = <
    TUserRole extends UserRoleEnum = UserRoleEnum,
    TResClient extends IAcsysClientBase = 
    TUserRole extends UserRoleEnum.Administrator ? IAcsysClientAdministrator : (TUserRole extends UserRoleEnum.Standard ? IAcsysClientStandard : IAcsysClientViewer)
  >(mode: TUserRole, event: H3Event): TResClient => {
    this.logger.debug(`(AcsysClientProvider) get, mode=${mode}, url=${event?.node.req.url}`);
    if(mode === UserRoleEnum.Administrator) {
      return this.clientAdministrator as any;
    } else if(mode === UserRoleEnum.Standard) {
      return this.clientStandard as any;
    } else {
      return this.clientViewer as any;
    }
  };

  onClientUsersReady = () => {
    this.logger.debug(`(AcsysClientProvider) client users ready`);
    [this.clientViewer, this.clientStandard, this.clientAdministrator].forEach(c => c.onClientUsersReady());
  };
}
