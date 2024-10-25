import { ValidationError, type ObjectSchema } from 'yup';
import AppConfig from './appconfig';

type YupMaybe<T> = T | null | undefined;
type YupAnyObject = { [k: string]: any; };

export async function validateObject<TBodySchema extends YupMaybe<YupAnyObject>> (body: any, schema: ObjectSchema<TBodySchema>): Promise<ValidationError | undefined> {
  let validationError: ValidationError | undefined;
  try {
    const validationResult = await schema.validate(body);
    if (validationResult instanceof ValidationError) {
      validationError = validationResult as ValidationError;
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationError = err as ValidationError;
    } else {
      throw err;
    }
  }
  return validationError;
}

export function validateObjectSync<TBodySchema extends YupMaybe<YupAnyObject>> (body: any, schema: ObjectSchema<TBodySchema>): ValidationError | undefined {
  let validationError: ValidationError | undefined;
  try {
    const validationResult = schema.validateSync(body);
    if (validationResult instanceof ValidationError) {
      validationError = validationResult as ValidationError;
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationError = err as ValidationError;
    } else {
      throw err;
    }
  }
  return validationError;
}

export function isPasswordSecure (value: string): boolean {
  if (!value) {
    return false;
  }
  if (value.length < AppConfig.userPasswordPolicy.minLength) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.uppercase && !/[A-Z]/.test(value)) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.lowercase && !/[a-z]/.test(value)) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.number && !/[0-9]/.test(value)) {
    return false;
  }
  if (AppConfig.userPasswordPolicy.specialChar && !/[#?!@$%^&*-]/.test(value)) {
    return false;
  }
  return true;
}
