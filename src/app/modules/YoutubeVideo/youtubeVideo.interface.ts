// src/app/modules/YoutubeVideo/youtubeVideo.interface.ts

export type TYoutubeVideo = {
  id?: string;
  title: string;
  youtubeId: string;
  thumbnail?: string | null;
  description?: string | null;
  isActive?: boolean;
  deleted?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};
