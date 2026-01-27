import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Media, MediaType } from '../../database/entities';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class MediaService {
  private uploadPath: string;
  private maxFileSize: number;
  private allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  constructor(
    @InjectRepository(Media)
    private mediaRepo: Repository<Media>,
    private configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
    this.maxFileSize = this.configService.get('MAX_FILE_SIZE', 10485760);
  }

  async upload(uploaderId: string, file: { filename: string; mimetype: string; data: Buffer }): Promise<Media> {
    const type = this.getMediaType(file.mimetype);
    if (!type) throw new BadRequestException('Unsupported file type');
    if (file.data.length > this.maxFileSize) throw new BadRequestException('File too large');

    const ext = path.extname(file.filename);
    const newFilename = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadPath, type, newFilename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.data);

    const media = this.mediaRepo.create({
      uploaderId,
      type,
      filename: newFilename,
      originalFilename: file.filename,
      mimeType: file.mimetype,
      size: file.data.length,
      url: `/uploads/${type}/${newFilename}`,
    });

    return this.mediaRepo.save(media);
  }

  async findById(id: string): Promise<Media | null> {
    return this.mediaRepo.findOne({ where: { id } });
  }

  async getUserMedia(uploaderId: string, type?: MediaType) {
    const where: any = { uploaderId };
    if (type) where.type = type;
    return this.mediaRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async delete(id: string, uploaderId: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id, uploaderId } });
    if (!media) return;

    const filePath = path.join(this.uploadPath, media.type, media.filename);
    try { await fs.unlink(filePath); } catch {}
    if (media.thumbnailUrl) {
      try { await fs.unlink(path.join(this.uploadPath, media.thumbnailUrl)); } catch {}
    }
    await this.mediaRepo.remove(media);
  }

  private getMediaType(mimeType: string): MediaType | null {
    for (const [type, mimes] of Object.entries(this.allowedMimeTypes)) {
      if (mimes.includes(mimeType)) return type as MediaType;
    }
    return null;
  }
}
