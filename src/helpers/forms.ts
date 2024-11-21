import { AppConfig } from '@golobe-demo/shared'; 
import { type ObjectSchema, string, ref, object } from 'yup';

export function createPasswordSchema (errMsgs: { required: string, minLength: string, policy: string, sameAs: string }): ObjectSchema<{ password: string, confirmPassword: string }> {
  let passwordSchema = string().required(errMsgs.required);
  passwordSchema = passwordSchema.min(AppConfig.userPasswordPolicy.minLength, errMsgs.minLength);
  if(AppConfig.userPasswordPolicy.uppercase) {
    passwordSchema = passwordSchema.matches(/[A-Z]/, { message: errMsgs.policy });
  }
  if(AppConfig.userPasswordPolicy.lowercase) {
    passwordSchema = passwordSchema.matches(/[a-z]/, { message: errMsgs.policy });
  }
  if(AppConfig.userPasswordPolicy.number) {
    passwordSchema = passwordSchema.matches(/[0-9]/, { message: errMsgs.policy });
  }
  if(AppConfig.userPasswordPolicy.specialChar) {
    passwordSchema = passwordSchema.matches(/[#?!@$%^&*-]/, { message: errMsgs.policy });
  }
  
  const passwordFieldRef = ref('password');
  return object({
    password: passwordSchema,
    confirmPassword: string().required(errMsgs.required).equals([passwordFieldRef], errMsgs.sameAs)
  });
}
