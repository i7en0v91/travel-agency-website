import { AppConfig } from '@golobe-demo/shared';
import type { ImageModifiers, ImageCTX } from '@nuxt/image';
import clamp from 'lodash-es/clamp';
import { getCommonServices } from '../helpers/service-accessors';

interface IImageProps {
  modifiers?: ImageModifiers,
  baseURL?: string
}

export function getImage (src: string, props: IImageProps, _: ImageCTX) {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'EntityImageProvider' });
  if (!props.modifiers) {
    logger.warn('image modifiers are empty', undefined, src);
    return 'image-modifiers-empty';
  }

  const imgSrcSize = props.modifiers.imgSrcSize;
  if (!imgSrcSize) {
    logger.warn('image size modifiers was not specified for image', undefined, src);
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
    logger.warn('got NaN scale', undefined, src);
    if (process.env.NODE_ENV !== 'development') {
      scale = 1.0;
    }
  }

  return {
    url: satori ? `${src}&scale=${scale.toFixed(3)}&satori=1` : `${src}&scale=${scale.toFixed(3)}`
  };
}
