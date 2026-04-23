// src/app/modules/Announcement/announcement.interface.ts

export type TAnnouncement = {
  id?: string;
  text: string;
  linkUrl?: string | null;
  isActive?: boolean;
  deleted?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};
