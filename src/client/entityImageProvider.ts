import { AppConfig, type IAppLogger } from '@golobe-demo/shared';
import type { ImageModifiers, ImageCTX } from '@nuxt/image';
import clamp from 'lodash-es/clamp';
import { getCommonServices } from '../helpers/service-accessors';

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

  const satori = props.modifiers?.satori ?? false;

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
    url: satori ? `${src}&scale=${scale.toFixed(3)}&satori=1` : `${src}&scale=${scale.toFixed(3)}`
  };
}

function getLogger (): IAppLogger {
  return getCommonServices().getLogger();
}
