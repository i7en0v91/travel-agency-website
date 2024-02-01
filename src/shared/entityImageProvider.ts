import { type ImageModifiers, type ImageCTX } from '@nuxt/image';
import clamp from 'lodash/clamp';
import AppConfig from '../appconfig';
import { type IAppLogger } from './applogger';

interface IImageProps {
  modifiers?: ImageModifiers,
  baseURL?: string
}

export function getImage (src: string, props: IImageProps, _: ImageCTX) {
  if (!props.modifiers) {
    getLogger().warn(`image modifiers are empty, src: ${src}`);
    return 'image-modifiers-empty';
  }

  const imgSrcSize = props.modifiers.imgSrcSize;
  if (!imgSrcSize) {
    getLogger().warn(`image size modifiers was not specified for image, src: ${src}`);
    return 'image-size-was-not-specified';
  }

  const requestedWidth = props.modifiers.width;
  const requestedHeight = props.modifiers.height;
  const scaleRefreshStep = AppConfig.images.scaleStep;
  const sharpness = AppConfig.images.sharpness;

  let scale = 1.0;

  const fitScale = Math.max(requestedWidth / imgSrcSize.width, requestedHeight / imgSrcSize.height);
  const requiredScale = clamp(fitScale * sharpness, 0.1, 1.0);
  const requiredScaleStep = Math.ceil(requiredScale / scaleRefreshStep);
  scale = requiredScaleStep * scaleRefreshStep;
  if (isNaN(scale)) {
    getLogger().warn(`got NaN scale, src: ${src}`);
    if (process.env.NODE_ENV !== 'development') {
      scale = 1.0;
    }
  }

  return {
    url: `${src}&scale=${scale.toFixed(3)}`
  };
}

function getLogger (): IAppLogger {
  return CommonServicesLocator.getLogger();
}
