import { AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import type CaptchaProtection from './../components/forms/captcha-protection.vue';
import type { ComponentInstance } from 'vue';
import { getCommonServices } from '../helpers/service-accessors';

const CommonLogProps = { component: 'CaptchaToken' };

export interface ICaptchaTokenComposable {
  requestToken: () => Promise<string>,
  onCaptchaVerified: (token: string) => void
  onCaptchaFailed: (reason?: any) => void
}

export function useCaptchaToken (captcha: ReturnType<typeof useTemplateRef<ComponentInstance<typeof CaptchaProtection>>>): ICaptchaTokenComposable {
  const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);

  let captchaVerificationResolveCallback: ((value: string | PromiseLike<string>) => void) | undefined;
  let captchaVerificationRejectCallback: ((reason?: any) => void) | undefined;

  const requestToken = () => {
    if (captchaVerificationResolveCallback || captchaVerificationRejectCallback) {
      logger.warn('cannot send update request as there is already one pending');
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'pending update request', 'error-stub');
    }

    const resetCallbacks = () => {
      captchaVerificationResolveCallback = captchaVerificationRejectCallback = undefined;
    };

    return new Promise<string>((resolve, reject) => {
      captchaVerificationResolveCallback = (value: string | PromiseLike<string>) => { resetCallbacks(); resolve(value); };
      captchaVerificationRejectCallback = (reason?: any) => {
        resetCallbacks();
        logger.warn('captcha verification failed', undefined, { reason });
        reject(new AppException(AppExceptionCodeEnum.CAPTCHA_VERIFICATION_FAILED, 'captcha verification failed', 'error-stub'));
      };
      captcha.value!.startVerification();
    });
  };

  const onCaptchaFailed = (reason?: any) => {
    if (captchaVerificationRejectCallback) {
      captchaVerificationRejectCallback(reason);
    } else {
      logger.warn('cannot find pedning captcha reject callback', undefined, { reason });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal request verification error', 'error-stub');
    }
  };

  const onCaptchaVerified = (captchaToken: string) => {
    if (captchaVerificationResolveCallback) {
      captchaVerificationResolveCallback(captchaToken ?? '');
    } else {
      logger.warn('cannot find pedning captcha verification callback');
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'internal request verification error', 'error-stub');
    }
  };

  return {
    requestToken,
    onCaptchaVerified,
    onCaptchaFailed
  };
}
