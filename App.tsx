
import React, { useState, useEffect } from 'react';
import { ViewState, Item, AppState } from './types';
import HomeView from './views/HomeView';
import ListView from './views/ListView';
import RecordView from './views/RecordView';
import SearchView from './views/SearchView';
import DetailView from './views/DetailView';
import LoadingView from './views/LoadingView';
import * as itemService from './services/itemService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'loading', // 初始显示加载状态
    items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从 Supabase 加载物品数据
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const items = await itemService.fetchItems();
        setState(prev => ({ ...prev, items, view: 'home' }));
      } catch (err) {
        console.error('加载物品失败:', err);
        setError('加载数据失败，请检查网络连接');
        setState(prev => ({ ...prev, view: 'home' }));
      } finally {
        setIsLoading(false);
      }
    };
    loadItems();
  }, []);

  const navigate = (view: ViewState, params?: Partial<AppState>) => {
    setState(prev => ({
      ...prev,
      isFromSearch: false,
      ...params,
      view
    }));
  };

  /**
   * 添加物品
   * 先上传图片到 Supabase Storage，再创建物品记录
   */
  const addItem = async (item: Item) => {
    try {
      // 如果是 base64 图片，先上传到 Storage
      let imageUrl = item.imageUrl;
      if (imageUrl.startsWith('data:image')) {
        imageUrl = await itemService.uploadImage(imageUrl);
      }

      const newItem = await itemService.createItem({
        name: item.name,
        location: item.location,
        imageUrl,
        timestamp: Date.now(),
        isRemoved: false,
      });

      setState(prev => ({
        ...prev,
        items: [newItem, ...prev.items],
        view: 'home'
      }));
    } catch (err) {
      console.error('添加物品失败:', err);
      // NOTE: 可以在这里添加用户提示
    }
  };

  /**
   * 更新物品信息
   */
  const updateItem = async (updatedItem: Item) => {
    try {
      // 如果图片变更为 base64，先上传
      let imageUrl = updatedItem.imageUrl;
      if (imageUrl.startsWith('data:image')) {
        imageUrl = await itemService.uploadImage(imageUrl);
      }

      const updated = await itemService.updateItem(updatedItem.id, {
        ...updatedItem,
        imageUrl,
      });

      setState(prev => ({
        ...prev,
        items: prev.items.map(item => item.id === updated.id ? updated : item)
      }));
    } catch (err) {
      console.error('更新物品失败:', err);
    }
  };

  /**
   * 批量删除物品
   */
  const deleteItems = async (ids: string[]) => {
    try {
      await itemService.deleteItems(ids);
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => !ids.includes(item.id))
      }));
    } catch (err) {
      console.error('删除物品失败:', err);
    }
  };

  const renderView = () => {
    // 显示加载状态
    if (isLoading && state.view === 'loading') {
      return <LoadingView />;
    }

    // 显示错误提示（可选）
    if (error) {
      console.warn('数据加载错误:', error);
    }

    switch (state.view) {
      case 'home':
        return <HomeView navigate={navigate} itemCount={state.items.length} />;
      case 'list':
        return <ListView navigate={navigate} items={state.items} onDeleteItems={deleteItems} />;
      case 'record':
        return <RecordView navigate={navigate} onCapture={(image, name, location) => {
          addItem({
            id: Math.random().toString(36).substr(2, 9), // 临时 ID，会被数据库生成的替换
            name,
            location,
            imageUrl: image,
            timestamp: Date.now(),
            isRemoved: false
          });
        }} />;
      case 'search':
        return <SearchView navigate={navigate} items={state.items} />;
      case 'detail':
        const item = state.items.find(i => i.id === state.currentItemId);
        if (!item) return <ListView navigate={navigate} items={state.items} onDeleteItems={deleteItems} />;
        return <DetailView
          item={item}
          onBack={() => navigate(state.isFromSearch ? 'search' : 'list')}
          onUpdate={updateItem}
          isFromSearch={state.isFromSearch}
        />;
      case 'loading':
        return <LoadingView />;
      default:
        return <HomeView navigate={navigate} itemCount={state.items.length} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background-dark font-display max-w-md mx-auto relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      {renderView()}
    </div>
  );
};

export default App;
