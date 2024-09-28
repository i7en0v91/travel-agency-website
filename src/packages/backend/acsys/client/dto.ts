import { type InferType, type ObjectSchema, string, object, number, array } from 'yup';
import { AvailableUserRoles } from './interfaces';

const TEXT_FIELD_LENGTH = 1024;
const FIELD_NAME_LENGTH = 256;
const TOKEN_FIELD_LENGTH = 2 ^ 16;
const ACSYS_ID_FIELD_LENGTH = 64;

type YupAnyObject = { [k: string]: any; };

export enum FieldEditControl {
  None = 'none',
  DropDown = 'dropDown',
  TimePicker = 'timePicker',
  //DayPicker = 'dayPicker', // TODO: check whether it is used in Acsys (v1.0.1)
  DateTimePicker = 'dateTimePicker',
  BooleanSelect = 'booleanSelect',
  NumberEditor = 'numberEditor',
  AutoGen = 'autoGen',
  ImageReference = 'imageReference',
  VideoReference = 'videoReference',
  ImageUrl = 'imageURL',
  VideoUrl = 'videoURL',
  TextEditor = 'textEditor',
  RichTextEditor = 'richTextEditor'
}
const AvailableFieldEditControls = Object.values(FieldEditControl).map(x => x.valueOf());

export enum FieldType {
  None = 'none',
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Object = 'object'
}
const AvailableFieldTypes = Object.values(FieldType).map(x => x.valueOf());

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc'
}
const AvailableSortOrders = Object.values(SortOrder).map(x => x.valueOf());

/**
 * Dto Schemas
 */
function buildEditDataSchema<TEntrySchema extends ObjectSchema<YupAnyObject>>(entrySchema: TEntrySchema) {
  return object({
    table: string().max(TEXT_FIELD_LENGTH).required(),
    entry: entrySchema,
    keys: array().of(array().of(string().max(TEXT_FIELD_LENGTH).required())).optional()
  });
}

function buildInsertWithUidSchema<TEntrySchema extends ObjectSchema<YupAnyObject>>(entrySchema: TEntrySchema) {
  return object({
    table: string().max(TEXT_FIELD_LENGTH).required(),
    entry: entrySchema,
    fields: array().of(string().max(FIELD_NAME_LENGTH).required())
  });
}

export const DeleteDataDtoSchema = object({
  table: string().max(TEXT_FIELD_LENGTH).required(),
  entry: array().of(array().of(string().max(TEXT_FIELD_LENGTH).required())).required()
});

export const SetInitialLocalDatabaseConfigDtoSchema = object({
  projectName: string().max(TEXT_FIELD_LENGTH).required()
});

export const RegisterUserDtoSchema = object({
  data: object({
    email: string().max(TEXT_FIELD_LENGTH).required(),
    username: string().max(TEXT_FIELD_LENGTH).required(),
    role: string().max(TEXT_FIELD_LENGTH).oneOf(AvailableUserRoles).required(),
    mode: string().max(TEXT_FIELD_LENGTH).oneOf(AvailableUserRoles).required(),
    password: string().max(TEXT_FIELD_LENGTH).required()
  }).required()
});

export const CreateUserDtoSchema = RegisterUserDtoSchema;

export const AuthenticateDtoSchema = object({
  username: object({
    username: string().max(TEXT_FIELD_LENGTH).required()
  }).required(),
  password: object({
    password: string().max(TEXT_FIELD_LENGTH).required()
  }).required()
});

export const AuthenticateResponseDtoSchema = object({
  acsys_id: string().max(ACSYS_ID_FIELD_LENGTH).required(),
  role: string().max(TEXT_FIELD_LENGTH).oneOf(AvailableUserRoles).required(),
  username: string().max(TEXT_FIELD_LENGTH).required(),
  token: string().max(TOKEN_FIELD_LENGTH).required(),
  refreshToken: string().max(TOKEN_FIELD_LENGTH).required()
});

export const RefreshTokenResponseDtoSchema = object({
  token: string().max(TOKEN_FIELD_LENGTH).required(),
  refreshToken: string().max(TOKEN_FIELD_LENGTH).required()
});

export const StorageItemResponseDtoSchema = object({
  acsys_id: string().max(ACSYS_ID_FIELD_LENGTH).required(),
  file_order: number().min(0).optional(),
  parent: string().max(TEXT_FIELD_LENGTH).required(),
  name: string().max(TEXT_FIELD_LENGTH).required(),
  content_type: string().max(512).required(),
  is_public: number().required(),
  time_created: string().max(256).required(),
  updated: string().max(256).required()
});

export const ViewInfoResponseDtoSchema = object({
  acsys_id: string().max(ACSYS_ID_FIELD_LENGTH).required(),
  name: string().max(TEXT_FIELD_LENGTH).required(),
  description: string().max(TEXT_FIELD_LENGTH).optional(),
  viewId: string().max(ACSYS_ID_FIELD_LENGTH).required(),
  source_collection: string().max(TEXT_FIELD_LENGTH).required(),
  position: number().min(0).optional(),
  table_keys: array().of(string().max(ACSYS_ID_FIELD_LENGTH).required()).optional()
});

export const ViewDisplayPropsDtoSchema = object( {
  acsys_id: string().max(ACSYS_ID_FIELD_LENGTH).required(),
  is_removable: number().required(),
  is_table_mode: number().required(),
  link_table: string().max(TEXT_FIELD_LENGTH).optional(),
  link_view_id: string().max(ACSYS_ID_FIELD_LENGTH).optional(),
  view_order: string().oneOf(AvailableSortOrders).required(),
  order_by: string().max(FIELD_NAME_LENGTH).required(),
  row_num: number().min(5).required()
});
export const SetViewDisplayPropsDtoSchema = buildEditDataSchema(ViewDisplayPropsDtoSchema);

const ViewColumnDetails = {
  content_id: string().max(ACSYS_ID_FIELD_LENGTH).required(),
  collection: string().max(TEXT_FIELD_LENGTH).required(),
  control: string().max(TEXT_FIELD_LENGTH).oneOf(AvailableFieldEditControls).required(),
  field_name: string().max(FIELD_NAME_LENGTH).required(),
  is_visible_on_page: number().required(),
  is_visible_on_table: number().required(),
  type: string().max(TEXT_FIELD_LENGTH).oneOf(AvailableFieldTypes).required(),
  is_key: number().required(),
  view_order: number().min(0).required(),
  width: number().min(0).max(12).required()
};
export const ViewColumnDetailsDtoSchema = object({
  ...ViewColumnDetails,
  acsys_id: string().max(ACSYS_ID_FIELD_LENGTH).required()
});
export const AddViewColumnDetailsDtoSchema = buildInsertWithUidSchema(object(ViewColumnDetails));

export const CreateViewDtoSchema = object({
  name: string().max(TEXT_FIELD_LENGTH).required(),
  description: string().max(TEXT_FIELD_LENGTH).required(),
  collection: string().max(TEXT_FIELD_LENGTH).required()
});

export const DropdownValuesDtoSchema = object({
  acsys_id: string().max(TEXT_FIELD_LENGTH).required(),
  field_name: string().max(TEXT_FIELD_LENGTH).required(),
  field: string().max(TEXT_FIELD_LENGTH).required()
});
export const EditDropdownValuesDtoSchema = buildEditDataSchema(DropdownValuesDtoSchema);

/** Dto Types */
export type DeleteDataDto = InferType<typeof DeleteDataDtoSchema>;
export type SetInitialLocalDatabaseConfigDto = InferType<typeof SetInitialLocalDatabaseConfigDtoSchema>;
export type RegisterUserDto = InferType<typeof RegisterUserDtoSchema>;
export type CreateUserDto = InferType<typeof CreateUserDtoSchema>;
export type AuthenticateDto = InferType<typeof AuthenticateDtoSchema>;
export type AuthenticateResponseDto = InferType<typeof AuthenticateResponseDtoSchema>;
export type RefreshTokenResponseDto = InferType<typeof RefreshTokenResponseDtoSchema>;
export type StorageItemResponseDto = InferType<typeof StorageItemResponseDtoSchema>;
export type ViewInfoResponseDto = InferType<typeof ViewInfoResponseDtoSchema>;
export type ViewDisplayPropsDto = InferType<typeof ViewDisplayPropsDtoSchema>;
export type SetViewDisplayPropsDto = InferType<typeof SetViewDisplayPropsDtoSchema>;
export type ViewColumnDetailsDto = InferType<typeof ViewColumnDetailsDtoSchema>;
export type AddViewColumnDetailsDto = InferType<typeof AddViewColumnDetailsDtoSchema>;
export type CreateViewDto = InferType<typeof CreateViewDtoSchema>;
export type EditDropdownValuesDto = InferType<typeof EditDropdownValuesDtoSchema>;
export type GetDropdownValuesDto = InferType<typeof DropdownValuesDtoSchema>;