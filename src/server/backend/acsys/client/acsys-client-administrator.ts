import { type EntityId, type IAppLogger } from '../../app-facade/interfaces';
import type { IAcsysClientAdministrator, UserData } from './interfaces';
import type { GetDropdownValuesDto, EditDropdownValuesDto, CreateViewDto, DeleteDataDto, CreateUserDto, ViewColumnDetailsDto, AddViewColumnDetailsDto, ViewInfoResponseDto, ViewDisplayPropsDto, SetViewDisplayPropsDto } from './dto';
import { SetViewDisplayPropsDtoSchema, FieldEditControl, FieldType, AddViewColumnDetailsDtoSchema, DeleteDataDtoSchema, CreateViewDtoSchema, CreateUserDtoSchema, EditDropdownValuesDtoSchema } from './dto';
import { AcsysTableDetailsDropdown, RouteCreateView, RouteDeleteData, RouteInsertWithUid, RouteCreateUser, AcsysTableViews, AcsysTableLogicalContent, AcsysTableSourceCollectionColumn, RouteReadData, RouteUpdateData, AcsysTableIdColumn, AcsysTableFieldNameColumn, AcsysTableDocumentDetails, AcsysTableContentIdColumn, RouteInsertData } from './constants';
import { ApiResponseTypes, UserRoleEnum } from './interfaces';
import { AcsysClientStandard } from './acsys-client-standard';
import { AppException, AppExceptionCodeEnum, lookupValueOrThrow } from './../../app-facade/implementation';
import { type IUserOptions } from './../../../../appconfig';
import omit from 'lodash-es/omit';
import uniqBy from 'lodash-es/uniqBy';
import { type SourceCollection, type IViewInfo, type IViewDisplayProps, type IViewColumnSettings, SortOrderEnum, FieldEditControlEnum, FieldEnum } from './views';


export class AcsysClientAdministrator extends AcsysClientStandard implements IAcsysClientAdministrator {
  public static override inject = ['logger'] as const;
  constructor (baseUrl: string, userOptions: IUserOptions, logger: IAppLogger) {
    super(baseUrl, userOptions, logger, UserRoleEnum.Administrator);
  }

  mapViewInfoDto = (dto: ViewInfoResponseDto, sourceCollection: SourceCollection): IViewInfo => {
    return {
      id: dto.viewId,
      name: dto.name,
      description: dto.description ?? '',
      position: dto.position,
      sourceCollection,
      tableKeys: dto.table_keys ?? []
    };
  };

  mapViewDisplayPropsDto = (dto: ViewDisplayPropsDto): IViewDisplayProps => {
    return {
      addRemoveOperationsAllowed: !!dto.is_removable,
      sortOrder: dto.view_order ? lookupValueOrThrow(SortOrderEnum, dto.view_order) : SortOrderEnum.Asc,
      sortColumn: dto.order_by,
      pageSize: dto.row_num
    };
  };

  mapViewDisplayProps = (viewId: EntityId, props: IViewDisplayProps): ViewDisplayPropsDto => {
    return {
      acsys_id: viewId,
      is_removable: props.addRemoveOperationsAllowed ? 1 : 0,
      is_table_mode: 1,
      row_num: props.pageSize,
      link_table: '',
      link_view_id: '',
      order_by: props.sortColumn,
      view_order: props.sortOrder?.valueOf() ?? ''
    };
  };

  mapViewColumnDetailsDto = (dto: ViewColumnDetailsDto, dropdownValues: string[] | undefined): IViewColumnSettings => {
    return {
      id: dto.acsys_id,
      control: lookupValueOrThrow(FieldEditControlEnum, lookupValueOrThrow(FieldEditControl, dto.control)),
      dropdownValues,
      displayOrder: dto.view_order,
      isKey: dto.is_key > 0,
      isVisibleOnPage: dto.is_visible_on_page > 0,
      isVisibleOnTable: dto.is_visible_on_table > 0,
      name: dto.field_name,
      type: lookupValueOrThrow(FieldEnum, lookupValueOrThrow(FieldType, dto.type)),
      width: dto.width
    };
  };

  mapAddViewColumnDetails = (settings: Omit<IViewColumnSettings, 'id'>, viewId: EntityId, sourceCollection: SourceCollection): AddViewColumnDetailsDto => {
    return {
      table: AcsysTableDocumentDetails,
      entry: {
        collection: sourceCollection.valueOf(),
        content_id: viewId,
        control: settings.control.valueOf(),
        field_name: settings.name,
        is_key: settings.isKey ? 1 : 0,
        is_visible_on_page: settings.isVisibleOnPage ? 1 : 0,
        is_visible_on_table: settings.isVisibleOnTable ? 1 : 0,
        type: settings.type.valueOf(),
        view_order: settings.displayOrder,
        width: settings.width
      },
      fields: [AcsysTableIdColumn]
    };
  };

  findViewInfo = async (sourceCollection: SourceCollection): Promise<IViewInfo | undefined> => {
    this.logger.verbose(`(AcsysClientAdministrator) find view info, sourceCollection=${sourceCollection.valueOf()}`);

    const queryParams = {
      table: AcsysTableLogicalContent,
      options: `{"where":[["${AcsysTableSourceCollectionColumn}","=","${sourceCollection.valueOf()}"]]}`
    };

    const fetchResult = await this.fetch<ApiResponseTypes.json, ViewInfoResponseDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);
    if(fetchResult.length === 0) {
      this.logger.verbose(`(AcsysClientAdministrator) view not found, sourceCollection=${sourceCollection.valueOf()}`);
      return undefined;
    }
    const uniqueItems = uniqBy(fetchResult, (i) => i.acsys_id);
    if(uniqueItems.length > 1) {
      this.logger.warn(`(AcsysClientAdministrator) too much views, sourceCollection=${sourceCollection.valueOf()}, all ids=[${(uniqueItems.map(f => f.acsys_id)).join('; ')}]`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much views found', 'error-page');
    }

    const result = this.mapViewInfoDto(uniqueItems[0], sourceCollection);
    this.logger.verbose(`(AcsysClientAdministrator) view found, sourceCollection=${sourceCollection.valueOf()}, viewId=${result.id}`);
    return result;
  };

  getViewDisplayProps = async (viewId: EntityId): Promise<IViewDisplayProps> => {
    this.logger.verbose(`(AcsysClientAdministrator) get view display props, viewId=${viewId}`);

    const queryParams = {
      table: AcsysTableViews,
      options: `{"where":[["${AcsysTableIdColumn}","=","${viewId}"]]}`
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, ViewDisplayPropsDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);
    if(fetchResult.length === 0) {
      this.logger.warn(`(AcsysClientAdministrator) view display props not found, viewId=${viewId}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'Acsys view not found', 'error-page');
    }
    const uniqueItems = uniqBy(fetchResult, (i) => i.acsys_id);
    if(uniqueItems.length > 1) {
      this.logger.warn(`(AcsysClientAdministrator) too much view display props found, viewId=${viewId}`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much views found', 'error-page');
    }

    const result = this.mapViewDisplayPropsDto(uniqueItems[0]);
    this.logger.verbose(`(AcsysClientAdministrator) view display props found, viewId=${viewId}`, result);
    
    return result;
  };

  setViewDisplayProps = async (viewId: EntityId, props: IViewDisplayProps): Promise<void> => {
    this.logger.verbose(`(AcsysClientAdministrator) set view display props, viewId=${viewId}`, props);

    const body: SetViewDisplayPropsDto = {
      table: AcsysTableViews,
      entry: this.mapViewDisplayProps(viewId, props),
      keys: [[AcsysTableIdColumn, '=', viewId]]
    };
    
    const fetchResult = await this.fetch<ApiResponseTypes.text, string>(RouteUpdateData, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.text, SetViewDisplayPropsDtoSchema);
    const isSuccess = fetchResult.toLowerCase() === 'true';
    if(!isSuccess) {
      this.logger.warn(`(AcsysClientAdministrator) failed to set view display props, viewId=${viewId}, response=${fetchResult}`, props);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to set view display props', 'error-page');
    }

    this.logger.verbose(`(AcsysClientAdministrator) view display props set, viewId=${viewId}`, props);
  };

  getDropDownColumnValues = async(viewId: EntityId, columnId: EntityId): Promise<string[] | undefined> => {
    this.logger.debug(`(AcsysClientAdministrator) get dropdown column values, viewId=${viewId}, columnId=${columnId}`);

    const queryParams = {
      table: AcsysTableDetailsDropdown,
      options: `{"where":[["${AcsysTableIdColumn}","=","${columnId}"]]}`
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, GetDropdownValuesDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);
    let result: string[] | undefined;
    if(fetchResult.length === 0) {
      this.logger.verbose(`(AcsysClientAdministrator) dropdown column values response empty, viewId=${viewId}, columnId=${columnId}`);
    } else if(fetchResult.length > 1) {
      this.logger.warn(`(AcsysClientAdministrator) too much dropdown column value dtos in reponse, viewId=${viewId}, columnId=${columnId}`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much dropdown column values found', 'error-page');
    } else {
      result = (fetchResult[0].field ?? '').split(',');
    }

    this.logger.debug(`(AcsysClientAdministrator) dropdown column values obtained, viewId=${viewId}, columnId=${columnId}, result=[${result?.join(',') ?? ''}]`);
    return result;
  };

  setDropDownColumnValues = async (viewId: EntityId, columnId: EntityId, columnName: string, values: string[]): Promise<void> => {
    this.logger.debug(`(AcsysClientAdministrator) set dropdown column values, viewId=${viewId}, columnId=${columnId}, columnName=${columnName}, values=${values.join(',')}`);

    const isUpdate = (await this.getDropDownColumnValues(viewId, columnId)) !== undefined;

    let valuesList = values.filter(v => v?.length).join(',');
    if(values.some(v => !(v?.length))) {
      valuesList = ',' + valuesList;
    }
    const body: EditDropdownValuesDto = {
      table: AcsysTableDetailsDropdown,
      entry: {
        acsys_id: columnId,
        field_name: columnName,
        field: valuesList
      },
      keys: isUpdate ? [
        [AcsysTableIdColumn, '=', columnId],
        [AcsysTableFieldNameColumn, '=', columnName]
      ] : undefined
    };
    
    const fetchResult = await this.fetch<ApiResponseTypes.text, string>(isUpdate ? RouteUpdateData : RouteInsertData, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.text, EditDropdownValuesDtoSchema);
    const isSuccess = fetchResult.toLowerCase() === 'true';
    if(!isSuccess) {
      this.logger.warn(`(AcsysClientAdministrator) failed to set dropdown column values, viewId=${viewId}, columnId=${columnId}, columnName=${columnName}, values=${values.join(',')}, response=${fetchResult}`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to set dropdown column values', 'error-page');
    }

    this.logger.debug(`(AcsysClientAdministrator) dropdown column values have been set, viewId=${viewId}, columnId=${columnId}, columnName=${columnName}, values=${values.join(',')}`);
  };

  getViewColumnSettings = async (viewId: EntityId): Promise<IViewColumnSettings[]> => {
    this.logger.verbose(`(AcsysClientAdministrator) get view column settings, viewId=${viewId}`);

    const queryParams = {
      table: AcsysTableDocumentDetails,
      options: `{"where":[["${AcsysTableContentIdColumn}","=","${viewId}"]]}`
    };

    const fetchResult = await this.fetch<ApiResponseTypes.json, ViewColumnDetailsDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);

    const dropdownColumns = new Map<EntityId, string[]>();

    this.logger.debug(`(AcsysClientAdministrator) checking dropdown column settings, viewId=${viewId}`);
    const dropdownColumnDtos = fetchResult.filter(c => c.control === FieldEditControl.DropDown.valueOf());
    for(let i = 0; i < dropdownColumnDtos.length; i++) {
      const columnId = dropdownColumnDtos[i].acsys_id;
      const values = await this.getDropDownColumnValues(viewId, columnId);
      dropdownColumns.set(columnId, values ?? []);
    }

    const result = fetchResult.map((columnDto) => {
      const isDropdown = columnDto.control === FieldEditControl.DropDown.valueOf();
      const columnId = columnDto.acsys_id;
      return this.mapViewColumnDetailsDto(columnDto, isDropdown ? dropdownColumns.get(columnId) : undefined);
    });
    this.logger.verbose(`(AcsysClientAdministrator) view column settings obtained, viewId=${viewId}, count=${result.length}`);
    return result;
  };

  setViewColumnSettings = async (viewId: EntityId, sourceCollection: SourceCollection, settings: Omit<IViewColumnSettings, 'id'>[]): Promise<void> => {
    this.logger.verbose(`(AcsysClientAdministrator) set view column settings, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, count=${settings.length}`);

    this.logger.debug(`(AcsysClientAdministrator) obtaining view's current column ids list, viewId=${viewId}`);
    const currentColumns = (await this.getViewColumnSettings(viewId));

    if(currentColumns.length) {
      this.logger.debug(`(AcsysClientAdministrator) removing view's current column list, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, count=${currentColumns.length}`);
      const body: DeleteDataDto = {
        table: AcsysTableDocumentDetails,
        entry: [[AcsysTableContentIdColumn, '=', viewId]]
      };
      
      const fetchResult = await this.fetch<ApiResponseTypes.text, string>(RouteDeleteData, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.text, DeleteDataDtoSchema);
      const isSuccess = fetchResult.toLowerCase() === 'true';
      if(!isSuccess) {
        this.logger.warn(`(AcsysClientAdministrator) failed to remove view's columns list, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, response=${fetchResult}, reqDto=${JSON.stringify(body)}`);
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to remove view column settigns', 'error-page');
      }

      this.logger.debug(`(AcsysClientAdministrator) view's current column list removed, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, count=${currentColumns.length}`);
    }

    if(!settings.length) {
      this.logger.verbose(`(AcsysClientAdministrator) view column settings were set, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, count=${settings.length}`);
      return;
    }

    for(let i = 0; i < settings.length; i++) {
      this.logger.debug(`(AcsysClientAdministrator) adding view's column settings, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, column=${settings[i].name}, settings=${JSON.stringify(settings[i])}`);
      const body: AddViewColumnDetailsDto = this.mapAddViewColumnDetails(settings[i], viewId, sourceCollection);
      
      const fetchResult = await this.fetch<ApiResponseTypes.json, any>(RouteInsertWithUid, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.json, AddViewColumnDetailsDtoSchema);
      const isSuccessfull = fetchResult?.status === true;
      const columnId = fetchResult.fields?.find((f: { field: string; }) => f.field === AcsysTableIdColumn)?.value;
      if(!isSuccessfull || !columnId) {
        this.logger.warn(`(AcsysClientAdministrator) failed to add view column settings, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, column=${settings[i].name}, response=${JSON.stringify(fetchResult)}`);
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to set view display props', 'error-page');
      }
      if(settings[i].dropdownValues?.length) {        
        await this.setDropDownColumnValues(viewId, columnId, settings[i].name, settings[i].dropdownValues!);
      }

      this.logger.debug(`(AcsysClientAdministrator) view's column settings added, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()}, column=${settings[i].name}`);
    }
    
    this.logger.verbose(`(AcsysClientAdministrator) view column settings were set, viewId=${viewId}, sourceCollection=${sourceCollection.valueOf()} count=${settings.length}`);
  };

  createView = async (sourceCollection: SourceCollection, name: string, description: string): Promise<EntityId> => {
    this.logger.verbose(`(AcsysClientAdministrator) creating view, sourceCollection=${sourceCollection.valueOf()}, name=${name}`);

    const bodyDto: CreateViewDto = {
      collection: sourceCollection.valueOf(),
      description,
      name
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, any>(RouteCreateView, undefined, bodyDto, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.json, CreateViewDtoSchema);
    const isSuccessfull = fetchResult?.status === 'success';
    if(!isSuccessfull) {
      this.logger.warn(`(AcsysClientAdministrator) failed to create view, sourceCollection=${sourceCollection.valueOf()}, name=${name}, response=${JSON.stringify(fetchResult)}`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to create view', 'error-page');
    }

    this.logger.debug(`(AcsysClientAdministrator) obtaining created view's id, sourceCollection=${sourceCollection.valueOf()}, name=${name}`);
    const viewInfo = await this.findViewInfo(sourceCollection);
    if(!viewInfo) {
      this.logger.warn(`(AcsysClientAdministrator) created view not found, sourceCollection=${sourceCollection.valueOf()}, name=${name}`);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to create view', 'error-page');
    }

    this.logger.verbose(`(AcsysClientAdministrator) view created, sourceCollection=${sourceCollection.valueOf()}, name=${name}, viewId=${viewInfo.id}`);
    return viewInfo.id;
  };

  createUser = async (userData: UserData): Promise<'created' | 'exists'> => {
    this.logger.info(`(AcsysClientAdministrator) creating user`, omit(userData, 'password'));

    const bodyDto: CreateUserDto = {
      data: {
        email: userData.email,
        mode: userData.mode.valueOf(),
        password: userData.password,
        role: userData.role.valueOf(),
        username: userData.username
      }
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, any>(RouteCreateUser, undefined, bodyDto, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.json, CreateUserDtoSchema);

    const exists = fetchResult?.message === 'Email already in use.' || fetchResult?.message === 'Username already in use.';
    if(exists) {
      this.logger.info(`(AcsysClientAdministrator) user already exists, username=${userData.username}`, omit(userData, 'password'));  
      return 'exists';
    }

    const resultText = JSON.stringify(fetchResult);
    const isSuccess = resultText.toLowerCase() === 'true';
    if(!isSuccess) {
      this.logger.warn(`(AcsysClientAdministrator) failed to create user, response=${resultText}`, omit(userData, 'password'));
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to create user', 'error-page');
    }

    this.logger.info(`(AcsysClientAdministrator) user created, acsys_id=${fetchResult.acsys_id}`, omit(userData, 'password'));
    return 'created';
  };
}
