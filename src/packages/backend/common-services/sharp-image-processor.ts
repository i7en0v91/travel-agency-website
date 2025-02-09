import type { IImageProcessor, IAppLogger } from '@golobe-demo/shared';
import sharp from 'sharp';

export class ImageProcessor implements IImageProcessor {
  private readonly logger: IAppLogger;
  
  public static inject = ['logger'] as const;
  constructor (logger: IAppLogger) {
    this.logger = logger;
  }

  async getSharp() { return sharp; }

  async createBlankImage(width: number, height: number, format: 'png'): Promise<Buffer> {
    this.logger.verbose(`(SharpImageProcessor) creating blank image, width=${width}, height=${height}, format=${format}`);

    if(width <= 0 || height <= 0 || width > 8096 || height > 8096) {
      this.logger.warn(`(SharpImageProcessor) blank image creation failed - incorrent parameters, width=${width}, height=${height}, format=${format}`);
      throw new Error('failed to create image data');
    }

    const result = await (await this.getSharp())({ 
      create: { 
        width, 
        height, 
        channels: 3, 
        background: 'white' 
      } 
    }).png().toBuffer();

    this.logger.verbose(`(SharpImageProcessor) blank image created, width=${width}, height=${height}, format=${format}, size=${result.length}`);
    return result;
  }

  async convert (bytes: Buffer, targetFormat: 'jpeg'): Promise<Buffer> {
    this.logger.verbose(`(SharpImageProcessor) converting image, size=${bytes.length}, targetFormat=${targetFormat}`);

    const sharpObj = (await this.getSharp())(bytes);
    const metadata = await sharpObj.metadata();
    if (!metadata.width || !metadata.height) {
      this.logger.warn(`(SharpImageProcessor) cannot convert image - parse failed: size=${bytes.length}, targetFormat=${targetFormat}`);
      throw new Error('failed to convert image');
    }
  
    const result = await sharpObj.jpeg().toBuffer();

    this.logger.verbose(`(SharpImageProcessor) image converted, originalSize=${bytes.length}, targetFormat=${targetFormat}, resultSize=${result.length}`);
    return result;
  }

  async extractImageRegion (bytes: Buffer, width: number, height: number, mimeType: 'webp' | 'jpeg'): Promise<Buffer> {
    this.logger.verbose(`(SharpImageProcessor) extracting image region, size=${bytes.length}, width=${width}, height=${height}, mimeType=${mimeType}`);

    if (mimeType !== 'webp') {
      this.logger.warn(`(SharpImageProcessor) cannot extract image region - unsupported mime type: size=${bytes.length}, width=${width}, height=${height}, mimeType=${mimeType}`);
      throw new Error('unsupported mime type');
    }

    const sharpObj = (await this.getSharp())(bytes);
    const metadata = await sharpObj.metadata();
    if (!metadata.width || !metadata.height) {
      this.logger.warn(`(SharpImageProcessor) cannot extract image region - parse failed: size=${bytes.length}, width=${width}, height=${height}, mimeType=${mimeType}`);
      throw new Error('failed to parse image');
    }
  
    const widthToExtract = Math.min(width, metadata.width);
    const heightToExtract = Math.min(height, metadata.height);
    const extractedImageObj = sharpObj.extract({
      left: Math.round((metadata.width - widthToExtract) / 2),
      top: Math.round((metadata.height - heightToExtract) / 2),
      height: heightToExtract,
      width: widthToExtract
    });
  
    const result = await extractedImageObj.webp().toBuffer();
    this.logger.verbose(`(SharpImageProcessor) image region extracted, originalSize=${bytes.length}, width=${width}, height=${height}, mimeType=${mimeType}, resultSize=${result.length}`);
    return result;
  }

  async getImageSize (imgData: Buffer): Promise<{width: number, height: number}> {
    this.logger.verbose(`(SharpImageProcessor) obtaining image dims, size=${imgData.length}`);  

    const sharpObj = (await this.getSharp())(imgData);
    const metadata = await sharpObj.metadata();
    if (!metadata.width || !metadata.height) {
      this.logger.warn(`(SharpImageProcessor) failed to parse image, size=${imgData.length}`);
      throw new Error('failed to parse image');
    }
    const result = { width: metadata.width!, height: metadata.height! };

    this.logger.verbose(`(SharpImageProcessor) image dims obtained, size=${imgData.length}, width=${result.width}, height=${result.height}`);
    return result;
  }

  async scaleImage (bytes: Buffer, scale: number, expectedWidth?: number): Promise<Buffer> {
    this.logger.verbose(`(SharpImageProcessor) scaling image: size=${bytes.length}, scale=${scale}, expectedWidth=${expectedWidth}`);
    try {
      const sharpObj = (await this.getSharp())(bytes);
      const metadata = await sharpObj.metadata();
      if (!metadata.width) {
        this.logger.warn(`(SharpImageProcessor) cannot scale image - parse failed: size=${bytes.length}, scale=${scale}, expectedWidth=${expectedWidth}`);
        return bytes;
      }

      if(expectedWidth) {
        const scaleAdj = Math.min(Math.max(1.0, expectedWidth / metadata.width) * scale, 1.0);
        if(Math.abs(scaleAdj - scale) < 0.00001) {
          this.logger.verbose(`(SharpImageProcessor) image scaling coef will be adjusted: size=${bytes.length}, scale=${scale}, realWidth=${metadata.width}, expectedWidth=${expectedWidth}, originalScale=${scale}, adjScale=${scaleAdj}`);
          scale = scaleAdj;
        }
      }
      
      const targetWidth = Math.ceil(metadata.width * scale);
      const result = await sharpObj.resize(targetWidth).toBuffer();

      this.logger.verbose(`(SharpImageProcessor) image scaled: originalSize=${bytes.length}, scale=${scale}, expectedWidth=${expectedWidth}, resultSize=${result.length}`);
      return result;
    } catch (err) {
      this.logger.warn(`(SharpImageProcessor) failed to scale image: size=${bytes.length}, scale=${scale}, expectedWidth=${expectedWidth}`, err);
      return bytes;
    }
  }
}
