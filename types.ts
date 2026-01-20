
export interface Item {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  timestamp: number; // 从 created_at 转换而来
  isRemoved: boolean;
}

export type ViewState = 'home' | 'list' | 'record' | 'search' | 'detail' | 'loading' | 'confirm_record';

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
