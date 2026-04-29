export type TTagType =
  | 'SKIN_TYPE'
  | 'CONCERN'
  | 'INGREDIENT'
  | 'FEATURE'
  | 'ROUTINE'
  | 'TEXTURE'
  | 'AGE_GROUP'
  | 'SPF_TYPE'
  | 'GENDER';

export type TTag = {
  id?: string;
  name: string;
  slug: string;
  type: TTagType;
  createdAt?: Date;
  updatedAt?: Date;
};
