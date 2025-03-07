import { AppException, AppExceptionCodeEnum, lookupValueOrThrow, type EntityId, type IAppLogger, type IAcsysUserOptions } from '@golobe-demo/shared';
import { ApiResponseTypes, UserRoleEnum, type IAcsysClientAdministrator, type UserData } from './interfaces';
import { SetViewDisplayPropsDtoSchema, FieldEditControl, FieldType, AddViewColumnDetailsDtoSchema, DeleteDataDtoSchema, CreateViewDtoSchema, CreateUserDtoSchema, EditDropdownValuesDtoSchema, type GetDropdownValuesDto, type EditDropdownValuesDto, type CreateViewDto, type DeleteDataDto, type CreateUserDto, type ViewColumnDetailsDto, type AddViewColumnDetailsDto, type ViewInfoResponseDto, type ViewDisplayPropsDto, type SetViewDisplayPropsDto } from './dto';
import { AcsysTableDetailsDropdown, RouteCreateView, RouteDeleteData, RouteInsertWithUid, RouteCreateUser, AcsysTableViews, AcsysTableLogicalContent, AcsysTableSourceCollectionColumn, RouteReadData, RouteUpdateData, AcsysTableIdColumn, AcsysTableFieldNameColumn, AcsysTableDocumentDetails, AcsysTableContentIdColumn, RouteInsertData } from './constants';
import { AcsysClientStandard } from './acsys-client-standard';
import { type SourceCollection, type IViewInfo, type IViewDisplayProps, type IViewColumnSettings, SortOrderEnum, FieldEditControlEnum, FieldEnum } from './views';
import omit from 'lodash-es/omit';
import uniqBy from 'lodash-es/uniqBy';

export class AcsysClientAdministrator extends AcsysClientStandard implements IAcsysClientAdministrator {
  public static override inject = ['logger'] as const;
  constructor (baseUrl: string, userOptions: IAcsysUserOptions, logger: IAppLogger) {
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
    this.logger.verbose('find view info', { sourceCollection: sourceCollection.valueOf() });

    const queryParams = {
      table: AcsysTableLogicalContent,
      options: `{"where":[["${AcsysTableSourceCollectionColumn}","=","${sourceCollection.valueOf()}"]]}`
    };

    const fetchResult = await this.fetch<ApiResponseTypes.json, ViewInfoResponseDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);
    if(fetchResult.length === 0) {
      this.logger.verbose('view not found', { sourceCollection: sourceCollection.valueOf() });
      return undefined;
    }
    const uniqueItems = uniqBy(fetchResult, (i) => i.acsys_id);
    if(uniqueItems.length > 1) {
      const allIds = uniqueItems.map(f => f.acsys_id);
      this.logger.warn('too much views', undefined, { sourceCollection: sourceCollection.valueOf(), ids: allIds });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much views found', 'error-page');
    }

    const result = this.mapViewInfoDto(uniqueItems[0], sourceCollection);
    this.logger.verbose('view found', { sourceCollection: sourceCollection.valueOf(), viewId: result.id });
    return result;
  };

  getViewDisplayProps = async (viewId: EntityId): Promise<IViewDisplayProps> => {
    this.logger.verbose('get view display props', viewId);

    const queryParams = {
      table: AcsysTableViews,
      options: `{"where":[["${AcsysTableIdColumn}","=","${viewId}"]]}`
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, ViewDisplayPropsDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);
    if(fetchResult.length === 0) {
      this.logger.warn('view display props not found', undefined, viewId);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'Acsys view not found', 'error-page');
    }
    const uniqueItems = uniqBy(fetchResult, (i) => i.acsys_id);
    if(uniqueItems.length > 1) {
      this.logger.warn('too much view display props found', undefined, viewId);
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much views found', 'error-page');
    }

    const result = this.mapViewDisplayPropsDto(uniqueItems[0]);
    this.logger.verbose('view display props found', viewId);
    
    return result;
  };

  setViewDisplayProps = async (viewId: EntityId, props: IViewDisplayProps): Promise<void> => {
    this.logger.verbose('set view display props', viewId);

    const body: SetViewDisplayPropsDto = {
      table: AcsysTableViews,
      entry: this.mapViewDisplayProps(viewId, props),
      keys: [[AcsysTableIdColumn, '=', viewId]]
    };
    
    const fetchResult = await this.fetch<ApiResponseTypes.text, string>(RouteUpdateData, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.text, SetViewDisplayPropsDtoSchema);
    const isSuccess = fetchResult.toLowerCase() === 'true';
    if(!isSuccess) {
      this.logger.warn('failed to set view display props', undefined, { viewId, response: fetchResult });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to set view display props', 'error-page');
    }

    this.logger.verbose('view display props set', viewId);
  };

  getDropDownColumnValues = async(viewId: EntityId, columnId: EntityId): Promise<string[] | undefined> => {
    this.logger.debug('get dropdown column values', { viewId, columnId });

    const queryParams = {
      table: AcsysTableDetailsDropdown,
      options: `{"where":[["${AcsysTableIdColumn}","=","${columnId}"]]}`
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, GetDropdownValuesDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);
    let result: string[] | undefined;
    if(fetchResult.length === 0) {
      this.logger.verbose('dropdown column values response empty', { viewId, columnId });
    } else if(fetchResult.length > 1) {
      this.logger.warn('too much dropdown column value dtos in reponse', undefined, { viewId, columnId });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'Too much dropdown column values found', 'error-page');
    } else {
      result = (fetchResult[0].field ?? '').split(',');
    }

    this.logger.debug('dropdown column values obtained', { viewId, columnId, result });
    return result;
  };

  setDropDownColumnValues = async (viewId: EntityId, columnId: EntityId, columnName: string, values: string[]): Promise<void> => {
    this.logger.debug('set dropdown column values', { viewId, columnId, columnName, values });

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
      this.logger.warn('failed to set dropdown column values', undefined, { viewId, columnId, columnName, response: fetchResult });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to set dropdown column values', 'error-page');
    }

    this.logger.debug('dropdown column values have been set', { viewId, columnId, columnName });
  };

  getViewColumnSettings = async (viewId: EntityId): Promise<IViewColumnSettings[]> => {
    this.logger.verbose('get view column settings', viewId);

    const queryParams = {
      table: AcsysTableDocumentDetails,
      options: `{"where":[["${AcsysTableContentIdColumn}","=","${viewId}"]]}`
    };

    const fetchResult = await this.fetch<ApiResponseTypes.json, ViewColumnDetailsDto[]>(RouteReadData, queryParams, undefined, 'GET', UserRoleEnum.Administrator, true, ApiResponseTypes.json, undefined);

    const dropdownColumns = new Map<EntityId, string[]>();

    this.logger.debug('checking dropdown column settings', viewId);
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
    this.logger.verbose('view column settings obtained', { viewId, count: result.length });
    return result;
  };

  setViewColumnSettings = async (viewId: EntityId, sourceCollection: SourceCollection, settings: Omit<IViewColumnSettings, 'id'>[]): Promise<void> => {
    this.logger.verbose('set view column settings', { viewId, sourceCollection: sourceCollection.valueOf(), count: settings.length });

    this.logger.debug('obtaining view', viewId);
    const currentColumns = (await this.getViewColumnSettings(viewId));

    if(currentColumns.length) {
      this.logger.debug('removing view', { viewId, sourceCollection: sourceCollection.valueOf(), count: currentColumns.length });
      const body: DeleteDataDto = {
        table: AcsysTableDocumentDetails,
        entry: [[AcsysTableContentIdColumn, '=', viewId]]
      };
      
      const fetchResult = await this.fetch<ApiResponseTypes.text, string>(RouteDeleteData, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.text, DeleteDataDtoSchema);
      const isSuccess = fetchResult.toLowerCase() === 'true';
      if(!isSuccess) {
        this.logger.warn('failed to remove view', undefined, { viewId, sourceCollection: sourceCollection.valueOf(), response: fetchResult, reqDto: body });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to remove view column settigns', 'error-page');
      }

      this.logger.debug('view', { viewId, sourceCollection: sourceCollection.valueOf(), count: currentColumns.length });
    }

    if(!settings.length) {
      this.logger.verbose('view column settings were set', { viewId, sourceCollection: sourceCollection.valueOf(), count: settings.length });
      return;
    }

    for(let i = 0; i < settings.length; i++) {
      this.logger.debug('adding view', { viewId, sourceCollection: sourceCollection.valueOf(), column: settings[i].name, settings: settings[i] });
      const body: AddViewColumnDetailsDto = this.mapAddViewColumnDetails(settings[i], viewId, sourceCollection);
      
      const fetchResult = await this.fetch<ApiResponseTypes.json, any>(RouteInsertWithUid, undefined, body, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.json, AddViewColumnDetailsDtoSchema);
      const isSuccessfull = fetchResult?.status === true;
      const columnId = fetchResult.fields?.find((f: { field: string; }) => f.field === AcsysTableIdColumn)?.value;
      if(!isSuccessfull || !columnId) {
        this.logger.warn('failed to add view column settings', undefined, { viewId, sourceCollection: sourceCollection.valueOf(), column: settings[i].name, response: fetchResult });
        throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to set view display props', 'error-page');
      }
      if(settings[i].dropdownValues?.length) {        
        await this.setDropDownColumnValues(viewId, columnId, settings[i].name, settings[i].dropdownValues!);
      }

      this.logger.debug('view', { viewId, sourceCollection: sourceCollection.valueOf(), column: settings[i].name });
    }
    
    this.logger.verbose('view column settings were set', { viewId, sourceCollection: sourceCollection.valueOf(), count: settings.length });
  };

  createView = async (sourceCollection: SourceCollection, name: string, description: string): Promise<EntityId> => {
    this.logger.verbose('creating view', { sourceCollection: sourceCollection.valueOf(), name });

    const bodyDto: CreateViewDto = {
      collection: sourceCollection.valueOf(),
      description,
      name
    };
    const fetchResult = await this.fetch<ApiResponseTypes.json, any>(RouteCreateView, undefined, bodyDto, 'POST', UserRoleEnum.Administrator, true, ApiResponseTypes.json, CreateViewDtoSchema);
    const isSuccessfull = fetchResult?.status === 'success';
    if(!isSuccessfull) {
      this.logger.warn('failed to create view', undefined, { sourceCollection: sourceCollection.valueOf(), name, response: fetchResult });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to create view', 'error-page');
    }

    this.logger.debug('obtaining created view', { sourceCollection: sourceCollection.valueOf(), name });
    const viewInfo = await this.findViewInfo(sourceCollection);
    if(!viewInfo) {
      this.logger.warn('created view not found', undefined, { sourceCollection: sourceCollection.valueOf(), name });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to create view', 'error-page');
    }

    this.logger.verbose('view created', { sourceCollection: sourceCollection.valueOf(), name, viewId: viewInfo.id });
    return viewInfo.id;
  };

  createUser = async (userData: UserData): Promise<'created' | 'exists'> => {
    this.logger.info('creating user');

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
      this.logger.info('user already exists', { username: userData.username });  
      return 'exists';
    }

    const resultText = JSON.stringify(fetchResult);
    const isSuccess = resultText.toLowerCase() === 'true';
    if(!isSuccess) {
      this.logger.warn('failed to create user', undefined, { response: resultText });
      throw new AppException(AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR, 'failed to create user', 'error-page');
    }

    this.logger.info('user created', { acsysId: fetchResult.acsys_id });
    return 'created';
  };
}
