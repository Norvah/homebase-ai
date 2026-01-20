
import React, { useState } from 'react';
import { Item, ViewState, AppState } from '../types';

interface ListViewProps {
  items: Item[];
  navigate: (view: ViewState, params?: Partial<AppState>) => void;
  onDeleteItems?: (ids: string[]) => void;
}

const ListView: React.FC<ListViewProps> = ({ items, navigate, onDeleteItems }) => {
  const [search, setSearch] = useState('');
  const [hideRemoved, setHideRemoved] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesRemoved = hideRemoved ? !item.isRemoved : true;
    return matchesSearch && matchesRemoved;
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size > 0 && onDeleteItems) {
      onDeleteItems(Array.from(selectedIds));
      setIsManaging(false);
      setSelectedIds(new Set());
    }
  };

  const cancelManage = () => {
    setIsManaging(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="relative flex flex-col h-full bg-background-dark">
      <header className="sticky top-0 z-50 flex flex-col bg-background-dark/80 backdrop-blur-md px-4 pt-4 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          {isManaging ? (
            <button 
              onClick={cancelManage}
              className="text-white/60 text-sm font-medium active:opacity-60"
            >
              取消
            </button>
          ) : (
            <button 
              onClick={() => navigate('home')}
              className="flex w-10 h-10 items-center justify-center rounded-full bg-white/5 border border-white/10 active:opacity-60"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
          )}

          <h2 className="text-white text-lg font-bold flex-1 text-center tracking-tight">
            {isManaging ? '选择物品' : '全部物品'}
          </h2>

          <button 
            className="w-10 flex items-center justify-end"
            onClick={isManaging ? selectAll : () => setIsManaging(true)}
          >
            <p className="text-primary text-sm font-bold whitespace-nowrap">
              {isManaging ? (selectedIds.size === filteredItems.length ? '取消全选' : '全选') : '管理'}
            </p>
          </button>
        </div>

        {isManaging && (
          <div className="flex justify-center mb-4">
            <div className="bg-[#161423] px-6 py-2 rounded-2xl border border-white/5 shadow-xl">
              <span className="text-white/40 text-xs font-bold tracking-wider">
                已选择 {selectedIds.size} 个物品
              </span>
            </div>
          </div>
        )}

        {!isManaging && (
          <div className="relative group mb-4">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all outline-none"
              placeholder="搜索记录的物品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {!isManaging && (
          <div className="flex items-center justify-between px-1 pb-3">
            <div 
              onClick={() => setHideRemoved(!hideRemoved)}
              className="flex items-center gap-3 cursor-pointer group select-none"
            >
              <div className={`
                w-11 h-6 rounded-full transition-all duration-300 relative border shadow-inner flex items-center px-0.5
                ${hideRemoved ? 'bg-primary border-primary shadow-primary/20' : 'bg-white/10 border-white/10 shadow-black/40'}
              `}>
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 transform
                  ${hideRemoved ? 'translate-x-5' : 'translate-x-0'}
                `}></div>
              </div>
              <span className={`text-xs font-medium transition-colors ${hideRemoved ? 'text-white' : 'text-white/40'}`}>
                隐藏已取出物品
              </span>
            </div>
            
            <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
              {filteredItems.length} 件物品
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-48">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-white/20">inventory_2</span>
            </div>
            <p className="text-white/30 text-lg font-medium">没有找到相关物品</p>
            <p className="text-white/10 text-sm mt-1">尝试输入其他关键词或更改过滤选项</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map(item => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => isManaging ? toggleSelect(item.id) : navigate('detail', { currentItemId: item.id })}
                  className={`relative group cursor-pointer transition-all duration-300 ${item.isRemoved && !isManaging ? 'opacity-40' : ''} ${isManaging && isSelected ? 'scale-[0.98]' : 'active:scale-95'}`}
                >
                  <div 
                    className={`bg-cover bg-center flex flex-col rounded-[1.5rem] justify-end p-4 aspect-square border transition-all duration-300 relative overflow-hidden shadow-xl
                      ${isManaging && isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-white/5'}
                    `}
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    
                    {/* Multi-select checkmark circle */}
                    {isManaging && (
                      <div className="absolute top-3 right-3 z-20">
                        <div className={`size-6 rounded-full flex items-center justify-center transition-all duration-300 border ${isSelected ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-black/30 border-white/20 backdrop-blur-md'}`}>
                          {isSelected && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                        </div>
                      </div>
                    )}

                    {item.isRemoved && !isManaging && (
                      <div className="absolute top-3 right-3 z-10 bg-primary/20 backdrop-blur-md px-2 py-1 rounded-lg border border-primary/30">
                        <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">已取出</span>
                      </div>
                    )}
                    
                    <p className="text-white text-sm font-bold relative z-10 truncate tracking-tight">{item.name}</p>
                    <div className="flex items-center gap-1 opacity-60 relative z-10">
                      <span className="material-symbols-outlined text-[10px] text-white">location_on</span>
                      <span className="text-[10px] text-white truncate">{item.location}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Button */}
      {isManaging && (
        <div className="fixed bottom-[110px] left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-[60] animate-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          <button 
            onClick={handleDelete}
            disabled={selectedIds.size === 0}
            className={`w-full bg-[#f84b4b] h-16 rounded-[2rem] flex items-center justify-center gap-3 text-white font-bold text-lg shadow-[0_12px_40px_rgba(248,75,75,0.4)] active:scale-95 transition-all pointer-events-auto
              ${selectedIds.size === 0 ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : ''}
            `}
          >
            <span className="material-symbols-outlined text-2xl">delete</span>
            <span>确认删除 ({selectedIds.size})</span>
          </button>
        </div>
      )}

      <footer className="fixed bottom-0 w-full max-w-md bg-background-dark/95 backdrop-blur-2xl border-t border-white/5 pb-8 pt-3 px-8 z-50">
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('home')} className="flex flex-col items-center gap-1 group">
            <span className="material-symbols-outlined text-white/40 group-active:scale-90 transition-transform">home</span>
            <span className="text-[10px] text-white/40 font-medium">首页</span>
          </button>
          <button className="flex flex-col items-center gap-1 group relative">
            <span className="material-symbols-outlined fill text-primary">inventory_2</span>
            <span className="text-[10px] text-primary font-bold">物品</span>
            <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"></div>
          </button>
          <button onClick={() => navigate('search')} className="flex flex-col items-center gap-1 group">
            <span className="material-symbols-outlined text-white/40 group-active:scale-90 transition-transform">search</span>
            <span className="text-[10px] text-white/40 font-medium">搜索</span>
          </button>
          <button className="flex flex-col items-center gap-1 group opacity-40">
            <span className="material-symbols-outlined text-white/40">settings</span>
            <span className="text-[10px] text-white/40 font-medium">设置</span>
          </button>
        </div>
      </footer>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default ListView;
