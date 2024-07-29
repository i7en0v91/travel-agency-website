import { AvailableTokenKinds, AvailableEmailTemplates, AvailableAirplaneImageKind, AvailableFlightClasses, AvailableStayDescriptionParagraphTypes, AvailableStayServiceLevel, type EntityId } from "../../app-facade/interfaces";

export enum SourceCollection {
  User = 'V_User_Cms',
  UserEmail = 'V_UserEmail_Cms',
  Image = 'V_Image_Cms',
  ImageCategory = 'V_ImageCategory_Cms',
  AuthFormImage = 'V_AuthFormImage_Cms',
  Flight = 'V_Flight_Cms',
  FlightOffer = 'V_FlightOffer_Cms',
  StayOffer = 'V_StayOffer_Cms',
  UserFlightOffer = 'V_UserFlightOffer_Cms',
  UserStayOffer = 'V_UserStayOffer_Cms',
  Hotel = 'V_Hotel_Cms',
  HotelDescription = 'V_HotelDescription_Cms',
  HotelReview = 'V_HotelReview_Cms',
  HotelImage = 'V_HotelImage_Cms',
  Booking = 'V_Booking_Cms',
  PopularCity = 'V_PopularCity_Cms',
  PopularCityImage = 'V_PopularCityImage_Cms',
  Country = 'V_Country_Cms',
  City = 'V_City_Cms',
  Airport = 'V_Airport_Cms',
  CompanyReview = 'V_CompanyReview_Cms',
  AirlineCompany = 'V_AirlineCompany_Cms',
  Airplane = 'V_Airplane_Cms',
  AirplaneImage = 'V_AirplaneImage_Cms',
  MailTemplate = 'V_MailTemplate_Cms',
  VerificationToken = 'V_VerificationToken_Cms',
  LocalizeableValue = 'V_LocalizeableValue_Cms'
}

export enum FieldEditControlEnum {
  None = 'none',
  DropDown = 'dropDown',
  TimePicker = 'timePicker',
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

export enum FieldEnum {
  None = 'none',
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Object = 'object'
}

export enum SortOrderEnum {
  Asc = 'asc',
  Desc = 'desc'
}

export interface IViewDisplayProps {
  addRemoveOperationsAllowed: boolean,
  sortOrder: SortOrderEnum,
  sortColumn: string,
  pageSize: number
}

export interface IViewInfo {
  id: EntityId,
  name: string,
  description: string,
  sourceCollection: SourceCollection,
  position: number | undefined,
  tableKeys: string[]
}

export interface IViewColumnSettings {
  id: EntityId,
  type: FieldEnum,
  control: FieldEditControlEnum,
  dropdownValues?: string[] | undefined,
  name: string,
  isKey: boolean,
  displayOrder: number,
  isVisibleOnPage: boolean,
  isVisibleOnTable: boolean,
  width: number
}

export interface IViewColumnSettingsMetadata {
  setDbNullIfEmpty: boolean
}

export const FieldControlMapping = new Map<FieldEnum, FieldEditControlEnum[]>([
  [FieldEnum.None, [FieldEditControlEnum.None]],
  [FieldEnum.Object, [FieldEditControlEnum.None]],
  [FieldEnum.Number, [FieldEditControlEnum.None, FieldEditControlEnum.NumberEditor, FieldEditControlEnum.BooleanSelect]],
  [FieldEnum.String, [
    FieldEditControlEnum.None, 
    FieldEditControlEnum.AutoGen, 
    FieldEditControlEnum.TextEditor, 
    FieldEditControlEnum.RichTextEditor, 
    FieldEditControlEnum.TimePicker, 
    FieldEditControlEnum.DateTimePicker, 
    FieldEditControlEnum.DropDown, 
    FieldEditControlEnum.ImageReference, 
    FieldEditControlEnum.ImageUrl, 
    FieldEditControlEnum.VideoReference, 
    FieldEditControlEnum.VideoUrl]]
]);


export declare type ViewConfig = { displayProps: IViewDisplayProps & { name: string, description: string }, columnSettings: (Omit<IViewColumnSettings, 'displayOrder' | 'id'> & IViewColumnSettingsMetadata & { displayOrder: number | undefined })[], draftsAllowed: boolean };
const DefaultTableIdColumn = 'id';
const DefaultTableIdColumnWidth = 6;
const DefaultTableIdColumnOrder = 1;
const DefaultTableVersionColumn = 'version';
const DefaultTableVersionColumnWidth = 3;
const DefaultTableVersionColumnOrder = 2;
const DefaultTableIsDeletedColumn = 'isDeleted';
const DefaultTableIsDeletedColumnWidth = 3;
const DefaultTableIsDeletedColumnOrder = 3;
// TODO: show in grid, ignore when storing to DB
/*
const TableTimestampColumnKind: FieldKind = FieldKind.String;
const DefaultTableCreatedColumn = 'createdUtc';
const DefaultTableCreatedColumnWidth = 12;
const DefaultTableCreatedColumnOrder = 4;
const DefaultTableModifiedColumn = 'modifiedUtc';
const DefaultTableModifiedColumnWidth = 12;
const DefaultTableModifiedColumnOrder = 5;
*/

const DefaultPageSize = 10;

export const ViewsConfig = new Map<SourceCollection, ViewConfig>([
  /**
   * User
   */
  [SourceCollection.User, {
    displayProps: {
      name: 'V_User',
      description: 'Edit website users',
      addRemoveOperationsAllowed: false,
      pageSize: DefaultPageSize,
      sortColumn: 'providerIdentity',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      // TODO: show in grid, ignore when storing to DB
      /*
      {
        name: DefaultTableCreatedColumn,
        type: TableTimestampColumnKind,
        control: FieldEditControlKind.None,
        isKey: false,
        isVisibleOnPage: false,
        isVisibleOnTable: true,
        width: DefaultTableCreatedColumnWidth,
        displayOrder: DefaultTableCreatedColumnOrder
      },
      {
        name: DefaultTableModifiedColumn,
        type: TableTimestampColumnKind,
        control: FieldEditControlKind.None,
        isKey: false,
        isVisibleOnPage: false,
        isVisibleOnTable: true,
        width: DefaultTableModifiedColumnWidth,
        displayOrder: DefaultTableModifiedColumnOrder
      },*/
      {
        name: 'authProvider',
        type: FieldEnum.String,
        control: FieldEditControlEnum.None,
        isKey: false,
        isVisibleOnPage: false,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'providerIdentity',
        type: FieldEnum.String,
        control: FieldEditControlEnum.None,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'avatarId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      },
      {
        name: 'coverId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      }
    ]
  }],


  /**
   * UserEmail
   */
  [SourceCollection.UserEmail, {
    displayProps: {
      name: 'V_UserEmail',
      description: 'Edit website user\'s emails',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'email',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'userId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'isVerified',
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'orderNum',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'email',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }]
  }],

  /**
   * Image
   */
  [SourceCollection.Image, {
    displayProps: {
      name: 'V_Image',
      description: 'Edit entity-related images (e.g. hotels, company logos e.t.c) or user uploaded photos',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'slug',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'slug',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'categoryId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'ownerId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      },
      {
        name: 'fileId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.ImageReference,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 8,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'invertForDarkTheme',
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'stubCssStyle',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      }      
    ]
  }],

  /**
   * ImageCategory
   */
  [SourceCollection.ImageCategory, {
    displayProps: {
      name: 'V_ImageCategory',
      description: 'Edit image categories width & height',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'kind',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'kind',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'width',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'height',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }      
    ]
  }],

  /**
   * AuthFormImage
   */
  [SourceCollection.AuthFormImage, {
    displayProps: {
      name: 'V_AuthFormImage',
      description: 'Edit image slides on auth pages (login, signup, password recovery e.t.c)',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'orderNum',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'imageId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'orderNum',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Flights
   */
  [SourceCollection.Flight, {
    displayProps: {
      name: 'V_Flight',
      description: 'View flights',
      addRemoveOperationsAllowed: false,
      pageSize: DefaultPageSize,
      sortColumn: 'departmentUtcPosix',
      sortOrder: SortOrderEnum.Desc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'airlineCompanyId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'airplaneId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'departmentAirportId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'arrivalAirportId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'departmentUtcPosix',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'arrivalUtcPosix',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
    ]
  }],

  /**
   * Flight Offers
   */
  [SourceCollection.FlightOffer, {
    displayProps: {
      name: 'V_FlightOffer',
      description: 'View flight offers',
      addRemoveOperationsAllowed: false,
      pageSize: DefaultPageSize,
      sortColumn: 'id',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'departFlightId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'returnFlightId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      },
      {
        name: 'totalPrice',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'numPassengers',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'class',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: AvailableFlightClasses,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Stay Offers
   */
  [SourceCollection.StayOffer, {
    displayProps: {
      name: 'V_StayOffer',
      description: 'View stay offers',
      addRemoveOperationsAllowed: false,
      pageSize: DefaultPageSize,
      sortColumn: 'id',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'hotelId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'totalPrice',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'checkInPosix',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'checkOutPosix',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'numRooms',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'numGuests',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * User Flight Offers
   */
  [SourceCollection.UserFlightOffer, {
    displayProps: {
      name: 'V_UserFlightOffer',
      description: 'Edit user flight offers',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'userId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'offerId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'userId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'isFavourite',
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Hotels
   */
  [SourceCollection.Hotel, {
    displayProps: {
      name: 'V_Hotel',
      description: 'Edit hotels',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'slug',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'cityId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'nameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'slug',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'lon',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'lat',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Hotel Descriptions
   */
  [SourceCollection.HotelDescription, {
    displayProps: {
      name: 'V_HotelDescription',
      description: 'Edit hotel descriptions',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'hotelId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'hotelId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'textStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'paragraphKind',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: AvailableStayDescriptionParagraphTypes,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'orderNum',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 2,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Hotel Reviews
   */
  [SourceCollection.HotelReview, {
    displayProps: {
      name: 'V_HotelReview',
      description: 'Edit hotel reviews',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'hotelId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'hotelId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'userId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'textStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'score',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Hotel Image
   */
  [SourceCollection.HotelImage, {
    displayProps: {
      name: 'V_HotelImage',
      description: 'Edit hotel images',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'hotelId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'hotelId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'imageId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'serviceLevel',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: [...AvailableStayServiceLevel, ''],
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      },
      {
        name: 'orderNum',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Booking
   */
  [SourceCollection.Booking, {
    displayProps: {
      name: 'V_Booking',
      description: 'Edit bookings',
      addRemoveOperationsAllowed: false,
      pageSize: DefaultPageSize,
      sortColumn: 'userId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'flightOfferId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      },
      {
        name: 'stayOfferId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      },
      {
        name: 'userId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'serviceLevel',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: [...AvailableStayServiceLevel, ''],
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: true
      }
    ]
  }],

  /**
   * Popular City
   */
  [SourceCollection.PopularCity, {
    displayProps: {
      name: 'V_PopularCity',
      description: 'Make some of cities popular to show promotion info on map & grids',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'cityId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'cityId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'promoLineStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'travelHeaderStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'travelTextStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'rating',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'visibleOnWorldMap',
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Popular City Image
   */
  [SourceCollection.PopularCityImage, {
    displayProps: {
      name: 'V_PopularCityImage',
      description: 'Edit popular city images',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'popularCityId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'popularCityId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'imageId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'orderNum',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Country
   */
  [SourceCollection.Country, {
    displayProps: {
      name: 'V_Country',
      description: 'Edit countries',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'nameStrId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'nameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * City
   */
  [SourceCollection.City, {
    displayProps: {
      name: 'V_City',
      description: 'Edit cities',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'slug',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'nameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'countryId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'slug',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'textForSearch',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'lon',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'lat',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'population',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'utcOffsetMin',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Airport
   */
  [SourceCollection.Airport, {
    displayProps: {
      name: 'V_Airport',
      description: 'Edit airports',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'cityId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'cityId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'nameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'lon',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'lat',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Company Review
   */
  [SourceCollection.CompanyReview, {
    displayProps: {
      name: 'V_CompanyReview',
      description: 'Edit company reviews',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'id',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'personNameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'imageId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'headerStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'bodyStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Airline Company
   */
  [SourceCollection.AirlineCompany, {
    displayProps: {
      name: 'V_AirlineCompany',
      description: 'Edit airline companies',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'nameStrId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'nameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'cityId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'logoImageId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'numReviews',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'reviewScore',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Airplane
   */
  [SourceCollection.Airplane, {
    displayProps: {
      name: 'V_Airplane',
      description: 'Edit airplanes',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'nameStrId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'nameStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Airplane Image
   */
  [SourceCollection.AirplaneImage, {
    displayProps: {
      name: 'V_AirplaneImage',
      description: 'Edit airplane images',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'airplaneId',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'airplaneId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'kind',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: AvailableAirplaneImageKind,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'orderNum',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'imageId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Mail Template
   */
  [SourceCollection.MailTemplate, {
    displayProps: {
      name: 'V_MailTemplate',
      description: 'Edit mail templates',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'kind',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'templateStrId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: 8,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'kind',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: AvailableEmailTemplates,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 4,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Verification Token
   */
  [SourceCollection.VerificationToken, {
    displayProps: {
      name: 'V_VerificationToken',
      description: 'Edit verification tokens',
      addRemoveOperationsAllowed: false,
      pageSize: DefaultPageSize,
      sortColumn: 'kind',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: false,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'userId',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 6,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'kind',
        type: FieldEnum.String,
        control: FieldEditControlEnum.DropDown,
        dropdownValues: AvailableTokenKinds,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'attemptsMade',
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 3,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }],

  /**
   * Verification Token
   */
  [SourceCollection.LocalizeableValue, {
    displayProps: {
      name: 'V_LocalizeableValue',
      description: 'Edit localizeable values',
      addRemoveOperationsAllowed: true,
      pageSize: DefaultPageSize,
      sortColumn: 'en',
      sortOrder: SortOrderEnum.Asc
    },
    draftsAllowed: true,
    columnSettings: [
      {
        name: DefaultTableIdColumn,
        type: FieldEnum.String,
        control: FieldEditControlEnum.AutoGen,
        isKey: true,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIdColumnWidth,
        displayOrder: DefaultTableIdColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableVersionColumn,
        type: FieldEnum.Number,
        control: FieldEditControlEnum.NumberEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: false,
        width: DefaultTableVersionColumnWidth,
        displayOrder: DefaultTableVersionColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: DefaultTableIsDeletedColumn,
        type: FieldEnum.Boolean,
        control: FieldEditControlEnum.BooleanSelect,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: DefaultTableIsDeletedColumnWidth,
        displayOrder: DefaultTableIsDeletedColumnOrder,
        setDbNullIfEmpty: false
      },
      {
        name: 'en',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'ru',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      },
      {
        name: 'fr',
        type: FieldEnum.String,
        control: FieldEditControlEnum.TextEditor,
        isKey: false,
        isVisibleOnPage: true,
        isVisibleOnTable: true,
        width: 12,
        displayOrder: undefined,
        setDbNullIfEmpty: false
      }
    ]
  }]
]);