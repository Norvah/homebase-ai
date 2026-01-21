
import React, { useState, useEffect } from 'react';
import { ViewState, Item, AppState } from './types';
import HomeView from './views/HomeView';
import ListView from './views/ListView';
import RecordView from './views/RecordView';
import SearchView from './views/SearchView';
import DetailView from './views/DetailView';
import LoadingView from './views/LoadingView';
import AuthView from './views/AuthView';
import UpgradePrompt from './components/UpgradePrompt';
import * as itemService from './services/itemService';
import * as authService from './services/auth';
import type { User } from './services/auth';

// 触发注册引导的物品数量阈值
const UPGRADE_PROMPT_THRESHOLD = 5;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'loading',
    items: [],
  });
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showAuthView, setShowAuthView] = useState(false);

  // 检查认证状态，自动匿名登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        let currentUser = await authService.getCurrentUser();

        // 如果没有用户，自动匿名登录
        if (!currentUser) {
          const { user: anonUser } = await authService.signInAnonymously();
          currentUser = anonUser;
        }

        setUser(currentUser);

        if (currentUser) {
          await loadItems();
        }
      } catch (err) {
        console.error('认证失败:', err);
        // 匿名登录失败，显示登录页面
        setShowAuthView(true);
        setState(prev => ({ ...prev, view: 'home' }));
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();

    // 监听认证状态变化
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setState({ view: 'loading', items: [] });
        // 登出后重新匿名登录
        authService.signInAnonymously().then(({ user }) => {
          setUser(user);
          loadItems();
        });
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return unsubscribe;
  }, []);

  // 加载物品数据
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

  // 登录成功后的处理
  const handleAuthSuccess = async () => {
    setShowAuthView(false);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    await loadItems();
  };

  // 账号升级成功
  const handleUpgradeSuccess = () => {
    setShowUpgradePrompt(false);
    // 刷新用户信息
    authService.getCurrentUser().then(setUser);
  };

  // 登出（仅正式用户显示登出按钮）
  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.error('登出失败:', err);
    }
  };

  // 切换到登录页面（用于匿名用户主动登录）
  const handleShowAuth = () => {
    setShowAuthView(true);
  };

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
   */
  const addItem = async (item: Item) => {
    try {
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

      const newItems = [newItem, ...state.items];
      setState(prev => ({
        ...prev,
        items: newItems,
        view: 'home'
      }));

      // 检查是否需要显示注册引导
      if (
        authService.isAnonymousUser(user) &&
        newItems.length >= UPGRADE_PROMPT_THRESHOLD
      ) {
        // 延迟显示，让用户先看到保存成功
        setTimeout(() => {
          setShowUpgradePrompt(true);
        }, 500);
      }
    } catch (err) {
      console.error('添加物品失败:', err);
    }
  };

  /**
   * 更新物品信息
   */
  const updateItem = async (updatedItem: Item) => {
    try {
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

  // 判断是否显示登出按钮（仅正式用户显示）
  const isRegisteredUser = user && !authService.isAnonymousUser(user);

  const renderView = () => {
    // 正在检查认证状态
    if (isAuthChecking) {
      return <LoadingView />;
    }

    // 显示登录页面（用户主动点击登录）
    if (showAuthView) {
      return <AuthView onAuthSuccess={handleAuthSuccess} onBack={() => setShowAuthView(false)} />;
    }

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
        return (
          <HomeView
            navigate={navigate}
            itemCount={state.items.length}
            onSignOut={isRegisteredUser ? handleSignOut : undefined}
            onShowAuth={authService.isAnonymousUser(user) ? handleShowAuth : undefined}
          />
        );
      case 'list':
        return <ListView navigate={navigate} items={state.items} onDeleteItems={deleteItems} />;
      case 'record':
        return <RecordView navigate={navigate} onCapture={(image, name, location) => {
          addItem({
            id: Math.random().toString(36).substr(2, 9),
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
        return (
          <HomeView
            navigate={navigate}
            itemCount={state.items.length}
            onSignOut={isRegisteredUser ? handleSignOut : undefined}
            onShowAuth={authService.isAnonymousUser(user) ? handleShowAuth : undefined}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background-dark font-display max-w-md mx-auto relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      {renderView()}

      {/* 注册引导弹窗 */}
      {showUpgradePrompt && (
        <UpgradePrompt
          itemCount={state.items.length}
          onSuccess={handleUpgradeSuccess}
          onDismiss={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
};

export default App;
