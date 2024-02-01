import { ValidationError, type ObjectSchema } from 'yup';
type YupMaybe<T> = T | null | undefined;
type YupAnyObject = { [k: string]: any; };

export function validateObject<TBodySchema extends YupMaybe<YupAnyObject>> (body: any, schema: ObjectSchema<TBodySchema>): ValidationError | undefined {
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
