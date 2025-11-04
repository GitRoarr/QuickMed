import { Injectable, Inject } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinary) {}

  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: 'user_avatars',
          resource_type: 'image', 
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
