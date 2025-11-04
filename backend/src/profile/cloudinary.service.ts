import { Inject, Injectable } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary) {}

  uploadImage(file: Express.Multer.File) {
    return this.cloudinary.uploader.upload(file.path);
  }
}
