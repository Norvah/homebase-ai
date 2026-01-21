
export interface Item {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  timestamp: number; // 从 created_at 转换而来
  isRemoved: boolean;
  userId?: string; // 关联用户 ID
}

export type ViewState = 'home' | 'list' | 'record' | 'search' | 'detail' | 'loading' | 'confirm_record' | 'auth';

export interface AppState {
  view: ViewState;
  items: Item[];
  currentItemId?: string;
  searchQuery?: string;
  lastCapturedImage?: string;
  aiSuggestedName?: string;
  aiSuggestedLocation?: string;
  isFromSearch?: boolean;
}
